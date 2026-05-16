'use client'

import React from 'react'

import type { Project, ChordResponse, SongVersionRecord } from '@/types/song'

type ChordVersion = {
  id: string
  title?: string | null
  created_at?: string | null
  chord_data?: unknown
}




type SongEditorPanelProps = {

  chordVersions: ChordVersion[]
  activeChordVersionId: string | null
  onActiveChordVersionChange: (id: string) => void
  formatUkDateTime: (value: string) => string
  structuredChordJsonRef: React.RefObject<HTMLDivElement | null>
  chordVersionTitle: string
  setChordVersionTitle: (value: string) => void
  chordsText: string
  chordExtractionMessage: string
  setChordsText: (value: string) => void
  setChords: React.Dispatch<React.SetStateAction<ChordResponse | null>>

  performanceSheet: string
  setPerformanceSheet: (value: string) => void

  songVersions: SongVersionRecord[]
  activeSongVersionId: string | null
  setActiveSongVersionId: React.Dispatch<React.SetStateAction<string | null>>

  songVersionTitle: string
  setSongVersionTitle: (value: string) => void
  saveChords: () => void
  savingChords: boolean
  justSavedChords: boolean




  activeProject: Project | null

  savingSong: boolean
  justSavedSong: boolean
  saveSong: () => void

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

export default function SongEditorPanel({






chordVersions,
activeChordVersionId,
onActiveChordVersionChange,
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
      <h1 className="text-xl mb-4">Write</h1>
      <p className="text-gray-400 mb-4">Lyrics, ideas, and structure go here.</p>

      <div
  ref={structuredChordJsonRef}
  className="mb-4 p-4 rounded bg-gray-800 max-w-3xl scroll-mt-6"
>
       <h2 className="text-lg font-semibold mb-1">Structured Chord JSON</h2>
        <p className="text-xs text-gray-400 mb-3">
          Optional: paste structured chord data here. Chords embedded in the song sheet are handled separately by Remove Chords.
        </p>

        {chordExtractionMessage && (
          <p className="text-xs text-green-300 mb-3">
            {chordExtractionMessage}
          </p>
        )}

  <div className="mt-3">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Load saved chord version
      </label>

      <select
        value={activeChordVersionId || ''}
        onChange={(e) => onActiveChordVersionChange(e.target.value)}
        disabled={chordVersions.length === 0}
        className="w-full px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {chordVersions.length === 0
            ? 'No saved chord versions yet'
            : 'Choose a saved chord version...'}
        </option>

        {chordVersions.map((v, i) => (
          <option key={v.id} value={v.id}>
            {v.title || `Chord Version ${chordVersions.length - i}`}
            {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
          </option>
        ))}
      </select>
    </div>

        <textarea
          value={chordsText}
          onChange={(e) => {
            const text = e.target.value
            setChordsText(text)

            try {
              const parsed = JSON.parse(text)

              if (
                parsed &&
                typeof parsed === 'object' &&
                !Array.isArray(parsed)
              ) {
                setChords(parsed)
              }
            } catch {
              // allow invalid JSON while typing
            }
          }}
          placeholder='Optional structured chord JSON, e.g. {"key":"G","verse":"G | D7 | G | C"}'
          className="w-full min-h-[220px] px-3 py-2 rounded bg-gray-700 text-white font-mono text-sm"
        />

        <div className="mt-3 max-w-3xl">
  <label className="block text-sm font-medium text-gray-300 mb-1">
    Save chord version as...
  </label>

  <input
    value={chordVersionTitle}
    onChange={(e) => setChordVersionTitle(e.target.value)}
    placeholder="Chord version title, e.g. Capo 3 - simplified chorus"
    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
  />
</div>


        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={saveChords}
            disabled={!activeProject || savingChords}
            className={`px-4 py-2 rounded text-white transition disabled:opacity-40 ${
              savingChords
                ? 'bg-gray-600 scale-95'
                : justSavedChords
                  ? 'bg-green-600'
                  : 'bg-yellow-600'
            }`}
          >
            {savingChords ? 'Saving chords...' : justSavedChords ? 'Saved ✓' : 'Save Chords'}
          </button>

          <span className="text-xs text-gray-400">
            Saves the Structured Chord JSON for this project.
          </span>
        </div>
        <div className="mt-3">
          <select
            value={activeChordVersionId || ''}
            onChange={(e) => onActiveChordVersionChange(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          >
            <option value="">Load saved chord version...</option>

            {chordVersions.map((v, i) => (
              <option key={v.id} value={v.id}>
                {v.title || `Chord Version ${chordVersions.length - i}`}
                {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
        <h2 className="text-lg font-semibold mb-1">Song Sheet / Lyrics</h2>
            <p className="text-xs text-gray-400 mb-3">
              Paste lyrics here. Chord lines above lyrics are allowed; use Remove Chords in the Rewrite Lab before rewriting.
            </p>

        <textarea
          value={performanceSheet}
          onChange={(e) => setPerformanceSheet(e.target.value)}
          placeholder="Paste lyrics here. Use headings like [Verse 1], [Chorus], [Bridge]."
          className="w-full min-h-[300px] px-3 py-2 rounded bg-gray-700 text-white font-mono text-sm"
        />



      </div>

      {songVersions.length > 0 && (
        <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
          <h3 className="text-sm text-gray-400 mb-2">Saved Versions</h3>

          <select
            value={activeSongVersionId || ''}
            onChange={(e) => {
              const id = e.target.value
              setActiveSongVersionId(id)

              const selected = songVersions.find((v) => v.id === id)
              if (selected?.result?.lyrics_full) {
                setPerformanceSheet(selected.result.lyrics_full)
              }
            }}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          >
            {songVersions.map((v, i) => (
              <option key={v.id} value={v.id}>
                {v.title || `Version ${songVersions.length - i}`}
                {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <input
        value={songVersionTitle}
        onChange={(e) => setSongVersionTitle(e.target.value)}
        placeholder="Version title, e.g. Chorus rewrite, Short radio edit"
        className="mt-3 w-full px-3 py-2 rounded bg-gray-700 text-white"
      />

      <div className="flex gap-2 mt-3">
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

      <button
        type="button"
        onClick={() => {
          setComparingNow(true)

          const latest = songVersions[0]

          if (latest?.result?.lyrics_full) {
            setCompareLeftSongId(latest.id)
            setCompareLeftText(latest.result.lyrics_full)
          }

          setCompareRightText(performanceSheet)

          setFlashLeftPanel(true)
          setFlashRightPanel(true)

          setTimeout(() => {
            setFlashLeftPanel(false)
            setFlashRightPanel(false)
            setComparingNow(false)
          }, 800)
        }}
        disabled={!performanceSheet.trim() || songVersions.length === 0}
        className={`mb-4 px-3 py-2 rounded text-white text-sm transition ${
          comparingNow ? 'bg-green-600 scale-95' : 'bg-blue-600'
        } disabled:opacity-40`}
      >
        {comparingNow ? 'Compared ✓' : 'Compare current vs last saved'}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Load saved version into left panel
          </label>

          <select
            value={compareLeftSongId}
            onChange={(e) => {
              const id = e.target.value
              setCompareLeftSongId(id)

              const selected = songVersions.find((v) => v.id === id)
              if (selected?.result?.lyrics_full) {
                setCompareLeftText(selected.result.lyrics_full)
              }
            }}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          >
            <option value="">Choose version for left</option>
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
              setLoadingLeftCurrent(true)

              setCompareLeftText(performanceSheet)

              setFlashLeftPanel(true)
              setTimeout(() => setFlashLeftPanel(false), 600)

              setTimeout(() => setLoadingLeftCurrent(false), 800)
            }}
            disabled={!performanceSheet.trim()}
            className={`mt-2 px-3 py-1 rounded text-white text-xs transition ${
              loadingLeftCurrent ? 'bg-green-600 scale-95' : 'bg-gray-600'
            } disabled:opacity-40`}
          >
            {loadingLeftCurrent ? 'Loaded ✓' : 'Load current → left'}
          </button>
        </div>

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
      </div>
    </>
  )
}