// /lib/parseSong.ts

import { ChordResponse, PerformanceSection, PreviewBar, PreviewSectionKey } from '@/types/song'

const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

const SHARP_TO_FLAT_DISPLAY: Record<string, string> = {
  'A#': 'Bb',
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
}

export function normalizeRoot(root: string) {
  return FLAT_TO_SHARP[root] || root
}

export function displayRoot(root: string) {
  return SHARP_TO_FLAT_DISPLAY[root] || root
}

export function transposeRoot(root: string, semitones: number) {
  const normalized = normalizeRoot(root)
  const index = CHROMATIC_SHARPS.indexOf(normalized)
  if (index === -1) return root
  const next = (index + semitones + 1200) % 12
  return displayRoot(CHROMATIC_SHARPS[next])
}

export function transposeTextPreservingLayout(text: string, semitones: number) {
  if (!text.trim() || semitones === 0) return text

  return text
    .split('\n')
    .map((line) => {
      if (!line.trim()) return line
      return line.replace(
        /\b([A-G](?:#|b)?)([^/\s|]*)?(?:\/([A-G](?:#|b)?))?/g,
        (_match, root, quality = '', bass) => {
          const nextRoot = transposeRoot(root, semitones)
          if (bass) {
            const nextBass = transposeRoot(bass, semitones)
            return `${nextRoot}${quality}/${nextBass}`
          }
          return `${nextRoot}${quality}`
        }
      )
    })
    .join('\n')
}

export function removeChordLinesFromSheet(sheet: string) {
  const chordLikeLine =
    /^(\s*[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?[\s-]*)+$/

  return sheet
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true
      if (/^\[.*\]$/.test(trimmed)) return true
      return !chordLikeLine.test(trimmed)
    })
    .join('\n')
}

export function parsePerformanceSections(sheet: string): PerformanceSection[] {
  const lines = sheet.split('\n')
  const sections: PerformanceSection[] = []

  let currentLabel = 'Song'
  let currentContent: string[] = []

  const pushSection = () => {
    const content = currentContent.join('\n').trim()
    if (!content) return

    sections.push({
      id: `section-${sections.length}`,
      label: currentLabel,
      content,
    })
  }

  const normalizePlainHeaderLabel = (value: string) => {
    return value
      .trim()
      .replace(/:$/, '')
      .replace(/\s+/g, ' ')
  }

  const isPlainSectionHeader = (value: string) => {
    return /^(intro|verse(?:\s+\d+)?|pre-chorus|chorus(?:\s+\d+)?|bridge|middle 8|outro|refrain|hook)(:)?$/i.test(
      value.trim()
    )
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const bracketMatch = trimmed.match(/^\[(.+?)\]$/)

    if (bracketMatch) {
      pushSection()
      currentLabel = bracketMatch[1].trim()
      currentContent = [line]
      continue
    }

    if (isPlainSectionHeader(trimmed)) {
      pushSection()
      currentLabel = normalizePlainHeaderLabel(trimmed)
      currentContent = [line]
      continue
    }

    currentContent.push(line)
  }

  pushSection()

  if (sections.length === 0 && sheet.trim()) {
    return [
      {
        id: 'section-0',
        label: 'Song',
        content: sheet.trim(),
      },
    ]
  }

  return sections
}

export function parseChordSequence(input?: string) {
  if (!input) return []

  return input
    .replace(/[–—]/g, '-')
    .replace(/\n/g, ' ')
    .split('|')
    .flatMap((chunk) => chunk.split(/\s{2,}/))
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => part.split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => /^[A-G](?:#|b)?/.test(token))
}

export function buildPreviewBars(chords: ChordResponse | null, section: PreviewSectionKey): PreviewBar[] {
  if (!chords) return []

  const verse = parseChordSequence(chords.verse).map((chord) => ({ label: 'Verse', chord }))
  const chorus = parseChordSequence(chords.chorus).map((chord) => ({ label: 'Chorus', chord }))
  const bridge = parseChordSequence(chords.bridge).map((chord) => ({ label: 'Bridge', chord }))

  if (section === 'verse') return verse
  if (section === 'chorus') return chorus
  if (section === 'bridge') return bridge

  return [...verse, ...chorus, ...bridge]
}

export function findMatchingSectionId(label: string, sections: PerformanceSection[]) {
  const normalizedLabel = label.trim().toLowerCase()
  if (!normalizedLabel) return null

  const exact = sections.find((section) => section.label.trim().toLowerCase() === normalizedLabel)
  if (exact) return exact.id

  const partial = sections.find((section) => section.label.trim().toLowerCase().includes(normalizedLabel))
  if (partial) return partial.id

  return null
}
export type OrderedSongSectionType =
  | 'verse'
  | 'pre_chorus'
  | 'chorus'
  | 'bridge'
  | 'breakdown'
  | 'final_chorus'
  | 'outro'
  | 'other'

export type OrderedSongSection = {
  id: string
  label: string
  type: OrderedSongSectionType
  content: string
}

function normalizeSectionLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

export function classifyOrderedSongSection(label: string): OrderedSongSectionType {
  const normalized = normalizeSectionLabel(label)

  if (normalized.includes('pre chorus')) return 'pre_chorus'
  if (normalized.includes('final chorus')) return 'final_chorus'
  if (normalized.includes('chorus')) return 'chorus'
  if (normalized.includes('verse')) return 'verse'
  if (normalized.includes('bridge')) return 'bridge'
  if (normalized.includes('breakdown')) return 'breakdown'
  if (normalized.includes('outro')) return 'outro'

  return 'other'
}

export function parseOrderedSongSections(sheet: string): OrderedSongSection[] {
  const baseSections = parsePerformanceSections(sheet)

  return baseSections.map((section) => ({
    id: section.id,
    label: section.label,
    content: section.content,
    type: classifyOrderedSongSection(section.label),
  }))
}

export function buildOrderedPreviewBarsFromSections(
  sections: OrderedSongSection[],
  chords: ChordResponse | null
): PreviewBar[] {
  if (!sections.length || !chords) return []

  const verseBars = parseChordSequence(chords.verse).map((chord) => ({ label: 'Verse', chord }))
  const chorusBars = parseChordSequence(chords.chorus).map((chord) => ({ label: 'Chorus', chord }))
  const bridgeBars = parseChordSequence(chords.bridge).map((chord) => ({ label: 'Bridge', chord }))

  return sections.flatMap((section) => {
    if (section.type === 'verse') {
      return verseBars.map((bar) => ({ label: section.label, chord: bar.chord }))
    }

    if (section.type === 'pre_chorus') {
      if (verseBars.length >= 4) {
        return verseBars.slice(Math.max(0, verseBars.length - 4)).map((bar) => ({
          label: section.label,
          chord: bar.chord,
        }))
      }
      return verseBars.map((bar) => ({ label: section.label, chord: bar.chord }))
    }

    if (section.type === 'chorus' || section.type === 'final_chorus') {
      return chorusBars.map((bar) => ({ label: section.label, chord: bar.chord }))
    }

    if (section.type === 'bridge') {
      return bridgeBars.map((bar) => ({ label: section.label, chord: bar.chord }))
    }

    if (section.type === 'breakdown') {
      if (chorusBars.length >= 4) {
        return chorusBars.slice(0, 4).map((bar) => ({ label: section.label, chord: bar.chord }))
      }
      if (verseBars.length >= 4) {
        return verseBars.slice(0, 4).map((bar) => ({ label: section.label, chord: bar.chord }))
      }
      return chorusBars.map((bar) => ({ label: section.label, chord: bar.chord }))
    }

    if (section.type === 'outro') {
      if (chorusBars.length >= 4) {
        return chorusBars.slice(Math.max(0, chorusBars.length - 4)).map((bar) => ({
          label: section.label,
          chord: bar.chord,
        }))
      }
      if (verseBars.length >= 4) {
        return verseBars.slice(Math.max(0, verseBars.length - 4)).map((bar) => ({
          label: section.label,
          chord: bar.chord,
        }))
      }
      return chorusBars.map((bar) => ({ label: section.label, chord: bar.chord }))
    }

    return verseBars.map((bar) => ({ label: section.label, chord: bar.chord }))
  })
}