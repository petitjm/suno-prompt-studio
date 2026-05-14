'use client'

import React from 'react'
import type { DetectedSection } from '@/lib/songSections'

type RewriteTarget = 'left' | 'right' | 'main'

type RewritePanelProps = {
  activeProjectTitle?: string
  rewriteTarget: RewriteTarget
  setRewriteTarget: (value: RewriteTarget) => void
  rewritePreset: string
  setRewritePreset: (value: string) => void
  rewritePresets: string[]
  rewriteInstruction: string
  setRewriteInstruction: (value: string) => void
  rewriteConstraint: string
  setRewriteConstraint: (value: string) => void
  commercialPolishMode: boolean
  setCommercialPolishMode: (value: boolean) => void
  rewriteSectionOnly: boolean
  setRewriteSectionOnly: (value: boolean) => void
  rewriteSectionName: string
  setRewriteSectionName: (value: string) => void
  detectedSections: DetectedSection[]
  hasChordLinesInRewriteSource: boolean
  justExtractedChords: boolean
  extractingLyricsOnly: boolean
  removeChordsFromRewriteSource: () => void
  extractChordsFromRewriteSourceToJson: () => void
  extractChordsAndRemoveFromRewriteSource: () => void
  setRewriteMessage: (value: string) => void
  runRewriteLab: () => void
  rewriteLoading: boolean
  rewriteDone: boolean
  rewriteMessage: string
}

