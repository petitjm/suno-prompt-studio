'use client'


import SongWorkshopPanel from '@/components/SongWorkshopPanel'

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

import { formatUkDateTime } from '@/lib/format'


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


import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  isSectionHeader,
  normaliseSectionName,
  parseSectionTarget,
} from '@/lib/songSections'

import {
  loadProjectVersions,
  normaliseProjectVersionData,
} from '@/lib/projectVersions'

import {
  extractLyricsOnly,
  looksLikeChordLine,
} from '@/lib/chords'


import VideoPromptBuilder from '@/components/VideoPromptBuilder'




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
  const [generatingChords, setGeneratingChords] = useState(false)
  const [justCopiedChordJson, setJustCopiedChordJson] = useState(false)
  const [justCopiedChordSummary, setJustCopiedChordSummary] = useState(false)
  const [justCopiedChordPacket, setJustCopiedChordPacket] = useState(false)
  const [justCopiedChordPracticePack, setJustCopiedChordPracticePack] = useState(false)
  const [justCopiedChordSheet, setJustCopiedChordSheet] = useState(false)
  const [justCopiedPlacedSongSheet, setJustCopiedPlacedSongSheet] = useState(false)
  const [justClearedChords, setJustClearedChords] = useState(false)
  const [chordTransposeSemitones, setChordTransposeSemitones] = useState(0)
  
  const structuredChordJsonRef = React.useRef<HTMLDivElement | null>(null)
  const [rewriteConstraint, setRewriteConstraint] = useState('default')
  const [extractingLyricsOnly, setExtractingLyricsOnly] = useState(false)
  const previewSynthRef = React.useRef<Tone.PolySynth | null>(null)
  const previewTimeoutsRef = React.useRef<number[]>([])
  const performanceSectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})

  const [protectSongContext, setProtectSongContext] = useState(true)
  const [usingLeft, setUsingLeft] = useState(false)
  const [usingRight, setUsingRight] = useState(false)
  const performanceScrollRef = React.useRef<HTMLDivElement | null>(null)
  const [lastRewriteTargetLabel, setLastRewriteTargetLabel] = useState('')
  const compareLeftRef = React.useRef<HTMLTextAreaElement | null>(null)
  const compareRightRef = React.useRef<HTMLTextAreaElement | null>(null)
  const previewLeftRef = React.useRef<HTMLDivElement | null>(null)
  const previewRightRef = React.useRef<HTMLDivElement | null>(null)
  const suppressCompareScrollSyncRef = React.useRef(false)

  const syncPreviewScroll = (source: 'left' | 'right') => {
  const src = source === 'left' ? previewLeftRef.current : previewRightRef.current
  const tgt = source === 'left' ? previewRightRef.current : previewLeftRef.current
  if (!src || !tgt) return
  tgt.scrollTop = src.scrollTop
}

    const syncCompareScroll = (source: 'left' | 'right') => {
      if (suppressCompareScrollSyncRef.current) return

      const src = source === 'left' ? compareLeftRef.current : compareRightRef.current
      const tgt = source === 'left' ? compareRightRef.current : compareLeftRef.current

      if (!src || !tgt) return

      tgt.scrollTop = src.scrollTop
    }

const [rewriteVoice, setRewriteVoice] = useState('british-natural') 
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
    const pendingCompareScrollRef = React.useRef(false)
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
  setRewriteTarget('main')
  setRewriteSectionName('')
  setRewriteMessage('')
  setRewriteDone(false)
  setCompareUpdateMessage('')
}



const setPerformanceSheetFromCompareUse = (value: string) => {
  setPerformanceSheet(value)
  setRewriteSectionName('')
  setRewriteMessage('')
  setRewriteDone(false)
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

const scrollToComparePreviewWhenReady = (attempt = 0) => {
  const comparePreview = document.getElementById('rewrite-compare-preview')

      if (comparePreview) {
        comparePreview.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
        return
      }

      if (attempt >= 10) {
        return
      }

      window.setTimeout(() => {
        scrollToComparePreviewWhenReady(attempt + 1)
      }, 100)
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

const activeSongVersion = songVersions.find(
      (version) => version.id === activeSongVersionId
    )

const [jumpHighlightLine, setJumpHighlightLine] = useState<number | null>(null)
const [compareLeftText, setCompareLeftText] = useState('')
const [compareRightText, setCompareRightText] = useState('')
const [compareMessage, setCompareMessage] = useState('')
const [comparingNow, setComparingNow] = useState(false)
const writeScrollTopRef = React.useRef(0)
const videoScrollTopRef = React.useRef(0)
const sheetScrollTopRef = React.useRef(0)

const handleWorkspaceScroll = () => {
  const currentScrollTop = performanceScrollRef.current?.scrollTop || 0

  if (mode === 'write') {
    writeScrollTopRef.current = currentScrollTop
  }

  if (mode === 'sheet') {
    sheetScrollTopRef.current = currentScrollTop
  }

  if (mode === 'video') {
    videoScrollTopRef.current = currentScrollTop
  }
}



const saveCurrentModeScroll = () => {
  const currentScrollTop = performanceScrollRef.current?.scrollTop || 0

  if (mode === 'write') {
    writeScrollTopRef.current = currentScrollTop
  }

  if (mode === 'sheet') {
    sheetScrollTopRef.current = currentScrollTop
  }

  if (mode === 'video') {
    videoScrollTopRef.current = currentScrollTop
  }
}

const handleModeChange = (nextMode: AppMode) => {
  handleWorkspaceScroll()
  setMode(nextMode)
}

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


useEffect(() => {
  if (mode !== 'write' || !pendingCompareScrollRef.current) {
    return
  }

  pendingCompareScrollRef.current = false

  const scrollToCompareEditors = (attempt = 0) => {
    const compareTarget =
      compareLeftRef.current ||
      compareRightRef.current ||
      document.getElementById('rewrite-compare-preview')

    if (compareTarget) {
      compareTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      return
    }

    if (attempt >= 20) {
      return
    }

    window.setTimeout(() => {
      scrollToCompareEditors(attempt + 1)
    }, 100)
  }

  requestAnimationFrame(() => {
    scrollToCompareEditors()

    window.setTimeout(() => {
      scrollToCompareEditors()
    }, 250)

    window.setTimeout(() => {
      scrollToCompareEditors()
    }, 600)
  })
}, [mode, compareLeftText, compareRightText])

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
  let nextScrollTop = 0

  if (mode === 'write') {
    nextScrollTop = writeScrollTopRef.current
  }

  if (mode === 'sheet') {
    nextScrollTop = sheetScrollTopRef.current
  }

  if (mode === 'video') {
    nextScrollTop = videoScrollTopRef.current
  }

  const restoreScroll = () => {
    performanceScrollRef.current?.scrollTo({
      top: nextScrollTop,
      behavior: 'auto',
    })
  }

  const frameId = window.requestAnimationFrame(restoreScroll)
  const firstTimer = window.setTimeout(restoreScroll, 50)
  const secondTimer = window.setTimeout(restoreScroll, 250)
  const thirdTimer = window.setTimeout(restoreScroll, 600)

  return () => {
    window.cancelAnimationFrame(frameId)
    window.clearTimeout(firstTimer)
    window.clearTimeout(secondTimer)
    window.clearTimeout(thirdTimer)
  }
}, [mode])

const [compareUpdateMessage, setCompareUpdateMessage] = useState('')

React.useEffect(() => {
  setCompareLeftText(compareLeftSong?.result?.lyrics_full || '')
}, [compareLeftSongId])

React.useEffect(() => {
  setCompareRightText(compareRightSong?.result?.lyrics_full || '')
}, [compareRightSongId])

  const sourceForDetection =
  rewriteTarget === 'left'
    ? compareLeftText
    : rewriteTarget === 'right'
      ? compareRightText
      : performanceSheet

 const detectedSections = detectSections(sourceForDetection, isSectionHeader)


   const detectedSectionLabels = detectedSections
  .map((section) => section.label)
  .join('|||')



  const stopPreviewPlayback = () => {
    clearPreviewTimeouts()
    lastFollowedSectionIdRef.current = null
    setPreviewPlaying(false)
  }

