'use client'

import type { SongVersionRecord } from '@/types/song'

type CompareSourceProps = {
  performanceSheet: string
  songVersions: SongVersionRecord[]
  formatUkDateTime: (value: string) => string
}

type CompareActionStateProps = {
  comparingNow: boolean
  setComparingNow: (value: boolean) => void

  loadingLeftCurrent: boolean
  setLoadingLeftCurrent: (value: boolean) => void
  loadingRightCurrent: boolean
  setLoadingRightCurrent: (value: boolean) => void
}

type ComparePanelSelectionProps = {
  compareLeftSongId: string
  setCompareLeftSongId: (value: string) => void
  compareRightSongId: string
  setCompareRightSongId: (value: string) => void

  setCompareLeftText: (value: string) => void
  setCompareRightText: (value: string) => void

  setFlashLeftPanel: (value: boolean) => void
  setFlashRightPanel: (value: boolean) => void
}

type CompareVersionControlsProps =
  CompareSourceProps &
  CompareActionStateProps &
  ComparePanelSelectionProps

export default function CompareVersionControls({
  performanceSheet,
  songVersions,
  formatUkDateTime,

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
}: CompareVersionControlsProps) {
  return (
    <>
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