'use client'




import React from 'react'

import type { AppMode } from '@/types/song'

type ComparePanelsProps = {
  compareLeftRef: React.RefObject<HTMLTextAreaElement | null>
  compareRightRef: React.RefObject<HTMLTextAreaElement | null>

  compareLeftText: string
  setCompareLeftText: (value: string) => void
  compareRightText: string
  setCompareRightText: (value: string) => void

lockCompareLeft: boolean
setLockCompareLeft: (value: boolean) => void
lockCompareRight: boolean
setLockCompareRight: (value: boolean) => void
lastRewriteTargetLabel: string
compareUpdateMessage: string
setCompareUpdateMessage: (value: string) => void

flashLeftPanel: boolean
  flashRightPanel: boolean
  setFlashLeftPanel: (value: boolean) => void
  setFlashRightPanel: (value: boolean) => void

  panelsMatch: boolean

  applyingLeft: boolean
  setApplyingLeft: (value: boolean) => void
  applyingRight: boolean
  setApplyingRight: (value: boolean) => void

  canApplyLeft: boolean
  canApplyRight: boolean

  usingLeft: boolean
  setUsingLeft: (value: boolean) => void
  usingRight: boolean
  setUsingRight: (value: boolean) => void

  syncCompareScroll: (source: 'left' | 'right') => void
  autoSnapshot: (text: string, title: string) => Promise<void>

  performanceScrollRef: React.RefObject<HTMLDivElement | null>
  setPerformanceSheet: (value: string) => void
  setCurrentBarIndex: (value: number) => void
  setMode: (value: AppMode) => void
}

