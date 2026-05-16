'use client'

import type { SongVersionRecord } from '@/types/song'

type SavedSongVersionSelectorProps = {
  songVersions: SongVersionRecord[]
  activeSongVersionId: string | null
  onActiveSongVersionChange: (id: string) => void
  formatUkDateTime: (value: string) => string
}

export default function SavedSongVersionSelector({
  songVersions,
  activeSongVersionId,
  onActiveSongVersionChange,
  formatUkDateTime,
}: SavedSongVersionSelectorProps) {
  if (songVersions.length === 0) {
    return null
  }

  return (
    <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
      <h3 className="text-sm text-gray-400 mb-2">
        Saved Versions
      </h3>

      <select
        value={activeSongVersionId || ''}
        onChange={(e) => onActiveSongVersionChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-gray-700 text-white"
      >
        {songVersions.map((v, i) => (
          <option key={v.id} value={v.id}>
            {v.title || `Version ${songVersions.length - i}`}
            {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}