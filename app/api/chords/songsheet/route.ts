import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SONGSHEET_TIMEOUT_MS = 240_000

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

type SongsheetChordPlacement = {
  chord: string
  charIndex: number
}

type SongsheetLine = {
  section: string
  lyric: string
  chords: SongsheetChordPlacement[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function validateSongSheetLines(
  value: unknown,
  sourceLyricLines: string[],
): {
  lines: SongsheetLine[]
  rejectedLines: string[]
} {
  if (!Array.isArray(value)) {
    return {
      lines: [],
      rejectedLines: [],
    }
  }

  const exactSourceLines = new Set(sourceLyricLines)
  const normalizedSourceLineMap = new Map(
    sourceLyricLines.map((line: string) => [normalizeMatchText(line), line]),
  )

  const rejectedLines: string[] = []

  const lines = value.flatMap((item): SongsheetLine[] => {
    if (!isRecord(item)) {
      return []
    }

    const rawLyric = typeof item.lyric === 'string' ? item.lyric.trim() : ''
    const section = typeof item.section === 'string' ? item.section.trim() : ''

    if (!rawLyric) {
      return [
        {
          section,
          lyric: '',
          chords: [],
        },
      ]
    }

    const exactLyric = exactSourceLines.has(rawLyric)
      ? rawLyric
      : normalizedSourceLineMap.get(normalizeMatchText(rawLyric))

    if (!exactLyric) {
      rejectedLines.push(rawLyric)
      return []
    }

    const chords = Array.isArray(item.chords)
      ? item.chords.flatMap((chordItem): SongsheetChordPlacement[] => {
          if (!isRecord(chordItem)) {
            return []
          }

          const chord =
            typeof chordItem.chord === 'string' ? chordItem.chord.trim() : ''

          const charIndex =
            typeof chordItem.charIndex === 'number' &&
            Number.isFinite(chordItem.charIndex)
              ? chordItem.charIndex
              : 0

          if (!chord) {
            return []
          }

          return [
            {
              chord,
              charIndex: Math.max(0, Math.floor(charIndex)),
            },
          ]
        })
      : []

    return [
      {
        section,
        lyric: exactLyric,
        chords,
      },
    ]
  })

  return {
    lines,
    rejectedLines,
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const lyrics = typeof body.lyrics === 'string' ? body.lyrics : ''
    const songTitle = typeof body.songTitle === 'string' ? body.songTitle : ''
    const songVersionTitle =
      typeof body.songVersionTitle === 'string' ? body.songVersionTitle : ''

    const chordData =
      body.chordData && typeof body.chordData === 'object' && !Array.isArray(body.chordData)
        ? body.chordData
        : null

    if (!lyrics.trim()) {
      return NextResponse.json(
        { error: 'Lyrics are required to generate a placed songsheet.' },
        { status: 400 },
      )
    }

    if (!chordData) {
      return NextResponse.json(
        { error: 'Chord data is required to generate a placed songsheet.' },
        { status: 400 },
      )
    }

   const sourceLyricLines = lyrics
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)

    const numberedSourceLyricLines = sourceLyricLines
      .map((line: string, index: number) => `${index + 1}. ${line}`)
      .join('\n')

    const prompt = `
You are helping a singer-songwriter turn a chord draft into a practical chord-over-lyric songsheet.

Return JSON only. No markdown. No commentary.

Song title: ${songTitle || 'Untitled song'}
Song version: ${songVersionTitle || 'Untitled version'}

Source lyric lines:
${numberedSourceLyricLines}

Existing chord data:
${JSON.stringify(chordData, null, 2)}

Return this exact JSON shape:

{
  "songSheetLines": [
    {
      "section": "Verse 1",
      "lyric": "Actual lyric line from the supplied lyrics",
      "chords": [
        { "chord": "Em", "charIndex": 0 },
        { "chord": "C", "charIndex": 12 }
      ]
    }
  ],
  "songsheetNotes": ""
}

Requirements:
Requirements:
- Use only the exact lyric text from the numbered source lyric lines above.
- Do not rewrite, modernise, correct, improve, shorten, expand, reorder, or paraphrase any lyric line.
- Every songSheetLines[].lyric value must exactly match one of the numbered source lyric lines.
- If a source line is a section label or metadata line, include it with an empty chords array.
- Preserve the source lyric order.
- Place chords above the word or syllable where the chord should change.
- Place chords above the word or syllable where the chord should change.
- Use zero-based charIndex positions within each lyric line.
- Do not put every chord at charIndex 0.
- Header/section label lines may have no chords.
- If a chord belongs after the lyric line as a turnaround or held chord, place it near the end of the line and explain briefly in songsheetNotes.
- Use the existing chord data as the harmonic source.
- Before returning JSON, check every lyric value against the numbered source lyric lines. If it does not exactly match, replace it with the closest exact source line.
- Keep the result practical for acoustic guitar performance.
`.trim()

    const controller = new AbortController()

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, SONGSHEET_TIMEOUT_MS)

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

    const text = completion.choices[0]?.message?.content || ''
        const songsheetData = parseModelJson(text)

        const songsheetRecord = isRecord(songsheetData) ? songsheetData : {}
        const validation = validateSongSheetLines(
          songsheetRecord.songSheetLines,
          sourceLyricLines,
        )

        return NextResponse.json({
          ...chordData,
          ...songsheetRecord,
          songSheetLines: validation.lines,
          songsheetValidation: {
            sourceLineCount: sourceLyricLines.length,
            acceptedLineCount: validation.lines.length,
            rejectedLineCount: validation.rejectedLines.length,
            rejectedLines: validation.rejectedLines.slice(0, 12),
          },
          songsheetNotes: [
            typeof songsheetRecord.songsheetNotes === 'string'
              ? songsheetRecord.songsheetNotes
              : '',
            validation.rejectedLines.length > 0
              ? `${validation.rejectedLines.length} generated songsheet line${validation.rejectedLines.length === 1 ? '' : 's'} rejected because they did not match the source lyrics.`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          draftType:
            typeof chordData.draftType === 'string'
              ? chordData.draftType
              : 'chord-draft-with-songsheet',
        })

  } catch (error) {
    console.error('Songsheet route failure:', error)

    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error:
            'OpenAI API quota has been exceeded. Please check your API billing/usage, then try generating the songsheet again.',
        },
        { status: 429 },
      )
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        {
          error:
            'Placed songsheet generation timed out after 4 minutes. Please try again, or shorten the lyrics.',
        },
        { status: 504 },
      )
    }

    return NextResponse.json(
      { error: 'Could not generate placed songsheet.' },
      { status: 500 },
    )
  }
}