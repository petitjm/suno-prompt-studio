'use client'

import type {
  Project,
  FormState,
  GenerateResponse,
  ChordResponse,
  SongVersionRecord,
  ChordVersionRecord,
  ArtistDNAProfile,
  DNAAnalysisInput,
  RewriteMode,
  ChordRewriteMode,
  ProjectSortKey,
  SortDirection,
  PerformanceSection,
  PreviewSectionKey,
  PreviewInstrument,
  PreviewFeel,
  PreviewPattern,
  PreviewBar,
  PreviewBarMeta,
  AppMode,
} from '@/types/song'
import SongEditorPanel from '@/components/SongEditorPanel'

import LiveDiffPreview from '@/components/LiveDiffPreview'

import ComparePanels from '@/components/ComparePanels'

import RewritePanel from '@/components/RewritePanel'


import { shouldStopRewriteAttempts } from '@/lib/rewriteRetry'

import { finalizeRewriteText } from '@/lib/rewriteFinalize'



import { buildStructuredRewriteSource } from '@/lib/rewritePrepare'

import { applyRewriteToTarget } from '@/lib/rewriteApply'


import {
  getMustPreserveLines,
  getRewriteFullSourceText,
} from '@/lib/rewriteSource'


import {
  assertLineCountPreserved,
  assertSelectedSectionOnly,
  isRelaxedChorusRewrite,
  shouldRelaxChorusAfterTwoFailures,
} from '@/lib/rewriteValidation'


import { buildRewriteSuccessMessage } from '@/lib/rewriteMessages'


import {
  countLyricLines,
} from '@/lib/rewriteText'


import { requestRewrite } from '@/lib/rewriteApi'


import {
  buildRewriteInstruction,
  rewritePresets,
} from '@/lib/rewritePrompts'


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
import {
  detectSections,
  extractSectionTextStrict,
  isSectionBoundary,
  normaliseSectionName,
  parseSectionTarget,
} from '@/lib/songSections'







function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group flex w-full items-center justify-center">
      {children}
      <div className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 z-50">
        {label}
      </div>
    </div>
  )
}

const readJsonSafe = async (res: Response) => {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
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
  const [songVersionTitle, setSongVersionTitle] = useState('')
 
  const [highlightedLines, setHighlightedLines] = useState<number[]>([])
  const [performanceSheet, setPerformanceSheet] = useState('')
  const [performanceSections, setPerformanceSections] = useState<PerformanceSection[]>([])
  const [chords, setChords] = useState<ChordResponse | null>(null)
  const [chordExtractionMessage, setChordExtractionMessage] = useState('')
  const [justExtractedChords, setJustExtractedChords] = useState(false)
  const [justExtractedAndRemovedChords, setJustExtractedAndRemovedChords] = useState(false)
  const [chordVersionTitle, setChordVersionTitle] = useState('')
  const [chordsText, setChordsText] = useState('{}')
  const structuredChordJsonRef = React.useRef<HTMLDivElement | null>(null)
  const [rewriteConstraint, setRewriteConstraint] = useState('default')
  const [extractingLyricsOnly, setExtractingLyricsOnly] = useState(false)
  const previewSynthRef = React.useRef<Tone.PolySynth | null>(null)
  const previewTimeoutsRef = React.useRef<number[]>([])
  const performanceSectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})

  const [usingLeft, setUsingLeft] = useState(false)
  const [usingRight, setUsingRight] = useState(false)
  const performanceScrollRef = React.useRef<HTMLDivElement | null>(null)
  const compareLeftRef = React.useRef<HTMLTextAreaElement | null>(null)
const compareRightRef = React.useRef<HTMLTextAreaElement | null>(null)
const previewLeftRef = React.useRef<HTMLDivElement | null>(null)
const previewRightRef = React.useRef<HTMLDivElement | null>(null)

const syncPreviewScroll = (source: 'left' | 'right') => {
  const src = source === 'left' ? previewLeftRef.current : previewRightRef.current
  const tgt = source === 'left' ? previewRightRef.current : previewLeftRef.current
  if (!src || !tgt) return
  tgt.scrollTop = src.scrollTop
}

const syncCompareScroll = (source: 'left' | 'right') => {
  const src = source === 'left' ? compareLeftRef.current : compareRightRef.current
  const tgt = source === 'left' ? compareRightRef.current : compareLeftRef.current
  if (!src || !tgt) return
  tgt.scrollTop = src.scrollTop
}

  
const [rewriteTarget, setRewriteTarget] = useState<'left' | 'right' | 'main'>('right')
const [rewriteInstruction, setRewriteInstruction] = useState('')
const [rewriteLoading, setRewriteLoading] = useState(false)
const [rewriteMessage, setRewriteMessage] = useState('')
const [commercialPolishMode, setCommercialPolishMode] = React.useState(false)
const [loadingLeftCurrent, setLoadingLeftCurrent] = useState(false)
const [loadingRightCurrent, setLoadingRightCurrent] = useState(false)
const lastFollowedSectionIdRef = React.useRef<string | null>(null)
  const [compareLeftSongId, setCompareLeftSongId] = useState('')
  const [compareRightSongId, setCompareRightSongId] = useState('')
    const [compareLeftTitle, setCompareLeftTitle] = useState('')
    const [compareRightTitle, setCompareRightTitle] = useState('')
    const [savingCompareLeft, setSavingCompareLeft] = useState(false)
    const [savingCompareRight, setSavingCompareRight] = useState(false)
    const [lockCompareLeft, setLockCompareLeft] = useState(false)
    const [lockCompareRight, setLockCompareRight] = useState(false)
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

  resetRewriteWorkbenchState()

  setUserEmail(user?.email || null)
  setAuthMessage(`Signed in as ${user?.email}`)
}

const resetRewriteWorkbenchState = (
  target: 'left' | 'right' | 'main' = 'right'
) => {
  setRewriteTarget(target)
  setRewritePreset('')
  setRewriteInstruction('')
  setRewriteConstraint('default')
  setCommercialPolishMode(false)

  setRewriteSectionOnly(false)
  setRewriteSectionName('')
  setRewriteMessage('')
  setRewriteDone(false)
}



