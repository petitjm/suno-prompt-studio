import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

function parseModelJson(text: string) {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    // Continue to fallback extraction below.
  }

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutCodeFence)
  } catch {
    // Continue to object extraction below.
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1)
    return JSON.parse(jsonCandidate)
  }

  throw new Error('Could not parse JSON from model response.')
}


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
    console.error('Artist DNA lookup failed in chords route:', err)
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const artistDNA = await getArtistDNAString()

    const lyrics = typeof body.lyrics === 'string' ? body.lyrics : ''
const songTitle = typeof body.songTitle === 'string' ? body.songTitle : ''
const songVersionTitle =
  typeof body.songVersionTitle === 'string' ? body.songVersionTitle : ''

const prompt = `
You are a professional songwriter, acoustic arranger, and live performance songsheet editor.

Create playable acoustic-guitar chords and a performance songsheet for these lyrics.

Song title: ${songTitle || 'Untitled song'}
Song version: ${songVersionTitle || 'Untitled version'}

Genre: ${body.genre || ''}
Mood: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme || ''}
Hook: ${body.hook || ''}

Lyrics:
${lyrics}

${artistDNA}

Return ONLY valid JSON. Do not include explanation, markdown, comments, or text before or after the JSON.

The JSON must use this shape:

{
  "key": "",
  "capo": "",
  "tuning": "",
  "genre": "",
  "performanceFeel": "",
  "verse": "",
  "chorus": "",
  "bridge": "",
  "notes": "",
  "songSheetLines": [
    {
      "section": "Verse 1",
      "lyric": "Actual lyric line here",
      "chords": [
        {
          "chord": "G",
          "charIndex": 0
        }
      ]
    }
  ]
}

Requirements:
- Make the chords playable for acoustic guitar.
- Use the artist DNA where helpful, especially for vocal range, style, harmonic richness, and live-performance suitability.
- Think like a songwriter and live acoustic performer.
- The output should help the performer remember phrasing, rhythm, melody feel, and chord timing.
- The placed chord positions are more important than a generic chord progression summary.
- songSheetLines must preserve the actual lyric lines in order.
- Each lyric line should appear once.
- Do not invent new lyrics.
- Do not omit lyric lines.
- Put chords only where chord changes happen.
- charIndex is zero-based.
- charIndex means the chord should appear above that character in the lyric line.
- Place chords above the syllable or word where the change should happen for natural performance phrasing.
- Do not place every chord at the start of the line unless the change truly happens there.
- Use the requested genre, mood, artist DNA, and live acoustic performance feel to choose chord rhythm and phrasing.
- Keep placements practical for a singer-guitarist reading a songsheet.
- If a lyric line has no chord change, include the line with an empty chords array.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0].message.content || '{}'

    let chordData
        try {
          chordData = parseModelJson(text)
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

      const {
        data: { user },
      } = await supabase.auth.getUser()

      await supabase.from('chord_versions').insert({
        project_id: body.project_id,
        chord_data: chordData,
      })

      if (user) {
        const { error: projectUpdateError } = await supabase
          .from('projects')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', body.project_id)
          .eq('user_id', user.id)

        if (projectUpdateError) {
          console.error('projects updated_at bump failed after chord save:', projectUpdateError)
        }
      }
    }

    return NextResponse.json(chordData)
  } catch (err: any) {
    console.error('Chords route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Chord generation failed' },
      { status: 500 }
    )
  }
}