import { SongSection } from './parseSong'

export type PreviewBar = {
  index: number
  sectionId: string
  sectionType: SongSection['type']
}

const DEFAULT_BARS: Record<SongSection['type'], number> = {
  verse: 8,
  pre_chorus: 4,
  chorus: 8,
  bridge: 8,
  breakdown: 4,
  outro: 4,
  other: 4,
}

export function buildPreviewBarsFromSections(
  sections: SongSection[]
): PreviewBar[] {
  const bars: PreviewBar[] = []
  let barIndex = 0

  for (const section of sections) {
    const barCount = DEFAULT_BARS[section.type] || 4

    for (let i = 0; i < barCount; i++) {
      bars.push({
        index: barIndex,
        sectionId: section.id,
        sectionType: section.type,
      })

      barIndex++
    }
  }

  return bars
}