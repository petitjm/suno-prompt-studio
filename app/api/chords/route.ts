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
You are a professional songwriter and acoustic arranger.

Create chord progressions for this song idea:

Genre: ${body.genre}
Mood: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme}
Hook: ${body.hook}

${artistDNA}

Return ONLY valid JSON (no explanation, no text before or after):

{
  "key": "",
  "capo": "",
  "verse": "",
  "chorus": "",
  "bridge": "",
  "notes": ""
}

Requirements:
- Make it playable for acoustic guitar.
- Use the artist DNA where helpful, especially for vocal range, style, harmonic richness, and live-performance suitability.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0].message.content || '{}'

    let chordData
    try {
      chordData = JSON.parse(text)
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON from model',
          raw: text,
        },
        { status: 500 }
      )
    }

    if (body.project_id) {
      const supabase = await createClient()

      await supabase.from('chord_versions').insert({
        project_id: body.project_id,
        chord_data: chordData,
      })
    }

    return NextResponse.json(chordData)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Chord generation failed' },
      { status: 500 }
    )
  }
}