import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

async function getArtistDNAString() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) return ''

    const { data, error } = await supabase
      .from('artist_dna_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !data) return ''

    return `
Artist DNA Profile:
- Artist Name: ${data.artist_name || ''}
- Vocal Range: ${data.vocal_range || ''}
- Core Genres: ${data.core_genres || ''}
- Lyrical Style: ${data.lyrical_style || ''}
- Emotional Tone: ${data.emotional_tone || ''}
- Writing Strengths: ${data.writing_strengths || ''}
- Avoid List: ${data.avoid_list || ''}
- Visual Style: ${data.visual_style || ''}
- Performance Style: ${data.performance_style || ''}
- DNA Summary: ${data.dna_summary || ''}

Use this DNA as a strong stylistic guide. Do not mention it explicitly in the output.
`
  } catch (err) {
    console.error('Artist DNA lookup failed in generate route:', err)
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const artistDNA = await getArtistDNAString()

    if (body.mode === 'rewrite') {
      const prompt = `
You are an expert songwriter and lyric editor.

Rewrite task:
${body.instruction || ''}

Lyrics to rewrite:
${body.lyrics || ''}

${artistDNA}

Return ONLY valid JSON in this exact shape:
{
  "rewrite": ""
}

Rules:
- Return rewritten lyrics only inside the "rewrite" field.
- Do not return a full song unless the supplied text is a full song.
- Do not add commentary.
- Do not include markdown fences.
- Do not include explanations.
`

      const completion = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{ role: 'user', content: prompt }],
      })

      const text = completion.choices[0].message.content || '{}'

      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON from model', raw: text },
          { status: 500 }
        )
      }
const rewriteText =
  parsed.rewrite ||
  parsed.lyrics ||
  parsed.text ||
  parsed.lyrics_full ||
  ''

return NextResponse.json({
  rewrite: rewriteText,
  lyrics: rewriteText,
  text: rewriteText,
  raw: parsed,
})
    }

    const prompt = `
You are an expert songwriter helping create a song concept and lyrics.

Song input:
- Genre: ${body.genre || ''}
- Moods: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
- Theme: ${body.theme || ''}
- Hook: ${body.hook || ''}
- Creative DNA preset: ${body.dnaId || ''}

${artistDNA}

Return ONLY valid JSON in this exact shape:
{
  "style_short": "",
  "style_detailed": "",
  "lyrics_brief": "",
  "lyrics_full": ""
}

Requirements:
- Make the output commercially strong but emotionally authentic.
- Keep lyrics coherent and singable.
- Use the artist DNA where helpful to shape voice, tone, phrasing, and emotional identity.
- Do not include markdown fences.
- Do not include any commentary outside JSON.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0].message.content || '{}'

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from model', raw: text },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('Generate route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Generation failed' },
      { status: 500 }
    )
  }
}