import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const GUIDE_TRACK_TIMEOUT_MS = 180_000
const GUIDE_TRACK_MODEL = process.env.OPENAI_GUIDE_TRACK_MODEL || 'gpt-5'

function logOpenAIUsage(routeName: string, startedAt: number, completion: unknown) {
  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)

  const usage =
    completion &&
    typeof completion === 'object' &&
    'usage' in completion
      ? (completion as {
          usage?: {
            prompt_tokens?: number
            completion_tokens?: number
            total_tokens?: number
          }
        }).usage
      : undefined

  console.log(
    `[${routeName}] duration=${durationSeconds}s input=${usage?.prompt_tokens ?? 'unknown'} output=${usage?.completion_tokens ?? 'unknown'} total=${usage?.total_tokens ?? 'unknown'}`,
  )
}

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

function parseModelJson(text: string) {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {}

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutCodeFence)
  } catch {}

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
  }

  throw new Error('Could not parse JSON from model response.')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const lyrics = typeof body.lyrics === 'string' ? body.lyrics : ''
    const songTitle = typeof body.songTitle === 'string' ? body.songTitle : ''
    const songVersionTitle =
      typeof body.songVersionTitle === 'string' ? body.songVersionTitle : ''

    const chordData =
      body.chordData &&
      typeof body.chordData === 'object' &&
      !Array.isArray(body.chordData)
        ? body.chordData
        : null

    if (!lyrics.trim()) {
      return NextResponse.json(
        { error: 'Lyrics are required to generate a guide track plan.' },
        { status: 400 },
      )
    }

    if (!chordData) {
      return NextResponse.json(
        { error: 'Chord data is required to generate a guide track plan.' },
        { status: 400 },
      )
    }

    const prompt = `
You are helping a singer-songwriter create a guide track plan for rehearsal.

Return JSON only. No markdown. No commentary.

Song title: ${songTitle || 'Untitled song'}
Song version: ${songVersionTitle || 'Untitled version'}

Lyrics:
${lyrics}

Current chord data:
${JSON.stringify(chordData, null, 2)}

Return this exact JSON shape:

{
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
  }
}

Requirements:
- This is a guide track plan, not finished production.
- Preserve tempo, groove, phrasing, chord timing, vocal entry points, and dynamic shape.
- Keep instrumentation sparse and rehearsal-focused.
- Prefer acoustic guitar as the main timing and harmony reference.
- Include count-in guidance.
- Use the placed songsheet if available.
- If songSheetLines are available, create sectionPlan items that follow those sections.
- Keep sectionPlan practical and concise.
- Make the plan suitable for a British male low baritone acoustic singer-songwriter performance.
`.trim()

    const startedAt = Date.now()

    const controller = new AbortController()

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, GUIDE_TRACK_TIMEOUT_MS)

    let completion

    try {
      completion = await openai.chat.completions.create(
        {
          model: GUIDE_TRACK_MODEL,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          signal: controller.signal,
        },
      )
    } finally {
      clearTimeout(timeoutId)
    }

    logOpenAIUsage(`chords/guide-track model=${GUIDE_TRACK_MODEL}`, startedAt, completion)

    const text = completion.choices[0]?.message?.content || ''
    const guideTrackData = parseModelJson(text)

    return NextResponse.json({
      ...chordData,
      ...guideTrackData,
      draftType:
        typeof chordData.draftType === 'string'
          ? chordData.draftType
          : 'chord-draft-with-guide-track-plan',
    })
  } catch (error) {
    console.error('Guide track route failure:', error)

    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error:
            'OpenAI API quota has been exceeded. Please check your API billing/usage, then try generating the guide track plan again.',
        },
        { status: 429 },
      )
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        {
          error:
            'Guide track plan generation timed out after 3 minutes. Please try again, or shorten the lyrics.',
        },
        { status: 504 },
      )
    }

    return NextResponse.json(
      { error: 'Could not generate guide track plan.' },
      { status: 500 },
    )
  }
}