export default function RewritePanel({
  activeProjectTitle,
  rewriteTarget,
  setRewriteTarget,
  rewritePreset,
  setRewritePreset,
  rewritePresets,
  rewriteInstruction,
  setRewriteInstruction,
  rewriteConstraint,
  setRewriteConstraint,
  commercialPolishMode,
  setCommercialPolishMode,
  rewriteSectionOnly,
  setRewriteSectionOnly,
  rewriteSectionName,
  setRewriteSectionName,
  detectedSections,
  hasChordLinesInRewriteSource,
  justExtractedChords,
  extractingLyricsOnly,
  extractChordsFromRewriteSourceToJson,
  extractChordsAndRemoveFromRewriteSource,
  removeChordsFromRewriteSource,
  setRewriteMessage,
  runRewriteLab,
  rewriteLoading,
  rewriteDone,
  rewriteMessage,
}: RewritePanelProps) {
  return (
    <div>
       <div className="flex items-center justify-between mb-1 leading-tight">
  <h3 className="text-lg font-semibold">Rewrite Lab</h3>

  <div className="text-xs text-gray-400 flex gap-4">
    <span>
      <strong>Project:</strong> {activeProjectTitle || 'None'}
    </span>

    <span>
      <strong>Source:</strong>{' '}
      {rewriteTarget === 'left'
        ? 'Left'
        : rewriteTarget === 'right'
          ? 'Right'
          : 'Main'}
    </span>

    {rewriteInstruction.toLowerCase().includes('hook') && (
  <div className="text-xs text-yellow-300 mt-1">
    Hook strengthening works best on a selected chorus section.
  </div>
)}

    {rewriteSectionOnly && (
      <span>
       <strong>Section:</strong> {rewriteSectionName || '—'}
      </span>
    )}
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
  <select
    value={rewritePreset}
    onChange={(e) => {
      setRewritePreset(e.target.value)
      setRewriteInstruction(e.target.value)
    }}
    className="px-3 py-2 rounded bg-gray-700 text-white"
  >
    <option value="">Choose preset</option>
    {rewritePresets.map((p) => (
      <option key={p} value={p}>
        {p}
      </option>
    ))}
  </select>

  <select
  title="Choose which panel or editor to rewrite"
  value={rewriteTarget}
  onChange={(e) =>
    setRewriteTarget(e.target.value as 'left' | 'right' | 'main')
  }
  className="px-3 py-2 rounded bg-gray-700 text-white"
>
  <option value="left">Rewrite left panel</option>
  <option value="right">Rewrite right panel</option>
  <option value="main">Rewrite main song</option>
</select>

  <input
    value={rewriteInstruction}
    onChange={(e) => setRewriteInstruction(e.target.value)}
    placeholder="Or type custom instruction..."
    className="md:col-span-2 px-3 py-2 rounded bg-gray-700 text-white"
  />


    <select
    value={rewriteConstraint}
    onChange={(e) => setRewriteConstraint(e.target.value)}
    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
  >
    <option value="default">Default</option>
   <option value="keep-lines" disabled={commercialPolishMode}>
  Keep structure {commercialPolishMode ? '(disabled in polish mode)' : ''}
</option>
    <option value="shorten">Shorten content</option>
    <option value="extend">Extend content</option>
    <option value="conversational">More conversational</option>
    <option value="poetic">More poetic</option>
    <option value="stronger">Stronger impact</option>
    <option value="simplify">Simplify lyrics</option>
  </select>


</div>
    <div className="flex flex-col md:flex-row gap-2 mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={commercialPolishMode}
            onChange={(e) => setCommercialPolishMode(e.target.checked)}
          />
          Commercial polish mode
        </label>
        
      
        <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={rewriteSectionOnly}
          disabled={detectedSections.length === 0}
          onChange={(e) => setRewriteSectionOnly(e.target.checked)}
        />
        Rewrite section only
      </label>

         <select
          value={rewriteSectionName}
          onChange={(e) => {
            setRewriteSectionName(e.target.value)
            setRewriteMessage('')
          }}
          disabled={!rewriteSectionOnly || detectedSections.length === 0}
          className="flex-1 px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-40"
        >
          <option value="">Select section</option>

          {detectedSections.map((section) => (
            <option
              key={section.id}
              value={section.label}
            >
              {section.label}
            </option>
          ))}
        </select>
    
     {detectedSections.length === 0 && (
      <div className="text-xs text-yellow-400 mt-1">
        No sections detected — full rewrite only
      </div>
    )}

    </div>

        {!rewriteSectionOnly && hasChordLinesInRewriteSource && (
          <div className="mb-3 p-3 rounded bg-yellow-900/30 text-yellow-200 text-sm">
            <div>
              Chord lines were detected in the selected song sheet.
            </div>
            <p className="text-xs text-yellow-100/80 mt-1">
              Extract them to Structured Chord JSON if you want to save the chords, then remove them before rewriting lyrics.
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                  type="button"
                  onClick={extractChordsFromRewriteSourceToJson}
                  className={`px-3 py-1 rounded text-white text-xs transition ${
                    justExtractedChords ? 'bg-green-600 scale-95' : 'bg-blue-600'
                  }`}
                >
                  {justExtractedChords ? 'Extracted ✓' : 'Extract chords to JSON'}
               </button>

              <button
                type="button"
                onClick={extractChordsAndRemoveFromRewriteSource}
                className="px-3 py-1 rounded bg-purple-600 text-white text-xs"
              >
                Extract JSON + Remove chords
              </button>

              <button
                type="button"
                onClick={removeChordsFromRewriteSource}
                className={`px-3 py-1 rounded text-white text-xs transition ${
                  extractingLyricsOnly ? 'bg-green-600 scale-95' : 'bg-yellow-600'
                }`}
              >
                {extractingLyricsOnly ? 'Removed ✓' : 'Remove chords only'}
              </button>
            </div>
          </div>
        )}
        {!rewriteInstruction.trim() && (
          <p className="text-xs text-yellow-400 mb-2">
            Choose a rewrite preset or type an instruction.
          </p>
        )}

        <button
          type="button"
          onClick={runRewriteLab}
          disabled={
            rewriteLoading ||
            !rewriteInstruction.trim() ||
            (!rewriteSectionOnly && hasChordLinesInRewriteSource)
          }
          className={`px-4 py-2 rounded text-white transition ${
            rewriteLoading
              ? 'bg-gray-600 scale-95'
              : rewriteDone
                ? 'bg-green-600'
                : 'bg-blue-600'
          } disabled:opacity-40`}
        >
          {rewriteLoading ? 'Rewriting...' : rewriteDone ? 'Rewritten ✓' : 'Run Rewrite'}
        </button>

        {rewriteMessage && (
          <p className="text-sm text-gray-400 mt-2">{rewriteMessage}</p>
        )}
      </div>
    )
}