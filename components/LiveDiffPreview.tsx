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
  scrollCompareEditorsToLine,
  getWordDiffParts,
}: LiveDiffPreviewProps) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm text-gray-400">
        Live Difference Preview
      </h4>

      <div
        ref={previewLeftRef}
        className="max-h-[460px] overflow-y-auto rounded bg-gray-900 p-4 font-mono text-sm leading-7 text-gray-100"
      >
        <div className="grid grid-cols-[1fr_3rem_1fr] gap-4">
          {editedDiffRows.map((row, index) => {
            const wordDiff = getWordDiffParts(row.left, row.right)
            const isHighlighted = highlightedLines.includes(index)

            return (
              <React.Fragment key={index}>
                <button
                  type="button"
                  onClick={() => {
                    if (row.changed) {
                      scrollCompareEditorsToLine(index)
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

                <div />

                <button
                  
                  type="button"
                  onClick={() => {
                    if (row.changed) {
                      scrollCompareEditorsToLine(index)
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