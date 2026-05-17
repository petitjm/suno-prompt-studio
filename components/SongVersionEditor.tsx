'use client'

import React from 'react'

import SongSheetEditor from './SongSheetEditor'
import SavedSongVersionSelector from './SavedSongVersionSelector'
import SongVersionSaveControls from './SongVersionSaveControls'

import type { Project, SongVersionRecord } from '@/types/song'

type SongVersionEditorProps = {
  performanceSheet: string
  setPerformanceSheet: (value: string) => void

  songVersions: SongVersionRecord[]
  activeSongVersionId: string | null
  setActiveSongVersionId: React.Dispatch<React.SetStateAction<string | null>>
  formatUkDateTime: (value: string) => string

  songVersionTitle: string
  setSongVersionTitle: (value: string) => void

  saveSong: () => void
  savingSong: boolean
  justSavedSong: boolean

  activeProject: Project | null
}

export default function SongVersionEditor({
  performanceSheet,
  setPerformanceSheet,

  songVersions,
  activeSongVersionId,
  setActiveSongVersionId,
  formatUkDateTime,

  songVersionTitle,
  setSongVersionTitle,

  saveSong,
  savingSong,
  justSavedSong,

  activeProject,
}: SongVersionEditorProps) {
    // Keep version-loading behaviour local to the song editor.
    // The parent owns state, but this component decides how selecting a saved song version updates the sheet.
    const handleActiveSongVersionChange = (id: string) => {
    setActiveSongVersionId(id)

  if (!id) {
    return
  }

  const selected = songVersions.find((v) => v.id === id)

  if (selected?.result?.lyrics_full) {
    setPerformanceSheet(selected.result.lyrics_full)
  }
}

  return (
    <>
      <SongSheetEditor
        performanceSheet={performanceSheet}
        setPerformanceSheet={setPerformanceSheet}
      />

     <SavedSongVersionSelector
      songVersions={songVersions}
      activeSongVersionId={activeSongVersionId}
      onActiveSongVersionChange={handleActiveSongVersionChange}
      formatUkDateTime={formatUkDateTime}
    />

      <SongVersionSaveControls
        songVersionTitle={songVersionTitle}
        setSongVersionTitle={setSongVersionTitle}
        saveSong={saveSong}
        savingSong={savingSong}
        justSavedSong={justSavedSong}
        activeProject={activeProject}
        performanceSheet={performanceSheet}
      />
    </>
  )
}