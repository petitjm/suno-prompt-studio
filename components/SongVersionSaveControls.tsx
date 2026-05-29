'use client'

import type { Project } from '@/types/song'

type SongVersionSaveControlsProps = {
  songVersionTitle: string
  setActiveSongVersionId: React.Dispatch<React.SetStateAction<string | null>>
  setSongVersionTitle: (value: string) => void
  saveSong: () => void
  savingSong: boolean
  justSavedSong: boolean
  activeProject: Project | null
  performanceSheet: string
}

export default function SongVersionSaveControls({
  songVersionTitle,
  setSongVersionTitle,
  setActiveSongVersionId,
  saveSong,
  savingSong,
  justSavedSong,
  activeProject,
  performanceSheet,
}: SongVersionSaveControlsProps) {
  return (
    <>
      {activeProject && (
        <div className="mt-3 max-w-3xl rounded border border-blue-700 bg-blue-900/30 px-3 py-2 text-xs text-blue-100">
          Tip: save a named version before major rewrites or compare-panel changes.
        </div>
      )}

      <input
        value={songVersionTitle}
        onChange={(e) => {
          setSongVersionTitle(e.target.value)
          setActiveSongVersionId(null)
        }}
        placeholder="Version title, e.g. Chorus rewrite, Short radio edit"
        className="mt-2 w-full max-w-3xl px-3 py-2 rounded bg-gray-700 text-white"
      />

      <div className="flex gap-2 mt-3 mb-4">
        <button
          type="button"
          onClick={saveSong}
          disabled={savingSong || !activeProject || !performanceSheet.trim()}
          className={`px-4 py-2 rounded text-white transition ${
            savingSong
              ? 'bg-gray-600 scale-95'
              : justSavedSong
                ? 'bg-blue-600'
                : 'bg-green-600'
          } disabled:opacity-40`}
        >
          {savingSong ? 'Saving song...' : justSavedSong ? 'Saved ✓' : 'Save Song'}
        </button>

        {!activeProject && (
          <span className="text-sm text-yellow-400 self-center">
            Select a project first
          </span>
        )}
      </div>
    </>
  )
}