import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const BASIC_CHORD_TIMEOUT_MS = 180_000
const BASIC_CHORD_MODEL = process.env.OPENAI_BASIC_CHORD_MODEL || 'gpt-5'

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

    if (!lyrics.trim()) {
      return NextResponse.json(
        { error: 'Lyrics are required to generate a basic chord draft.' },
        { status: 400 },
      )
    }

    const prompt = `
You are helping a singer-songwriter create a fast basic chord draft.

Return JSON only. No markdown. No commentary.

Song title: ${songTitle || 'Untitled song'}
Song version: ${songVersionTitle || 'Untitled version'}

Lyrics:
${lyrics}

Create a concise basic chord and performance foundation.

Return this exact JSON shape:

{
  "draftType": "basic-chord-draft",
  "key": "",
  "capo": "",
  "tuning": "",
  "genre": "",
  "tempoBpm": 0,
  "timeSignature": "",
  "groove": "",
  "performanceFeel": "",
  "vocalDelivery": "",
  "guitarPattern": "",
  "intro": "",
  "verse": "",
  "preChorus": "",
  "chorus": "",
  "bridge": "",
  "outro": "",
  "notes": ""
}

Requirements:
- Keep the output compact.
- Do not create chord-over-lyric songsheet lines.
- Do not create guideTrackPlan.
- Do not create audio preview data.
- Focus on a playable acoustic guitar foundation.
- Prefer singer-songwriter friendly chords.
- Suggest capo only if useful.
- Use the lyrics to infer mood, structure, and dynamics.
- Make the result practical for a British male low baritone acoustic performance.
`.trim()

    const startedAt = Date.now()

    const controller = new AbortController()

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, BASIC_CHORD_TIMEOUT_MS)

    let completion

    try {
      completion = await openai.chat.completions.create(
        {
          model: BASIC_CHORD_MODEL,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          signal: controller.signal,
        },
      )
    } finally {
      clearTimeout(timeoutId)
    }

    function getOpenAIUsageMeta(
  routeName: string,
  model: string,
  startedAt: number,
  completion: unknown,
) {
  const durationSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1))

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

  return {
    route: routeName,
    model,
    durationSeconds,
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    generatedAt: new Date().toISOString(),
  }
}


    logOpenAIUsage(`chords/basic model=${BASIC_CHORD_MODEL}`, startedAt, completion)

    const text = completion.choices[0]?.message?.content || ''
    const chordData = parseModelJson(text)

    return NextResponse.json({
      ...(chordData && typeof chordData === 'object' && !Array.isArray(chordData)
        ? chordData
        : {}),
      generationMeta: getOpenAIUsageMeta(
        'chords/basic',
        BASIC_CHORD_MODEL,
        startedAt,
        completion,
      ),
    })
  } catch (error) {
    console.error('Basic chords route failure:', error)

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
            'Basic chord generation timed out after 3 minutes. Please try again, or shorten the lyrics.',
        },
        { status: 504 },
      )
    }

    return NextResponse.json(
      { error: 'Could not generate basic chord draft.' },
      { status: 500 },
    )
  }
}