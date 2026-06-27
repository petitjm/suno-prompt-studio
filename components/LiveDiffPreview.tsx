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
  leftLineIndex?: number | null
  rightLineIndex?: number | null
}

type LiveDiffPreviewProps = {
  previewLeftRef: React.RefObject<HTMLDivElement | null>
  previewRightRef: React.RefObject<HTMLDivElement | null>
  editedDiffRows: DiffRow[]
  highlightedLines: number[]
  syncPreviewScroll: (source: 'left' | 'right') => void
  scrollCompareEditorsToLine: (
  leftLineIndex: number | null,
  rightLineIndex?: number | null,
) => void
  getWordDiffParts: (left: string, right: string) => {
    leftParts: WordDiffPart[]
    rightParts: WordDiffPart[]
  }
}

const getRowStatus = (row: DiffRow) => {
  if (!row.left.trim() && row.right.trim()) {
    return '+ Added'
  }

  if (row.left.trim() && !row.right.trim()) {
    return '- Removed'
  }

  if (row.changed) {
    return 'Changed'
  }

  return ''
}



export default function LiveDiffPreview({
  previewLeftRef,
  previewRightRef,
  editedDiffRows,
  highlightedLines,
  scrollCompareEditorsToLine,
  getWordDiffParts,
}: LiveDiffPreviewProps) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm text-gray-400">
        Live Difference Preview
      </h4>
      <p className="mb-3 text-xs text-gray-500">
          Right-side highlights show draft changes. Added and removed rows are labelled
          to make structure changes easier to follow.
        </p>

      <div
        ref={previewLeftRef}
        className="max-h-[460px] overflow-y-auto rounded bg-gray-900 p-4 font-mono text-sm leading-7 text-gray-100"
      >
        <div className="grid grid-cols-[1fr_5.5rem_1fr] gap-3">
          {editedDiffRows.map((row, index) => {
            const wordDiff = getWordDiffParts(row.left, row.right)
            const isHighlighted = highlightedLines.includes(index)
            const rowStatus = getRowStatus(row)

            return (
              <React.Fragment key={index}>
                <button
                  type="button"
                 onClick={() => {
                  if (row.changed) {
                    scrollCompareEditorsToLine(
                      row.leftLineIndex ?? null,
                      row.rightLineIndex ?? null,
                    )
                  }
                }}
                  title={
                    row.changed
                      ? 'Click to jump editors to this line'
                      : undefined
                  }
                  className={`min-h-7 whitespace-pre-wrap border-l px-2 text-left ${
                    row.changed
                      ? 'border-yellow-700/50 cursor-pointer hover:bg-yellow-900/10'
                      : 'border-transparent'
                  } ${
                    isHighlighted
                      ? 'bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                      : ''
                  }`}
                >
                  {row.left || ' '}
                </button>

                   <div className="flex items-start justify-center pt-1">
                      {rowStatus && (
                        <span className="whitespace-nowrap rounded border border-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                          {rowStatus}
                        </span>
                      )}
                    </div>

                <button
                  
                  type="button"
                  onClick={() => {
                      if (row.changed) {
                        scrollCompareEditorsToLine(
                          row.leftLineIndex ?? null,
                          row.rightLineIndex ?? null,
                        )
                      }
                    }}
                  title={
                    row.changed
                      ? 'Click to jump editors to this line'
                      : undefined
                  }
                  className={`min-h-7 whitespace-pre-wrap border-l px-2 text-left ${
                    row.changed
                      ? 'border-yellow-700/50 cursor-pointer hover:bg-yellow-900/10'
                      : 'border-transparent'
                  } ${
                    isHighlighted
                      ? 'bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                      : ''
                  }`}
                >
                  {wordDiff.rightParts.length > 0
                    ? wordDiff.rightParts.map((part, partIndex) => (
                        <span
                          key={partIndex}
                          className={
                            part.changed && part.text.trim()
                              ? 'rounded bg-yellow-700/40 px-0.5'
                              : ''
                          }
                        >
                          {part.text}
                        </span>
                      ))
                    : ' '}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}