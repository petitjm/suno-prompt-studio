'use client'

import React from 'react'

type WordDiffPart = {
  text: string
  changed: boolean
}

type DiffRow = {
  left: string
  right: string
  changed: boolean
}

type LiveDiffPreviewProps = {
  previewLeftRef: React.RefObject<HTMLDivElement | null>
  previewRightRef: React.RefObject<HTMLDivElement | null>
  editedDiffRows: DiffRow[]
  highlightedLines: number[]
  syncPreviewScroll: (source: 'left' | 'right') => void
  scrollCompareEditorsToLine: (lineIndex: number) => void
  getWordDiffParts: (left: string, right: string) => {
    leftParts: WordDiffPart[]
    rightParts: WordDiffPart[]
  }
}

export default function LiveDiffPreview({
  previewLeftRef,
  previewRightRef,
  editedDiffRows,
  highlightedLines,
  syncPreviewScroll,
  scrollCompareEditorsToLine,
  getWordDiffParts,
}: LiveDiffPreviewProps) {
  return (
    <div className="mt-4">
      <h4 className="text-sm text-gray-400 mb-2">Live Difference Preview</h4>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
        <div
          ref={previewLeftRef}
          onScroll={() => syncPreviewScroll('left')}
          className="bg-gray-900 rounded p-4 font-mono text-sm leading-7 text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto"
        >
          {editedDiffRows.map((row, i) => (
            <div
              key={i}
              onClick={() => {
                if (row.changed) scrollCompareEditorsToLine(i)
              }}
              title={row.changed ? 'Click to jump editors to this line' : undefined}
              className={`px-1 ${
                row.changed
                  ? 'bg-yellow-900/40 cursor-pointer hover:bg-yellow-800/50'
                  : ''
              } ${
                highlightedLines.includes(i)
                  ? 'bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)] rounded'
                  : ''
              }`}
            >
              {getWordDiffParts(row.left, row.right).leftParts.map((part, j) => (
                <span
                  key={j}
                  className={part.changed ? 'bg-yellow-700/60 rounded px-0.5' : ''}
                >
                  {part.text}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="hidden md:block w-[112px]" />

        <div
          ref={previewRightRef}
          onScroll={() => syncPreviewScroll('right')}
          className="bg-gray-900 rounded p-4 font-mono text-sm leading-7 text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto"
        >
          {editedDiffRows.map((row, i) => (
            <div
              key={i}
              onClick={() => {
                if (row.changed) scrollCompareEditorsToLine(i)
              }}
              title={row.changed ? 'Click to jump editors to this line' : undefined}
              className={
                row.changed
                  ? 'bg-yellow-900/40 px-1 rounded cursor-pointer hover:bg-yellow-800/50'
                  : 'px-1'
              }
            >
              {getWordDiffParts(row.left, row.right).rightParts.map((part, j) => (
                <span
                  key={j}
                  className={part.changed ? 'bg-yellow-700/60 rounded px-0.5' : ''}
                >
                  {part.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}