'use client'

import type { SongVersionRecord } from '@/types/song'

import { getSongVersionLyrics } from '@/lib/songVersions'

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

type CompareVersionControlsProps = {
  source: CompareSourceProps
  actionState: CompareActionStateProps
  panelSelection: ComparePanelSelectionProps
}

export default function CompareVersionControls({
  source,
  actionState,
  panelSelection,
}: CompareVersionControlsProps) {
    return (
    <>
      <button
        type="button"
        onClick={() => {
          actionState.setComparingNow(true)

          const latest = source.songVersions[0]
        const latestLyrics = getSongVersionLyrics(latest)

        if (latestLyrics) {
          panelSelection.setCompareLeftSongId(latest.id)
          panelSelection.setCompareLeftText(latestLyrics)
        }

          panelSelection.setCompareRightText(source.performanceSheet)

          panelSelection.setFlashLeftPanel(true)
          panelSelection.setFlashRightPanel(true)

          setTimeout(() => {
            panelSelection.setFlashLeftPanel(false)
            panelSelection.setFlashRightPanel(false)
            actionState.setComparingNow(false)
          }, 800)
        }}
        disabled={!source.performanceSheet.trim() || source.songVersions.length === 0}
        className={`mb-4 px-3 py-2 rounded text-white text-sm transition ${
          actionState.comparingNow ? 'bg-green-600 scale-95' : 'bg-blue-600'
        } disabled:opacity-40`}
      >
        {actionState.comparingNow ? 'Compared ✓' : 'Compare current vs last saved'}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Load saved version into left panel
          </label>

          <select
            value={panelSelection.compareLeftSongId}
            onChange={(e) => {
              const id = e.target.value
              panelSelection.setCompareLeftSongId(id)

              const selected = source.songVersions.find((v) => v.id === id)
            const lyrics = getSongVersionLyrics(selected)

            if (lyrics) {
              panelSelection.setCompareLeftText(lyrics)
            }
            }}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          >
            <option value="">Choose version for left</option>

            {source.songVersions.map((v, i) => (
              <option key={v.id} value={v.id}>
                {v.title || `Version ${source.songVersions.length - i}`}
                {v.created_at ? ` (${source.formatUkDateTime(v.created_at)})` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              actionState.setLoadingLeftCurrent(true)

              panelSelection.setCompareLeftText(source.performanceSheet)

              panelSelection.setFlashLeftPanel(true)
              setTimeout(() => panelSelection.setFlashLeftPanel(false), 600)

              setTimeout(() => actionState.setLoadingLeftCurrent(false), 800)
            }}
            disabled={!source.performanceSheet.trim()}
            className={`mt-2 px-3 py-1 rounded text-white text-xs transition ${
              actionState.loadingLeftCurrent ? 'bg-green-600 scale-95' : 'bg-gray-600'
            } disabled:opacity-40`}
          >
            {actionState.loadingLeftCurrent ? 'Loaded ✓' : 'Load current → left'}
          </button>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Load saved version into right panel
          </label>

          <select
            value={panelSelection.compareRightSongId}
            onChange={(e) => {
              const id = e.target.value
              panelSelection.setCompareRightSongId(id)

              const selected = source.songVersions.find((v) => v.id === id)
                const lyrics = getSongVersionLyrics(selected)

                if (lyrics) {
                  panelSelection.setCompareRightText(lyrics)
                }
            }}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white"
          >
            <option value="">Choose version for right</option>

            {source.songVersions.map((v, i) => (
              <option key={v.id} value={v.id}>
                {v.title || `Version ${source.songVersions.length - i}`}
                {v.created_at ? ` (${source.formatUkDateTime(v.created_at)})` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              actionState.setLoadingRightCurrent(true)

              panelSelection.setCompareRightText(source.performanceSheet)

              panelSelection.setFlashRightPanel(true)
              setTimeout(() => panelSelection.setFlashRightPanel(false), 600)

              setTimeout(() => actionState.setLoadingRightCurrent(false), 800)
            }}
            disabled={!source.performanceSheet.trim()}
            className={`mt-2 px-3 py-1 rounded text-white text-xs transition ${
              actionState.loadingRightCurrent ? 'bg-green-600 scale-95' : 'bg-gray-600'
            } disabled:opacity-40`}
          >
            {actionState.loadingRightCurrent ? 'Loaded ✓' : 'Load current → right'}
          </button>
        </div>
      </div>
    </>
  )
}