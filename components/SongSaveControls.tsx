'use client'

type SongSaveControlsProps = {
  songVersionTitle: string
  setSongVersionTitle: (value: string) => void
  saveSong: () => void
  savingSong: boolean
  justSavedSong: boolean
}

export default function SongSaveControls({
  songVersionTitle,
  setSongVersionTitle,
  saveSong,
  savingSong,
  justSavedSong,
}: SongSaveControlsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={songVersionTitle}
        onChange={(e) => setSongVersionTitle(e.target.value)}
        placeholder="Song version title..."
        className="w-full px-3 py-2 rounded bg-gray-700 text-white"
      />

      <button
        type="button"
        onClick={saveSong}
        disabled={savingSong}
        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white whitespace-nowrap"
      >
        {savingSong ? 'Saving...' : justSavedSong ? 'Saved' : 'Save Song'}
      </button>
    </div>
  )
}