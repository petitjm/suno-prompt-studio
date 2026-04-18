import { NextResponse } from 'next/server'

function isMetadataLine(line: string) {
  const trimmed = line.trim()

  if (!trimmed) return false

  // Label-style metadata
  if (/^(bpm|tempo|key|capo|style|genre|mood|time signature|meter)\s*:/i.test(trimmed)) {
    return true
  }

  // Standalone time signatures like 4/4, 3/4, 6/8, 12/8
  if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    return true
  }

  // Combined time-signature + BPM line like: 4/4          ~78 BPM
  if (/^\d{1,2}\/\d{1,2}\s+(~\s*)?\d{2,3}\s*bpm$/i.test(trimmed)) {
    return true
  }

  // Standalone BPM lines like:
  // 78 BPM
  // ~78 BPM
  // approx 78 BPM
  // approximately 78 BPM
  if (/^(~\s*)?\d{2,3}\s*bpm$/i.test(trimmed)) {
    return true
  }

  if (/^(approx\.?|approximately)\s+\d{2,3}\s*bpm$/i.test(trimmed)) {
    return true
  }

  return false
}

function isSectionHeader(line: string) {
  const trimmed = line.trim()
  return /^\[(verse|chorus|bridge|pre-chorus|pre chorus|intro|outro|hook|refrain|tag)(\s*\d+)?\]$/i.test(trimmed)
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
    const rawLines = section
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (!rawLines.length) continue

    const lines = rawLines.filter((line) => !isMetadataLine(line))
    if (!lines.length) continue

    let startIndex = 0

    if (isSectionHeader(lines[0])) {
      out.push(lines[0])
      out.push('')
      startIndex = 1
    }

    const lyricLines = lines.slice(startIndex).filter(Boolean)
    if (!lyricLines.length) {
      out.push('')
      continue
    }

    for (const line of lyricLines) {
      const words = line.split(/\s+/).filter(Boolean)

      if (words.length <= 2 || chordPool.length === 0) {
        out.push(line)
        out.push('')
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
      out.push('')
    }
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