import type { ChordResponse, ChordVersion } from '@/types/song'

export function getChordVersionData(version?: ChordVersion | null) {
  return version?.chord_data as ChordResponse | undefined
}