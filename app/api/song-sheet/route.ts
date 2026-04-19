import { NextResponse } from 'next/server'

function isMetadataLine(line: string) {
  const trimmed = line.trim()

  if (!trimmed) return false

  if (/^(bpm|tempo|key|capo|style|genre|mood|time signature|meter)\s*:/i.test(trimmed)) {
    return true
  }

  if (/^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    return true
  }

  if (/^\d{1,2}\/\d{1,2}\s+(~\s*)?\d{2,3}\s*bpm$/i.test(trimmed)) {
    return true
  }

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

function looksLikeChord(token: string) {
  const trimmed = token.trim()

  if (!trimmed) return false

  // reject obvious prose
  if (/\s{2,}/.test(trimmed)) return false
  if (/^(verse|chorus|bridge|intro|outro|pre-chorus|pre chorus|alt|turnaround|groove)$/i.test(trimmed)) {
    return false
  }

  // remove dash variants for slash-type movement like A7sus4–A7 later via split
  const chordPattern =
    /^[A-G](#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\([^)]*\))?(?:\/[A-G](#|b)?)?$/

  return chordPattern.test(trimmed)
}

function normalizeChordToken(token: string) {
  return token
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractChordTokens(input: string) {
  const normalized = input
    .replace(/[||]/g, '|')
    .replace(/[–—]/g, '-')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const roughParts = normalized
    .split('|')
    .flatMap((part) => part.split(','))
    .flatMap((part) => part.split(/\s+-\s+/))
    .map(normalizeChordToken)
    .filter(Boolean)

  const chordTokens: string[] = []

  for (const part of roughParts) {
    // split phrases into words if needed, then keep only valid chord-like chunks
    const subparts = part.split(/\s+/).map(normalizeChordToken).filter(Boolean)

    if (looksLikeChord(part)) {
      chordTokens.push(part)
      continue
    }

    for (const sub of subparts) {
      if (looksLikeChord(sub)) {
        chordTokens.push(sub)
      }
    }
  }

  return chordTokens
}

function getChordPool(chordData: any) {
  const combined = [
    chordData?.verse || '',
    chordData?.chorus || '',
    chordData?.bridge || '',
  ]
    .join(' ')
    .trim()

  if (!combined) return []

  return extractChordTokens(combined)
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