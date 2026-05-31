'use client'

import React from 'react'

import SongSheetEditor from './SongSheetEditor'
import SavedSongVersionSelector from './SavedSongVersionSelector'
import SongVersionSaveControls from './SongVersionSaveControls'

import type { Project, SongVersionRecord } from '@/types/song'

import { getSongVersionLyrics } from '@/lib/songVersions'

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
      if (!id) {
        setActiveSongVersionId(null)
        const fallbackTitle = `Untitled song version ${songVersions.length - songVersions.findIndex((v) => v.id === id)}`

            setSongVersionTitle(selected?.title || fallbackTitle)
        return
      }

      const selected = songVersions.find((v) => v.id === id)
      const lyrics = getSongVersionLyrics(selected)

      if (!lyrics) {
        setActiveSongVersionId(id)
        return
      }

      const hasUnsavedLyrics =
        activeSongVersionId === null &&
        performanceSheet.trim().length > 0

      if (hasUnsavedLyrics) {
        const confirmed = window.confirm(
          'Load this saved song version? This will replace the current song sheet text.'
        )

        if (!confirmed) {
          return
        }
      }

        setActiveSongVersionId(id)
        setPerformanceSheet(lyrics)
        setSongVersionTitle(selected?.title ?? '')
    }


const handlePerformanceSheetChange = (value: string) => {
  setPerformanceSheet(value)

  if (value !== performanceSheet) {
    setActiveSongVersionId(null)
  }

  if (!value.trim()) {
    setSongVersionTitle('')
  }
}

  return (
    <>
      <SongSheetEditor
          performanceSheet={performanceSheet}
          setPerformanceSheet={handlePerformanceSheetChange}
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
      setActiveSongVersionId={setActiveSongVersionId}
      saveSong={saveSong}
      savingSong={savingSong}
      justSavedSong={justSavedSong}
      activeProject={activeProject}
      performanceSheet={performanceSheet}
    />
    </>
  )
}