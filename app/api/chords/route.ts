import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const CHORD_GENERATION_TIMEOUT_MS = 300_000

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()

  return (
    error.name === 'AbortError' ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('aborted')
  )
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const record = error as {
    status?: number
    code?: string
    type?: string
  }

  return (
    record.status === 429 ||
    record.code === 'insufficient_quota' ||
    record.type === 'insufficient_quota'
  )
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

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
  "tempoBpm": 82,
  "timeSignature": "4/4",
  "groove": "",
  "performanceFeel": "",
  "phrasingNotes": "",
  "vocalDelivery": "",
  "guitarPattern": "",
  "guideTrackPlan": {
  "purpose": "",
  "countIn": "",
  "instrumentation": "",
  "guitarTone": "",
  "rhythmReference": "",
  "vocalGuideStyle": "",
  "sectionPlan": [
    {
          "section": "Verse 1",
          "feel": "",
          "guitarApproach": "",
          "vocalApproach": "",
          "dynamicShape": "",
          "notes": ""
        }
      ]
    },
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
- The placed chord positions must reflect the intended performance feel, tempo, groove, phrasing, breath points, and instrumental movement. They are more important than a generic chord progression summary.
- songSheetLines must preserve the actual lyric lines in order.
- Each lyric line should appear once.
- Do not invent new lyrics.
- Do not omit lyric lines.
- Put chords only where chord changes happen, and place each chord above the lyric syllable or word where the singer should feel the change.
- charIndex is zero-based.
- charIndex means the chord should appear above that character in the lyric line.
- Place chords above the syllable or word where the change should happen for natural performance phrasing.
- Do not place every chord at the start of the line unless the change truly happens there.
- Use the requested genre, mood, artist DNA, and live acoustic performance feel to choose chord rhythm and phrasing.
- Keep placements practical for a singer-guitarist reading a songsheet.
- If a lyric line has no chord change, include the line with an empty chords array.
- Review the songSheetLines before final output.
- Avoid placing most chords at charIndex 0.
- At least half of the chord placements should normally fall after character 0 unless the song genuinely changes chords only at line starts.
- Spread chord placements across the lyric line according to natural vocal phrasing.
- Prefer fewer meaningful chord placements over too many mechanical placements.
- Make sure every charIndex points to a valid character position in that lyric line.
- If the lyric line is "Hold on through the stormy weather" and the chord changes on "through", charIndex should point near the "t" in "through", not automatically to 0.
- Return the final checked JSON only.
Performance intent requirements:
- Include tempoBpm as a realistic number for the song style.
- Include timeSignature, usually "4/4" unless another feel is clearly better.
- Include groove, describing the rhythmic feel, for example "laid-back fingerpicked 8th-note feel" or "steady brushed country ballad pulse".
- Include phrasingNotes describing how the vocal should sit against the guitar rhythm.
- Include vocalDelivery describing the emotional and rhythmic delivery.
- Include guitarPattern describing the likely accompaniment pattern.
- Make guideTrackPlan specific enough that a simple audio-preview feature could use it later.
- Use these performance intent fields to guide songSheetLines chord placement.
- If a chord occurs after the final sung word on a line, describe its purpose through the performance feel or notes, such as turnaround, held chord, pickup, breath, or instrumental response.
Guide track plan requirements:
- Include guideTrackPlan as a practical plan for a future simple audio guide track.
- The guide track is not a finished production.
- It should help the songwriter remember tempo, groove, phrasing, chord timing, vocal entry points, and dynamic shape.
- Keep instrumentation sparse, usually acoustic guitar plus optional light count-in, foot tap, or metronome.
- Do not suggest full-band production unless the song clearly requires it.
- Use sectionPlan to describe how each major section should feel and develop.
- Include vocalGuideStyle as a simple guide vocal or melody reference, not a polished lead vocal.
- Include rhythmReference to describe the pulse clearly enough that it could later drive audio preview generation.
`


    

const controller = new AbortController()

const timeoutId = setTimeout(() => {
  controller.abort()
}, CHORD_GENERATION_TIMEOUT_MS)

let completion

try {
  completion = await openai.chat.completions.create(
    {
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      signal: controller.signal,
    },
  )
} finally {
  clearTimeout(timeoutId)
}

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
  } catch (error) {
  console.error('Chords route failure:', error)

  if (isQuotaError(error)) {
    return NextResponse.json(
      {
        error:
          'OpenAI API quota has been exceeded. Please check your API billing/usage, then try generating chords again.',
      },
      { status: 429 },
    )
  }

  if (isTimeoutError(error)) {
    return NextResponse.json(
      {
        error:
          'Chord generation timed out after 5 minutes. Please try again, or shorten the lyrics/prompt context and regenerate.',
      },
      { status: 504 },
    )
  }

  return NextResponse.json(
    { error: 'Could not generate chords.' },
    { status: 500 },
  )
}
}