const setPerformanceSheetFromEditor = (value: string) => {
  setPerformanceSheet(value)
  resetRewriteWorkbenchState('main')
}

const setCompareLeftTextFromLoader = (value: string) => {
  setCompareLeftText(value)
  resetRewriteWorkbenchState('left')
}

const setCompareRightTextFromLoader = (value: string) => {
  setCompareRightText(value)
  resetRewriteWorkbenchState('right')
}


  const signOut = async () => {
  resetRewriteWorkbenchState()

  await supabase.auth.signOut()

  setUserEmail(null)
  setEmail('')
  setOtp('')
  setAuthMessage('')
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
   

const scrollPerformanceToBarIndex = (
  barIndex: number,
  behavior: ScrollBehavior = 'smooth'
) => {
  const container = performanceScrollRef.current
  if (!container) return
  if (!performanceSections.length) return
  if (!previewBarMeta.length) return

  const safeBarIndex = Math.max(0, Math.min(barIndex, previewBarMeta.length - 1))
  const activeBarMeta = previewBarMeta[safeBarIndex]
  const activeSectionId = activeBarMeta?.sectionId
  if (!activeSectionId) return

  const currentSectionIndex = performanceSections.findIndex(
    (section) => section.id === activeSectionId
  )
  if (currentSectionIndex === -1) return

  const currentSection = performanceSections[currentSectionIndex]
  const nextSection = performanceSections[currentSectionIndex + 1] || null

  const currentSectionEl = performanceSectionRefs.current[currentSection.id]
  if (!currentSectionEl) return

  const currentSectionStartBar =
    previewBarMeta.find((bar) => bar.sectionId === currentSection.id)?.barIndex ??
    safeBarIndex

  const nextSectionStartBar = nextSection
    ? previewBarMeta.find((bar) => bar.sectionId === nextSection.id)?.barIndex ??
      previewBarMeta.length
    : previewBarMeta.length

  const sectionBarSpan = Math.max(1, nextSectionStartBar - currentSectionStartBar)

  const localBarProgress = Math.max(
    0,
    Math.min(1, (safeBarIndex - currentSectionStartBar) / sectionBarSpan)
  )

  const anchorOffset = container.clientHeight * 0.22

  const currentTop = Math.max(0, currentSectionEl.offsetTop - anchorOffset - 12)

  let targetTop = currentTop

  if (nextSection) {
    const nextSectionEl = performanceSectionRefs.current[nextSection.id]

    if (nextSectionEl) {
      const nextTop = Math.max(0, nextSectionEl.offsetTop - anchorOffset)
      targetTop = currentTop + (nextTop - currentTop) * localBarProgress
    }
  }

  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
  const clampedTop = Math.max(0, Math.min(targetTop, maxScrollTop))

  container.scrollTo({
    top: clampedTop,
    behavior,
  })
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
  const sectionId = meta?.sectionId || null

  if (sectionId && sectionId !== lastFollowedSectionIdRef.current) {
    lastFollowedSectionIdRef.current = sectionId
  }

  scrollPerformanceToBarIndex(index)
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


  const latestProjectLoadRef = React.useRef(0)

const [projects, setProjects] = useState<Project[]>([])
const [activeProject, setActiveProject] = useState<Project | null>(null)
const [newProjectName, setNewProjectName] = useState('')
const [projectMessage, setProjectMessage] = useState('')
const [savingSong, setSavingSong] = useState(false)
const [justSavedSong, setJustSavedSong] = useState(false)
const [songVersions, setSongVersions] = useState<SongVersionRecord[]>([])
const [chordVersions, setChordVersions] = useState<ChordVersionRecord[]>([])
const [savingChords, setSavingChords] = useState(false)
const [justSavedChords, setJustSavedChords] = useState(false)


const compareLeftSong = songVersions.find((v) => v.id === compareLeftSongId) || null
const compareRightSong = songVersions.find((v) => v.id === compareRightSongId) || null

const [versionsLoading, setVersionsLoading] = useState(false)
const [activeSongVersionId, setActiveSongVersionId] = useState<string | null>(null)
const [activeChordVersionId, setActiveChordVersionId] = useState<string | null>(null)

const [jumpHighlightLine, setJumpHighlightLine] = useState<number | null>(null)
const [compareLeftText, setCompareLeftText] = useState('')
const [compareRightText, setCompareRightText] = useState('')
const [compareMessage, setCompareMessage] = useState('')
const [comparingNow, setComparingNow] = useState(false)
const writeScrollTopRef = React.useRef(0)
const [flashLeftPanel, setFlashLeftPanel] = useState(false)
const [flashRightPanel, setFlashRightPanel] = useState(false)
const [rewriteDone, setRewriteDone] = useState(false)
const [rewriteSectionOnly, setRewriteSectionOnly] = useState(false)
const [rewriteSectionName, setRewriteSectionName] = useState('')


const resetRewriteSelection = () => {
  setRewriteSectionName('')
  setRewriteMessage('')
}


const [rewritePreset, setRewritePreset] = useState('')
const [applyingLeft, setApplyingLeft] = useState(false)
const [applyingRight, setApplyingRight] = useState(false)

React.useEffect(() => {
  if (rewriteInstruction.toLowerCase().includes('hook')) {
    setRewriteSectionOnly(true)
  }
}, [rewriteInstruction])

React.useEffect(() => {
  if (commercialPolishMode && rewriteConstraint === 'keep-lines') {
    setRewriteConstraint('default')
  }
}, [commercialPolishMode, rewriteConstraint])

React.useEffect(() => {
  if (mode !== 'write') return

  requestAnimationFrame(() => {
    performanceScrollRef.current?.scrollTo({
      top: writeScrollTopRef.current,
      behavior: 'auto',
    })
  })
}, [mode])



React.useEffect(() => {
  setCompareLeftText(compareLeftSong?.result?.lyrics_full || '')
}, [compareLeftSongId])

React.useEffect(() => {
  setCompareRightText(compareRightSong?.result?.lyrics_full || '')
}, [compareRightSongId])




  const stopPreviewPlayback = () => {
    clearPreviewTimeouts()
    lastFollowedSectionIdRef.current = null
    setPreviewPlaying(false)
  }


  React.useEffect(() => {
  if (userEmail) {
    void loadProjects()
  } else {
    setProjects([])
    setActiveProject(null)
    setProjectMessage('')
    setSongVersions([])
    setChordVersions([])
    setPerformanceSheet('')
    setChords(null)
  }
}, [userEmail])

React.useEffect(() => {
  if (activeProject?.id) {
    void loadProjectData(activeProject.id)
  }
}, [activeProject?.id])





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






  const loadProjects = async (preferredProjectId?: string) => {
  try {
    setProjectMessage('Loading projects...')

    const res = await fetch('/api/projects')
    const data = await readJsonSafe(res)
    console.log('Rewrite response:', data)


    if (!res.ok) throw new Error(data.error || 'Failed to load projects')

    const nextProjects: Project[] = Array.isArray(data.projects) ? data.projects : []
    setProjects(nextProjects)

    if (nextProjects.length > 0) {
      setActiveProject((prev) => {
        const targetId = preferredProjectId || prev?.id
        return targetId
          ? nextProjects.find((p) => p.id === targetId) || nextProjects[0]
          : nextProjects[0]
      })
    } else {
      setActiveProject(null)
    }

    setProjectMessage('')
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to load projects')
  }
}

const loadProjectData = async (
  projectId: string,
  options?: { silent?: boolean }
) => {
  const token = Date.now()
  latestProjectLoadRef.current = token

  try {
    setVersionsLoading(true)
    if (!options?.silent) {
  setProjectMessage('Loading project data...')
}

    const [songRes, chordRes] = await Promise.all([
      fetch(`/api/song-versions/${projectId}`),
      fetch(`/api/chord-versions/${projectId}`),
    ])

    const songData = await readJsonSafe(songRes)
    const chordData = await readJsonSafe(chordRes)

    if (latestProjectLoadRef.current !== token) return

    if (!songRes.ok) throw new Error(songData.error || 'Failed to load song versions')
    if (!chordRes.ok) throw new Error(chordData.error || 'Failed to load chord versions')

    const nextSongVersions: SongVersionRecord[] = Array.isArray(songData.versions)
      ? songData.versions
      : []

    const nextChordVersions: ChordVersionRecord[] = Array.isArray(chordData.versions)
      ? chordData.versions
      : []

    setSongVersions(nextSongVersions)

    if (nextSongVersions.length >= 2) {
      setCompareLeftSongId(nextSongVersions[0].id)
      setCompareRightSongId(nextSongVersions[1].id)
    } else {
      setCompareLeftSongId('')
      setCompareRightSongId('')
    }


    setChordVersions(nextChordVersions)
    setActiveSongVersionId(songData.latest?.id || null)
    setActiveChordVersionId(chordData.latest?.id || null)

    const latestLyrics = songData.latest?.result?.lyrics_full || ''
    const latestChordVersion = chordData.latest || null
    const latestChords = latestChordVersion?.chord_data || null

    setPerformanceSheet(latestLyrics)
    setChords(latestChords)
    setChordsText(JSON.stringify(latestChords || {}, null, 2))
    setChordVersionTitle(latestChordVersion?.title || '')

    setProjectMessage('')
  } catch (err: any) {
    if (latestProjectLoadRef.current !== token) return

    console.error(err)
    setProjectMessage(err.message || 'Failed to load project data')
    setPerformanceSheet('')
    setChords(null)
    setChordsText('')
    setSongVersions([])
    setChordVersions([])
  } finally {
    if (latestProjectLoadRef.current === token) {
      setVersionsLoading(false)
    }
  }
}

const autoSnapshot = async (text: string, label: string) => {
  if (!activeProject || !text.trim()) return

  try {
    await fetch('/api/song-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: `Auto: ${label} ${new Date().toLocaleTimeString()}`,
        result: { lyrics_full: text },
      }),
    })
  } catch (err) {
    console.error('Auto snapshot failed', err)
  }
}


