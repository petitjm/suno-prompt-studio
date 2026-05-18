import type { SongVersionRecord } from '@/types/song'

export function getSongVersionLyrics(version?: SongVersionRecord | null) {
  return version?.result?.lyrics_full || ''
}