export default function ComparePanels({
  compareLeftRef,
  compareRightRef,
  compareLeftText,
  setCompareLeftText,
  compareRightText,
  setCompareRightText,
  lockCompareLeft,
  setLockCompareLeft,
  lockCompareRight,
  setLockCompareRight,
  compareUpdateMessage,
  setCompareUpdateMessage,
  lastRewriteTargetLabel,
  flashLeftPanel,
  flashRightPanel,
  setFlashLeftPanel,
  setFlashRightPanel,
  panelsMatch,
  applyingLeft,
  setApplyingLeft,
  applyingRight,
  setApplyingRight,
  canApplyLeft,
  canApplyRight,
  usingLeft,
  setUsingLeft,
  usingRight,
  setUsingRight,
  syncCompareScroll,
  autoSnapshot,
  performanceScrollRef,
  setPerformanceSheet,
  setCurrentBarIndex,
  setMode,
}: ComparePanelsProps) {


const leftLineNumbersRef = React.useRef<HTMLDivElement | null>(null)
const rightLineNumbersRef = React.useRef<HTMLDivElement | null>(null)

const getLineNumbers = (value: string) =>
  value.split('\n').map((_, index) => index + 1)

const renderLineNumbers = (value: string) => (
  <>
    {getLineNumbers(value).map((lineNumber) => (
      <div key={lineNumber}>{lineNumber}</div>
    ))}
  </>
)






return (
  <div id="rewrite-compare-preview">

          <div className="mb-2 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-200">
            Compare Panels
          </h3>

          {lastRewriteTargetLabel && (
            <span className="text-xs text-gray-400">
              Last rewrite: {lastRewriteTargetLabel}
            </span>
          )}
        </div>
    {compareUpdateMessage && (
      <div className="mb-3 rounded border border-blue-700 bg-blue-900/30 px-3 py-2 text-sm text-blue-100">
        <div className="flex flex-wrap items-center gap-2">
          <span>{compareUpdateMessage}</span>

          <button
            type="button"
            onClick={() => setCompareUpdateMessage('')}
            className="shrink-0 rounded bg-blue-800 px-2 py-1 text-xs text-blue-100 hover:bg-blue-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-[1fr_112px_1fr] gap-4 items-start">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={lockCompareLeft}
              onChange={(e) => {
                setLockCompareLeft(e.target.checked)
                if (e.target.checked) setLockCompareRight(false)
              }}
            />
            Lock
          </label>

          <button
            type="button"
            onClick={() => {
              setCompareUpdateMessage('')
              setUsingLeft(true)
              performanceScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              setPerformanceSheet(compareLeftText)
              setCurrentBarIndex(0)
              setMode('perform')
              requestAnimationFrame(() => {
                performanceScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              })
              setTimeout(() => setUsingLeft(false), 1000)
            }}
            disabled={!compareLeftText.trim()}
            className={`px-2 py-1 rounded text-xs text-white transition ${
              usingLeft ? 'bg-green-600 scale-95' : 'bg-purple-600'
            } disabled:opacity-40`}
          >
            {usingLeft ? 'Used ✓' : '▶ Use'}
          </button>
        </div>

        <div
      className={`flex rounded bg-gray-900 transition-all duration-300 ease-out ${
        lockCompareLeft ? 'opacity-70 cursor-not-allowed' : ''
      } ${
        flashLeftPanel
          ? 'ring-2 ring-green-400/60 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
          : ''
      }`}
    >
      <div
        ref={leftLineNumbersRef}
        aria-hidden="true"
        className="max-h-[400px] min-h-[300px] overflow-hidden border-r border-gray-800 px-2 py-4 text-right font-mono text-sm leading-7 text-gray-500 select-none"
      >
        {renderLineNumbers(compareLeftText)}
      </div>

      <textarea
        ref={compareLeftRef}
        value={compareLeftText}
        onChange={(e) => setCompareLeftText(e.target.value)}
        onScroll={(event) => {
          if (leftLineNumbersRef.current) {
            leftLineNumbersRef.current.scrollTop = event.currentTarget.scrollTop
          }

          syncCompareScroll('left')
        }}
        readOnly={lockCompareLeft}
         wrap="off"
      className="min-h-[300px] max-h-[400px] flex-1 resize-y overflow-auto rounded-r bg-transparent p-4 pl-3 font-mono text-sm leading-7 text-gray-100 outline-none whitespace-pre"
    />
    </div>
      </div>

      <div className="w-[112px] flex flex-col justify-center items-center gap-2 pt-8">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            panelsMatch
              ? 'bg-green-600/20 text-green-300'
              : 'bg-yellow-600/20 text-yellow-300'
          }`}
        >
          {panelsMatch ? 'MATCH' : 'NO MATCH'}
        </span>

        <button
          title="Replace the left panel with the right panel text"
          type="button"
          onClick={async () => {
            setCompareUpdateMessage('')
            setApplyingLeft(true)
            await autoSnapshot(compareLeftText, 'Left before apply')
            setCompareLeftText(compareRightText)
            setFlashLeftPanel(true)
            setTimeout(() => setFlashLeftPanel(false), 600)
            setTimeout(() => setApplyingLeft(false), 800)
          }}
          disabled={!canApplyLeft}
          className={`px-3 py-2 rounded text-white text-sm ${
            applyingLeft
              ? 'bg-green-600 scale-95'
              : canApplyLeft
                ? 'bg-blue-600'
                : 'bg-gray-600 opacity-50 cursor-not-allowed'
          }`}
        >
          {applyingLeft ? 'Applied ✓' : '← Apply'}
        </button>

        <button
          title="Replace the right panel with the left panel text"
          type="button"
          onClick={async () => {
            setCompareUpdateMessage('')
            setApplyingRight(true)
            await autoSnapshot(compareRightText, 'Right before apply')
            setCompareRightText(compareLeftText)
            setFlashRightPanel(true)
            setTimeout(() => setFlashRightPanel(false), 600)
            setTimeout(() => setApplyingRight(false), 800)
          }}
          disabled={!canApplyRight}
          className={`px-3 py-2 rounded text-white text-sm ${
            applyingRight
              ? 'bg-green-600 scale-95'
              : canApplyRight
                ? 'bg-blue-600'
                : 'bg-gray-600 opacity-50 cursor-not-allowed'
          }`}
        >
          {applyingRight ? 'Applied ✓' : 'Apply →'}
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={lockCompareRight}
              onChange={(e) => {
                setLockCompareRight(e.target.checked)
                if (e.target.checked) setLockCompareLeft(false)
              }}
            />
            Lock
          </label>

          <button
            type="button"
            onClick={() => {
              setCompareUpdateMessage('')
              setUsingRight(true)
              performanceScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              setPerformanceSheet(compareRightText)
              setCurrentBarIndex(0)
              setMode('perform')
              requestAnimationFrame(() => {
                performanceScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              })
              setTimeout(() => setUsingRight(false), 1000)
            }}
            disabled={!compareRightText.trim()}
            className={`px-2 py-1 rounded text-xs text-white transition ${
              usingRight ? 'bg-green-600 scale-95' : 'bg-purple-600'
            } disabled:opacity-40`}
          >
            {usingRight ? 'Used ✓' : '▶ Use'}
          </button>
        </div>

        <div
      className={`flex rounded bg-gray-900 transition-all duration-300 ease-out ${
        lockCompareRight ? 'opacity-70 cursor-not-allowed' : ''
      } ${
        flashRightPanel
          ? 'ring-2 ring-green-400/60 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
          : ''
      }`}
    >
      <div
        ref={rightLineNumbersRef}
        aria-hidden="true"
        className="max-h-[400px] min-h-[300px] overflow-hidden border-r border-gray-800 px-2 py-4 text-right font-mono text-sm leading-7 text-gray-500 select-none"
      >
        {renderLineNumbers(compareRightText)}
      </div>

      <textarea
        ref={compareRightRef}
        value={compareRightText}
        onChange={(e) => setCompareRightText(e.target.value)}
        onScroll={(event) => {
          if (rightLineNumbersRef.current) {
            rightLineNumbersRef.current.scrollTop = event.currentTarget.scrollTop
          }

          syncCompareScroll('right')
        }}
        readOnly={lockCompareRight}
         wrap="off"
      className="min-h-[300px] max-h-[400px] flex-1 resize-y overflow-auto rounded-r bg-transparent p-4 pl-3 font-mono text-sm leading-7 text-gray-100 outline-none whitespace-pre"
    />
    </div>
      </div>
    </div>
   </div>
  )
}