const saveSong = async () => {
  try {
    if (!activeProject) {
      setProjectMessage('Select a project first.')
      return
    }

    if (!performanceSheet.trim()) {
      setProjectMessage('No lyrics to save.')
      return
    }

    setSavingSong(true)
    setSongVersionTitle('')
    setJustSavedSong(false)
    

    const res = await fetch('/api/song-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
         title: songVersionTitle.trim() || 'Untitled version',
        result: {
          lyrics_full: performanceSheet,
        },
      }),
    })

    const data = await readJsonSafe(res)

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save song')
    }

    await loadProjectData(activeProject.id, { silent: true })

    setJustSavedSong(true)
    window.setTimeout(() => {
      setJustSavedSong(false)
    }, 1500)
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to save song')
  } finally {
    setSavingSong(false)
  }
}





const createProject = async () => {
  const title = newProjectName.trim()

  if (!title) {
    setProjectMessage('Enter a project name first.')
    return
  }

  try {
    setProjectMessage('Creating project...')

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    const data = await readJsonSafe(res)

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create project')
    }

    setNewProjectName('')
    await loadProjects(data.id)
    setProjectMessage('Project created')
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to create project')
  }
}

const renameProject = async () => {
  try {
    if (!activeProject) {
      setProjectMessage('Select a project first.')
      return
    }

    const nextTitle = window.prompt('Enter a new project name:', activeProject.title)
    if (nextTitle === null) return

    const trimmed = nextTitle.trim()
    if (!trimmed) {
      setProjectMessage('Project name cannot be empty.')
      return
    }

    if (trimmed === activeProject.title) {
      setProjectMessage('Project name unchanged.')
      return
    }

    const res = await fetch(`/api/projects/${activeProject.id}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })

    const data = await readJsonSafe(res)
    if (!res.ok) throw new Error(data.error || 'Failed to rename project')

    await loadProjects(activeProject.id)
    setProjectMessage(`Renamed to: ${trimmed}`)
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to rename project')
  }
}

const duplicateProject = async () => {
  try {
    if (!activeProject) {
      setProjectMessage('Select a project first.')
      return
    }

    const res = await fetch(`/api/projects/${activeProject.id}/duplicate`, {
      method: 'POST',
    })

    const data = await readJsonSafe(res)
    if (!res.ok) throw new Error(data.error || 'Failed to duplicate project')

    await loadProjects(data.project?.id)
    setProjectMessage(`Duplicated: ${data.project?.title || 'Copy created'}`)
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to duplicate project')
  }
}

const deleteProject = async () => {
  try {
    if (!activeProject) {
      setProjectMessage('Select a project first.')
      return
    }

    const ok = window.confirm(`Delete "${activeProject.title}"?`)
    if (!ok) return

    const projectId = activeProject.id
    const projectTitle = activeProject.title

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    })

    const data = await readJsonSafe(res)
    if (!res.ok) throw new Error(data.error || 'Failed to delete project')

    await loadProjects()
    setProjectMessage(`Deleted: ${projectTitle}`)
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to delete project')
  }
}

const scrollToStructuredChordJson = () => {
  window.setTimeout(() => {
    structuredChordJsonRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, 150)
}


const saveChords = async () => {
  try {
    if (!activeProject) {
      setProjectMessage('Select a project first.')
      return
    }

    let chordsToSave: ChordResponse | null = null

        try {
          const parsed = JSON.parse(chordsText)

          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          ) {
            chordsToSave = parsed
          } else {
            setProjectMessage('Chord JSON must be an object, not a number, string, or array.')
            return
          }
        } catch {
          setProjectMessage('Chord JSON is not valid.')
          return
        }

    if (!chordsToSave) {
      setProjectMessage('Chord JSON must be an object, for example: {"key":"G","verse":"G | D7 | G | C"}')
      return
    }

    setSavingChords(true)
    setProjectMessage('Saving chords...')

    const res = await fetch('/api/chord-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: chordVersionTitle.trim() || 'Untitled chords',
        chord_data: chordsToSave,
      }),
    })

        const data = await readJsonSafe(res)
        if (!res.ok) throw new Error(data.error || 'Failed to save chords')

        const savedVersion = data.version




        setChords(chordsToSave)
        setChordsText(JSON.stringify(chordsToSave, null, 2))

        if (savedVersion?.id) {
          setActiveChordVersionId(savedVersion.id)

          setChordVersions((current) => [
            savedVersion,
            ...current.filter((version) => version.id !== savedVersion.id),
          ])
        }

        setChordVersionTitle(savedVersion?.title || chordVersionTitle.trim() || 'Untitled chords')
        setProjectMessage('Chords saved')
        setJustSavedChords(true)

    setTimeout(() => setJustSavedChords(false), 1000)
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to save chords')
  } finally {
    setSavingChords(false)
  }
}

if (!userEmail) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-gray-800 p-6 shadow-xl border border-gray-700">
        <h1 className="text-2xl font-semibold mb-2">Suno Prompt Studio</h1>

        <p className="text-gray-300 mb-4">
          {authMessage || 'Sign in to continue.'}
        </p>

        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-300">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded bg-white text-black border border-gray-400 placeholder-gray-500"
          />

          <button
            type="button"
            onClick={sendOtp}
            className="w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            Send Verification Code
          </button>

          <label className="text-sm text-gray-300 mt-3">Verification code</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter code"
            className="w-full px-3 py-2 rounded bg-white text-black border border-gray-400 placeholder-gray-500"
          />

          <button
            type="button"
            onClick={verifyOtp}
            className="w-full px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-semibold"
          >
            Verify Code
          </button>
        </div>
      </div>
    </div>
  )
}

const getDiffLines = (left: string, right: string) => {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')
  const max = Math.max(leftLines.length, rightLines.length)

  const rows = []

  for (let i = 0; i < max; i++) {
    const l = leftLines[i] || ''
    const r = rightLines[i] || ''

    rows.push({
      left: l,
      right: r,
      changed: l !== r,
    })
  }

  return rows
}


const getWordDiffParts = (left: string, right: string) => {
  const leftWords = left.split(/(\s+)/)
  const rightWords = right.split(/(\s+)/)
  const max = Math.max(leftWords.length, rightWords.length)

  const leftParts = []
  const rightParts = []

  for (let i = 0; i < max; i++) {
    const l = leftWords[i] || ''
    const r = rightWords[i] || ''
    const changed = l !== r

    leftParts.push({ text: l, changed })
    rightParts.push({ text: r, changed })
  }

  return { leftParts, rightParts }
}

const scrollCompareEditorsToLine = (lineIndex: number) => {
  const jumpToLine = (el: HTMLTextAreaElement | null) => {
    if (!el) return

    const lines = el.value.split('\n')
    const safeLineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1))

    const start = lines
      .slice(0, safeLineIndex)
      .reduce((total, line) => total + line.length + 1, 0)

    const end = start + (lines[safeLineIndex]?.length || 0)

    el.focus()
    el.setSelectionRange(start, end)

    // 🔥 smooth scroll to bring line into view
    requestAnimationFrame(() => {
      const computed = window.getComputedStyle(el)
      const lineHeight = Number.parseFloat(computed.lineHeight) || 28

      el.scrollTop = Math.max(
        0,
        safeLineIndex * lineHeight - lineHeight * 4
      )
    })

    // 🔥 brief visual highlight (selection flash)
    setJumpHighlightLine(safeLineIndex)

    setTimeout(() => {
      setJumpHighlightLine(null)
    }, 800)
  }

  jumpToLine(compareLeftRef.current)
  jumpToLine(compareRightRef.current)
}



const editedDiffRows = getDiffLines(compareLeftText, compareRightText)


const formatUkDateTime = (value?: string) => {
  if (!value) return ''

  const hasTimezone =
    value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)

  const date = new Date(hasTimezone ? value : `${value}Z`)

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

const noCompareLocks = !lockCompareLeft && !lockCompareRight

const canApplyLeft = noCompareLocks || lockCompareLeft
const canApplyRight = noCompareLocks || lockCompareRight



  





const extractSectionText = (text: string, sectionName: string) => {
  if (!sectionName.trim()) return text

  const target = parseSectionTarget(sectionName)
  const lines = text.split('\n')

  let matchCount = 0
  let startIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (!isSectionHeader(lines[i])) continue

    if (normaliseSectionName(lines[i]) === target.label) {
      matchCount++

      if (matchCount === target.instance) {
        startIndex = i
        break
      }
    }
  }

  if (startIndex === -1) return text

  let endIndex = lines.length

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (isSectionHeader(lines[i])) {
      endIndex = i
      break
    }
  }

  return lines.slice(startIndex, endIndex).join('\n')
}


const extractEmbeddedChordsToJson = (text: string) => {
  const lines = text.split('\n')

  const sections: Record<string, string[]> = {}
  const sectionCounts: Record<string, number> = {}

  let currentSection = 'unsectioned'

  const makeSectionKey = (heading: string) => {
    const base = normaliseSectionName(heading)
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/gi, '')
      .toLowerCase()

    sectionCounts[base] = (sectionCounts[base] || 0) + 1

    // If the heading already has a number, e.g. verse_1, keep it.
    // If it repeats without a number, e.g. chorus, make chorus_1, chorus_2, etc.
    if (/\d+$/.test(base)) {
      return base
    }

    return `${base}_${sectionCounts[base]}`
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (isSectionHeader(trimmed)) {
      currentSection = makeSectionKey(trimmed)
      continue
    }

    if (looksLikeChordLine(line)) {
      const chordLine = trimmed
        .replace(/^solo\s*/i, '')
        .replace(/\|+/g, '|')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/\s+/g, ' ')
        .trim()

      if (!sections[currentSection]) {
        sections[currentSection] = []
      }

      sections[currentSection].push(chordLine)
    }
  }

  const compactSections: Record<string, string> = {}

  for (const [section, chordLines] of Object.entries(sections)) {
    compactSections[section] = chordLines.join(' / ')
  }

  return {
    source: 'embedded-song-sheet',
    sections: compactSections,
  }
}

const chordRegex =
  /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add|dom)?[0-9]*(maj|min|m|sus|add|dim|aug|b|#|\/|[0-9])*$/i

const looksLikeChordLine = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Do not treat obvious lyric lines as chord lines
  if (/[a-z]{2,}/.test(trimmed.replace(/\b(add|maj|min|dim|aug|sus|solo|intro|outro|bridge|verse|chorus)\b/gi, ''))) {
    const lyricWords = trimmed
      .split(/\s+/)
      .filter((word) => /^[a-z]{2,}$/i.test(word))
      .length

    if (lyricWords >= 3 && !trimmed.includes('|')) return false
  }

  const chordTokenRegex =
    /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add)?[0-9]*(\((add|sus|maj|min|dim|aug)?[#b]?[0-9]+\))?((add|sus|maj|min|dim|aug)[#b]?[0-9]+)?(\/[A-G](#|b)?)?$/i

  const cleaned = trimmed
    .replace(/[|]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  let tokens = cleaned
    .split(' ')
    .flatMap((token) =>
      token
        .replace(/[()[\]]/g, '')
        .split('-')
        .map((part) => part.trim())
        .filter(Boolean)
    )

  const leadingLabels = [
    'solo',
    'intro',
    'outro',
    'instrumental',
    'break',
    'turnaround',
    'alt',
  ]

  if (tokens.length > 1 && leadingLabels.includes(tokens[0].toLowerCase())) {
    tokens = tokens.slice(1)
  }

  if (!tokens.length) return false

const chordCount = tokens.filter((token) => chordTokenRegex.test(token)).length

// Single standalone chord line, e.g. G, D7, Am, Bbmaj7
if (tokens.length === 1 && chordCount === 1) {
  return true
}

// Bar-line chord format, e.g. solo |G |D7 |G |C
if (trimmed.includes('|') && chordCount >= 2) return true

// Spaced chord line, e.g. G        D7       C
if (chordCount >= 2 && chordCount >= Math.ceil(tokens.length * 0.6)) {
  return true
}

return false
}

const extractLyricsOnly = (text: string) => {
  return text
    .split('\n')
    .filter((line) => !looksLikeChordLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


const knownSectionNames = [
  'verse',
  'verse 1',
  'verse 2',
  'verse 3',
  'verse 4',
  'chorus',
  'pre-chorus',
  'pre chorus',
  'bridge',
  'middle 8',
  'intro',
  'outro',
  'hook',
  'refrain',
  'solo',
  'instrumental',
]




const isSectionHeader = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Never treat chord-only lines as section headings
  if (looksLikeChordLine(trimmed)) return false

  // [Verse 1]
  if (/^\[.+\]$/.test(trimmed)) return true

  // Verse 1:
  if (/^[A-Za-z0-9][A-Za-z0-9\s\-\/]*:$/.test(trimmed)) return true

  const normalised = normaliseSectionName(trimmed)

  // Common song section names, with optional numbers
  if (
    /^(intro|verse|pre chorus|pre-chorus|chorus|bridge|middle 8|solo|instrumental|break|outro|tag|refrain)(\s+\d+)?$/.test(
      normalised
    )
  ) {
    return true
  }

  return knownSectionNames.includes(normalised)
}











const sourceForDetection =
  rewriteTarget === 'left'
    ? compareLeftText
    : rewriteTarget === 'right'
      ? compareRightText
      : performanceSheet

     

            

 const detectedSections = detectSections(sourceForDetection, isSectionHeader)

const extractChordsAndRemoveFromRewriteSource = () => {
  const extracted = extractEmbeddedChordsToJson(sourceForDetection)

  if (!Object.keys(extracted.sections).length) {
    setRewriteMessage('No chord lines found to extract.')
    return
  }

  setChords(extracted)
  setChordsText(JSON.stringify(extracted, null, 2))
  scrollToStructuredChordJson()

  removeChordsFromRewriteSource()

  setJustExtractedAndRemovedChords(true)
  const sectionCount = Object.keys(extracted.sections).length
  
  const message = `Chord lines extracted: ${sectionCount} section${
          sectionCount === 1 ? '' : 's'
        } found. Review the JSON, then click Save Chords if you want to keep this version.`

        setChordExtractionMessage(message)
        setRewriteMessage(
          `Chord lines extracted to Structured Chord JSON: ${sectionCount} section${sectionCount === 1 ? '' : 's'} found. Review the JSON, then click Save Chords if you want to keep this version.`
        )
    

  setTimeout(() => setJustExtractedAndRemovedChords(false), 2000)
}

const extractChordsFromRewriteSourceToJson = () => {
  const extracted = extractEmbeddedChordsToJson(sourceForDetection)

  if (!Object.keys(extracted.sections).length) {
    setRewriteMessage('No chord lines found to extract.')
    return
  }

  setChords(extracted)
  setChordsText(JSON.stringify(extracted, null, 2))
  scrollToStructuredChordJson()

  setJustExtractedChords(true)
  const sectionCount = Object.keys(extracted.sections).length
  const message = `Chord lines extracted and removed: ${sectionCount} section${
          sectionCount === 1 ? '' : 's'
        } found. Review the JSON, then click Save Chords if you want to keep this version.`

        setChordExtractionMessage(message)

    setRewriteMessage(
                      `Chord lines extracted to Structured Chord JSON and removed from the song sheet: ${sectionCount} section${sectionCount === 1 ? '' : 's'} found. Review the JSON, then click Save Chords if you want to keep this version.`
                        )

  setTimeout(() => setJustExtractedChords(false), 1000)
}

const removeChordsFromRewriteSource = () => {
  setExtractingLyricsOnly(true)

  const lyricsOnly = extractLyricsOnly(sourceForDetection)

  if (rewriteTarget === 'left') {
    setCompareLeftText(lyricsOnly)
    setFlashLeftPanel(true)
    setTimeout(() => setFlashLeftPanel(false), 600)
  }

  if (rewriteTarget === 'right') {
    setCompareRightText(lyricsOnly)
    setFlashRightPanel(true)
    setTimeout(() => setFlashRightPanel(false), 600)
  }

  if (rewriteTarget === 'main') {
    setPerformanceSheet(lyricsOnly)
  }

  setRewriteSectionName('')
  setRewriteMessage('Chord lines removed. Please re-select the section to rewrite.')

  setTimeout(() => setExtractingLyricsOnly(false), 800)
}






const runRewriteLab = async () => {
const fullSourceText = sourceForDetection
    if (hasChordLinesInRewriteSource) {
      setRewriteMessage('Chords detected. Please remove chord lines before rewriting.')
      return
    }




const sourceText =
  rewriteSectionOnly
    ? extractSectionTextStrict(
        fullSourceText,
        rewriteSectionName,
        isSectionHeader
      )
    : fullSourceText

    assertSelectedSectionOnly({
      rewriteSectionOnly,
      sourceText,
      isSectionBoundary: (line) => isSectionBoundary(line, looksLikeChordLine),
    })


  if (!sourceText.trim()) {
    setRewriteMessage('No text to rewrite.')
    return
  }

  if (!rewriteInstruction.trim()) {
    setRewriteMessage('Enter a rewrite instruction.')
    return
  }

 


  try {
    setRewriteLoading(true)
    setRewriteMessage('Rewriting...')

const originalLineCount = countLyricLines(sourceText, isSectionHeader)

   // const isHookMode = rewriteInstruction.toLowerCase().includes('hook')

    const mustPreserveLines = getMustPreserveLines(rewriteConstraint)


    const structuredSourceText = buildStructuredRewriteSource({
      sourceText,
      rewriteSectionOnly,
      mustPreserveLines,
      isSectionHeader,
    })




let rewritten = ''
let lastLineCount = originalLineCount

for (let attempt = 1; attempt <= 3; attempt++) {
  rewritten = await requestRewrite({
  instruction:
    rewriteSectionOnly
      ? `
STRICT RULES:
- Rewrite ONLY the provided section.
- Preserve meaning and emotional tone.
- Keep structure unless instructed otherwise.

TASK:
${buildRewriteInstruction(
  rewriteInstruction,
  rewriteConstraint,
  rewriteSectionOnly
)}
`
      : buildRewriteInstruction(
          rewriteInstruction,
          rewriteConstraint,
          rewriteSectionOnly
        ),
  lyrics: structuredSourceText,
  sectionOnly: rewriteSectionOnly,
})

const shouldRelaxAfterTwoFailures = shouldRelaxChorusAfterTwoFailures({
  rewriteSectionName,
  rewriteConstraint,
  attempt,
  normaliseSectionName,
})


  const testSection =
  rewriteSectionOnly
    ? extractSectionTextStrict(rewritten, rewriteSectionName,
  (line) => isSectionBoundary(line, looksLikeChordLine)
)
    : rewritten

if (!testSection || !testSection.trim()) {
  continue
}

    if (!testSection || !testSection.trim()) {
  continue // try next attempt
}

  lastLineCount = testSection
    .split('\n')
    .filter((line) => line.trim().length > 0 && !isSectionHeader(line))
    .length

 if (
  shouldStopRewriteAttempts({
    rewriteSectionOnly,
    mustPreserveLines,
    shouldRelaxAfterTwoFailures,
    lastLineCount,
    originalLineCount,
  })
) {
  break
}
}

const relaxedChorusRewrite = isRelaxedChorusRewrite({
  rewriteSectionName,
  rewriteConstraint,
  lastLineCount,
  originalLineCount,
  normaliseSectionName,
})

if (
  rewriteSectionOnly &&
  rewriteConstraint === 'keep-lines' &&
  lastLineCount !== originalLineCount &&
  !relaxedChorusRewrite
) {
  throw new Error(
    `Couldn’t keep ${originalLineCount} lines after 3 attempts (got ${lastLineCount}). Try again or untick “keep lines”.`
  )
}

console.log('rewriteTarget:', rewriteTarget)
console.log('rewriteSectionOnly:', rewriteSectionOnly)
console.log('rewriteSectionName:', rewriteSectionName)
console.log('sourceText:', sourceText)
console.log('rewritten:', rewritten)
console.log('fullSourceText before:', fullSourceText)


if (!rewritten || !rewritten.trim()) {
  throw new Error('Rewrite failed — AI could not produce a valid version. Try again.')
}

const finalText = finalizeRewriteText({
  rewritten,
  rewriteSectionOnly,
  rewriteSectionName,
  fullSourceText,
  sourceText,
  mustPreserveLines,
  originalLineCount,
  isSectionHeader,
  looksLikeChordLine,
})

console.log('REWRITE DEBUG', {
  rewriteTarget,
  rewriteSectionOnly,
  rewriteSectionName,
  sourceText,
  rewritten,
  finalText,
  changed: finalText.trim() !== fullSourceText.trim(),
})


const normaliseForCompare = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim()

if (normaliseForCompare(finalText) === normaliseForCompare(fullSourceText)) {
  setRewriteMessage(
    'Rewrite completed, but the model returned no visible changes. Try a stronger instruction or a different rewrite style.'
  )
  return
}


applyRewriteToTarget({
  rewriteTarget,
  finalText,
  setCompareLeftText,
  setCompareRightText,
  setPerformanceSheet,
  setFlashLeftPanel,
  setFlashRightPanel,
})

setRewriteMessage(
  buildRewriteSuccessMessage({
    rewriteConstraint,
    rewriteSectionName,
    originalLineCount,
    lastLineCount,
    normaliseSectionName,
  })
)
setRewriteDone(true)
setTimeout(() => setRewriteDone(false), 1000)
} catch (err: any) {
  console.error(err)
  setRewriteMessage(err.message || 'Rewrite failed')
} finally {
  setRewriteLoading(false)
}
}


const panelsMatch =
  compareLeftText.trim() === compareRightText.trim()
const hasChordLinesInRewriteSource = sourceForDetection
  .split('\n')
  .some((line) => looksLikeChordLine(line))

  return (

    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-white">
      <div
        className={`${
          sidebarCollapsed ? 'w-14' : 'w-44'
        } shrink-0 bg-gray-800 p-3 flex flex-col transition-all duration-300`}
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

<div className="flex-1 min-w-0 flex flex-col">
  <div className="h-12 bg-gray-800 flex items-center px-4 border-b border-gray-700">
    <span className="text-sm text-gray-400">Mode: {mode.toUpperCase()}</span>

    <div className="ml-auto flex items-center gap-3">
      <span className="text-xs text-green-400">{userEmail}</span>

      <button
        type="button"
        onClick={signOut}
        className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
      >
        Sign Out
      </button>
    </div>
  </div>

        <div ref={performanceScrollRef} className="flex-1 min-h-0 overflow-auto p-6">



          {mode === 'write' && (
            <div>
          <SongEditorPanel
              structuredChordJsonRef={structuredChordJsonRef}
              chordsText={chordsText}
              chordExtractionMessage={chordExtractionMessage}
              setChordsText={setChordsText}
              setChords={setChords}
              saveChords={saveChords}
              savingChords={savingChords}
              justSavedChords={justSavedChords}
              performanceSheet={performanceSheet}
              setPerformanceSheet={setPerformanceSheetFromEditor}
              songVersions={songVersions}
              activeSongVersionId={activeSongVersionId}
              setActiveSongVersionId={setActiveSongVersionId}
              songVersionTitle={songVersionTitle}
              setSongVersionTitle={setSongVersionTitle}
              activeProject={activeProject}
              savingSong={savingSong}
              justSavedSong={justSavedSong}
              saveSong={saveSong}
              comparingNow={comparingNow}
              setComparingNow={setComparingNow}
              compareLeftSongId={compareLeftSongId}
              setCompareLeftSongId={setCompareLeftSongId}
              compareRightSongId={compareRightSongId}
              setCompareRightSongId={setCompareRightSongId}
              setCompareLeftText={setCompareLeftTextFromLoader}
              setCompareRightText={setCompareRightTextFromLoader}
              setFlashLeftPanel={setFlashLeftPanel}
              setFlashRightPanel={setFlashRightPanel}
              loadingLeftCurrent={loadingLeftCurrent}
              setLoadingLeftCurrent={setLoadingLeftCurrent}
              loadingRightCurrent={loadingRightCurrent}
              setLoadingRightCurrent={setLoadingRightCurrent}
              formatUkDateTime={formatUkDateTime}
            />

<ComparePanels
  compareLeftRef={compareLeftRef}
  compareRightRef={compareRightRef}
  compareLeftText={compareLeftText}
  setCompareLeftText={setCompareLeftText}
  compareRightText={compareRightText}
  setCompareRightText={setCompareRightText}
  lockCompareLeft={lockCompareLeft}
  setLockCompareLeft={setLockCompareLeft}
  lockCompareRight={lockCompareRight}
  setLockCompareRight={setLockCompareRight}
  flashLeftPanel={flashLeftPanel}
  flashRightPanel={flashRightPanel}
  setFlashLeftPanel={setFlashLeftPanel}
  setFlashRightPanel={setFlashRightPanel}
  panelsMatch={panelsMatch}
  applyingLeft={applyingLeft}
  setApplyingLeft={setApplyingLeft}
  applyingRight={applyingRight}
  setApplyingRight={setApplyingRight}
  canApplyLeft={canApplyLeft}
  canApplyRight={canApplyRight}
  usingLeft={usingLeft}
  setUsingLeft={setUsingLeft}
  usingRight={usingRight}
  setUsingRight={setUsingRight}
  syncCompareScroll={syncCompareScroll}
  autoSnapshot={autoSnapshot}
  performanceScrollRef={performanceScrollRef}
  setPerformanceSheet={setPerformanceSheetFromEditor}
  setCurrentBarIndex={setCurrentBarIndex}
  setMode={setMode}
/>

<LiveDiffPreview
  previewLeftRef={previewLeftRef}
  previewRightRef={previewRightRef}
  editedDiffRows={editedDiffRows}
  highlightedLines={highlightedLines}
  syncPreviewScroll={syncPreviewScroll}
  scrollCompareEditorsToLine={scrollCompareEditorsToLine}
  getWordDiffParts={getWordDiffParts}
/>


<div className="mb-4 p-4 rounded bg-gray-800 max-w-6xl">
  <RewritePanel
    activeProjectTitle={activeProject?.title}
    rewriteTarget={rewriteTarget}
    setRewriteTarget={setRewriteTarget}
    rewritePreset={rewritePreset}
    setRewritePreset={setRewritePreset}
    rewritePresets={rewritePresets}
    rewriteInstruction={rewriteInstruction}
    setRewriteInstruction={setRewriteInstruction}
    rewriteConstraint={rewriteConstraint}
    setRewriteConstraint={setRewriteConstraint}
    commercialPolishMode={commercialPolishMode}
    setCommercialPolishMode={setCommercialPolishMode}
    rewriteSectionOnly={rewriteSectionOnly}
    setRewriteSectionOnly={setRewriteSectionOnly}
    rewriteSectionName={rewriteSectionName}
    setRewriteSectionName={setRewriteSectionName}
    detectedSections={detectedSections}
    extractChordsAndRemoveFromRewriteSource={extractChordsAndRemoveFromRewriteSource}
    justExtractedAndRemovedChords={justExtractedAndRemovedChords}
    justExtractedChords={justExtractedChords}
    hasChordLinesInRewriteSource={hasChordLinesInRewriteSource}
    extractingLyricsOnly={extractingLyricsOnly}
    removeChordsFromRewriteSource={removeChordsFromRewriteSource}
    extractChordsFromRewriteSourceToJson={extractChordsFromRewriteSourceToJson}
    setRewriteMessage={setRewriteMessage}
    runRewriteLab={runRewriteLab}
    rewriteLoading={rewriteLoading}
    rewriteDone={rewriteDone}
    rewriteMessage={rewriteMessage}
  />
</div>

   <div className="mt-3 max-w-3xl">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Save chord version as...
      </label>

      <input
        value={chordVersionTitle}
        onChange={(e) => setChordVersionTitle(e.target.value)}
        placeholder="Chord version title, e.g. Capo 3 - simplified chorus"
        className="w-full px-3 py-2 rounded bg-gray-700 text-white"
      />
  </div>


             
    {chordVersions.length > 0 && (
      <div className="mb-3 max-w-3xl">
        <h3 className="text-sm text-gray-400 mb-2">Saved Chord Versions</h3>

        <select
          value={activeChordVersionId || ''}
          onChange={(e) => {
            const id = e.target.value
            setActiveChordVersionId(id)

            const selected = chordVersions.find((v) => v.id === id)
            if (selected?.chord_data) {
              setChords(selected.chord_data)
              setChordsText(JSON.stringify(selected.chord_data, null, 2))
              setChordVersionTitle(selected.title || '')
            }
          }}
          className="w-full px-3 py-2 rounded bg-gray-700 text-white"
        >
          {chordVersions.map((v, i) => (
            <option key={v.id} value={v.id}>
              {v.title || `Chord Version ${chordVersions.length - i}`}
              {v.created_at ? ` (${formatUkDateTime(v.created_at)})` : ''}
            </option>
          ))}
        </select>
      </div>
    )}


   






    <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={saveChords}
          disabled={!activeProject || savingChords}
          className={`px-4 py-2 rounded text-white transition disabled:opacity-40 ${
            savingChords
              ? 'bg-gray-600 scale-95'
              : justSavedChords
                ? 'bg-green-600'
                : 'bg-yellow-600'
          }`}
        >
          {savingChords ? 'Saving chords...' : justSavedChords ? 'Saved ✓' : 'Save Chords'}
        </button>
    </div>






    <div className="mb-4 p-4 rounded bg-gray-800 max-w-xl">
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Projects</h2>

              <button
                type="button"
                onClick={() => loadProjects()}
                className="px-3 py-1 rounded bg-gray-600 text-white text-sm"
              >
                Refresh
              </button>
        </div>

          {projectMessage && (
            <p className="text-sm text-gray-400 mb-3">{projectMessage}</p>
          )}

          <div className="flex gap-2 mb-3">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name"
              className="flex-1 px-3 py-2 rounded bg-gray-700 text-white"
             />

            <button
              type="button"
              onClick={createProject}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >
              Create
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={renameProject}
              disabled={!activeProject}
              className="px-3 py-2 rounded bg-gray-600 text-white disabled:opacity-40"
            >
              Rename
            </button>

            <button
              type="button"
              onClick={duplicateProject}
              disabled={!activeProject}
              className="px-3 py-2 rounded bg-gray-600 text-white disabled:opacity-40"
            >
              Duplicate
            </button>

            <button
              type="button"
              onClick={deleteProject}
              disabled={!activeProject}
              className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-40"
            >
              Delete
            </button>
          </div>

          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setActiveProject(project)}
                className={`w-full text-left px-3 py-2 rounded ${
                  activeProject?.id === project.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                <div className="font-medium">{project.title}</div>
                <div className="text-xs opacity-70">{project.id}</div>
              </button>
            ))}
          </div>

          {activeProject && (
            <p className="mt-3 text-sm text-green-400">
              Active project: {activeProject.title}
            </p>
          )}
    
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