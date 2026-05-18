import type { SongVersionRecord } from '@/types/song'

export function getSongVersionLyrics(version?: SongVersionRecord | null) {
  return version?.result?.lyrics_full || ''
}

export function getInitialCompareSongIds(songVersions: SongVersionRecord[]) {
  if (songVersions.length >= 2) {
    return {
      leftId: songVersions[0].id,
      rightId: songVersions[1].id,
    }
  }

  return {
    leftId: '',
    rightId: '',
  }
}