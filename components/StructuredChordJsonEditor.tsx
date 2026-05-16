'use client'

import React from 'react'

import SavedChordVersionSelector from './SavedChordVersionSelector'

import type { ChordVersion } from '@/types/song'

type StructuredChordJsonEditorProps = {
  structuredChordJsonRef: React.RefObject<HTMLDivElement | null>

  chordVersionTitle: string
  setChordVersionTitle: (value: string) => void

  chordsText: string
  chordExtractionMessage: string
  setChordsText: (value: string) => void

  chordVersions: ChordVersion[]
  activeChordVersionId: string | null
  onActiveChordVersionChange: (id: string) => void
  formatUkDateTime: (value: string) => string

  saveChords: () => void
  savingChords: boolean
  justSavedChords: boolean
}

export default function StructuredChordJsonEditor({
  structuredChordJsonRef,

  chordVersionTitle,
  setChordVersionTitle,

  chordsText,
  chordExtractionMessage,
  setChordsText,

  chordVersions,
  activeChordVersionId,
  onActiveChordVersionChange,
  formatUkDateTime,

  saveChords,
  savingChords,
  justSavedChords,
}: StructuredChordJsonEditorProps) {
  return (
    <div ref={structuredChordJsonRef} className="mt-4">
      <h3 className="text-lg font-semibold mb-2">
        Structured Chord JSON
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={chordVersionTitle}
          onChange={(e) => setChordVersionTitle(e.target.value)}
          placeholder="Chord version title, e.g. Capo 3 - simplified chorus"
          className="w-full px-3 py-2 rounded bg-gray-700 text-white"
        />

        <button
          type="button"
          onClick={saveChords}
          disabled={savingChords}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white whitespace-nowrap"
        >
          {savingChords ? 'Saving...' : justSavedChords ? 'Saved' : 'Save Chords'}
        </button>
      </div>

      <SavedChordVersionSelector
        chordVersions={chordVersions}
        activeChordVersionId={activeChordVersionId}
        onActiveChordVersionChange={onActiveChordVersionChange}
        formatUkDateTime={formatUkDateTime}
      />

      <textarea
        value={chordsText}
        onChange={(e) => setChordsText(e.target.value)}
        placeholder="Structured Chord JSON will appear here..."
        className="mt-3 w-full min-h-[220px] px-3 py-2 rounded bg-gray-900 text-gray-100 font-mono text-sm border border-gray-700"
      />

      {chordExtractionMessage && (
        <p className="mt-2 text-sm text-gray-300">
          {chordExtractionMessage}
        </p>
      )}
    </div>
  )
}