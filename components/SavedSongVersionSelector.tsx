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
  

  const getSongVersionDisplayTitle = (
  version: { title?: string | null },
  index: number
) => {
  const title = version.title || `Untitled song version ${songVersions.length - index}`

  if (title.startsWith('Auto:')) {
    return title.replace(/^Auto:\s*/, 'Auto backup: ')
  }

  return title
}

  return (
    <div
      className={`mb-4 p-4 rounded bg-gray-800 max-w-3xl ${
        songVersions.length === 0 ? 'opacity-75' : ''
      }`}
    >
      <h3 className="text-sm text-gray-400 mb-2">
        Saved Song Versions ({songVersions.length})
      </h3>

      <select
          value={activeSongVersionId || ''}
          onChange={(e) => onActiveSongVersionChange(e.target.value)}
          disabled={songVersions.length === 0}
          className="w-full px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {songVersions.length === 0
              ? 'No saved song versions yet'
              : 'Choose a saved song version...'}
          </option>
          {songVersions.map((v, i) => (
          <option key={v.id} value={v.id}>
            {getSongVersionDisplayTitle(v, i)}
            {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
          </option>
        ))}
      </select>
      {songVersions.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">
            Save the Song Sheet to create a reusable song version.
          </p>
        )}
    </div>
  )
}