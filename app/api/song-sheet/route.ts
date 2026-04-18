import { NextResponse } from 'next/server'

function isMetadataLine(line: string) {
  const trimmed = line.trim()

  if (!trimmed) return false

  return /^(bpm|tempo|key|capo|style|genre|mood|time signature|meter)\s*:/i.test(trimmed)
}

function splitSections(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function getChordPool(chordData: any) {
  const combined = [
    chordData?.verse || '',
    chordData?.chorus || '',
    chordData?.bridge || '',
  ]
    .join(' | ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!combined) return []

  return combined
    .split(/[|,]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function createSongSheet(lyrics: string, chordData: any) {
  const rawSections = splitSections(lyrics)
  const chordPool = getChordPool(chordData)

  if (!rawSections.length) return ''

  let chordIndex = 0
  const out: string[] = []

  for (const section of rawSections) {
    const lines = section
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((line) => !isMetadataLine(line))

    if (!lines.length) continue

    for (const line of lines) {
      const words = line.split(/\s+/).filter(Boolean)

      if (words.length <= 2 || chordPool.length === 0) {
        out.push(line)
        continue
      }

      const chordA = chordPool[chordIndex % chordPool.length]
      const chordB = chordPool[(chordIndex + 1) % chordPool.length]
      chordIndex += 2

      const midpoint = Math.max(1, Math.floor(words.length / 2))
      const firstHalf = words.slice(0, midpoint).join(' ')
      const secondHalf = words.slice(midpoint).join(' ')

      const chordLine =
        chordA.padEnd(Math.max(firstHalf.length, chordA.length) + 2, ' ') + chordB

      out.push(chordLine)
      out.push(`${firstHalf} ${secondHalf}`.trim())
    }

    out.push('')
  }

  return out.join('\n').trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const lyrics = String(body.lyrics || '').trim()
    const chordData = body.chord_data || {}

    if (!lyrics) {
      return NextResponse.json({ error: 'Missing lyrics' }, { status: 400 })
    }

    const songSheet = createSongSheet(lyrics, chordData)

    return NextResponse.json({
      ok: true,
      song_sheet: songSheet,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create song sheet' },
      { status: 500 }
    )
  }
}