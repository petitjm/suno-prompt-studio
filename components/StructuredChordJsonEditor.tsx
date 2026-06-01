'use client'

import React from 'react'

import SavedChordVersionSelector from './SavedChordVersionSelector'

import type { ChordResponse, ChordVersion } from '@/types/song'

import { getChordVersionData } from '@/lib/chordVersions'

type StructuredChordJsonEditorProps = {
  structuredChordJsonRef: React.RefObject<HTMLDivElement | null>

  chordVersionTitle: string
  setChordVersionTitle: (value: string) => void

  chordsText: string
  chordExtractionMessage: string
  setChordExtractionMessage: (value: string) => void
  setChordsText: (value: string) => void

  chordVersions: ChordVersion[]
  activeChordVersionId: string | null
  setActiveChordVersionId: React.Dispatch<React.SetStateAction<string | null>>
  setChords: React.Dispatch<React.SetStateAction<ChordResponse | null>>
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
  setChordExtractionMessage,
  setChordsText,

  chordVersions,
  activeChordVersionId,
  setActiveChordVersionId,
  setChords,
  formatUkDateTime,

  saveChords,
  savingChords,
  justSavedChords,
}: StructuredChordJsonEditorProps) {
    // Keep version-loading behaviour local to the chord JSON editor.
// The parent owns state, but this component decides how selecting a saved chord version updates JSON and title.
    const handleActiveChordVersionChange = (id: string) => {
  setActiveChordVersionId(id)

  if (!id) {
      setActiveChordVersionId(null)
      setChordVersionTitle('')
      setChordExtractionMessage('')
      return
    }

  const selected = chordVersions.find((v) => v.id === id)
    const chordData = getChordVersionData(selected)

    if (chordData) {
      if (chordsText.trim()) {
        const confirmed = window.confirm(
          'Load this saved chord version? This will replace the current chord JSON in the editor.'
        )

        if (!confirmed) {
          setActiveChordVersionId(activeChordVersionId)
          return
        }
      }

      setChords(chordData)
      setChordsText(JSON.stringify(chordData, null, 2))
      setChordVersionTitle(selected?.title || '')
      setChordExtractionMessage('')
    }
}

const chordJsonIsValidObject = React.useMemo(() => {
  if (!chordsText.trim()) {
    return false
  }

  try {
    const parsed = JSON.parse(chordsText)

    return (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    )
  } catch {
    return false
  }
}, [chordsText])

  return (
    <div ref={structuredChordJsonRef} className="mt-4">
      <h3 className="text-lg font-semibold mb-2">
        Structured Chord JSON
      </h3>

      <div className="mb-3 rounded border border-blue-700 bg-blue-900/30 px-3 py-2 text-xs text-blue-100">
  Tip: save a named chord version before changing extracted chords or trying a new arrangement.
</div>

<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
  <input
    value={chordVersionTitle}
    onChange={(e) => {
      setChordVersionTitle(e.target.value)
      setChordExtractionMessage('')
      setActiveChordVersionId(null)
    }}
    placeholder="Chord version title, e.g. Capo 3 - simplified chorus"
    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
  />

  <button
    type="button"
    onClick={() => {
      setActiveChordVersionId(null)
      setChordExtractionMessage('')
      saveChords()
    }}
    disabled={savingChords || !chordJsonIsValidObject}
    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white whitespace-nowrap"
  >
    {savingChords
      ? 'Saving...'
      : justSavedChords
        ? 'Saved ✓'
        : !chordJsonIsValidObject
          ? 'Enter valid chord JSON'
          : 'Save Chords'}
  </button>

  <button
  type="button"
  onClick={() => {
     const confirmed = window.confirm(
        'Clear the chord editor? This will remove the current chord JSON and chord version title.'
      )

      if (!confirmed) {
        return
      }

      setChordsText('')
      setChordVersionTitle('')
      setChordExtractionMessage('')
      setActiveChordVersionId(null)
    }}
  disabled={savingChords || !chordsText.trim()}
  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white whitespace-nowrap"
>
  Clear chord editor
</button>

</div>

{chordsText.trim() && !chordJsonIsValidObject && (
  <p className="mt-2 text-xs text-yellow-300">
    Enter a valid JSON object before saving, for example: {'{ "verse": "G | D | Em | C" }'}
  </p>
)}

<div className="mt-3 text-xs text-gray-400">
  Saved chord versions: {chordVersions.length}
</div>
     <SavedChordVersionSelector
      chordVersions={chordVersions}
      activeChordVersionId={activeChordVersionId}
      onActiveChordVersionChange={handleActiveChordVersionChange}
      formatUkDateTime={formatUkDateTime}
    />

      <textarea
        value={chordsText}
        onChange={(e) => {
          setChordsText(e.target.value)
          setChordExtractionMessage('')
          setActiveChordVersionId(null)
        }}
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