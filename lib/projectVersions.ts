import type {
  ChordResponse,
  ChordVersionRecord,
  SongVersionRecord,
} from '@/types/song'

import { getChordVersionData } from '@/lib/chordVersions'
import {
  getInitialCompareSongIds,
  getSongVersionLyrics,
} from '@/lib/songVersions'

type ReadJsonSafe = (response: Response) => Promise<any>

type LoadProjectVersionsResult = {
  songData: any
  chordData: any
}

export async function loadProjectVersions(
  projectId: string,
  readJsonSafe: ReadJsonSafe
): Promise<LoadProjectVersionsResult> {
  const [songRes, chordRes] = await Promise.all([
    fetch(`/api/song-versions/${projectId}`),
    fetch(`/api/chord-versions/${projectId}`),
  ])

  const songData = await readJsonSafe(songRes)
  const chordData = await readJsonSafe(chordRes)

  if (!songRes.ok) {
    throw new Error(songData.error || 'Failed to load song versions')
  }

  if (!chordRes.ok) {
    throw new Error(chordData.error || 'Failed to load chord versions')
  }

  return {
    songData,
    chordData,
  }
}

type NormalisedProjectVersionData = {
  songVersions: SongVersionRecord[]
  chordVersions: ChordVersionRecord[]
  activeSongVersionId: string | null
  activeChordVersionId: string | null
  latestLyrics: string
  latestChordVersion: ChordVersionRecord | null
  latestChords: ChordResponse | null
  initialCompareSongIds: {
    leftId: string
    rightId: string
  }
}

export function normaliseProjectVersionData(
  songData: any,
  chordData: any
): NormalisedProjectVersionData {
  const songVersions: SongVersionRecord[] = Array.isArray(songData.versions)
    ? songData.versions
    : []

  const chordVersions: ChordVersionRecord[] = Array.isArray(chordData.versions)
  ? chordData.versions
  : []

  const latestChordVersion = chordData.latest || null
  const latestChords = getChordVersionData(latestChordVersion) || null

  return {
    songVersions,
    chordVersions,
    activeSongVersionId: songData.latest?.id || null,
    activeChordVersionId: chordData.latest?.id || null,
    latestLyrics: getSongVersionLyrics(songData.latest),
    latestChordVersion,
    latestChords,
    initialCompareSongIds: getInitialCompareSongIds(songVersions),
  }
}