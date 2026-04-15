import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

async function getArtistDNAString() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return ''

  const { data } = await supabase
    .from('artist_dna_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return ''

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
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const artistDNA = await getArtistDNAString()

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
    return NextResponse.json(
      { error: err.message || 'Generation failed' },
      { status: 500 }
    )
  }
}