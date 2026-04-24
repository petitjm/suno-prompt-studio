
'use client'


import LegacyRehearseUI from '@/components/LegacyRehearseUI'
import React, { useState } from 'react'
import type { PreviewFeel, PerformanceSection, PreviewInstrument, PreviewPattern, PreviewSectionKey } from '@/types/song'
import RehearsePanel from '@/components/RehearsePanel'
import SongSheet from '@/components/SongSheet'
import { buildPreviewBars } from '@/lib/parseSong'
import type { ChordResponse } from '@/types/song'
import * as Tone from 'tone'
import { parsePerformanceSections } from '@/lib/parseSong'






// ===============================
// TYPES
// ===============================

type AppMode =
  | 'write'
  | 'chords'
  | 'sheet'
  | 'rehearse'
  | 'perform'
  | 'video'

// ===============================
// TOOLTIP COMPONENT (simple + clean)
// ===============================

function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 z-50">
        {label}
      </div>
    </div>
  )
}

// ===============================
// SIDEBAR ITEM
// ===============================

function SidebarItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <Tooltip label={label}>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition
        ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
      >
        <span className="text-lg">{icon}</span>
        {!collapsed && <span className="text-sm">{label}</span>}
      </button>
    </Tooltip>
  )
}

// ===============================
// MAIN PAGE
// ===============================

export default function Page() {
  const [currentBarIndex, setCurrentBarIndex] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mode, setMode] = useState<AppMode>('write')

  const [previewReady, setPreviewReady] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewTempo, setPreviewTempo] = useState(92)
  const [previewFeel, setPreviewFeel] = useState<PreviewFeel>('straight')
  const [previewInstrument, setPreviewInstrument] = useState<PreviewInstrument>('guitar')
  const [previewSection, setPreviewSection] = useState<PreviewSectionKey>('verse')
  const [previewPattern, setPreviewPattern] = useState<PreviewPattern>('ballad_strum')
  const [previewLoop, setPreviewLoop] = useState(true)
  const [previewIncludeBass, setPreviewIncludeBass] = useState(true)
  const [previewIncludeClick, setPreviewIncludeClick] = useState(false)
  const [followPlayback, setFollowPlayback] = useState(true)

  const previewSynthRef = React.useRef<Tone.PolySynth | null>(null)
  const previewTimeoutsRef = React.useRef<number[]>([])
  const performanceSectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})


