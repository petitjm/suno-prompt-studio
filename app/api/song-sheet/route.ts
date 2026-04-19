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

function getSectionType(line: string): 'verse' | 'chorus' | 'bridge' | 'other' | null {
  const trimmed = line.trim()

  if (/^\[verse(\s*\d+)?\]$/i.test(trimmed)) return 'verse'
  if (/^\[chorus(\s*\d+)?\]$/i.test(trimmed)) return 'chorus'
  if (/^\[bridge(\s*\d+)?\]$/i.test(trimmed)) return 'bridge'

  if (
    /^\[(pre-chorus|pre chorus|intro|outro|hook|refrain|tag)(\s*\d+)?\]$/i.test(trimmed)
  ) {
    return 'other'
  }

  return null
}

function splitSections(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function normalizeChordToken(token: string) {
  return token.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

function looksLikeChord(token: string) {
  const trimmed = token.trim()
  if (!trimmed) return false

  if (/^(verse|chorus|bridge|intro|outro|pre-chorus|pre chorus|alt|turnaround|groove)$/i.test(trimmed)) {
    return false
  }

  const chordPattern =
    /^[A-G](#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\([^)]*\))?(?:\/[A-G](#|b)?)?$/

  return chordPattern.test(trimmed)
}

function extractChordTokens(input: string) {
  const normalized = input
    .replace(/\|\|/g, '|')
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
    if (looksLikeChord(part)) {
      chordTokens.push(part)
      continue
    }

    const subparts = part.split(/\s+/).map(normalizeChordToken).filter(Boolean)
    for (const sub of subparts) {
      if (looksLikeChord(sub)) {
        chordTokens.push(sub)
      }
    }
  }

  return chordTokens
}

function getChordPools(chordData: any) {
  return {
    verse: extractChordTokens(String(chordData?.verse || '')),
    chorus: extractChordTokens(String(chordData?.chorus || '')),
    bridge: extractChordTokens(String(chordData?.bridge || '')),
  }
}

function choosePool(
  sectionType: 'verse' | 'chorus' | 'bridge' | 'other' | null,
  pools: { verse: string[]; chorus: string[]; bridge: string[] }
) {
  if (sectionType === 'verse' && pools.verse.length) return pools.verse
  if (sectionType === 'chorus' && pools.chorus.length) return pools.chorus
  if (sectionType === 'bridge' && pools.bridge.length) return pools.bridge

  if (pools.verse.length) return pools.verse
  if (pools.chorus.length) return pools.chorus
  if (pools.bridge.length) return pools.bridge

  return []
}

function createSongSheet(lyrics: string, chordData: any) {
  const rawSections = splitSections(lyrics)
  const pools = getChordPools(chordData)

  if (!rawSections.length) return ''

  const out: string[] = []
  let fallbackIndex = 0

  for (const section of rawSections) {
    const rawLines = section
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (!rawLines.length) continue

    const lines = rawLines.filter((line) => !isMetadataLine(line))
    if (!lines.length) continue

    const sectionType = getSectionType(lines[0])
    let startIndex = 0

    if (sectionType) {
      out.push(lines[0])
      out.push('')
      startIndex = 1
    }

    const lyricLines = lines.slice(startIndex).filter(Boolean)
    if (!lyricLines.length) {
      out.push('')
      continue
    }

    const pool = choosePool(sectionType, pools)
    let sectionIndex = 0

    for (const line of lyricLines) {
      const words = line.split(/\s+/).filter(Boolean)

      if (words.length <= 2 || pool.length === 0) {
        out.push(line)
        out.push('')
        continue
      }

      const chordA = pool[(sectionIndex + fallbackIndex) % pool.length]
      const chordB = pool[(sectionIndex + fallbackIndex + 1) % pool.length]
      sectionIndex += 2

      const midpoint = Math.max(1, Math.floor(words.length / 2))
      const firstHalf = words.slice(0, midpoint).join(' ')
      const secondHalf = words.slice(midpoint).join(' ')

      const chordLine =
        chordA.padEnd(Math.max(firstHalf.length, chordA.length) + 2, ' ') + chordB

      out.push(chordLine)
      out.push(`${firstHalf} ${secondHalf}`.trim())
      out.push('')
    }

    fallbackIndex += 2
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