useEffect(() => {
  setRewriteTarget('main')
  setRewritePreset('')
  setRewriteInstruction('')
  setRewriteConstraint('default')
  setCommercialPolishMode(false)
  setRewriteVoice('british-natural')
  setProtectSongContext(true)
  setRewriteSectionOnly(false)
  setRewriteSectionName('')
  setRewriteMessage('')
  setCompareUpdateMessage('')
}, [activeProject?.id])


      useEffect(() => {
  const availableSectionLabels = detectedSectionLabels
    ? detectedSectionLabels.split('|||')
    : []

  if (availableSectionLabels.length === 0) {
    if (rewriteSectionOnly) {
      setRewriteSectionOnly(false)
    }

    if (rewriteSectionName) {
      setRewriteSectionName('')
      setRewriteMessage('')
    }

    return
  }

  if (
    rewriteSectionName &&
    !availableSectionLabels.includes(rewriteSectionName)
  ) {
    setRewriteSectionName('')
    setRewriteMessage('')
  }
}, [detectedSectionLabels, rewriteSectionName, rewriteSectionOnly])



  React.useEffect(() => {
  if (userEmail) {
    void loadProjects()
  } else {
    setProjects([])
    setActiveProject(null)
    setProjectMessage('')
    setSongVersions([])
    setSongVersionTitle('')
    setChordVersions([])
    setChordVersionTitle('')
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
    setActiveSongVersionId(null)
    setSongVersionTitle('')

    setActiveChordVersionId(null)
    setChordVersionTitle('')
  const token = Date.now()
  latestProjectLoadRef.current = token

try {
  setVersionsLoading(true)

  if (!options?.silent) {
    setProjectMessage('Loading project data...')
  }

  const projectVersionResult = await loadProjectVersions(
    projectId,
    readJsonSafe
  )

  if (latestProjectLoadRef.current !== token) return

  const songData = projectVersionResult.song.ok
    ? projectVersionResult.song.data
    : { versions: [], latest: null }

  const chordData = projectVersionResult.chord.ok
    ? projectVersionResult.chord.data
    : { versions: [], latest: null }

  if (!projectVersionResult.song.ok || !projectVersionResult.chord.ok) {
    const messages = [
      projectVersionResult.song.ok ? '' : projectVersionResult.song.error,
      projectVersionResult.chord.ok ? '' : projectVersionResult.chord.error,
    ].filter(Boolean)

    setProjectMessage(messages.join(' / '))
  }

  const normalisedProjectData = normaliseProjectVersionData(songData, chordData)

  setSongVersions(normalisedProjectData.songVersions)

  setCompareLeftSongId(normalisedProjectData.initialCompareSongIds.leftId)
  setCompareRightSongId(normalisedProjectData.initialCompareSongIds.rightId)

  setChordVersions(normalisedProjectData.chordVersions)
  setActiveSongVersionId(normalisedProjectData.activeSongVersionId)
  setActiveChordVersionId(normalisedProjectData.activeChordVersionId)

  setPerformanceSheet(normalisedProjectData.latestLyrics)
  setChords(normalisedProjectData.latestChords)
  setChordsText(JSON.stringify(normalisedProjectData.latestChords || {}, null, 2))
  setChordVersionTitle(normalisedProjectData.latestChordVersion?.title || '')

  if (projectVersionResult.song.ok && projectVersionResult.chord.ok) {
    setProjectMessage('')
  }
} catch (err: any) {
  if (latestProjectLoadRef.current !== token) return

  console.error(err)
  setProjectMessage(err.message || 'Failed to load project data')
  setPerformanceSheet('')
  setChords(null)
  setChordsText('')
  setSongVersions([])
  setChordVersions([])
}
   finally {
    if (latestProjectLoadRef.current === token) {
      setVersionsLoading(false)
    }
  }
}

const autoSnapshot = async (text: string, label: string) => {
      if (!activeProject || !text.trim()) return

      try {
        const res = await fetch('/api/song-versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: activeProject.id,
            title: `Auto: ${label}`,
            result: { lyrics_full: text },
          }),
        })

        const data = await readJsonSafe(res)

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create auto snapshot')
        }

        if (data.version?.id) {
          setSongVersions((current) => [
            data.version,
            ...current.filter((version) => version.id !== data.version.id),
          ])
        }
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
    const savedVersion = data.version

    await loadProjectData(activeProject.id, { silent: true })

        if (savedVersion?.id) {
          setActiveSongVersionId(savedVersion.id)
        }

        setProjectMessage(
          `Saved song version: ${savedVersion?.title || songVersionTitle.trim() || 'Untitled version'}`
        )

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





const hasChordEditorContent = () => {
  return Boolean(chordsText.trim())
}


