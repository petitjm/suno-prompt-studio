'use client'

import React, { useState } from 'react'
import * as Tone from 'tone'

import RehearsePanel from '@/components/RehearsePanel'
import SongSheet from '@/components/SongSheet'
import {
  buildPreviewBars,
  buildOrderedPreviewBarsFromSections,
  findMatchingSectionId,
  parseOrderedSongSections,
  parsePerformanceSections,
} from '@/lib/parseSong'
import { createClient } from '@/lib/supabase/client'
import type {
  ChordResponse,
  PerformanceSection,
  PreviewFeel,
  PreviewInstrument,
  PreviewPattern,
  PreviewSectionKey,
} from '@/types/song'

type PreviewBarMeta = {
  barIndex: number
  label: string
  chord: string
  sectionId: string | null
}


type AppMode = 'write' | 'chords' | 'sheet' | 'rehearse' | 'perform' | 'video'

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group flex items-center justify-center">
      {children}
      <div className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 z-50">
        {label}
      </div>
    </div>
  )
}

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
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
          active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
        }`}
      >
        <span className="text-lg">{icon}</span>
        {!collapsed && <span className="text-sm">{label}</span>}
      </button>
    </Tooltip>
  )
}

export default function Page() {
    const [performControlsOpen, setPerformControlsOpen] = useState(false)
  const supabase = React.useMemo(() => createClient(), [])

  const [mode, setMode] = useState<AppMode>('write')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState('')
  const [debugOutput, setDebugOutput] = useState('')

  const [currentBarIndex, setCurrentBarIndex] = useState(0)

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

  const [performanceSheet, setPerformanceSheet] = useState('')
  const [performanceSections, setPerformanceSections] = useState<PerformanceSection[]>([])
  const [chords, setChords] = useState<ChordResponse | null>(null)

  const previewSynthRef = React.useRef<Tone.PolySynth | null>(null)
  const previewTimeoutsRef = React.useRef<number[]>([])
  const performanceSectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})

  const previewBars = React.useMemo(() => {
  if (!chords) return []

  try {
    if (previewSection !== 'full_song') {
      return buildPreviewBars(chords, previewSection).map((bar) => ({
        ...bar,
        sectionId: null,
      }))
    }

    if (!performanceSheet.trim()) {
      return []
    }

    const orderedSections = parseOrderedSongSections(performanceSheet)

    if (!orderedSections.length) {
      return []
    }

    return buildOrderedPreviewBarsFromSections(orderedSections, chords)
  } catch (err) {
    console.error('Failed to build preview bars:', err)
    return []
  }
}, [chords, previewSection, performanceSheet])

const previewBarMeta = React.useMemo<PreviewBarMeta[]>(() => {
  let sectionCursor = 0

  return previewBars.map((bar, index) => {
    let sectionId: string | null = null

    if (bar.label && performanceSections.length) {
      const label = bar.label.toLowerCase()

      // move forward until we find matching section
      while (sectionCursor < performanceSections.length) {
        const current = performanceSections[sectionCursor]

        if (current.label.toLowerCase() === label) {
          sectionId = current.id
          break
        }

        sectionCursor++
      }
    }

    return {
      barIndex: index,
      label: bar.label || '',
      chord: bar.chord || '',
      sectionId,
    }
  })
}, [previewBars, performanceSections])



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

  const sendOtp = async () => {
    setAuthMessage('Sending code...')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      setAuthMessage(error.message)
      return
    }

    setAuthMessage('Check your email for the verification code.')
  }

  const verifyOtp = async () => {
    setAuthMessage('Verifying...')

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setAuthMessage(error.message)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUserEmail(user?.email || null)
    setAuthMessage(`Signed in as ${user?.email}`)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    setAuthMessage('Signed out')
  }

  const debugProjects = async () => {
    try {
      setDebugOutput('Loading projects...')

      const res = await fetch('/api/projects')
      const text = await res.text()

let data: any = null
try {
  data = text ? JSON.parse(text) : null
} catch {
  setDebugOutput(`Non-JSON response from server:\n\n${text}`)
  return
}

if (!res.ok) {
  setDebugOutput(JSON.stringify(data, null, 2))
  return
}

      console.log('Projects:', data)
      setDebugOutput(JSON.stringify(data, null, 2))
    } catch (err: any) {
      console.error(err)
      setDebugOutput(err.message || 'Failed to load projects')
    }
  }

  const loadSavedSongSheet = async (projectId: string) => {
  try {
    setDebugOutput('Loading song sheet...')

    const res = await fetch(`/api/projects/${projectId}`)
    const text = await res.text()

    let data: any = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      setDebugOutput(`Non-JSON response from server:\n\n${text || '[empty response]'}`)
      return
    }

    if (!res.ok) {
      setDebugOutput(JSON.stringify(data, null, 2))
      return
    }

    const latestSong = data?.songVersions?.[0]
const latestChords = data?.chordVersions?.[0]

const nextSheet = latestSong?.result?.lyrics_full || ''
const nextChords = latestChords?.chord_data || null

    setPerformanceSheet(nextSheet)
    setChords(nextChords)
    setDebugOutput(JSON.stringify(data, null, 2))
  } catch (err: any) {
    console.error('Failed to load saved song sheet', err)
    setDebugOutput(err.message || 'Failed to load saved song sheet')
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
        if (followPlayback) {
         setCurrentBarIndex(index)

  const meta = previewBarMeta[index]
      if (meta?.sectionId) {
        const el = performanceSectionRefs.current[meta.sectionId]
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }
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
    const parsed = parsePerformanceSections(performanceSheet)

// add instance numbering
const counts: Record<string, number> = {}

const withUniqueIds = parsed.map((section) => {
  const key = section.label.toLowerCase()

  counts[key] = (counts[key] || 0) + 1

  return {
    ...section,
    id: `${key}-${counts[key]}`, // 🔥 unique id
  }
})

setPerformanceSections(withUniqueIds)
  }, [performanceSheet])

  React.useEffect(() => {
    if (previewPattern === 'piano_block') {
      setPreviewInstrument('piano')
    } else if (previewPattern === 'fingerpick') {
      setPreviewInstrument('guitar')
    }
  }, [previewPattern])

  React.useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        setUserEmail(null)
        setAuthMessage('Not signed in')
        return
      }

      setUserEmail(user.email || null)
      setAuthMessage(`Signed in as ${user.email}`)
    }

    checkUser()
  }, [supabase])

  React.useEffect(() => {
    return () => {
      clearPreviewTimeouts()
      previewSynthRef.current?.dispose()
    }
  }, [])

 const activePerformanceSectionId =
  previewBarMeta[currentBarIndex]?.sectionId || null

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-56'
        } bg-gray-800 p-3 flex flex-col transition-all duration-300`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((s) => !s)}
          className="mb-4 text-gray-300 hover:text-white"
          title="Toggle sidebar"
        >
          ☰
        </button>

        <div className="flex flex-col gap-2">
          <SidebarItem icon="✍️" label="Write" active={mode === 'write'} collapsed={sidebarCollapsed} onClick={() => setMode('write')} />
          <SidebarItem icon="🎸" label="Chords" active={mode === 'chords'} collapsed={sidebarCollapsed} onClick={() => setMode('chords')} />
          <SidebarItem icon="📄" label="Sheet" active={mode === 'sheet'} collapsed={sidebarCollapsed} onClick={() => setMode('sheet')} />
          <SidebarItem icon="🎧" label="Rehearse" active={mode === 'rehearse'} collapsed={sidebarCollapsed} onClick={() => setMode('rehearse')} />
          <SidebarItem icon="🎤" label="Perform" active={mode === 'perform'} collapsed={sidebarCollapsed} onClick={() => setMode('perform')} />
          <SidebarItem icon="🎬" label="Video" active={mode === 'video'} collapsed={sidebarCollapsed} onClick={() => setMode('video')} />
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
              <p className="text-gray-400 mb-4">Lyrics, ideas, and structure go here.</p>

              <div className="mb-4 p-4 rounded bg-gray-800 max-w-xl">
                <p className="text-sm text-gray-300 mb-3">{authMessage}</p>

                {!userEmail ? (
                  <div className="flex flex-col gap-3">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="px-3 py-2 rounded bg-gray-700 text-white"
                    />

                    <button type="button" onClick={sendOtp} className="px-4 py-2 rounded bg-blue-600 text-white">
                      Send Verification Code
                    </button>

                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Verification code"
                      className="px-3 py-2 rounded bg-gray-700 text-white"
                    />

                    <button type="button" onClick={verifyOtp} className="px-4 py-2 rounded bg-green-600 text-white">
                      Verify Code
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-green-400">Signed in as {userEmail}</p>
                    <button type="button" onClick={signOut} className="px-4 py-2 rounded bg-gray-600 text-white">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mb-4">
                <button type="button" onClick={debugProjects} className="px-4 py-2 rounded bg-blue-600 text-white">
                  Log Projects
                </button>

                <button
                  type="button"
                  onClick={() => loadSavedSongSheet('e01a6d78-3e08-4f78-8db8-75c6241196c3')}
                  className="px-4 py-2 rounded bg-purple-600 text-white"
                >
                  Load Saved SongSheet
                </button>
              </div>

              {debugOutput && (
                <pre className="mt-4 p-4 rounded bg-gray-800 text-gray-200 whitespace-pre-wrap text-sm">
                  {debugOutput}
                </pre>
              )}
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
              activePerformanceSectionId={activePerformanceSectionId}
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
  <div className="relative h-full">
    <button
      type="button"
      onClick={() => setPerformControlsOpen((open) => !open)}
      className="fixed right-6 top-20 z-50 px-4 py-2 rounded bg-blue-600 text-white shadow-lg"
    >
      {performControlsOpen ? 'Hide Controls' : 'Show Controls'}
    </button>

    <SongSheet
      performanceSheet={performanceSheet}
      performanceSections={performanceSections}
      performanceFontSize={24}
      activePerformanceSectionId={activePerformanceSectionId}
      performanceSectionRefs={performanceSectionRefs}
    />

    {performControlsOpen && (
     <div className="fixed right-0 top-12 h-[calc(100vh-3rem)] w-[420px] max-w-[90vw] z-40 bg-gray-900 border-l border-gray-700 shadow-2xl overflow-auto p-4">
        <div className="mb-4">
  <h2 className="text-lg font-semibold">Performance Controls</h2>
</div>

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
  </div>
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