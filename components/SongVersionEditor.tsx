'use client'

import SongSheetEditor from './SongSheetEditor'
import SavedSongVersionSelector from './SavedSongVersionSelector'
import SongVersionSaveControls from './SongVersionSaveControls'

import type { Project, SongVersionRecord } from '@/types/song'

type SongVersionEditorProps = {
  performanceSheet: string
  setPerformanceSheet: (value: string) => void

  songVersions: SongVersionRecord[]
  activeSongVersionId: string | null
  onActiveSongVersionChange: (id: string) => void
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
  onActiveSongVersionChange,
  formatUkDateTime,

  songVersionTitle,
  setSongVersionTitle,

  saveSong,
  savingSong,
  justSavedSong,

  activeProject,
}: SongVersionEditorProps) {
  return (
    <>
      <SongSheetEditor
        performanceSheet={performanceSheet}
        setPerformanceSheet={setPerformanceSheet}
      />

      <SavedSongVersionSelector
        songVersions={songVersions}
        activeSongVersionId={activeSongVersionId}
        onActiveSongVersionChange={onActiveSongVersionChange}
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