'use client'

import React from 'react'

import EditorWorkspace from './EditorWorkspace'
import CompareVersionControls from './CompareVersionControls'
import WritePanelHeader from './WritePanelHeader'

import type {
  Project,
  ChordResponse,
  SongVersionRecord,
  ChordVersion,
} from '@/types/song'


// SongEditorPanel is now a wiring component.
// Main editor UI is grouped in EditorWorkspace:
// - SongVersionEditor handles lyrics, saved song versions, and song saving.
// - StructuredChordJsonEditor handles structured chord JSON, saved chord versions, and chord saving.

type SongEditorWorkspaceSongProps = {
  performanceSheet: string
  setPerformanceSheet: (value: string) => void

  songVersions: SongVersionRecord[]
  activeSongVersionId: string | null
  setActiveSongVersionId: React.Dispatch<React.SetStateAction<string | null>>

  songVersionTitle: string
  setSongVersionTitle: (value: string) => void

  activeProject: Project | null

  savingSong: boolean
  justSavedSong: boolean
  saveSong: () => void
}

type SongEditorWorkspaceChordProps = {
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

type SongEditorCompareProps = {
  comparingNow: boolean
  setComparingNow: (value: boolean) => void

  compareLeftSongId: string
  setCompareLeftSongId: (value: string) => void
  compareRightSongId: string
  setCompareRightSongId: (value: string) => void

  setCompareLeftText: (value: string) => void
  setCompareRightText: (value: string) => void

  setFlashLeftPanel: (value: boolean) => void
  setFlashRightPanel: (value: boolean) => void

  loadingLeftCurrent: boolean
  setLoadingLeftCurrent: (value: boolean) => void
  loadingRightCurrent: boolean
  setLoadingRightCurrent: (value: boolean) => void
}

type SongEditorSharedProps = {
  formatUkDateTime: (value: string) => string
}

type SongEditorPanelProps =
  SongEditorWorkspaceSongProps &
  SongEditorWorkspaceChordProps &
  SongEditorCompareProps &
  SongEditorSharedProps

export default function SongEditorPanel({
chordVersions,
activeChordVersionId,
setActiveChordVersionId,
formatUkDateTime,
  structuredChordJsonRef,
  saveChords,
  savingChords,
  justSavedChords,
  chordsText,
  chordVersionTitle,
  setChordVersionTitle,
  chordExtractionMessage,
  setChordsText,
  setChords,
  performanceSheet,
  setPerformanceSheet,
  songVersions,
  activeSongVersionId,
  setActiveSongVersionId,
  songVersionTitle,
  setSongVersionTitle,
  activeProject,
  savingSong,
  justSavedSong,
  saveSong,
  comparingNow,
  setComparingNow,
  compareLeftSongId,
  setCompareLeftSongId,
  compareRightSongId,
  setCompareRightSongId,
  setCompareLeftText,
  setCompareRightText,
  setFlashLeftPanel,
  setFlashRightPanel,
  loadingLeftCurrent,
  setLoadingLeftCurrent,
  loadingRightCurrent,
  setLoadingRightCurrent,
}: SongEditorPanelProps) {
    
  return (
    <>
<WritePanelHeader />
<EditorWorkspace
  songEditor={{
    performanceSheet,
    setPerformanceSheet,
    songVersions,
    activeSongVersionId,
    setActiveSongVersionId,
    songVersionTitle,
    setSongVersionTitle,
    saveSong,
    savingSong,
    justSavedSong,
    activeProject,
  }}
  chordEditor={{
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
  }}
  shared={{
      formatUkDateTime,
    }}
/>

      <CompareVersionControls
  // Compare source data
  performanceSheet={performanceSheet}
  songVersions={songVersions}
  formatUkDateTime={formatUkDateTime}

  // Compare action state
  comparingNow={comparingNow}
  setComparingNow={setComparingNow}
  loadingLeftCurrent={loadingLeftCurrent}
  setLoadingLeftCurrent={setLoadingLeftCurrent}
  loadingRightCurrent={loadingRightCurrent}
  setLoadingRightCurrent={setLoadingRightCurrent}

  // Compare panel selection
  compareLeftSongId={compareLeftSongId}
  setCompareLeftSongId={setCompareLeftSongId}
  compareRightSongId={compareRightSongId}
  setCompareRightSongId={setCompareRightSongId}
  setCompareLeftText={setCompareLeftText}
  setCompareRightText={setCompareRightText}
  setFlashLeftPanel={setFlashLeftPanel}
  setFlashRightPanel={setFlashRightPanel}
/>

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Load saved version into right panel
          </label>

          <select
            value={compareRightSongId}
            onChange={(e) => {
              const id = e.target.value
              setCompareRightSongId(id)

              const selected = songVersions.find((v) => v.id === id)
              if (selected?.result?.lyrics_full) {
                setCompareRightText(selected.result.lyrics_full)
              }
            }}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          >
            <option value="">Choose version for right</option>
            {songVersions.map((v, i) => (
              <option key={v.id} value={v.id}>
                {v.title || `Version ${songVersions.length - i}`}
                {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setLoadingRightCurrent(true)

              setCompareRightText(performanceSheet)

              setFlashRightPanel(true)
              setTimeout(() => setFlashRightPanel(false), 600)

              setTimeout(() => setLoadingRightCurrent(false), 800)
            }}
            disabled={!performanceSheet.trim()}
            className={`mt-2 px-3 py-1 rounded text-white text-xs transition ${
              loadingRightCurrent ? 'bg-green-600 scale-95' : 'bg-gray-600'
            } disabled:opacity-40`}
          >
            {loadingRightCurrent ? 'Loaded ✓' : 'Load current → right'}
          </button>
        </div>
      
    </>
  )
}