const [performanceSheet, setPerformanceSheet] = useState('')
const [performanceSections, setPerformanceSections] = useState<PerformanceSection[]>([])
const [chords, setChords] = useState<ChordResponse | null>(null)



  const previewBars = React.useMemo(() => {
    return buildPreviewBars(chords, previewSection)
  }, [chords, previewSection])

  const clearPreviewTimeouts = () => {
    previewTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
    previewTimeoutsRef.current = []
  }

  const scrollToPerformanceSection = (sectionLabel: string) => {
    const normalized = sectionLabel.toLowerCase()

    const match = performanceSections.find((section) => {
      const label = section.label.toLowerCase()
      return label === normalized || label.includes(normalized)
    })

    if (!match) return

    const el = performanceSectionRefs.current[match.id]
    if (!el) return

    el.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const loadSavedSongSheet = async (projectId: string) => {
  try {
    const res = await fetch(`/api/projects/${projectId}`)
    const data = await res.json()

    const debugProjects = async () => {
  const res = await fetch('/api/projects')
  const data = await res.json()
  console.log(data)
}


    // adjust these keys to your real API response
    const nextSheet =
      data.performanceSheet ||
      data.songSheet ||
      data.project?.performanceSheet ||
      ''

    const nextChords =
      data.chords ||
      data.project?.chords ||
      null

    setPerformanceSheet(nextSheet)
    setChords(nextChords)
  } catch (err) {
    console.error('Failed to load saved song sheet', err)
  }
}


  const startPreviewPlayback = async () => {
    await Tone.start()

    clearPreviewTimeouts()

    if (!previewSynthRef.current) {
      previewSynthRef.current = new Tone.PolySynth(Tone.Synth).toDestination()
    }

    const synth = previewSynthRef.current
    const msPerBar = (60 / previewTempo) * 4 * 1000

    previewBars.forEach((bar, index) => {
      const timeoutId = window.setTimeout(() => {
        if (followPlayback && bar.label) {
          setCurrentBarIndex(index)
          scrollToPerformanceSection(bar.label)
        }

        const chord = (bar.chord || 'C').trim()

        const chordNotes: Record<string, string[]> = {
          C: ['C4', 'E4', 'G4'],
          D: ['D4', 'F#4', 'A4'],
          Em: ['E4', 'G4', 'B4'],
          F: ['F4', 'A4', 'C5'],
          G: ['G4', 'B4', 'D5'],
          Am: ['A4', 'C5', 'E5'],
        }

        const chordKey = chord.replace(/[^A-G#m]/g, '')
        const notes = chordNotes[chordKey] || ['C4', 'E4', 'G4']

        if (previewPattern === 'fingerpick') {
          ;[0, 1, 2, 1].forEach((noteIndex, i) => {
            const pickId = window.setTimeout(() => {
              const note = notes[noteIndex] || notes[0]
              synth.triggerAttackRelease(note, '8n')
            }, i * 220)

            previewTimeoutsRef.current.push(pickId)
          })
        } else if (previewPattern === 'country_train') {
          const rhythm = [0, 180, 360, 540]
          rhythm.forEach((delay, i) => {
            const trainId = window.setTimeout(() => {
              const note = i % 2 === 0 ? notes[0] : notes[1] || notes[0]
              synth.triggerAttackRelease(note, '8n')
            }, delay)

            previewTimeoutsRef.current.push(trainId)
          })
        } else if (previewPattern === 'piano_block') {
          synth.triggerAttackRelease(notes, '4n')
        } else {
          notes.forEach((note, i) => {
            const strumId = window.setTimeout(() => {
              synth.triggerAttackRelease(note, '8n')
            }, i * 35)

            previewTimeoutsRef.current.push(strumId)
          })
        }
      }, index * msPerBar)

      previewTimeoutsRef.current.push(timeoutId)
    })

    setPreviewReady(true)
    setPreviewPlaying(true)
  }

  const stopPreviewPlayback = () => {
    clearPreviewTimeouts()
    setPreviewPlaying(false)
  }

  React.useEffect(() => {
  setPerformanceSections(parsePerformanceSections(performanceSheet))
}, [performanceSheet])


  React.useEffect(() => {
    if (previewPattern === 'piano_block') {
      setPreviewInstrument('piano')
    } else if (previewPattern === 'fingerpick') {
      setPreviewInstrument('guitar')
    }
  }, [previewPattern])

  React.useEffect(() => {
    return () => {
      clearPreviewTimeouts()
      previewSynthRef.current?.dispose()
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-56'
        } bg-gray-800 p-3 flex flex-col transition-all duration-300`}
      >
        <button
          onClick={() => setSidebarCollapsed((s) => !s)}
          className="mb-4 text-gray-300 hover:text-white"
          title="Toggle sidebar"
        >
          ☰
        </button>

        <div className="flex flex-col gap-2">
          <SidebarItem
            icon="✍️"
            label="Write"
            active={mode === 'write'}
            collapsed={sidebarCollapsed}
            onClick={() => setMode('write')}
          />
          <SidebarItem
            icon="🎸"
            label="Chords"
            active={mode === 'chords'}
            collapsed={sidebarCollapsed}
            onClick={() => setMode('chords')}
          />
          <SidebarItem
            icon="📄"
            label="Sheet"
            active={mode === 'sheet'}
            collapsed={sidebarCollapsed}
            onClick={() => setMode('sheet')}
          />
          <SidebarItem
            icon="🎧"
            label="Rehearse"
            active={mode === 'rehearse'}
            collapsed={sidebarCollapsed}
            onClick={() => setMode('rehearse')}
          />
          <SidebarItem
            icon="🎤"
            label="Perform"
            active={mode === 'perform'}
            collapsed={sidebarCollapsed}
            onClick={() => setMode('perform')}
          />
          <SidebarItem
            icon="🎬"
            label="Video"
            active={mode === 'video'}
            collapsed={sidebarCollapsed}
            onClick={() => setMode('video')}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-12 bg-gray-800 flex items-center px-4 border-b border-gray-700">
          <span className="text-sm text-gray-400">Mode: {mode.toUpperCase()}</span>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {mode === 'write' && (
  <div>
    <h1 className="text-xl mb-4">Write</h1>
    <p className="text-gray-400 mb-4">
      Lyrics, ideas, and structure go here.
    </p>
    <button onClick={debugProjects}>Log Projects</button>
    <button
      onClick={() => loadSavedSongSheet('page to modules')}
      className="px-4 py-2 rounded bg-blue-600 text-white"
    >
      Load Saved SongSheet
    </button>
  </div>
)}

          {mode === 'chords' && (
            <div>
              <h1 className="text-xl mb-4">Chords</h1>
              <p className="text-gray-400">Generate and refine harmonic structure.</p>
            </div>
          )}

          {mode === 'sheet' && (
              <SongSheet
                performanceSheet={performanceSheet}
                performanceSections={performanceSections}
                performanceFontSize={18}
                activePerformanceSectionId={null}
                performanceSectionRefs={performanceSectionRefs}
              />
            )}

          {mode === 'rehearse' && (
            <div className="h-full">
              <RehearsePanel
                previewSection={previewSection}
                setPreviewSection={setPreviewSection}
                previewPattern={previewPattern}
                setPreviewPattern={setPreviewPattern}
                previewInstrument={previewInstrument}
                setPreviewInstrument={setPreviewInstrument}
                previewFeel={previewFeel}
                setPreviewFeel={setPreviewFeel}
                previewTempo={previewTempo}
                setPreviewTempo={setPreviewTempo}
                previewLoop={previewLoop}
                setPreviewLoop={setPreviewLoop}
                previewIncludeBass={previewIncludeBass}
                setPreviewIncludeBass={setPreviewIncludeBass}
                previewIncludeClick={previewIncludeClick}
                setPreviewIncludeClick={setPreviewIncludeClick}
                previewBarsLength={previewBars.length}
                previewPlaying={previewPlaying}
                previewReady={previewReady}
                followPlayback={followPlayback}
                setFollowPlayback={setFollowPlayback}
                startPreviewPlayback={startPreviewPlayback}
                stopPreviewPlayback={stopPreviewPlayback}
              />
            </div>
          )}

          {mode === 'perform' && (
              <SongSheet
                performanceSheet={performanceSheet}
                performanceSections={performanceSections}
                performanceFontSize={24}
                activePerformanceSectionId={null}
                performanceSectionRefs={performanceSectionRefs}
              />
            )}

          {mode === 'video' && (
            <div>
              <h1 className="text-xl mb-4">Video Generator</h1>
              <p className="text-gray-400">OpenArt / prompt generation tools go here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}