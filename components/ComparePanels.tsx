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
  return (
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

        <textarea
          ref={compareLeftRef}
          value={compareLeftText}
          onChange={(e) => setCompareLeftText(e.target.value)}
          onScroll={() => syncCompareScroll('left')}
          readOnly={lockCompareLeft}
          className={`w-full bg-gray-900 rounded p-4 font-mono text-sm leading-7 text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto transition-all duration-300 ease-out ${
            lockCompareLeft ? 'opacity-70 cursor-not-allowed' : ''
          } ${
            flashLeftPanel
              ? 'ring-2 ring-green-400/60 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
              : ''
          }`}
        />
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
          title="Copy right panel into left panel"
          type="button"
          onClick={async () => {
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
          title="Copy left panel into right panel"
          type="button"
          onClick={async () => {
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

        <textarea
          ref={compareRightRef}
          value={compareRightText}
          onChange={(e) => setCompareRightText(e.target.value)}
          onScroll={() => syncCompareScroll('right')}
          readOnly={lockCompareRight}
          className={`w-full bg-gray-900 rounded p-4 font-mono text-sm leading-7 text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto transition-all duration-300 ease-out ${
            lockCompareRight ? 'opacity-70 cursor-not-allowed' : ''
          } ${
            flashRightPanel
              ? 'ring-2 ring-green-400/60 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
              : ''
          }`}
        />
      </div>
    </div>
  )
}