'use client'

import type { Project } from '@/types/song'

type SongVersionSaveControlsProps = {
  songVersionTitle: string
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
  saveSong,
  savingSong,
  justSavedSong,
  activeProject,
  performanceSheet,
}: SongVersionSaveControlsProps) {
  return (
    <>
      <input
        value={songVersionTitle}
        onChange={(e) => setSongVersionTitle(e.target.value)}
        placeholder="Version title, e.g. Chorus rewrite, Short radio edit"
        className="mt-3 w-full max-w-3xl px-3 py-2 rounded bg-gray-700 text-white"
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