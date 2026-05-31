'use client'

import type { SongVersionRecord } from '@/types/song'

// Selector-only props. Version loading logic lives in SongVersionEditor.
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

  const getSongVersionDisplayTitle = (
  version: { title?: string | null },
  index: number
) => {
  const title = version.title || `Version ${songVersions.length - index}`

  if (title.startsWith('Auto:')) {
    return title.replace(/^Auto:\s*/, 'Auto backup: ')
  }

  return title
}

  return (
    <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
      <h3 className="text-sm text-gray-400 mb-2">
        Saved Song Versions ({songVersions.length})
      </h3>

      <select
          value={activeSongVersionId || ''}
          onChange={(e) => onActiveSongVersionChange(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-700 text-white"
        >
          <option value="">Choose a saved song version...</option>
          {songVersions.map((v, i) => (
          <option key={v.id} value={v.id}>
            {getSongVersionDisplayTitle(v, i)}
            {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}