const getChordDataFromEditorJson = () => {
  if (!chordsText.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(chordsText)

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return parsed
    }

    return null
  } catch {
    return null
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

const loadChordVersionIntoEditor = (versionId: string) => {
  const selected = chordVersions.find((version) => version.id === versionId)

  if (!selected) {
    return
  }

  setActiveChordVersionId(selected.id)
  setChordVersionTitle(selected.title || 'Untitled chord version')
  setChords(selected.chord_data || null)
  setChordsText(JSON.stringify(selected.chord_data || {}, null, 2))
  setChordExtractionMessage('')
  setProjectMessage(`Loaded chord version: ${selected.title || 'Untitled chord version'}`)
}

const copyChordJson = async () => {
  if (!chordsText.trim()) {
    setChordExtractionMessage('No chord JSON available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(chordsText)
    setJustCopiedChordJson(true)
    setChordExtractionMessage('Chord JSON copied.')

    window.setTimeout(() => {
      setJustCopiedChordJson(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy chord JSON.')
  }
}


const copyChordPacket = async () => {
  const copyText = buildChordPacketCopyText()

  if (!copyText) {
    setChordExtractionMessage('No chord data available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedChordPacket(true)
    setChordExtractionMessage('Chord packet copied.')

    window.setTimeout(() => {
      setJustCopiedChordPacket(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy chord packet.')
  }
}


const copyChordPracticePack = async () => {
  const copyText = buildChordPracticePackCopyText()

  if (!copyText) {
    setChordExtractionMessage('No usable chord data available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedChordPracticePack(true)
    setChordExtractionMessage('Chord practice pack copied.')

    window.setTimeout(() => {
      setJustCopiedChordPracticePack(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy chord practice pack.')
  }
}

const copyChordSheet = async () => {
  const copyText = buildChordSheetCopyText()

  if (!copyText) {
    setChordExtractionMessage('No usable chord sheet available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedChordSheet(true)
    setChordExtractionMessage('Chord sheet copied.')

    window.setTimeout(() => {
      setJustCopiedChordSheet(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy chord sheet.')
  }
}

const copyPlacedSongSheet = async () => {
  const copyText = buildPlacedSongSheetCopyText()

  if (!copyText) {
    setChordExtractionMessage('No placed chord songsheet available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedPlacedSongSheet(true)
    setChordExtractionMessage('Performance songsheet copied.')

    window.setTimeout(() => {
      setJustCopiedPlacedSongSheet(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy performance songsheet.')
  }
}



const sharpNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const flatToSharpNoteMap: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

const transposeRootNote = (root: string, semitones: number) => {
  const normalizedRoot = flatToSharpNoteMap[root] || root
  const noteIndex = sharpNotes.indexOf(normalizedRoot)

  if (noteIndex === -1) {
    return root
  }

  const transposedIndex = (noteIndex + semitones + 1200) % 12

  return sharpNotes[transposedIndex]
}

const transposeChordSymbol = (chord: string, semitones: number) => {
  if (semitones === 0) {
    return chord
  }

  return chord.replace(
    /(^|\/)([A-G](?:#|b)?)/g,
    (_match, prefix: string, root: string) => {
      return `${prefix}${transposeRootNote(root, semitones)}`
    },
  )
}

const getTransposeLabel = () => {
  if (chordTransposeSemitones === 0) {
    return 'Original key'
  }

  return chordTransposeSemitones > 0
    ? `+${chordTransposeSemitones} semitone${chordTransposeSemitones === 1 ? '' : 's'}`
    : `${chordTransposeSemitones} semitone${chordTransposeSemitones === -1 ? '' : 's'}`
}

const getTransposedKeyLabel = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return ''
  }

  const record = chordData as Record<string, unknown>
  const keyValue = getStringValue(record.key)

  if (!keyValue) {
    return ''
  }

  if (chordTransposeSemitones === 0) {
    return keyValue
  }

  return `${keyValue} → ${transposeChordSymbol(keyValue, chordTransposeSemitones)}`
}


const transposePlacedSongSheetLine = (
  line: PlacedSongSheetLine,
): PlacedSongSheetLine => {
  return {
    ...line,
    chords: line.chords.map((placement) => ({
      ...placement,
      chord: transposeChordSymbol(placement.chord, chordTransposeSemitones),
    })),
  }
}




const copyChordSummary = async () => {
  const copyText = buildChordSummaryCopyText()

  if (!copyText) {
    setChordExtractionMessage('No chord summary available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedChordSummary(true)
    setChordExtractionMessage('Chord summary copied.')

    window.setTimeout(() => {
      setJustCopiedChordSummary(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy chord summary.')
  }
}


const getChordSummaryRows = (value: unknown): { label: string; value: string }[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, entry]) => {
      if (typeof entry === 'string') {
        return [
          {
            label: key,
            value: entry,
          },
        ]
      }

      if (Array.isArray(entry)) {
        return [
          {
            label: key,
            value: entry
              .map((item) =>
                typeof item === 'string' ? item : JSON.stringify(item),
              )
              .join('\n'),
          },
        ]
      }

      if (entry && typeof entry === 'object') {
        return Object.entries(entry as Record<string, unknown>).map(
          ([nestedKey, nestedValue]) => ({
            label: `${key}.${nestedKey}`,
            value:
              typeof nestedValue === 'string'
                ? nestedValue
                : JSON.stringify(nestedValue),
          }),
        )
      }

      return []
    })
    .filter((row) => row.value.trim())
}





const getUsableChordDataFromEditor = () => {
  if (!chordsText.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(chordsText)

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length > 0
    ) {
      return parsed
    }

    return null
  } catch {
    return null
  }
}


const hasUsableChordData = () => {
  return getUsableChordDataFromEditor() !== null
}

const buildChordPacketCopyText = () => {
  const chordData = getUsableChordDataFromEditor()

  if (!chordData) {
    return ''
  }

  const rows = getChordSummaryRows(chordData)

  return [
    'CHORD WORKSHOP PACKET',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    `Editor status: ${chordEditorStatus.label}`,
    `Transpose: ${getTransposeLabel()}`,
    getTransposedKeyLabel()
      ? `Displayed key: ${getTransposedKeyLabel()}`
      : '',
    '',
    '',
    'CHORD SUMMARY',
    '',
    ...(rows.length > 0
      ? rows.flatMap((row) => [
          row.label,
          row.value,
          '',
        ])
      : ['No chord summary available.', '']),
    '',
    'CHORD JSON',
    '',
    chordsText.trim() || 'No chord JSON available.',
    '',
    'SOURCE LYRICS',
    '',
    performanceSheet || 'No source lyrics available.',
  ].join('\n')
}


const buildChordPracticePackCopyText = () => {
  const chordData = getUsableChordDataFromEditor()

  if (!chordData) {
    return ''
  }

  const rows = getChordSummaryRows(chordData)

  return [
    'CHORD PRACTICE PACK',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    `Editor status: ${chordEditorStatus.label}`,
    '',
    'CHORD SUMMARY',
    '',
    ...(rows.length > 0
      ? rows.flatMap((row) => [
          row.label,
          row.value,
          '',
        ])
      : ['No chord summary available.', '']),
    '',
    'SOURCE LYRICS',
    '',
    performanceSheet || 'No source lyrics available.',
  ].join('\n')
}

const buildChordSheetCopyText = () => {
  const chordData = getUsableChordDataFromEditor()

  if (!chordData) {
    return ''
  }

  const rows = getChordSummaryRows(chordData)

  if (rows.length === 0) {
    return ''
  }

  const getMetaValue = (keys: string[]) => {
    const record = chordData as Record<string, unknown>

    for (const key of keys) {
      const value = record[key]

      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }

    return ''
  }

  const keyValue = getMetaValue(['key', 'songKey'])
  const capoValue = getMetaValue(['capo'])
  const tuningValue = getMetaValue(['tuning'])

  return [
    'CHORD SHEET',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    keyValue ? `Key: ${keyValue}` : '',
    capoValue ? `Capo: ${capoValue}` : '',
    tuningValue ? `Tuning: ${tuningValue}` : '',
    '',
    ...rows.flatMap((row) => [
      `[${row.label}]`,
      row.value,
      '',
    ]),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')
}


type PlacedChord = {
  chord: string
  charIndex: number
}

type PlacedSongSheetLine = {
  section: string
  lyric: string
  chords: PlacedChord[]
}

const getStringValue = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : ''
}

const getNumberValue = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const getPlacedSongSheetLines = (value: unknown): PlacedSongSheetLine[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>

  const candidateLines =
    record.songSheetLines ||
    record.songsheetLines ||
    record.performanceSongSheetLines ||
    record.performanceSheetLines ||
    record.lines

  if (!Array.isArray(candidateLines)) {
    return []
  }

  return candidateLines
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null
      }

      const lineRecord = entry as Record<string, unknown>
      const lyric =
        getStringValue(lineRecord.lyric) ||
        getStringValue(lineRecord.text) ||
        getStringValue(lineRecord.line)

      const section = getStringValue(lineRecord.section)

      const rawChords = Array.isArray(lineRecord.chords)
        ? lineRecord.chords
        : []

      const chords = rawChords
        .map((rawChord) => {
          if (
            !rawChord ||
            typeof rawChord !== 'object' ||
            Array.isArray(rawChord)
          ) {
            return null
          }

          const chordRecord = rawChord as Record<string, unknown>
          const chord = getStringValue(chordRecord.chord)

          const rawIndex =
            getNumberValue(chordRecord.charIndex) ??
            getNumberValue(chordRecord.index) ??
            getNumberValue(chordRecord.position)

          if (!chord || rawIndex === null) {
            return null
          }

          return {
            chord,
            charIndex: Math.max(0, Math.floor(rawIndex)),
          }
        })
        .filter((chord): chord is PlacedChord => Boolean(chord))

      if (!lyric && chords.length === 0) {
        return null
      }

      return {
        section,
        lyric,
        chords,
      }
    })
    .filter((line): line is PlacedSongSheetLine => Boolean(line))
}


const renderPlacedSongSheetLine = (line: PlacedSongSheetLine) => {
  const lyric = line.lyric
  const baseLength = Math.max(lyric.length, 1)
  const chordCharacters = Array.from({ length: baseLength }, () => ' ')

  const sortedChords = [...line.chords].sort(
    (left, right) => left.charIndex - right.charIndex,
  )

  sortedChords.forEach((placement) => {
    let startIndex = Math.min(placement.charIndex, chordCharacters.length)

    while (
      chordCharacters
        .slice(startIndex, startIndex + placement.chord.length)
        .some((character) => character !== ' ')
    ) {
      startIndex += 1
    }

    while (chordCharacters.length < startIndex + placement.chord.length) {
      chordCharacters.push(' ')
    }

    placement.chord.split('').forEach((character, characterIndex) => {
      chordCharacters[startIndex + characterIndex] = character
    })
  })

  return [
    chordCharacters.join('').trimEnd(),
    lyric,
  ]
}

const buildPlacedSongSheetCopyText = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData) {
    return ''
  }

  const lines = getPlacedSongSheetLines(chordData)

  if (lines.length === 0) {
    return ''
  }

  let currentSection = ''

  const renderedLines = lines.flatMap((line) => {
    const output: string[] = []

    if (line.section && line.section !== currentSection) {
      currentSection = line.section
      output.push('')
      output.push(`[${line.section}]`)
      output.push('')
    }

    const [chordLine, lyricLine] = renderPlacedSongSheetLine(
      transposePlacedSongSheetLine(line),
    )

    if (chordLine) {
      output.push(chordLine)
    }

    output.push(lyricLine)
    output.push('')

    return output
  })

  return [
    'PERFORMANCE SONGSHEET',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    `Editor status: ${chordEditorStatus.label}`,
    `Transpose: ${getTransposeLabel()}`,
    '',
    ...renderedLines,
  ]
    .filter((line, index, linesToFilter) => {
      if (line !== '') {
        return true
      }

      return linesToFilter[index - 1] !== ''
    })
    .join('\n')
}


const getChordEditorStatus = () => {
  const usableChordData = hasUsableChordData()
  const summaryRows = getChordSummaryRows(getUsableChordDataFromEditor() || chords)

  if (!chordsText.trim()) {
    return {
      label: 'Empty editor',
      detail: 'No chord JSON is currently in the editor.',
    }
  }

  if (!usableChordData) {
    return {
      label: 'Invalid or incomplete JSON',
      detail: 'The editor has text, but it is not valid usable chord JSON yet.',
    }
  }

  return {
    label: activeChordVersionId ? 'Saved chord version loaded' : 'Unsaved chord draft',
    detail: `${summaryRows.length} chord section${summaryRows.length === 1 ? '' : 's'} available.`,
  }
}

const chordSummaryRows = getChordSummaryRows(chords)
const chordEditorStatus = getChordEditorStatus()
const chordSheetPreview = buildChordSheetCopyText()
const placedSongSheetPreview = buildPlacedSongSheetCopyText()

const buildChordSummaryCopyText = () => {
  const rows = getChordSummaryRows(chords)

  if (rows.length === 0) {
    return ''
  }

  return [
    'CHORD SUMMARY',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    `Editor status: ${chordEditorStatus.label}`,
    `Editor status detail: ${chordEditorStatus.detail}`,
    '',
    ...rows.flatMap((row) => [
      row.label,
      row.value,
      '',
    ]),
  ].join('\n')
}




const generateChords = async () => {
  if (!performanceSheet.trim()) {
    setChordExtractionMessage('Add lyrics before generating chords.')
    return
  }

  setGeneratingChords(true)
  setChordExtractionMessage('Generating chords...')
  setProjectMessage('')

  try {
    const res = await fetch('/api/chords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lyrics: performanceSheet,
        songTitle: activeProject?.title || '',
        songVersionTitle:
          activeSongVersion?.title || songVersionTitle || '',
      }),
    })

    const data = await readJsonSafe(res)

    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate chords.')
    }

    const generatedChords = data.chords || data.result || data

    if (
      !generatedChords ||
      typeof generatedChords !== 'object' ||
      Array.isArray(generatedChords)
    ) {
      throw new Error('Chord generation did not return a valid chord object.')
    }

    setChords(generatedChords)
    setChordsText(JSON.stringify(generatedChords, null, 2))
    setChordExtractionMessage('Chords generated. Review and save when ready.')

    if (!chordVersionTitle.trim()) {
      setChordVersionTitle('Generated chord draft')
    }
  } catch (error) {
    setChordExtractionMessage(
      error instanceof Error
        ? error.message
        : 'Failed to generate chords.',
    )
  } finally {
    setGeneratingChords(false)
  }
}

const clearChordEditor = () => {
  setChords(null)
  setChordsText('')
  setChordVersionTitle('')
  setActiveChordVersionId(null)
  setChordExtractionMessage('Chord editor cleared.')
  setProjectMessage('')
  setJustClearedChords(true)
  setChordTransposeSemitones(0)

  window.setTimeout(() => {
    setJustClearedChords(false)
  }, 1500)
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
        setChordExtractionMessage(
          'Chord JSON must be an object, not a number, string, or array.'
        )
        setProjectMessage('')
        return
      }
    } catch {
      setChordExtractionMessage('Chord JSON is not valid.')
      setProjectMessage('')
      return
    }

    if (!chordsToSave) {
      setChordExtractionMessage(
        'Chord JSON must be an object, for example: {"key":"G","verse":"G | D7 | G | C"}'
      )
      setProjectMessage('')
      return
    }

    const getChordStringValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap(getChordStringValues)
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(getChordStringValues)
  }

  return []
}

const suspiciousChordText = getChordStringValues(chordsToSave).some((value) =>
  /([a-zA-Z])\1{7,}/.test(value)
)

if (suspiciousChordText) {
  setChordExtractionMessage(
    'Chord JSON is valid, but one or more chord lines contains suspicious long text. Please check the chord data before saving.'
  )
  setProjectMessage('')
  return
}

    setSavingChords(true)
    setChordExtractionMessage('')
    setProjectMessage('Saving chords...')

    const chordTitleToSave =
      chordVersionTitle.trim() || `Chord version ${chordVersions.length + 1}`

    const res = await fetch('/api/chord-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: chordTitleToSave,
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

    const savedChordTitle =
      savedVersion?.title || chordTitleToSave

    setChordVersionTitle(savedChordTitle)
    setProjectMessage(`Saved chord version: ${savedChordTitle}`)
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
  type DiffRow = {
    left: string
    right: string
    changed: boolean
    leftLineIndex: number | null
    rightLineIndex: number | null
  }

  type SongLine = {
    text: string
    lineIndex: number
  }

  type SongBlock = {
    key: string
    heading: string
    headingLineIndex: number | null
    lines: SongLine[]
  }

  const normaliseLineForDiff = (value: string) =>
    String(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}' ]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  const normaliseHeading = (value: string) =>
    String(value)
      .toLowerCase()
      .replace(/^\s*\[/, '')
      .replace(/\]\s*$/, '')
      .replace(/[^\p{L}\p{N} ]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  const getSectionBase = (line: string) => {
    const normalised = normaliseHeading(line)

    if (/^final\s*chorus\s*\d*$/.test(normalised)) return 'finalchorus'
    if (/^verse\s*\d*$/.test(normalised)) return 'verse'
    if (/^chorus\s*\d*$/.test(normalised)) return 'chorus'
    if (/^bridge\s*\d*$/.test(normalised)) return 'bridge'
    if (/^pre\s*chorus\s*\d*$/.test(normalised)) return 'prechorus'
    if (/^prechorus\s*\d*$/.test(normalised)) return 'prechorus'
    if (/^intro\s*\d*$/.test(normalised)) return 'intro'
    if (/^outro\s*\d*$/.test(normalised)) return 'outro'

    return ''
  }

  const getExplicitSectionNumber = (line: string) => {
    const match = normaliseHeading(line).match(/(\d+)$/)
    return match ? Number(match[1]) : null
  }

  const splitIntoBlocks = (text: string) => {
    const lines = text.split('\n')
    const counts: Record<string, number> = {}
    const blocks: SongBlock[] = []

    let currentBlock: SongBlock = {
      key: 'preamble',
      heading: '',
      headingLineIndex: null,
      lines: [],
    }

    const finishCurrentBlock = () => {
      if (
        currentBlock.heading ||
        currentBlock.lines.some((line) => line.text.trim())
      ) {
        blocks.push(currentBlock)
      }
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const base = getSectionBase(line)

      if (base) {
        finishCurrentBlock()

        const explicitNumber = getExplicitSectionNumber(line)
        counts[base] = explicitNumber || (counts[base] || 0) + 1

        currentBlock = {
          key: `${base}-${counts[base]}`,
          heading: line,
          headingLineIndex: lineIndex,
          lines: [],
        }

        continue
      }

      currentBlock.lines.push({
        text: line,
        lineIndex,
      })
    }

    finishCurrentBlock()

    return blocks
  }

  const wordsForLine = (value: string) =>
    normaliseLineForDiff(value)
      .split(' ')
      .filter(Boolean)

  const lineSimilarity = (leftLine: string, rightLine: string) => {
    const leftNormalised = normaliseLineForDiff(leftLine)
    const rightNormalised = normaliseLineForDiff(rightLine)

    if (!leftNormalised && !rightNormalised) return 1
    if (!leftNormalised || !rightNormalised) return 0
    if (leftNormalised === rightNormalised) return 1

    const leftWords = new Set(wordsForLine(leftLine))
    const rightWords = new Set(wordsForLine(rightLine))

    if (!leftWords.size || !rightWords.size) return 0

    const shared = [...leftWords].filter((word) => rightWords.has(word)).length

    return shared / Math.max(1, Math.min(leftWords.size, rightWords.size))
  }

  const alignLines = (leftLines: SongLine[], rightLines: SongLine[]) => {
    const rows: DiffRow[] = []
    const gapPenalty = -0.35

    const scoreLines = (leftLine: string, rightLine: string) => {
      const leftNormalised = normaliseLineForDiff(leftLine)
      const rightNormalised = normaliseLineForDiff(rightLine)

      if (!leftNormalised && !rightNormalised) return 2
      if (!leftNormalised || !rightNormalised) return -1
      if (leftNormalised === rightNormalised) return 4

      const similarity = lineSimilarity(leftLine, rightLine)

      if (similarity >= 0.65) return 2.5 + similarity
      if (similarity >= 0.35) return 1 + similarity
      if (similarity >= 0.2) return similarity

      return -1
    }

    const scores = Array.from({ length: leftLines.length + 1 }, () =>
      Array(rightLines.length + 1).fill(0),
    )

    for (let leftIndex = 1; leftIndex <= leftLines.length; leftIndex++) {
      scores[leftIndex][0] = leftIndex * gapPenalty
    }

    for (let rightIndex = 1; rightIndex <= rightLines.length; rightIndex++) {
      scores[0][rightIndex] = rightIndex * gapPenalty
    }

    for (let leftIndex = 1; leftIndex <= leftLines.length; leftIndex++) {
      for (let rightIndex = 1; rightIndex <= rightLines.length; rightIndex++) {
        const leftLine = leftLines[leftIndex - 1]?.text || ''
        const rightLine = rightLines[rightIndex - 1]?.text || ''

        const diagonal =
          scores[leftIndex - 1][rightIndex - 1] +
          scoreLines(leftLine, rightLine)

        const deleteLeft = scores[leftIndex - 1][rightIndex] + gapPenalty
        const insertRight = scores[leftIndex][rightIndex - 1] + gapPenalty

        scores[leftIndex][rightIndex] = Math.max(
          diagonal,
          deleteLeft,
          insertRight,
        )
      }
    }

    let leftIndex = leftLines.length
    let rightIndex = rightLines.length

    while (leftIndex > 0 || rightIndex > 0) {
      const leftLine = leftLines[leftIndex - 1]?.text || ''
      const rightLine = rightLines[rightIndex - 1]?.text || ''
      const leftOriginalIndex = leftLines[leftIndex - 1]?.lineIndex ?? null
      const rightOriginalIndex = rightLines[rightIndex - 1]?.lineIndex ?? null

      const diagonalScore =
        leftIndex > 0 && rightIndex > 0
          ? scores[leftIndex - 1][rightIndex - 1] +
            scoreLines(leftLine, rightLine)
          : Number.NEGATIVE_INFINITY

      const deleteScore =
        leftIndex > 0
          ? scores[leftIndex - 1][rightIndex] + gapPenalty
          : Number.NEGATIVE_INFINITY

      const insertScore =
        rightIndex > 0
          ? scores[leftIndex][rightIndex - 1] + gapPenalty
          : Number.NEGATIVE_INFINITY

      if (
        leftIndex > 0 &&
        rightIndex > 0 &&
        diagonalScore >= deleteScore &&
        diagonalScore >= insertScore &&
        scoreLines(leftLine, rightLine) > 0
      ) {
        rows.unshift({
          left: leftLine,
          right: rightLine,
          changed:
            normaliseLineForDiff(leftLine) !== normaliseLineForDiff(rightLine),
          leftLineIndex: leftOriginalIndex,
          rightLineIndex: rightOriginalIndex,
        })

        leftIndex--
        rightIndex--
        continue
      }

      if (leftIndex > 0 && deleteScore >= insertScore) {
        rows.unshift({
          left: leftLine,
          right: '',
          changed: true,
          leftLineIndex: leftOriginalIndex,
          rightLineIndex: null,
        })

        leftIndex--
        continue
      }

      rows.unshift({
        left: '',
        right: rightLine,
        changed: true,
        leftLineIndex: null,
        rightLineIndex: rightOriginalIndex,
      })

      rightIndex--
    }

     return rows.filter((row) => {
    const leftIsBlank = !row.left.trim()
    const rightIsBlank = !row.right.trim()

    if (leftIsBlank && rightIsBlank) {
      return false
    }

    return true
  })
}

  const leftBlocks = splitIntoBlocks(left)
  const rightBlocks = splitIntoBlocks(right)

  const leftBlocksByKey = new Map(leftBlocks.map((block) => [block.key, block]))
  const rightBlocksByKey = new Map(rightBlocks.map((block) => [block.key, block]))

  const orderedKeys = [
    ...leftBlocks.map((block) => block.key),
    ...rightBlocks
      .map((block) => block.key)
      .filter((key) => !leftBlocksByKey.has(key)),
  ]

  const rows: DiffRow[] = []

  for (const key of orderedKeys) {
    const leftBlock = leftBlocksByKey.get(key) || null
    const rightBlock = rightBlocksByKey.get(key) || null

    if (!leftBlock && !rightBlock) continue

    if (key !== 'preamble') {
      rows.push({
        left: leftBlock?.heading || '',
        right: rightBlock?.heading || '',
        changed:
          normaliseHeading(leftBlock?.heading || '') !==
          normaliseHeading(rightBlock?.heading || ''),
        leftLineIndex: leftBlock?.headingLineIndex ?? null,
        rightLineIndex: rightBlock?.headingLineIndex ?? null,
      })
    }

    rows.push(...alignLines(leftBlock?.lines || [], rightBlock?.lines || []))
  }

  return rows
}


const getWordDiffParts = (left: string, right: string) => {
  type DiffToken = {
    text: string
    comparable: string
    highlightable: boolean
  }

  const tokeniseForDiff = (value: string): DiffToken[] => {
    const matches = value.match(/\p{L}+|\p{N}+|\s+|[^\s\p{L}\p{N}]+/gu) || []

    return matches.map((text) => {
      const comparable = /[\p{L}\p{N}]/u.test(text)
        ? text.toLowerCase()
        : text

      return {
        text,
        comparable,
        highlightable: /[\p{L}\p{N}]/u.test(text),
      }
    })
  }

  const leftTokens = tokeniseForDiff(left)
  const rightTokens = tokeniseForDiff(right)

  const plainResult = {
      leftParts: leftTokens.map((token) => ({
        text: token.text,
        changed: false,
      })),
      rightParts: rightTokens.map((token) => ({
        text: token.text,
        changed: false,
      })),
    }

    if (!left.trim() && right.trim()) {
      return {
        leftParts: plainResult.leftParts,
        rightParts: rightTokens.map((token) => ({
          text: token.text,
          changed: token.highlightable,
        })),
      }
    }

    if (left.trim() && !right.trim()) {
      return {
        leftParts: leftTokens.map((token) => ({
          text: token.text,
          changed: token.highlightable,
        })),
        rightParts: plainResult.rightParts,
      }
    }

    if (!left.trim() && !right.trim()) {
      return plainResult
    }

  const table = Array.from({ length: leftTokens.length + 1 }, () =>
    Array(rightTokens.length + 1).fill(0),
  )

  for (let leftIndex = leftTokens.length - 1; leftIndex >= 0; leftIndex--) {
    for (let rightIndex = rightTokens.length - 1; rightIndex >= 0; rightIndex--) {
      if (
        leftTokens[leftIndex].comparable === rightTokens[rightIndex].comparable
      ) {
        table[leftIndex][rightIndex] =
          table[leftIndex + 1][rightIndex + 1] + 1
      } else {
        table[leftIndex][rightIndex] = Math.max(
          table[leftIndex + 1][rightIndex],
          table[leftIndex][rightIndex + 1],
        )
      }
    }
  }

  const leftParts: { text: string; changed: boolean }[] = []
  const rightParts: { text: string; changed: boolean }[] = []

  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < leftTokens.length && rightIndex < rightTokens.length) {
    const leftToken = leftTokens[leftIndex]
    const rightToken = rightTokens[rightIndex]

    if (leftToken.comparable === rightToken.comparable) {
      leftParts.push({ text: leftToken.text, changed: false })
      rightParts.push({ text: rightToken.text, changed: false })
      leftIndex++
      rightIndex++
    } else if (
      table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]
    ) {
      leftParts.push({
        text: leftToken.text,
        changed: leftToken.highlightable,
      })
      leftIndex++
    } else {
      rightParts.push({
        text: rightToken.text,
        changed: rightToken.highlightable,
      })
      rightIndex++
    }
  }

  while (leftIndex < leftTokens.length) {
    const leftToken = leftTokens[leftIndex]

    leftParts.push({
      text: leftToken.text,
      changed: leftToken.highlightable,
    })

    leftIndex++
  }

  while (rightIndex < rightTokens.length) {
    const rightToken = rightTokens[rightIndex]

    rightParts.push({
      text: rightToken.text,
      changed: rightToken.highlightable,
    })

    rightIndex++
  }

  return { leftParts, rightParts }
}

    const scrollCompareEditorsToLine = (
      leftLineIndex: number | null,
      rightLineIndex: number | null = null,
    ) => {
  suppressCompareScrollSyncRef.current = true
      const jumpToLine = (
        el: HTMLTextAreaElement | null,
        lineIndex: number | null,
      ) => {
        if (!el || lineIndex === null) return

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

  jumpToLine(compareLeftRef.current, leftLineIndex)
  jumpToLine(compareRightRef.current, rightLineIndex)

    window.setTimeout(() => {
    suppressCompareScrollSyncRef.current = false
  }, 250)
}



const editedDiffRows = getDiffLines(compareLeftText, compareRightText)




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

if (rewriteSectionOnly && !rewriteSectionName) {
  setRewriteMessage('Please choose a section before running a section rewrite.')
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
  rewriteSectionOnly,
  rewriteVoice,
  protectSongContext,
)}
`
      : buildRewriteInstruction(
          rewriteInstruction,
          rewriteConstraint,
          rewriteSectionOnly,
          rewriteVoice,
          protectSongContext,
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
  mustPreserveLines &&
  lastLineCount !== originalLineCount &&
  !relaxedChorusRewrite
) {
  throw new Error(
    `Couldn’t keep ${originalLineCount} lines after 3 attempts (got ${lastLineCount}). Try again or choose a less strict constraint.`
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



const nextCompareUpdateMessageBase =
  rewriteTarget === 'main'
    ? 'Original is on the left. Rewritten version is on the right.'
    : rewriteTarget === 'left'
      ? 'Left panel was rewritten. Right panel was unchanged.'
      : 'Right panel was rewritten. Left panel was unchanged.'

const currentRewriteVoiceLabel =
  rewriteVoice === 'british-natural'
    ? 'Natural British'
    : rewriteVoice === 'british-songwriter'
      ? 'British singer-songwriter'
      : rewriteVoice === 'uk-folk-rock'
        ? 'UK folk rock'
        : rewriteVoice === 'americana-country'
          ? 'Modern country / Americana'
          : 'Neutral commercial'

const currentRewriteConstraintLabel =
  rewriteConstraint === 'keep-lines'
    ? 'Keep structure'
    : rewriteConstraint === 'syllable-feel'
      ? 'Maintain syllable feel'
      : rewriteConstraint === 'shorten'
        ? 'Shorten content'
        : rewriteConstraint === 'extend'
          ? 'Extend content'
          : rewriteConstraint === 'conversational'
            ? 'More conversational'
            : rewriteConstraint === 'poetic'
              ? 'More poetic'
              : rewriteConstraint === 'stronger'
                ? 'Stronger impact'
                : rewriteConstraint === 'simplify'
                  ? 'Simplify lyrics'
                  : 'Default'

const currentProtectSongContextLabel = protectSongContext ? 'On' : 'Off'

setCompareUpdateMessage(
  `${nextCompareUpdateMessageBase} Voice: ${currentRewriteVoiceLabel}. Constraint: ${currentRewriteConstraintLabel}. Context protection: ${currentProtectSongContextLabel}.`
)




const rewriteVoiceLabel =
  rewriteVoiceOptions.find((option) => option.id === rewriteVoice)?.label ||
  'Natural British'

const nextRewriteTargetLabel =
  rewriteTarget === 'main'
    ? 'Main Song Sheet / Lyrics'
    : rewriteTarget === 'left'
      ? 'Left compare panel'
      : 'Right compare panel'

setLastRewriteTargetLabel(nextRewriteTargetLabel)


if (rewriteTarget === 'main') {
  setCompareLeftText(fullSourceText)
  setCompareRightText(finalText)

  setFlashLeftPanel(true)
  setFlashRightPanel(true)
}

if (rewriteTarget === 'left') {
  setFlashLeftPanel(true)
}

if (rewriteTarget === 'right') {
  setFlashRightPanel(true)
}

setTimeout(() => {
  document
    .getElementById('rewrite-compare-preview')
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
}, 150)

setTimeout(() => {
  setFlashLeftPanel(false)
  setFlashRightPanel(false)
}, 600)

const rewriteSuccessMessage = buildRewriteSuccessMessage({
  rewriteConstraint,
  rewriteSectionName,
  originalLineCount,
  lastLineCount,
  normaliseSectionName,
})

const rewriteOutputMessage =
  rewriteTarget === 'main'
    ? 'Original copied to the left compare panel and rewritten version copied to the right compare panel.'
    : rewriteTarget === 'left'
      ? 'Left compare panel rewritten. Output replaced the left compare panel. Right panel was unchanged.'
      : 'Right compare panel rewritten. Output replaced the right compare panel. Left panel was unchanged.'

setRewriteMessage(
  `${rewriteSuccessMessage} ${rewriteOutputMessage} Voice: ${currentRewriteVoiceLabel}. Constraint: ${currentRewriteConstraintLabel}. Context protection: ${currentProtectSongContextLabel}.`
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

const rewriteSectionCount = detectedSections.length

const rewriteTargetLabel =
  rewriteTarget === 'left'
    ? 'Left compare panel'
    : rewriteTarget === 'right'
      ? 'Right compare panel'
      : 'Song Sheet / Lyrics'

const rewriteScopeLabel =
  rewriteSectionOnly && rewriteSectionName
    ? `Selected section: ${rewriteSectionName}`
    : rewriteSectionOnly
      ? 'Section rewrite selected, but no section chosen'
      : 'Whole selected source'

const rewriteAvailabilityLabel = rewriteLoading
  ? 'Rewriting...'
  : hasChordLinesInRewriteSource
    ? 'Rewrite blocked until chord lines are removed'
    : rewriteSectionOnly && !rewriteSectionName
      ? 'Choose a section before rewriting'
      : sourceForDetection.trim()
        ? 'Rewrite available'
        : 'No rewrite source text'

      const hasRewriteSourceText = sourceForDetection.trim().length > 0

      const rewriteBlockedReason = rewriteLoading
      ? ''
      : !hasRewriteSourceText
        ? 'Add lyrics to the selected source before rewriting.'
        : !rewriteInstruction.trim()
          ? 'Choose a preset or type a custom instruction.'
          : hasChordLinesInRewriteSource
            ? 'Remove or extract chord lines before rewriting.'
            : rewriteSectionOnly && !rewriteSectionName
              ? 'Choose a section before running a section rewrite.'
              : ''

const rewriteCanRun = !rewriteBlockedReason && !rewriteLoading
const protectSongContextLabel = protectSongContext ? 'On' : 'Off'

const rewriteVoiceOptions = [
  { id: 'british-natural', label: 'Natural British' },
  { id: 'british-songwriter', label: 'British singer-songwriter' },
  { id: 'uk-folk-rock', label: 'UK folk rock' },
  { id: 'americana-country', label: 'Modern country / Americana' },
  { id: 'neutral-commercial', label: 'Neutral commercial' },
]

const rewriteVoiceLabel =
  rewriteVoiceOptions.find((option) => option.id === rewriteVoice)?.label ||
  'Natural British'

  const rewriteConstraintLabel =
  rewriteConstraint === 'keep-lines'
    ? 'Keep structure'
    : rewriteConstraint === 'syllable-feel'
      ? 'Maintain syllable feel'
      : rewriteConstraint === 'shorten'
        ? 'Shorten content'
        : rewriteConstraint === 'extend'
          ? 'Extend content'
          : rewriteConstraint === 'conversational'
            ? 'More conversational'
            : rewriteConstraint === 'poetic'
              ? 'More poetic'
              : rewriteConstraint === 'stronger'
                ? 'Stronger impact'
                : rewriteConstraint === 'simplify'
                  ? 'Simplify lyrics'
                  : 'Default'







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
              <SidebarItem
                icon="✍️"
                label="Write"
                active={mode === 'write'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('write')}
              />

              <SidebarItem
                icon="🧭"
                label="Develop"
                active={mode === 'develop'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('develop')}
              />

              <SidebarItem
                icon="🎸"
                label="Chords"
                active={mode === 'chords'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('chords')}
              />

              <SidebarItem
                icon="📄"
                label="Sheet"
                active={mode === 'sheet'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('sheet')}
              />

              <SidebarItem
                icon="🎧"
                label="Rehearse"
                active={mode === 'rehearse'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('rehearse')}
              />

              <SidebarItem
                icon="🎤"
                label="Perform"
                active={mode === 'perform'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('perform')}
              />

              <SidebarItem
                icon="🎬"
                label="Video"
                active={mode === 'video'}
                collapsed={sidebarCollapsed}
                onClick={() => handleModeChange('video')}
              />
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

        <div
          ref={performanceScrollRef}
          onScroll={handleWorkspaceScroll}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        >



          {mode === 'write' && (
            <div>
          <SongEditorPanel
  songEditor={{
    performanceSheet,
    setPerformanceSheet,
    songVersions,
    activeSongVersionId,
    setActiveSongVersionId,
    songVersionTitle,
    setSongVersionTitle,
    activeProject,
    savingSong,
    justSavedSong,
    saveSong,
  }}
 chordEditor={{
  structuredChordJsonRef,
  chordVersionTitle,
  setChordVersionTitle,
  chordsText,
  chordExtractionMessage,
  setChordExtractionMessage,
  setChordsText,
  setChords,
  chordVersions,
  activeChordVersionId,
  setActiveChordVersionId,
  saveChords,
  savingChords,
  justSavedChords,
}}
  compareControls={{
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
  }}
  shared={{
    formatUkDateTime,
  }}
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
  compareUpdateMessage={compareUpdateMessage}
  setCompareUpdateMessage={setCompareUpdateMessage}
  lastRewriteTargetLabel={lastRewriteTargetLabel}
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
  setPerformanceSheet={setPerformanceSheetFromCompareUse}
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
    protectSongContext={protectSongContext}
    setProtectSongContext={setProtectSongContext}
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
    hasRewriteSourceText={hasRewriteSourceText}
    rewriteSectionCount={rewriteSectionCount}
    rewriteTargetLabel={rewriteTargetLabel}
    rewriteScopeLabel={rewriteScopeLabel}
    rewriteVoiceLabel={rewriteVoiceLabel}
    rewriteAvailabilityLabel={rewriteAvailabilityLabel}
    rewriteConstraintLabel={rewriteConstraintLabel}
    protectSongContextLabel={protectSongContextLabel}
    rewriteBlockedReason={rewriteBlockedReason}
    rewriteCanRun={rewriteCanRun}
    setCompareUpdateMessage={setCompareUpdateMessage}
    extractingLyricsOnly={extractingLyricsOnly}
    removeChordsFromRewriteSource={removeChordsFromRewriteSource}
    extractChordsFromRewriteSourceToJson={extractChordsFromRewriteSourceToJson}
    setRewriteMessage={setRewriteMessage}
    runRewriteLab={runRewriteLab}
    rewriteLoading={rewriteLoading}
    rewriteDone={rewriteDone}
    rewriteMessage={rewriteMessage}
    rewriteVoice={rewriteVoice}
    setRewriteVoice={setRewriteVoice}
    rewriteVoiceOptions={rewriteVoiceOptions}
  />
</div>




             
    {chordVersions.length > 0 && (
      <div className="mb-3 max-w-3xl">
        <h3 className="text-sm text-gray-400 mb-2">Load saved chord version</h3>

        
      </div>
    )}


   






 






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



          <div className={mode === 'develop' ? 'block' : 'hidden'}>
              <SongWorkshopPanel
                  lyrics={performanceSheet}
                  songTitle={activeProject?.title || ''}
                  songVersionTitle={activeSongVersion?.title || songVersionTitle || ''}
                  onUseDraft={(draft) => {
                    setPerformanceSheet(draft)
                    handleModeChange('write')
                  }}

                 

                 onSendDraftToCompare={(draft, label) => {
                  const compareLabel = label || 'Song Workshop draft'

                  setCompareLeftText(performanceSheet)
                  setCompareRightText(draft)
                  setCompareLeftTitle('Current Write lyrics')
                  setCompareRightTitle(compareLabel)
                  setLastRewriteTargetLabel(compareLabel)
                  setCompareUpdateMessage(
                    `${compareLabel} sent to compare. Original is on the left. Workshop draft is on the right.`,
                  )
                  setFlashLeftPanel(true)
                  setFlashRightPanel(true)
                  pendingCompareScrollRef.current = true
                  handleModeChange('write')

                  window.setTimeout(() => {
                    setFlashLeftPanel(false)
                    setFlashRightPanel(false)
                  }, 600)

                }}
                  onEditLyrics={() => handleModeChange('write')}
                />
            </div>


          {mode === 'chords' && (
  <div className="space-y-6">
    <div>
      <h1 className="text-xl font-semibold text-gray-100">
        Chords Workshop
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Generate, inspect, edit, and save harmonic structure for the current song.
      </p>
    </div>

    <div className="rounded border border-gray-800 bg-gray-950 p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Current song context
      </h2>

      <div className="mt-3 grid gap-3 text-sm text-gray-300 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Project
          </div>
          <div className="mt-1">
            {activeProject?.title || 'No project selected'}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Song version
          </div>
          <div className="mt-1">
            {activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Active chord version
          </div>
          <div className="mt-1">
            {chordVersionTitle || 'No chord version selected'}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Saved chord versions
          </div>
          <div className="mt-1">
            {chordVersions.length}
          </div>
        </div>
      </div>
    </div>


    <div className="rounded border border-gray-800 bg-gray-950 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Saved chord versions
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Load a saved harmonic version into the editor.
          </p>
        </div>

        <div className="text-xs text-gray-500">
          {chordVersions.length} saved
        </div>
      </div>

      {chordVersions.length > 0 ? (
        <select
          value={activeChordVersionId || ''}
          onChange={(event) => loadChordVersionIntoEditor(event.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
        >
          <option value="">Select a saved chord version</option>
          {chordVersions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.title || 'Untitled chord version'}
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-400">
          No saved chord versions yet.
        </div>
      )}
    </div>

    <div className="rounded border border-gray-800 bg-gray-950 p-4">
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Chord editor status
      </div>

      <div className="mt-2 text-gray-300">
        {chordEditorStatus.label}
      </div>

      <div className="mt-1 text-sm text-gray-500">
        {chordEditorStatus.detail}
      </div>
    </div>


    <div className="rounded border border-gray-800 bg-gray-950 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Chord summary
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            A readable view of the currently loaded or generated chord data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-gray-500">
            {chordSummaryRows.length} sections
          </div>

          

          <button
            type="button"
            onClick={() => copyChordSummary()}
            disabled={chordSummaryRows.length === 0}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {justCopiedChordSummary ? 'Copied ✓' : 'Copy summary'}
          </button>




          <button
              type="button"
              onClick={() => copyChordSheet()}
              disabled={!hasUsableChordData()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedChordSheet ? 'Copied ✓' : 'Copy chord sheet'}
          </button>


          <button
              type="button"
              onClick={() => copyChordPracticePack()}
              disabled={!hasUsableChordData()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedChordPracticePack ? 'Copied ✓' : 'Copy practice pack'}
          </button>

          <button
              type="button"
              onClick={() => copyChordPacket()}
              disabled={!hasUsableChordData()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedChordPacket ? 'Copied ✓' : 'Copy packet'}
            </button>

        </div>
      </div>

      {chordSummaryRows.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {chordSummaryRows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="rounded border border-gray-800 bg-gray-900 p-3"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {row.label}
              </div>

              <pre className="mt-2 whitespace-pre-wrap font-mono text-sm leading-6 text-gray-100">
                {row.value}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-400">
          No chord data loaded yet. Generate chords, load a saved version, or paste valid chord JSON.
        </div>
      )}
    </div>

   <div className="rounded border border-gray-800 bg-gray-950 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Performance songsheet preview
      </div>
      <p className="mt-1 text-sm text-gray-500">
          Chords placed above the lyric position where the change happens.
          {getTransposedKeyLabel()
            ? ` Displayed key: ${getTransposedKeyLabel()}.`
            : ''}
        </p>
    </div>

    <div className="flex flex-wrap items-center justify-end gap-2">
  <button
    type="button"
    onClick={() => setChordTransposeSemitones((value) => value - 1)}
    disabled={!placedSongSheetPreview}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
  >
    Transpose −
  </button>

  <div className="min-w-[110px] text-center text-xs text-gray-400">
    {getTransposeLabel()}
  </div>

  <button
    type="button"
    onClick={() => setChordTransposeSemitones((value) => value + 1)}
    disabled={!placedSongSheetPreview}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
  >
    Transpose +
  </button>

  <button
    type="button"
    onClick={() => setChordTransposeSemitones(0)}
    disabled={!placedSongSheetPreview || chordTransposeSemitones === 0}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
  >
    Reset
  </button>

  <button
    type="button"
    onClick={() => copyPlacedSongSheet()}
    disabled={!placedSongSheetPreview}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
  >
    {justCopiedPlacedSongSheet ? 'Copied ✓' : 'Copy songsheet'}
  </button>
 </div>
</div>

  <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre rounded border border-gray-800 bg-gray-900 p-4 font-mono text-sm leading-6 text-gray-100">
    {placedSongSheetPreview ||
      'No performance songsheet preview yet. Generate or paste chord JSON that includes placed chord positions. The next step is to make Generate chords create this automatically.'}
  </pre>

  {!placedSongSheetPreview && (
    <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs text-gray-500">
      This preview needs chord placement data. For now, the test JSON works manually. Next we will update Generate chords so this is created for you.
    </div>
  )}
</div>

<div className="rounded border border-gray-800 bg-gray-950 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Chord sheet preview
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Musician-facing chord-only output. This is what Copy chord sheet will copy.
      </p>
    </div>

    <button
      type="button"
      onClick={() => copyChordSheet()}
      disabled={!hasUsableChordData()}
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {justCopiedChordSheet ? 'Copied ✓' : 'Copy chord sheet'}
    </button>
  </div>

  <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-4 text-sm leading-6 text-gray-100">
    {chordSheetPreview ||
      'No usable chord sheet preview yet. Paste, generate, or load valid chord JSON.'}
  </pre>
</div>



    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Source lyrics
          </h2>

          <button
            type="button"
            onClick={() => handleModeChange('write')}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
          >
            Edit lyrics
          </button>
        </div>

        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded bg-gray-900 p-4 font-mono text-sm leading-7 text-gray-100">
          {performanceSheet || 'No lyrics available yet.'}
        </pre>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Chord JSON
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => generateChords()}
              disabled={generatingChords || !performanceSheet.trim()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {generatingChords ? 'Generating...' : 'Generate chords'}
            </button>


            <button
              type="button"
              onClick={() => copyChordJson()}
              disabled={!chordsText.trim()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedChordJson ? 'Copied ✓' : 'Copy JSON'}
            </button>

            <button
              type="button"
              onClick={() => clearChordEditor()}
              disabled={generatingChords || savingChords || !hasChordEditorContent()}
              className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justClearedChords ? 'Cleared ✓' : 'Clear editor'}
           </button>



            <button
              type="button"
              onClick={saveChords}
              disabled={!activeProject || savingChords || !chordsText.trim()}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {savingChords
                ? 'Saving...'
                : justSavedChords
                  ? 'Saved ✓'
                  : 'Save chords'}
            </button>
          </div>
        </div>

        {chordExtractionMessage && (
          <div className="mt-3 rounded border border-yellow-700/40 bg-yellow-900/20 p-3 text-sm text-yellow-200">
            {chordExtractionMessage}
          </div>
        )}

        {projectMessage && (
          <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-300">
            {projectMessage}
          </div>
        )}


        <input
          value={chordVersionTitle}
          onChange={(event) => {
              setChordVersionTitle(event.target.value)
              setChordExtractionMessage('')
              setProjectMessage('')
            }}
          placeholder="Chord version title"
          className="mb-3 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
        />

        <textarea
  value={chordsText}
  onChange={(event) => {
    const nextValue = event.target.value

    setChordsText(nextValue)
    setChordExtractionMessage('')
    setProjectMessage('')

    if (!nextValue.trim()) {
  setChords(null)
  setActiveChordVersionId(null)
  setChordVersionTitle('')
  return
}

    try {
      const parsed = JSON.parse(nextValue)

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        setChords(parsed)

        if (Object.keys(parsed).length === 0) {
          setActiveChordVersionId(null)
        }
      }
    } catch {
      // Keep the last valid chord summary while the user is editing invalid JSON.
    }
  }}
  placeholder='Paste or generate chord JSON here, for example: {"key":"G","verse":"G | D7 | G | C"}'
  className="min-h-[360px] w-full resize-y rounded border border-gray-800 bg-gray-900 p-4 font-mono text-sm leading-6 text-gray-100 outline-none focus:border-blue-500"
/>

        
      </div>
    </div>
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
              <div className="space-y-4">
                <h1 className="text-xl mb-4">Video Generator</h1>
                <VideoPromptBuilder
                  lyrics={performanceSheet}
                  songTitle={activeProject?.title || ''}
                  songVersionTitle={
                    activeSongVersion?.title || songVersionTitle || ''
                  }
                  projectId={activeProject?.id || null}
                  songVersionId={activeSongVersionId}
                />
              </div>
            )}

        </div>
      </div>
    </div>
  )
}
