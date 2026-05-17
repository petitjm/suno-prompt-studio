'use client'

import React from 'react'

import SongVersionEditor from './SongVersionEditor'
import StructuredChordJsonEditor from './StructuredChordJsonEditor'

import type {
  Project,
  ChordResponse,
  SongVersionRecord,
  ChordVersion,
} from '@/types/song'

type EditorWorkspaceProps = {
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

  structuredChordJsonRef: React.RefObject<HTMLDivElement | null>

  chordVersionTitle: string
  setChordVersionTitle: (value: string) => void

  chordsText: string
  chordExtractionMessage: string
  setChordsText: (value: string) => void
  setChords: React.Dispatch<React.SetStateAction<ChordResponse | null>>

  chordVersions: ChordVersion[]
  activeChordVersionId: string | null
  setActiveChordVersionId: React.Dispatch<React.SetStateAction<string | null>>

  saveChords: () => void
  savingChords: boolean
  justSavedChords: boolean
}

export default function EditorWorkspace({
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

  structuredChordJsonRef,

  chordVersionTitle,
  setChordVersionTitle,

  chordsText,
  chordExtractionMessage,
  setChordsText,
  setChords,

  chordVersions,
  activeChordVersionId,
  setActiveChordVersionId,

  saveChords,
  savingChords,
  justSavedChords,
}: EditorWorkspaceProps) {
  return (
    <>
      {/* Song sheet, saved versions, and save controls */}
      <SongVersionEditor
        performanceSheet={performanceSheet}
        setPerformanceSheet={setPerformanceSheet}
        songVersions={songVersions}
        activeSongVersionId={activeSongVersionId}
        setActiveSongVersionId={setActiveSongVersionId}
        formatUkDateTime={formatUkDateTime}
        songVersionTitle={songVersionTitle}
        setSongVersionTitle={setSongVersionTitle}
        saveSong={saveSong}
        savingSong={savingSong}
        justSavedSong={justSavedSong}
        activeProject={activeProject}
      />

      {/* Structured Chord JSON editor and saved chord-version selector */}
      <StructuredChordJsonEditor
        structuredChordJsonRef={structuredChordJsonRef}
        chordVersionTitle={chordVersionTitle}
        setChordVersionTitle={setChordVersionTitle}
        chordsText={chordsText}
        chordExtractionMessage={chordExtractionMessage}
        setChordsText={setChordsText}
        setChords={setChords}
        chordVersions={chordVersions}
        activeChordVersionId={activeChordVersionId}
        setActiveChordVersionId={setActiveChordVersionId}
        formatUkDateTime={formatUkDateTime}
        saveChords={saveChords}
        savingChords={savingChords}
        justSavedChords={justSavedChords}
      />
    </>
  )
}