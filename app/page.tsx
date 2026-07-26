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
  const [generatingBasicChords, setGeneratingBasicChords] = useState(false)
  const [generatingPlacedSongsheet, setGeneratingPlacedSongsheet] = useState(false)
  const [generatingGuideTrackPlan, setGeneratingGuideTrackPlan] = useState(false)
  const [requestingAudioPreview, setRequestingAudioPreview] = useState(false)
  const [audioPreviewMessage, setAudioPreviewMessage] = useState('')
  const [submittingAudioPreviewRender, setSubmittingAudioPreviewRender] = useState(false)
  const [testingRealRenderRoute, setTestingRealRenderRoute] = useState(false)
const [realRenderRouteTestResponse, setRealRenderRouteTestResponse] =
  useState<Record<string, unknown> | null>(null)
  const [audioPreviewRenderMessage, setAudioPreviewRenderMessage] = useState('')
  const [audioPreviewRenderJob, setAudioPreviewRenderJob] = useState<Record<string, unknown> | null>(null)
  const [audioPreviewRenderResponse, setAudioPreviewRenderResponse] = useState('')
  const [audioPreviewDryRunRenderPlan, setAudioPreviewDryRunRenderPlan] = useState<Record<string, unknown> | null>(null)
 const [
  dryRunRenderManifestValidation,
      setDryRunRenderManifestValidation,
    ] = useState<Record<string, unknown> | null>(null)
  const [dryRunRenderManifest, setDryRunRenderManifest] =
    useState<Record<string, unknown> | null>(null)
  const [dryRunCueSheetValidation,
      setDryRunCueSheetValidation,
    ] = useState<Record<string, unknown> | null>(null)
  const [dryRunRenderPlanValidation,
      setDryRunRenderPlanValidation,
    ] = useState<Record<string, unknown> | null>(null)
  const [dryRunHandoffBundle, setDryRunHandoffBundle] =
  useState<Record<string, unknown> | null>(null)
  const [dryRunHandoffBundleValidation, setDryRunHandoffBundleValidation] =
  useState<Record<string, unknown> | null>(null)
  const [dryRunArtifactPackage, setDryRunArtifactPackage] =
  useState<Record<string, unknown> | null>(null)
  const [dryRunArtifactPackageValidation, setDryRunArtifactPackageValidation] =
  useState<Record<string, unknown> | null>(null)
    const [audioPreviewResponse, setAudioPreviewResponse] = useState('')
  const [audioPreviewPlan, setAudioPreviewPlan] = useState<Record<string, unknown> | null>(null)
  const [audioPreviewRenderPrompt, setAudioPreviewRenderPrompt] = useState('')
  const [audioPreviewMeta, setAudioPreviewMeta] = useState<Record<string, unknown> | null>(null)
  const [audioPreviewRendererPayload, setAudioPreviewRendererPayload] = useState<Record<string, unknown> | null>(null)
  const [audioPreviewRendererPayloadValidation, setAudioPreviewRendererPayloadValidation] = useState<Record<string, unknown> | null>(null)
  const [audioPreviewSongSheetText, setAudioPreviewSongSheetText] = useState('')
  const [audioPreviewSectionGuideText, setAudioPreviewSectionGuideText] = useState('')
  const [audioPreviewRenderSteps, setAudioPreviewRenderSteps] = useState<
      Record<string, unknown>[]
    >([])
  const resetAudioPreviewRequestState = () => {
      setAudioPreviewMessage('')
      setAudioPreviewResponse('')
      setAudioPreviewPlan(null)
      setAudioPreviewRenderPrompt('')
      setAudioPreviewRenderSteps([])
      setAudioPreviewMeta(null)
      setAudioPreviewSectionGuideText('')
      setAudioPreviewSongSheetText('')
      setAudioPreviewRendererPayload(null)
      setAudioPreviewRendererPayloadValidation(null)
      setSubmittingAudioPreviewRender(false)
      setAudioPreviewRenderMessage('')
      setAudioPreviewRenderJob(null)
      setAudioPreviewRenderResponse('')
      setAudioPreviewDryRunRenderPlan(null)
      setDryRunRenderPlanValidation(null)
      setDryRunRenderManifest(null)
      setDryRunRenderManifestValidation(null)
      setDryRunHandoffBundle(null)
      setDryRunHandoffBundleValidation(null)
      setDryRunArtifactPackage(null)
      setDryRunArtifactPackageValidation(null)
      setDryRunCueSheetValidation(null)
      
    }
  const [justCopiedChordJson, setJustCopiedChordJson] = useState(false)
  const [justCopiedChordSummary, setJustCopiedChordSummary] = useState(false)
  const [justCopiedChordPacket, setJustCopiedChordPacket] = useState(false)
  const [justCopiedChordPracticePack, setJustCopiedChordPracticePack] = useState(false)
  const [justCopiedChordSheet, setJustCopiedChordSheet] = useState(false)
  const [justCopiedPlacedSongSheet, setJustCopiedPlacedSongSheet] = useState(false)
  const [justCopiedPerformanceIntent, setJustCopiedPerformanceIntent] = useState(false)
  const [
  justCopiedAudioPreviewHandoffBundle,
     setJustCopiedAudioPreviewHandoffBundle,
    ] = useState(false)
const [
  justCopiedAudioPreviewArtifactPackage,
      setJustCopiedAudioPreviewArtifactPackage,
    ] = useState(false)
  const [justCopiedPerformanceDesignNotes, setJustCopiedPerformanceDesignNotes] = useState(false)
  const [justCopiedGuideTrackPlan, setJustCopiedGuideTrackPlan] = useState(false)
  const [justCopiedFullPerformancePack, setJustCopiedFullPerformancePack] = useState(false)
  const [justCopiedSongsheetReview, setJustCopiedSongsheetReview] = useState(false)
  const [justCopiedAudioGuidePrompt, setJustCopiedAudioGuidePrompt] = useState(false)
  const [justCopiedAudioPreviewDryRunPlan, setJustCopiedAudioPreviewDryRunPlan] = useState(false)
  const [justCopiedAudioPreviewSectionGuide, setJustCopiedAudioPreviewSectionGuide] = useState(false)
  const [justCopiedAudioPreviewRendererPayload, setJustCopiedAudioPreviewRendererPayload] = useState(false)
  const [justCopiedAudioGuideSummary, setJustCopiedAudioGuideSummary] = useState(false)
  const [justCopiedAudioPreviewSpec, setJustCopiedAudioPreviewSpec] = useState(false)
  const [justCopiedAudioRenderPrompt, setJustCopiedAudioRenderPrompt] = useState(false)
  const [justCopiedAudioRenderSteps, setJustCopiedAudioRenderSteps] = useState(false)
  const [justCopiedAudioPreviewSongSheet, setJustCopiedAudioPreviewSongSheet] = useState(false)
  const [justCopiedAudioPreviewChecklist, setJustCopiedAudioPreviewChecklist] = useState(false)
  const [justCopiedAudioPreviewCueSheet, setJustCopiedAudioPreviewCueSheet] = useState(false)
  const [
  justCopiedAudioPreviewRenderManifest,
     setJustCopiedAudioPreviewRenderManifest,
    ] = useState(false)
  const [justCopiedGenerationUsage, setJustCopiedGenerationUsage] = useState(false)
  const [justClearedChords, setJustClearedChords] = useState(false)
  const [chordTransposeSemitones, setChordTransposeSemitones] = useState(0)

  const [lastAppliedTransposeSnapshot, setLastAppliedTransposeSnapshot] = useState<{
      chordsText: string
      chordVersionTitle: string
    } | null>(null)
  
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

const getCleanChordDraftTitleBase = (title: string) => {
  const cleaned = title
    .trim()
    .replace(/\s+with songsheet with guide plan$/i, '')
    .replace(/\s+with songsheet and guide plan$/i, '')
    .replace(/\s+with guide plan$/i, '')
    .replace(/\s+with songsheet$/i, '')
    .replace(/\s+transposed(?:\s+transposed)+$/i, ' transposed')
    .trim()

  return cleaned || 'Chord draft'
}

const getStagedChordVersionTitle = (
  currentTitle: string,
  stage: 'basic' | 'songsheet' | 'guide-plan',
) => {
  const baseTitle = getCleanChordDraftTitleBase(currentTitle)

  if (stage === 'basic') {
    return 'Basic chord draft'
  }

  if (stage === 'songsheet') {
    return `${baseTitle} with songsheet`
  }

  return `${baseTitle} with songsheet and guide plan`
}


const buildChordGenerationUsageCopyText = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return ''
  }

  const record = chordData as Record<string, unknown>
  const history = Array.isArray(record.generationHistory)
    ? record.generationHistory
    : []

  const entries = history.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  )

  if (entries.length === 0) {
    return ''
  }

  const summary = getChordGenerationHistorySummary()
  const usageWarning = getChordGenerationUsageWarning()
  const songsheetReviewStatusLabel = getSongsheetReviewStatusLabel()
  const songsheetReviewSummaryLine = getSongsheetReviewSummaryLine()

  return [
    'STAGED CHORD GENERATION USAGE',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Songsheet status: ${songsheetReviewStatusLabel}`,
    songsheetReviewSummaryLine ? songsheetReviewSummaryLine : '',
    '',
    'TOTALS',
    '',
    `Stages run: ${summary.stageCount}`,
    `Total duration: ${summary.totalDurationSeconds.toFixed(1)}s`,
    `Input tokens: ${summary.totalInputTokens.toLocaleString()}`,
    `Output tokens: ${summary.totalOutputTokens.toLocaleString()}`,
    `Total tokens: ${summary.totalTokens.toLocaleString()}`,
    summary.routes.length > 0 ? `Routes: ${summary.routes.join(' → ')}` : '',
    '',
    ...(usageWarning.hasWarning
      ? [
          'USAGE WARNING',
          '',
          usageWarning.label,
          usageWarning.detail,
          '',
        ]
      : []),
    'STAGES',
    '',
    ...entries.flatMap((entry, index) => {
      const route = typeof entry.route === 'string' ? entry.route : 'Unknown route'
      const model = typeof entry.model === 'string' ? entry.model : 'Unknown model'
      const duration =
        typeof entry.durationSeconds === 'number'
          ? `${entry.durationSeconds.toFixed(1)}s`
          : 'Unknown'
      const inputTokens =
        typeof entry.inputTokens === 'number'
          ? entry.inputTokens.toLocaleString()
          : 'Unknown'
      const outputTokens =
        typeof entry.outputTokens === 'number'
          ? entry.outputTokens.toLocaleString()
          : 'Unknown'
      const totalTokens =
        typeof entry.totalTokens === 'number'
          ? entry.totalTokens.toLocaleString()
          : 'Unknown'
      const generatedAt =
        typeof entry.generatedAt === 'string'
          ? new Date(entry.generatedAt).toLocaleString()
          : 'Unknown'

      return [
        `Stage ${index + 1}: ${route}`,
        `Model: ${model}`,
        `Duration: ${duration}`,
        `Input tokens: ${inputTokens}`,
        `Output tokens: ${outputTokens}`,
        `Total tokens: ${totalTokens}`,
        `Generated at: ${generatedAt}`,
        '',
      ]
    }),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')
}


const getChordGenerationHistoryRows = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return []
  }

  const record = chordData as Record<string, unknown>
  const history = Array.isArray(record.generationHistory)
    ? record.generationHistory
    : []

  return history
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
    .map((entry, index) => ({
      stage: index + 1,
      route: typeof entry.route === 'string' ? entry.route : 'Unknown route',
      model: typeof entry.model === 'string' ? entry.model : 'Unknown model',
      duration:
        typeof entry.durationSeconds === 'number'
          ? `${entry.durationSeconds.toFixed(1)}s`
          : 'Unknown',
      inputTokens:
        typeof entry.inputTokens === 'number'
          ? entry.inputTokens.toLocaleString()
          : 'Unknown',
      outputTokens:
        typeof entry.outputTokens === 'number'
          ? entry.outputTokens.toLocaleString()
          : 'Unknown',
      totalTokens:
        typeof entry.totalTokens === 'number'
          ? entry.totalTokens.toLocaleString()
          : 'Unknown',
      generatedAt:
        typeof entry.generatedAt === 'string'
          ? new Date(entry.generatedAt).toLocaleString()
          : 'Unknown',
    }))
}

const getChordGenerationUsageWarning = () => {
  const summary = getChordGenerationHistorySummary()

  if (!summary.hasHistory) {
    return {
      hasWarning: false,
      label: '',
      detail: '',
    }
  }

  if (summary.totalTokens >= 30000) {
    return {
      hasWarning: true,
      label: 'High staged generation usage',
      detail:
        'This staged workflow has used more than 30,000 tokens. That is fine during development, but worth reviewing during normal song sessions.',
    }
  }

  if (summary.totalTokens >= 15000) {
    return {
      hasWarning: true,
      label: 'Moderate staged generation usage',
      detail:
        'This staged workflow has used more than 15,000 tokens. Songsheet generation is likely the main contributor.',
    }
  }

  return {
    hasWarning: false,
    label: '',
    detail: '',
  }
}


const getChordGenerationHistorySummary = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return {
      hasHistory: false,
      stageCount: 0,
      totalDurationSeconds: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      routes: [] as string[],
    }
  }

  const record = chordData as Record<string, unknown>
  const history = Array.isArray(record.generationHistory)
    ? record.generationHistory
    : []

  const entries = history.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  )

  const totalDurationSeconds = entries.reduce((total, entry) => {
    return total + (typeof entry.durationSeconds === 'number' ? entry.durationSeconds : 0)
  }, 0)

  const totalInputTokens = entries.reduce((total, entry) => {
    return total + (typeof entry.inputTokens === 'number' ? entry.inputTokens : 0)
  }, 0)

  const totalOutputTokens = entries.reduce((total, entry) => {
    return total + (typeof entry.outputTokens === 'number' ? entry.outputTokens : 0)
  }, 0)

  const totalTokens = entries.reduce((total, entry) => {
    return total + (typeof entry.totalTokens === 'number' ? entry.totalTokens : 0)
  }, 0)

  const routes = entries
    .map((entry) => (typeof entry.route === 'string' ? entry.route : ''))
    .filter(Boolean)

  return {
    hasHistory: entries.length > 0,
    stageCount: entries.length,
    totalDurationSeconds,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    routes,
  }
}


const getChordGenerationMetaRows = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return []
  }

  const record = chordData as Record<string, unknown>
  const generationMeta = record.generationMeta

  if (
    !generationMeta ||
    typeof generationMeta !== 'object' ||
    Array.isArray(generationMeta)
  ) {
    return []
  }

  const meta = generationMeta as Record<string, unknown>

  const rows = [
    {
      label: 'Route',
      value: typeof meta.route === 'string' ? meta.route : '',
    },
    {
      label: 'Model',
      value: typeof meta.model === 'string' ? meta.model : '',
    },
    {
      label: 'Duration',
      value:
        typeof meta.durationSeconds === 'number'
          ? `${meta.durationSeconds}s`
          : '',
    },
    {
      label: 'Input tokens',
      value:
        typeof meta.inputTokens === 'number'
          ? meta.inputTokens.toLocaleString()
          : '',
    },
    {
      label: 'Output tokens',
      value:
        typeof meta.outputTokens === 'number'
          ? meta.outputTokens.toLocaleString()
          : '',
    },
    {
      label: 'Total tokens',
      value:
        typeof meta.totalTokens === 'number'
          ? meta.totalTokens.toLocaleString()
          : '',
    },
    {
      label: 'Generated at',
      value:
        typeof meta.generatedAt === 'string'
          ? new Date(meta.generatedAt).toLocaleString()
          : '',
    },
  ]

  return rows.filter((row) => row.value)
}


const getChordVersionCopyTitle = () => {
  const title = chordVersionTitle.trim()

  if (!title) {
    return 'Unsaved or untitled chord version'
  }

  return title.replace(/\s+transposed(?:\s+transposed)+$/i, ' transposed')
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
  setLastAppliedTransposeSnapshot(null)
  setChordTransposeSemitones(0)
  setChordsText(JSON.stringify(selected.chord_data || {}, null, 2))
  resetAudioPreviewRequestState()
  resetAudioPreviewRequestState()
  setChordExtractionMessage('')
  setProjectMessage(`Loaded chord version: ${selected.title || 'Untitled chord version'}`)
}


const copySongsheetReview = async () => {
  const copyText = buildSongsheetReviewCopyText()

  if (!copyText.trim()) {
    setChordExtractionMessage('No songsheet review available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedSongsheetReview(true)
    setChordExtractionMessage('Songsheet review copied.')

    window.setTimeout(() => {
      setJustCopiedSongsheetReview(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy songsheet review.')
  }
}


const copyChordGenerationUsage = async () => {
  const copyText = buildChordGenerationUsageCopyText()

  if (!copyText) {
    setChordExtractionMessage('No staged generation usage available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedGenerationUsage(true)
    setChordExtractionMessage('Staged generation usage copied.')

    window.setTimeout(() => {
      setJustCopiedGenerationUsage(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy staged generation usage.')
  }
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


const isAudioPreviewDryRunPlanReady = () => {
  return Boolean(audioPreviewDryRunRenderPlan)
}

const isAudioPreviewDryRunReady = () => {
  return (
    audioPreviewRenderJob &&
    typeof audioPreviewRenderJob.status === 'string' &&
    audioPreviewRenderJob.status === 'dry-run-ready'
  )
}


const isAudioPreviewRendererPayloadValidated = () => {
  return audioPreviewRendererPayloadValidation?.ready === true
}


const copyAudioRenderPrompt = async () => {
  if (!audioPreviewRenderPrompt.trim()) {
    setAudioPreviewMessage('No audio render prompt available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
    'AUDIO PREVIEW RENDER PROMPT',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'RENDER PROMPT',
    '',
    audioPreviewRenderPrompt,
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioRenderPrompt(true)
    setAudioPreviewMessage('Audio render prompt copied.')

    window.setTimeout(() => {
      setJustCopiedAudioRenderPrompt(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio render prompt.')
  }
}

const copyGuideTrackPlan = async () => {
  const copyText = buildGuideTrackPlanCopyText()

  if (!copyText) {
    setChordExtractionMessage('No guide track plan available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedGuideTrackPlan(true)
    setChordExtractionMessage('Guide track plan copied.')

    window.setTimeout(() => {
      setJustCopiedGuideTrackPlan(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy guide track plan.')
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

const resetOrUndoChordTranspose = () => {
  if (chordTransposeSemitones !== 0) {
    setChordTransposeSemitones(0)
    resetAudioPreviewRequestState()
    setChordExtractionMessage('Transpose preview reset.')
    setProjectMessage('')
    return
  }

  if (!lastAppliedTransposeSnapshot) {
    return
  }

  const restoredText = lastAppliedTransposeSnapshot.chordsText

  setChordsText(restoredText)
  setChordVersionTitle(lastAppliedTransposeSnapshot.chordVersionTitle)
  resetAudioPreviewRequestState()
  setActiveChordVersionId(null)
  setChordTransposeSemitones(0)
  setLastAppliedTransposeSnapshot(null)
  setChordExtractionMessage('Applied transpose undone. Review and save when ready.')
  setProjectMessage('')

  try {
    const parsed = JSON.parse(restoredText)

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      setChords(parsed)
    }
  } catch {
    setChords(null)
  }
}


const applyTransposeToChordEditor = () => {
  const chordData = getChordDataFromEditorJson()

  if (
    !chordData ||
    typeof chordData !== 'object' ||
    Array.isArray(chordData) ||
    chordTransposeSemitones === 0
  ) {
    return
  }

  setLastAppliedTransposeSnapshot({
      chordsText,
      chordVersionTitle,
    })

  const record = chordData as Record<string, unknown>
  const nextRecord: Record<string, unknown> = { ...record }

  const originalKey = getStringValue(record.key)

  if (originalKey) {
    nextRecord.key = transposeChordSymbol(originalKey, chordTransposeSemitones)
  }

  ;['verse', 'chorus', 'bridge', 'intro', 'outro', 'preChorus'].forEach(
    (sectionKey) => {
      const value = nextRecord[sectionKey]

      if (typeof value === 'string') {
        nextRecord[sectionKey] = transposeChordProgressionText(
          value,
          chordTransposeSemitones,
        )
      }
    },
  )

  const lines = getPlacedSongSheetLines(record)

  if (lines.length > 0) {
    nextRecord.songSheetLines = lines.map((line) => ({
      ...line,
      chords: line.chords.map((placement) => ({
        ...placement,
        chord: transposeChordSymbol(
          placement.chord,
          chordTransposeSemitones,
        ),
      })),
    }))
  }

  const nextText = JSON.stringify(nextRecord, null, 2)

  setChords(nextRecord)
  setChordsText(nextText)
  setActiveChordVersionId(null)
  const baseTransposeTitle = chordVersionTitle
      .trim()
      .replace(/\s+transposed(?:\s+transposed)*$/i, '')

    setChordVersionTitle(
      baseTransposeTitle
        ? `${baseTransposeTitle} transposed`
        : 'Transposed chord draft',
    )
  setChordTransposeSemitones(0)
  setChordExtractionMessage('Transpose applied to chord editor. Review and save as a new chord version.')
  setProjectMessage('')
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


const getSongsheetTransposeCopyRows = () => {
  const originalKey = getOriginalKeyLabel()
  const displayedKey = getDisplayedKeyLabel()
  const transposeLabel = getTransposeLabel()

  if (chordTransposeSemitones === 0) {
    return [
      originalKey ? `Key: ${originalKey}` : '',
      'Transpose: None',
    ].filter(Boolean)
  }

  return [
    originalKey ? `Original key: ${originalKey}` : '',
    displayedKey ? `Displayed key: ${displayedKey}` : '',
    `Transpose: ${transposeLabel}`,
  ].filter(Boolean)
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

const transposeChordProgressionText = (value: string, semitones: number) => {
  if (semitones === 0) {
    return value
  }

  return value.replace(
    /\b([A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?)\b/g,
    (match) => transposeChordSymbol(match, semitones),
  )
}

const submitAudioPreviewRendererPayload = async () => {
  if (!audioPreviewRendererPayload) {
    setAudioPreviewRenderMessage('No renderer payload available to submit.')
    return
  }

  if (audioPreviewRendererPayloadValidation?.ready !== true) {
    setAudioPreviewRenderMessage(
      'Renderer payload validation has not passed. Review the payload before submitting.',
    )
    return
  }

  setSubmittingAudioPreviewRender(true)
  setRealRenderRouteTestResponse(null)
  setAudioPreviewRenderMessage('Submitting renderer payload...')
  setAudioPreviewRenderJob(null)
  setAudioPreviewRenderResponse('')
  setAudioPreviewDryRunRenderPlan(null)
  setDryRunRenderPlanValidation(null)
  setDryRunRenderManifest(null)
  setDryRunRenderManifestValidation(null)
  setDryRunHandoffBundle(null)
  setDryRunHandoffBundleValidation(null)
  setDryRunArtifactPackage(null)
  setRealRenderRouteTestResponse(null)
  setDryRunArtifactPackageValidation(null)
  setDryRunCueSheetValidation(null)
 


  try {
    const response = await fetch('/api/audio-preview/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(audioPreviewRendererPayload),
    })

    const result = await response.json()

    setAudioPreviewRenderResponse(JSON.stringify(result, null, 2))

    if (!response.ok) {
      setAudioPreviewRenderMessage(
        typeof result.error === 'string'
          ? result.error
          : typeof result.validation?.detail === 'string'
            ? result.validation.detail
            : 'Renderer payload submission failed.',
      )
      return
    }

    setAudioPreviewRenderMessage(
      typeof result.message === 'string'
        ? result.message
        : 'Renderer payload accepted.',
    )
setAudioPreviewRenderJob(
  result.renderJob &&
    typeof result.renderJob === 'object' &&
    !Array.isArray(result.renderJob)
    ? result.renderJob
    : null,
)

setAudioPreviewDryRunRenderPlan(
  result.dryRunRenderPlan &&
    typeof result.dryRunRenderPlan === 'object' &&
    !Array.isArray(result.dryRunRenderPlan)
    ? result.dryRunRenderPlan
    : null,
)

setDryRunRenderPlanValidation(
  result.dryRunRenderPlanValidation &&
    typeof result.dryRunRenderPlanValidation === 'object' &&
    !Array.isArray(result.dryRunRenderPlanValidation)
    ? result.dryRunRenderPlanValidation
    : null,
)

setDryRunCueSheetValidation(
  result.dryRunCueSheetValidation &&
    typeof result.dryRunCueSheetValidation === 'object' &&
    !Array.isArray(result.dryRunCueSheetValidation)
    ? result.dryRunCueSheetValidation
    : null,
)

setDryRunRenderManifest(
  result.dryRunRenderManifest &&
    typeof result.dryRunRenderManifest === 'object' &&
    !Array.isArray(result.dryRunRenderManifest)
    ? result.dryRunRenderManifest
    : null,
)

setDryRunRenderManifestValidation(
  result.dryRunRenderManifestValidation &&
    typeof result.dryRunRenderManifestValidation === 'object' &&
    !Array.isArray(result.dryRunRenderManifestValidation)
    ? result.dryRunRenderManifestValidation
    : null,
)

setDryRunHandoffBundle(
  result.dryRunHandoffBundle &&
    typeof result.dryRunHandoffBundle === 'object' &&
    !Array.isArray(result.dryRunHandoffBundle)
    ? result.dryRunHandoffBundle
    : null,
)

setDryRunHandoffBundle(
  result.dryRunHandoffBundle &&
    typeof result.dryRunHandoffBundle === 'object' &&
    !Array.isArray(result.dryRunHandoffBundle)
    ? result.dryRunHandoffBundle
    : null,
)

setDryRunHandoffBundleValidation(
  result.dryRunHandoffBundleValidation &&
    typeof result.dryRunHandoffBundleValidation === 'object' &&
    !Array.isArray(result.dryRunHandoffBundleValidation)
    ? result.dryRunHandoffBundleValidation
    : null,
)

setDryRunArtifactPackage(
  result.dryRunArtifactPackage &&
    typeof result.dryRunArtifactPackage === 'object' &&
    !Array.isArray(result.dryRunArtifactPackage)
    ? result.dryRunArtifactPackage
    : null,
)

setDryRunArtifactPackageValidation(
  result.dryRunArtifactPackageValidation &&
    typeof result.dryRunArtifactPackageValidation === 'object' &&
    !Array.isArray(result.dryRunArtifactPackageValidation)
    ? result.dryRunArtifactPackageValidation
    : null,
)


  } catch {
    setAudioPreviewRenderMessage('Could not submit renderer payload.')
  } finally {
    setSubmittingAudioPreviewRender(false)
  }
}
const requestAudioPreview = async () => {
  const previewSpec = buildAudioPreviewSpecCopyText()

  if (!previewSpec) {
    setAudioPreviewMessage('No audio preview spec available.')
    return
  }

  setRequestingAudioPreview(true)
  setAudioPreviewRendererPayload(null)
  setAudioPreviewRendererPayloadValidation(null)
  setAudioPreviewMessage('Sending audio preview spec...')
  setAudioPreviewResponse('')
  setAudioPreviewPlan(null)
  setAudioPreviewRenderPrompt('')
  setAudioPreviewRenderSteps([])
  setAudioPreviewMeta(null)
  setAudioPreviewSectionGuideText('')
  setAudioPreviewSongSheetText('')

  try {
    const parsedSpec = JSON.parse(previewSpec)

    const response = await fetch('/api/audio-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsedSpec),
    })

    const result = await response.json()

    setAudioPreviewRendererPayload(
      result.rendererPayload &&
        typeof result.rendererPayload === 'object' &&
        !Array.isArray(result.rendererPayload)
        ? result.rendererPayload
        : null,
    )

    if (!response.ok) {
      setAudioPreviewMessage(
        typeof result.error === 'string'
          ? result.error
          : 'Audio preview request failed.',
      )
      return
    }

    setAudioPreviewRendererPayloadValidation(
      result.rendererPayloadValidation &&
        typeof result.rendererPayloadValidation === 'object' &&
        !Array.isArray(result.rendererPayloadValidation)
        ? result.rendererPayloadValidation
        : null,
    )

    setAudioPreviewMessage(
      typeof result.message === 'string'
        ? result.message
        : 'Audio preview request completed.',
    )
    setAudioPreviewResponse(JSON.stringify(result, null, 2))

        if (
          result.previewPlan &&
          typeof result.previewPlan === 'object' &&
          !Array.isArray(result.previewPlan)
        ) {
          setAudioPreviewPlan(result.previewPlan as Record<string, unknown>)
        }
        if (typeof result.renderPrompt === 'string') {
          setAudioPreviewRenderPrompt(result.renderPrompt)
        }
        if (Array.isArray(result.renderSteps)) {
          setAudioPreviewRenderSteps(
            result.renderSteps.filter(
              (item: unknown) =>
                item && typeof item === 'object' && !Array.isArray(item),
            ) as Record<string, unknown>[],
          )
        } else {
          setAudioPreviewRenderSteps([])
        }

        setAudioPreviewMeta(
          result.audioPreviewMeta &&
            typeof result.audioPreviewMeta === 'object' &&
            !Array.isArray(result.audioPreviewMeta)
            ? result.audioPreviewMeta
            : null,
        )

        setAudioPreviewSongSheetText(
          typeof result.previewSongSheetText === 'string'
            ? result.previewSongSheetText
            : '',
        )


        setAudioPreviewSectionGuideText(
          typeof result.sectionGuideText === 'string' ? result.sectionGuideText : '',
        )
  } catch {
    setAudioPreviewMessage('Could not send audio preview spec.')
  } finally {
    setRequestingAudioPreview(false)
  }
}

const getRealRenderRouteReceivedContractSummary = () => {
  if (
    !realRenderRouteTestResponse ||
    typeof realRenderRouteTestResponse.receivedContractSummary !== 'object' ||
    realRenderRouteTestResponse.receivedContractSummary === null ||
    Array.isArray(realRenderRouteTestResponse.receivedContractSummary)
  ) {
    return null
  }

  const receivedContractSummary =
    realRenderRouteTestResponse.receivedContractSummary as Record<
      string,
      unknown
    >

  return {
    hasRendererInputContract:
      receivedContractSummary.hasRendererInputContract === true,
    hasRealRenderGate: receivedContractSummary.hasRealRenderGate === true,
    hasFirstRealRenderPlan:
      receivedContractSummary.hasFirstRealRenderPlan === true,
    hasRealRenderConfiguration:
      receivedContractSummary.hasRealRenderConfiguration === true,
    requestedTarget:
      typeof receivedContractSummary.requestedTarget === 'string'
        ? receivedContractSummary.requestedTarget
        : '',
  }
}

const getRealRenderRouteReceivedContractCheck = () => {
  if (
    !realRenderRouteTestResponse ||
    typeof realRenderRouteTestResponse.receivedContractCheck !== 'object' ||
    realRenderRouteTestResponse.receivedContractCheck === null ||
    Array.isArray(realRenderRouteTestResponse.receivedContractCheck)
  ) {
    return null
  }

  const receivedContractCheck =
    realRenderRouteTestResponse.receivedContractCheck as Record<
      string,
      unknown
    >

  const missingOrInvalid = Array.isArray(
    receivedContractCheck.missingOrInvalid,
  )
    ? receivedContractCheck.missingOrInvalid.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  return {
    passed: receivedContractCheck.passed === true,
    missingOrInvalid,
  }
}

const getRealRenderRouteReceivedConfigurationCheck = () => {
  if (
    !realRenderRouteTestResponse ||
    typeof realRenderRouteTestResponse.receivedConfigurationCheck !==
      'object' ||
    realRenderRouteTestResponse.receivedConfigurationCheck === null ||
    Array.isArray(realRenderRouteTestResponse.receivedConfigurationCheck)
  ) {
    return null
  }

  const receivedConfigurationCheck =
    realRenderRouteTestResponse.receivedConfigurationCheck as Record<
      string,
      unknown
    >

  const missingOrInvalid = Array.isArray(
    receivedConfigurationCheck.missingOrInvalid,
  )
    ? receivedConfigurationCheck.missingOrInvalid.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  return {
    passed: receivedConfigurationCheck.passed === true,
    missingOrInvalid,
  }
}

const getRealRenderRouteReceivedConfigurationSummary = () => {
  if (
    !realRenderRouteTestResponse ||
    typeof realRenderRouteTestResponse.receivedConfigurationSummary !==
      'object' ||
    realRenderRouteTestResponse.receivedConfigurationSummary === null ||
    Array.isArray(realRenderRouteTestResponse.receivedConfigurationSummary)
  ) {
    return null
  }

  const receivedConfigurationSummary =
    realRenderRouteTestResponse.receivedConfigurationSummary as Record<
      string,
      unknown
    >

  return {
    configurationStatus:
      typeof receivedConfigurationSummary.configurationStatus === 'string'
        ? receivedConfigurationSummary.configurationStatus
        : '',
    audioStatus:
      typeof receivedConfigurationSummary.audioStatus === 'string'
        ? receivedConfigurationSummary.audioStatus
        : '',
    rendererStatus:
      typeof receivedConfigurationSummary.rendererStatus === 'string'
        ? receivedConfigurationSummary.rendererStatus
        : '',
    rendererCandidateStatus:
      typeof receivedConfigurationSummary.rendererCandidateStatus === 'string'
        ? receivedConfigurationSummary.rendererCandidateStatus
        : '',
    recommendedFirstRenderer:
      typeof receivedConfigurationSummary.recommendedFirstRenderer === 'string'
        ? receivedConfigurationSummary.recommendedFirstRenderer
        : '',
    rendererCandidateSelectedRenderer:
      typeof receivedConfigurationSummary.rendererCandidateSelectedRenderer ===
      'string'
        ? receivedConfigurationSummary.rendererCandidateSelectedRenderer
        : null,
    outputFormatStatus:
      typeof receivedConfigurationSummary.outputFormatStatus === 'string'
        ? receivedConfigurationSummary.outputFormatStatus
        : '',
    recommendedFirstFormat:
      typeof receivedConfigurationSummary.recommendedFirstFormat === 'string'
        ? receivedConfigurationSummary.recommendedFirstFormat
        : '',
    selectedFormat:
      typeof receivedConfigurationSummary.selectedFormat === 'string'
        ? receivedConfigurationSummary.selectedFormat
        : null,
    sampleRateStatus:
  typeof receivedConfigurationSummary.sampleRateStatus === 'string'
    ? receivedConfigurationSummary.sampleRateStatus
    : '',
    recommendedFirstSampleRateHz:
      typeof receivedConfigurationSummary.recommendedFirstSampleRateHz ===
      'number'
        ? receivedConfigurationSummary.recommendedFirstSampleRateHz
        : null,
    selectedSampleRateHz:
      typeof receivedConfigurationSummary.selectedSampleRateHz === 'number'
        ? receivedConfigurationSummary.selectedSampleRateHz
    : null,
storageStatus:
  typeof receivedConfigurationSummary.storageStatus === 'string'
    ? receivedConfigurationSummary.storageStatus
    : '',
recommendedFirstProvider:
  typeof receivedConfigurationSummary.recommendedFirstProvider === 'string'
    ? receivedConfigurationSummary.recommendedFirstProvider
    : '',
selectedProvider:
  typeof receivedConfigurationSummary.selectedProvider === 'string'
    ? receivedConfigurationSummary.selectedProvider
    : null,
firstTargetKey:
      typeof receivedConfigurationSummary.firstTargetKey === 'string'
        ? receivedConfigurationSummary.firstTargetKey
        : '',
  }
}

const getRealRenderRouteReceivedConfigurationStatus = () => {
  if (
    !realRenderRouteTestResponse ||
    typeof realRenderRouteTestResponse.receivedContractSummary !== 'object' ||
    realRenderRouteTestResponse.receivedContractSummary === null ||
    Array.isArray(realRenderRouteTestResponse.receivedContractSummary)
  ) {
    return 'unknown'
  }

  const receivedContractSummary =
    realRenderRouteTestResponse.receivedContractSummary as Record<
      string,
      unknown
    >

  return receivedContractSummary.hasRealRenderConfiguration === true
    ? 'yes'
    : 'no'
}

const getRealRenderRouteReceivedConfigurationPassed = () => {
  if (
    !realRenderRouteTestResponse ||
    typeof realRenderRouteTestResponse.receivedContractSummary !== 'object' ||
    realRenderRouteTestResponse.receivedContractSummary === null ||
    Array.isArray(realRenderRouteTestResponse.receivedContractSummary)
  ) {
    return false
  }

  const receivedContractSummary =
    realRenderRouteTestResponse.receivedContractSummary as Record<
      string,
      unknown
    >

  return receivedContractSummary.hasRealRenderConfiguration === true
}

const getBlockedRealRenderRouteTestPassed = () => {
  const receivedConfigurationSummary =
    getRealRenderRouteReceivedConfigurationSummary()

const receivedConfigurationCheck =
    getRealRenderRouteReceivedConfigurationCheck()

const receivedContractSummary =
  getRealRenderRouteReceivedContractSummary()

const receivedContractCheck =
  getRealRenderRouteReceivedContractCheck()

  return (
    realRenderRouteTestResponse !== null &&
    realRenderRouteTestResponse.httpStatus === 423 &&
    realRenderRouteTestResponse.status === 'blocked' &&
    realRenderRouteTestResponse.audioStatus === 'not-generated' &&
    realRenderRouteTestResponse.rendererStatus === 'not-connected' &&
    getRealRenderRouteReceivedConfigurationPassed() &&
    receivedContractSummary !== null &&
    receivedContractSummary.hasRendererInputContract &&
    receivedContractSummary.hasRealRenderGate &&
    receivedContractSummary.hasFirstRealRenderPlan &&
    receivedContractSummary.hasRealRenderConfiguration &&
    receivedContractSummary.requestedTarget === 'clickTrack' &&
    receivedContractCheck !== null &&
    receivedContractCheck.passed &&
    receivedContractCheck.missingOrInvalid.length === 0 &&
    receivedConfigurationCheck !== null &&
    receivedConfigurationCheck.passed &&
    receivedConfigurationCheck.missingOrInvalid.length === 0 &&
    receivedConfigurationSummary !== null &&
    receivedConfigurationSummary.configurationStatus ===
      'dry-run-real-render-configuration-placeholder' &&
    receivedConfigurationSummary.audioStatus === 'not-generated' &&
    receivedConfigurationSummary.rendererStatus === 'not-connected' &&
    receivedConfigurationSummary.rendererCandidateStatus ===
      'candidate-declared-not-selected' &&
    receivedConfigurationSummary.recommendedFirstRenderer ===
      'local-click-track-wav-renderer' &&
    receivedConfigurationSummary.rendererCandidateSelectedRenderer === null &&
    receivedConfigurationSummary.outputFormatStatus ===
     'format-candidate-declared-not-selected' &&
    receivedConfigurationSummary.recommendedFirstFormat === 'wav' &&
    receivedConfigurationSummary.selectedFormat === null &&
    receivedConfigurationSummary.sampleRateStatus ===
     'sample-rate-candidate-declared-not-selected' &&
   receivedConfigurationSummary.recommendedFirstSampleRateHz === 44100 &&
   receivedConfigurationSummary.selectedSampleRateHz === null &&
    receivedConfigurationSummary.storageStatus ===
  'storage-candidate-declared-not-configured' &&
    receivedConfigurationSummary.recommendedFirstProvider ===
      'browser-download' &&
    receivedConfigurationSummary.selectedProvider === null &&
    receivedConfigurationSummary.firstTargetKey === 'clickTrack'
  )
}

const testBlockedRealRenderRoute = async () => {
  if (!dryRunArtifactPackage) {
    setRealRenderRouteTestResponse({
      ok: false,
      status: 'missing-dry-run-artifact-package',
      message: 'Submit dry run before testing the blocked real-render route.',
    })
    return
  }

  setTestingRealRenderRoute(true)
  setRealRenderRouteTestResponse(null)

  try {
    const response = await fetch('/api/audio-preview/real-render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestedTarget: 'clickTrack',
        rendererInputContract: dryRunArtifactPackage.rendererInputContract,
        realRenderGate: dryRunArtifactPackage.realRenderGate,
        firstRealRenderPlan: dryRunArtifactPackage.firstRealRenderPlan,
        realRenderConfiguration: dryRunArtifactPackage.realRenderConfiguration,
      }),
    })

    const data = await response.json()

    setRealRenderRouteTestResponse({
      httpStatus: response.status,
      ...data,
    })
  } catch (error) {
    setRealRenderRouteTestResponse({
      ok: false,
      status: 'request-failed',
      message:
        error instanceof Error
          ? error.message
          : 'Blocked real-render route test failed.',
    })
  } finally {
    setTestingRealRenderRoute(false)
  }
}



const getPreviewPlanValue = (key: string) => {
  if (!audioPreviewPlan) {
    return ''
  }

  const value = audioPreviewPlan[key]

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

const getRenderStepValue = (
  step: Record<string, unknown>,
  key: string,
) => {
  const value = step[key]

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

const buildAudioRenderStepsCopyText = () => {
  if (audioPreviewRenderSteps.length === 0) {
    return ''
  }

  return [
    'AUDIO RENDER STEPS',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    '',
    ...audioPreviewRenderSteps.flatMap((step, index) => {
      const stepNumber = getRenderStepValue(step, 'step') || String(index + 1)
      const section = getRenderStepValue(step, 'section') || `Section ${stepNumber}`
      const goal = getRenderStepValue(step, 'goal')
      const guitarInstruction = getRenderStepValue(step, 'guitarInstruction')
      const vocalInstruction = getRenderStepValue(step, 'vocalInstruction')
      const dynamicInstruction = getRenderStepValue(step, 'dynamicInstruction')
      const notes = getRenderStepValue(step, 'notes')

      return [
        `STEP ${stepNumber}: ${section}`,
        goal ? `Goal: ${goal}` : '',
        guitarInstruction ? `Guitar: ${guitarInstruction}` : '',
        vocalInstruction ? `Vocal: ${vocalInstruction}` : '',
        dynamicInstruction ? `Dynamics: ${dynamicInstruction}` : '',
        notes ? `Notes: ${notes}` : '',
        '',
      ]
    }),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')
}

const buildSongsheetReviewCopyText = () => {
  const quality = getPlacedSongSheetQuality()
  const sourceMatch = getPlacedSongsheetSourceMatch()
  const serverValidation = getSongsheetServerValidation()
  const sourceCoverage = getPlacedSongsheetSourceCoverage()

  return [
    'SONGSHEET REVIEW',
    '',
    `Placement status: ${quality.label}`,
    quality.detail,
    `After-lyric chords: ${quality.outOfRangeChords ?? 0}`,
    quality.warning ? `Review note: ${quality.warning}` : '',
    '',
    'SOURCE LYRIC MATCH',
    '',
    sourceMatch.label,
    sourceMatch.detail,
    sourceMatch.unmatchedCount > 0
      ? `Unmatched placed lines: ${sourceMatch.unmatchedCount}`
      : '',
    ...sourceMatch.unmatchedLines.flatMap((line) => [
      `- ${line.section || 'Unknown section'}: ${line.lyric}`,
    ]),
    '',
    ...(serverValidation.hasValidation
      ? [
          'SERVER VALIDATION',
          '',
          `Source lines: ${serverValidation.sourceLineCount}`,
          `Accepted placed lines: ${serverValidation.acceptedLineCount}`,
          `Rejected rewritten lines: ${serverValidation.rejectedLineCount}`,
          ...serverValidation.rejectedLines.map((line) => `- ${line}`),
          '',
        ]
      : []),
    'SOURCE LYRIC COVERAGE',
    '',
    sourceCoverage.label,
    sourceCoverage.detail,
    sourceCoverage.missingLineCount > 0
      ? `Missing source lines: ${sourceCoverage.missingLineCount}`
      : '',
    ...sourceCoverage.missingLines.map((line) => `- ${line}`),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')
}

const copyAudioPreviewArtifactPackage = async () => {
  if (!dryRunArtifactPackage) {
    setAudioPreviewRenderMessage('No audio preview dry-run artefact package available to copy.')
    return
  }

  const realRenderReadinessSummary = getDryRunRealRenderReadinessSummary()
  const renderTargetRows = getDryRunRenderTargetRows()
  const guideTrackRenderRecipeSummary =
  getDryRunGuideTrackRenderRecipeSummary()
  const clickTrackRenderRecipeSummary =
  getDryRunClickTrackRenderRecipeSummary()
  const chordReferenceRenderRecipeSummary =
  getDryRunChordReferenceRenderRecipeSummary()
  const vocalGuideRenderRecipeSummary =
  getDryRunVocalGuideRenderRecipeSummary()
  const expectedOutputFileRows = getDryRunExpectedOutputFileRows()
  const rendererInputContractSummary =
  getDryRunRendererInputContractSummary()
  const realRenderGateSummary = getDryRunRealRenderGateSummary()
  const firstRealRenderPlanSummary =
  getDryRunFirstRealRenderPlanSummary()
  const realRenderRouteScaffoldSummary =
  getDryRunRealRenderRouteScaffoldSummary()
  const realRenderConfigurationSummary =
  getDryRunRealRenderConfigurationSummary()
  const blockedRealRenderRouteTestPassed =
  realRenderRouteTestResponse !== null &&
  realRenderRouteTestResponse.httpStatus === 423 &&
  realRenderRouteTestResponse.status === 'blocked' &&
  realRenderRouteTestResponse.audioStatus === 'not-generated' &&
  realRenderRouteTestResponse.rendererStatus === 'not-connected'
  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
  'AUDIO PREVIEW DRY-RUN ARTEFACT PACKAGE',
  '',
  ...getAudioPreviewReadinessCopyLines(),
  `Project: ${activeProject?.title || 'Untitled project'}`,
  `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
  `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
   'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'DRY-RUN ONLY WARNING',
    '',
    'No audio file has been generated.',
    'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
    '',
    'ARTEFACT PACKAGE VALIDATION',
    '',
    dryRunArtifactPackageValidation?.ready === true ? 'Passed' : 'Needs review',
    typeof dryRunArtifactPackageValidation?.detail === 'string'
      ? dryRunArtifactPackageValidation.detail
      : 'Validation details unavailable.',
    '',
    ...(realRenderReadinessSummary.readinessStatus
  ? [
      'REAL-RENDER READINESS',
      '',
      `Ready for real render: ${
        realRenderReadinessSummary.readyForRealRender === true ? 'Yes' : 'No'
      }`,
      `Status: ${realRenderReadinessSummary.readinessStatus}`,
      '',
      'Blockers:',
      ...realRenderReadinessSummary.blockers.map((item) => `- ${item}`),
      '',
      'Required decisions:',
      ...realRenderReadinessSummary.requiredDecisions.map(
        (item) => `- ${item}`,
      ),
      '',
      'Safety notes:',
      ...realRenderReadinessSummary.safetyNotes.map((item) => `- ${item}`),
      '',
    ]
  : []),
  ...(renderTargetRows.length > 0
  ? [
      'DECLARED RENDER TARGETS',
      '',
      ...renderTargetRows.flatMap((target) => [
        `${target.priority}. ${target.label}`,
        `Status: ${target.selected ? 'Selected' : 'Optional'}`,
        target.reason ? `Reason: ${target.reason}` : '',
        '',
      ]),
    ]
  : []),
  ...(guideTrackRenderRecipeSummary
  ? [
      'GUIDE-TRACK RENDER RECIPE',
      '',
      `Recipe status: ${guideTrackRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${guideTrackRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Output status: ${guideTrackRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Count-in: ${
        guideTrackRenderRecipeSummary.countIn.enabled
          ? `${guideTrackRenderRecipeSummary.countIn.bars} bar`
          : 'Not declared'
      }`,
      `Primary bed: ${
        guideTrackRenderRecipeSummary.musicalBed.primaryInstrument ||
        'Not declared'
      }`,
      '',
      guideTrackRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${guideTrackRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      ...(guideTrackRenderRecipeSummary.musicalBed.supportInstruments.length > 0
        ? [
            'Support instruments:',
            ...guideTrackRenderRecipeSummary.musicalBed.supportInstruments.map(
              (instrument) => `- ${instrument}`,
            ),
            '',
          ]
        : []),
      ...(guideTrackRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...guideTrackRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(clickTrackRenderRecipeSummary
  ? [
      'CLICK-TRACK RENDER RECIPE',
      '',
      `Recipe status: ${clickTrackRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${clickTrackRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Output status: ${clickTrackRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Count-in: ${
        clickTrackRenderRecipeSummary.countIn.enabled
          ? `${clickTrackRenderRecipeSummary.countIn.bars} bar`
          : 'Not declared'
      }`,
      `Click sound: ${
        clickTrackRenderRecipeSummary.clickSound.subdivision || 'Not declared'
      }${
        clickTrackRenderRecipeSummary.clickSound.downbeatEmphasis
          ? ' with downbeat emphasis'
          : ''
      }`,
      '',
      clickTrackRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${clickTrackRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      ...(clickTrackRenderRecipeSummary.sectionMarkers.enabled
        ? [
            'Section markers:',
            clickTrackRenderRecipeSummary.sectionMarkers.description ||
              'Section markers declared.',
            '',
          ]
        : []),
      ...(clickTrackRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...clickTrackRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(clickTrackRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...clickTrackRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(chordReferenceRenderRecipeSummary
  ? [
      'CHORD-REFERENCE RENDER RECIPE',
      '',
      `Recipe status: ${chordReferenceRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${chordReferenceRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Output status: ${chordReferenceRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Count-in: ${
        chordReferenceRenderRecipeSummary.countIn.enabled
          ? `${chordReferenceRenderRecipeSummary.countIn.bars} bar`
          : 'Not declared'
      }`,
      `Voicing: ${
        chordReferenceRenderRecipeSummary.voicing.primaryInstrument ||
        'Not declared'
      }${
        chordReferenceRenderRecipeSummary.voicing.density
          ? `, ${chordReferenceRenderRecipeSummary.voicing.density}`
          : ''
      }`,
      '',
      chordReferenceRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${chordReferenceRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      chordReferenceRenderRecipeSummary.chordSource.description
        ? `Chord source: ${chordReferenceRenderRecipeSummary.chordSource.description}`
        : '',
      '',
      ...(chordReferenceRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...chordReferenceRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(chordReferenceRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...chordReferenceRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(vocalGuideRenderRecipeSummary
  ? [
      'OPTIONAL VOCAL-GUIDE RENDER RECIPE',
      '',
      `Recipe status: ${vocalGuideRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${vocalGuideRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Selection: ${vocalGuideRenderRecipeSummary.targetSelection || 'Unknown'}`,
      `Output status: ${vocalGuideRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Melody source: ${
        vocalGuideRenderRecipeSummary.melodySource.status || 'Unknown'
      }`,
      '',
      vocalGuideRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${vocalGuideRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      ...(vocalGuideRenderRecipeSummary.activationRequirements.length > 0
        ? [
            'Activation requirements:',
            ...vocalGuideRenderRecipeSummary.activationRequirements.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.melodySource.acceptedSources.length > 0
        ? [
            'Accepted melody sources:',
            ...vocalGuideRenderRecipeSummary.melodySource.acceptedSources.map(
              (source) => `- ${source}`,
            ),
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.vocalStyle.defaultReference
        ? [
            'Vocal style placeholder:',
            vocalGuideRenderRecipeSummary.vocalStyle.defaultReference,
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...vocalGuideRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...vocalGuideRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(expectedOutputFileRows.length > 0
  ? [
      'EXPECTED OUTPUT FILE PLACEHOLDERS',
      '',
      ...expectedOutputFileRows.flatMap((output) => [
        `${output.label || output.key || 'Unnamed output'}`,
        `Key: ${output.key || 'Unknown'}`,
        `Selected: ${output.selected ? 'yes' : 'no'}`,
        `Status: ${output.status || 'Unknown'}`,
        `File: ${output.file === null ? 'null' : 'unexpected file value'}`,
        ...(output.requiredBeforeGenerated.length > 0
          ? [
              'Required before generated:',
              ...output.requiredBeforeGenerated.map(
                (requirement) => `- ${requirement}`,
              ),
            ]
          : []),
        '',
      ]),
    ]
  : []),
  ...(rendererInputContractSummary
  ? [
      'RENDERER INPUT CONTRACT',
      '',
      `Contract status: ${rendererInputContractSummary.contractStatus || 'Unknown'}`,
      `Audio status: ${rendererInputContractSummary.audioStatus || 'Unknown'}`,
      `Renderer status: ${rendererInputContractSummary.rendererStatus || 'Unknown'}`,
      `Storage status: ${rendererInputContractSummary.storageStatus || 'Unknown'}`,
      `Format status: ${rendererInputContractSummary.formatStatus || 'Unknown'}`,
      '',
      rendererInputContractSummary.purpose
        ? `Purpose: ${rendererInputContractSummary.purpose}`
        : '',
      '',
      ...(rendererInputContractSummary.requiredBeforeRealRender.length > 0
        ? [
            'Required before real render:',
            ...rendererInputContractSummary.requiredBeforeRealRender.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(rendererInputContractSummary.selectedOutputKeys.length > 0
        ? [
            'Selected outputs:',
            ...rendererInputContractSummary.selectedOutputKeys.map(
              (key) => `- ${key}`,
            ),
            '',
          ]
        : []),
      ...(rendererInputContractSummary.optionalOutputKeys.length > 0
        ? [
            'Optional outputs:',
            ...rendererInputContractSummary.optionalOutputKeys.map(
              (key) => `- ${key}`,
            ),
            '',
          ]
        : []),
      ...(rendererInputContractSummary.handoffRules.length > 0
        ? [
            'Handoff rules:',
            ...rendererInputContractSummary.handoffRules.map(
              (rule) => `- ${rule}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(realRenderGateSummary
  ? [
      'REAL-RENDER SAFETY GATE',
      '',
      `Gate status: ${realRenderGateSummary.gateStatus || 'Unknown'}`,
      `Can render audio: ${realRenderGateSummary.canRenderAudio ? 'yes' : 'no'}`,
      `Audio status: ${realRenderGateSummary.audioStatus || 'Unknown'}`,
      `Renderer status: ${realRenderGateSummary.rendererStatus || 'Unknown'}`,
      `Storage status: ${realRenderGateSummary.storageStatus || 'Unknown'}`,
      `Format status: ${realRenderGateSummary.formatStatus || 'Unknown'}`,
      `Dry run ready: ${realRenderGateSummary.dryRunReady ? 'yes' : 'no'}`,
      '',
      ...(realRenderGateSummary.blockedReasons.length > 0
        ? [
            'Blocked reasons:',
            ...realRenderGateSummary.blockedReasons.map(
              (reason) => `- ${reason}`,
            ),
            '',
          ]
        : []),
      ...(realRenderGateSummary.requiredToUnlock.length > 0
        ? [
            'Required to unlock:',
            ...realRenderGateSummary.requiredToUnlock.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(realRenderGateSummary.safetyRules.length > 0
        ? [
            'Safety rules:',
            ...realRenderGateSummary.safetyRules.map(
              (rule) => `- ${rule}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(firstRealRenderPlanSummary
  ? [
      'FIRST REAL-RENDER PLAN',
      '',
      `Plan status: ${firstRealRenderPlanSummary.planStatus || 'Unknown'}`,
      `Audio status: ${firstRealRenderPlanSummary.audioStatus || 'Unknown'}`,
      `Recommended first target: ${
        firstRealRenderPlanSummary.recommendedFirstTarget || 'Unknown'
      }`,
      `Strategy: ${
        firstRealRenderPlanSummary.rendererStrategy.strategyType || 'Unknown'
      }`,
      `Implementation status: ${
        firstRealRenderPlanSummary.rendererStrategy.implementationStatus ||
        'Unknown'
      }`,
      '',
      firstRealRenderPlanSummary.recommendedReason
        ? `Reason: ${firstRealRenderPlanSummary.recommendedReason}`
        : '',
      '',
      ...(firstRealRenderPlanSummary.firstUnlockRequirements.length > 0
        ? [
            'First unlock requirements:',
            ...firstRealRenderPlanSummary.firstUnlockRequirements.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(firstRealRenderPlanSummary.firstValidationChecks.length > 0
        ? [
            'First validation checks:',
            ...firstRealRenderPlanSummary.firstValidationChecks.map(
              (check) => `- ${check}`,
            ),
            '',
          ]
        : []),
      ...(firstRealRenderPlanSummary.laterTargets.length > 0
        ? [
            'Later targets:',
            ...firstRealRenderPlanSummary.laterTargets.map(
              (target) => `- ${target}`,
            ),
            '',
          ]
        : []),
      ...(firstRealRenderPlanSummary.notes.length > 0
        ? [
            'Notes:',
            ...firstRealRenderPlanSummary.notes.map((note) => `- ${note}`),
            '',
          ]
        : []),
    ]
  : []),

  ...(realRenderRouteScaffoldSummary
  ? [
      'BLOCKED REAL-RENDER ROUTE SCAFFOLD',
      '',
      `Route status: ${realRenderRouteScaffoldSummary.routeStatus || 'Unknown'}`,
      `Method: ${realRenderRouteScaffoldSummary.method || 'Unknown'}`,
      `Path: ${realRenderRouteScaffoldSummary.path || 'Unknown'}`,
      `Expected blocked status code: ${
        realRenderRouteScaffoldSummary.expectedBlockedStatusCode || 'Unknown'
      }`,
      `Audio status: ${realRenderRouteScaffoldSummary.audioStatus || 'Unknown'}`,
      `Renderer status: ${
        realRenderRouteScaffoldSummary.rendererStatus || 'Unknown'
      }`,
      '',
      realRenderRouteScaffoldSummary.purpose
        ? `Purpose: ${realRenderRouteScaffoldSummary.purpose}`
        : '',
      '',
      'Expected request shape:',
      `- requestedTarget: ${
        realRenderRouteScaffoldSummary.expectedRequestShape.requestedTarget ||
        'Unknown'
      }`,
      `- rendererInputContract: ${
        realRenderRouteScaffoldSummary.expectedRequestShape
          .rendererInputContract || 'Unknown'
      }`,
      `- realRenderGate: ${
        realRenderRouteScaffoldSummary.expectedRequestShape.realRenderGate ||
        'Unknown'
      }`,
      `- firstRealRenderPlan: ${
          realRenderRouteScaffoldSummary.expectedRequestShape
            .firstRealRenderPlan || 'Unknown'
        }`,
        `- realRenderConfiguration: ${
          realRenderRouteScaffoldSummary.expectedRequestShape
            .realRenderConfiguration || 'Unknown'
        }`,
        '',
      'Expected blocked response:',
      `- status: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.status ||
        'Unknown'
      }`,
      `- audioStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.audioStatus ||
        'Unknown'
      }`,
      `- rendererStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse
          .rendererStatus || 'Unknown'
      }`,
      `- storageStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.storageStatus ||
        'Unknown'
      }`,
      `  - recommendedFirstProvider: ${
              realRenderRouteScaffoldSummary.expectedBlockedResponse
                .receivedConfigurationSummary.recommendedFirstProvider || 'Unknown'
            }`,
            `  - selectedProvider: ${
              realRenderRouteScaffoldSummary.expectedBlockedResponse
                .receivedConfigurationSummary.selectedProvider || 'none'
            }`,
      `- formatStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.formatStatus ||
        'Unknown'
      }`,
      '- receivedContractSummary:',
        `  - rendererInputContract: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasRendererInputContract
            ? 'yes'
            : 'no'
        }`,
        `  - realRenderGate: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasRealRenderGate
            ? 'yes'
            : 'no'
        }`,
        `  - firstRealRenderPlan: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasFirstRealRenderPlan
            ? 'yes'
            : 'no'
        }`,
        `  - realRenderConfiguration: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasRealRenderConfiguration
            ? 'yes'
            : 'no'
        }`,
        `  - requestedTarget: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.requestedTarget || 'Unknown'
        }`,
      `- receivedContractCheck.passed: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractCheck.passed
            ? 'true'
            : 'false'
        }`,
        ...(realRenderRouteScaffoldSummary.expectedBlockedResponse
          .receivedContractCheck.missingOrInvalid.length > 0
          ? [
              '- receivedContractCheck.missingOrInvalid:',
              ...realRenderRouteScaffoldSummary.expectedBlockedResponse.receivedContractCheck.missingOrInvalid.map(
                (item) => `  - ${item}`,
              ),
            ]
          : ['- receivedContractCheck.missingOrInvalid: none']),
          '- receivedConfigurationSummary:',
`  - configurationStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.configurationStatus || 'Unknown'
}`,
`  - audioStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.audioStatus || 'Unknown'
}`,
`  - rendererStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererStatus || 'Unknown'
}`,
`  - rendererCandidateStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererCandidateStatus || 'Unknown'
}`,
`  - recommendedFirstRenderer: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstRenderer || 'Unknown'
}`,
`  - rendererCandidateSelectedRenderer: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererCandidateSelectedRenderer ||
  'none'
}`,
`  - outputFormatStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.outputFormatStatus || 'Unknown'
}`,
`  - recommendedFirstFormat: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstFormat || 'Unknown'
}`,
`  - selectedFormat: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.selectedFormat || 'none'
}`,
`  - sampleRateStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.sampleRateStatus || 'Unknown'
}`,
`  - recommendedFirstSampleRateHz: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstSampleRateHz ??
  'Unknown'
}`,
`  - selectedSampleRateHz: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.selectedSampleRateHz ?? 'none'
}`,
`  - storageStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.storageStatus || 'Unknown'
}`,
`  - firstTargetKey: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.firstTargetKey || 'Unknown'
}`,
      `- receivedConfigurationCheck.passed: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedConfigurationCheck.passed
            ? 'true'
            : 'false'
        }`,
        ...(realRenderRouteScaffoldSummary.expectedBlockedResponse
          .receivedConfigurationCheck.missingOrInvalid.length > 0
          ? [
              '- receivedConfigurationCheck.missingOrInvalid:',
              ...realRenderRouteScaffoldSummary.expectedBlockedResponse.receivedConfigurationCheck.missingOrInvalid.map(
                (item) => `  - ${item}`,
              ),
            ]
          : ['- receivedConfigurationCheck.missingOrInvalid: []']),
      '',

      ...(realRenderRouteScaffoldSummary.safetyRules.length > 0
        ? [
            'Safety rules:',
            ...realRenderRouteScaffoldSummary.safetyRules.map(
              (rule) => `- ${rule}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  
  ...(realRenderConfigurationSummary
  ? [
      'REAL-RENDER CONFIGURATION PLACEHOLDERS',
      '',
      `Configuration status: ${
        realRenderConfigurationSummary.configurationStatus || 'Unknown'
      }`,
      `Audio status: ${realRenderConfigurationSummary.audioStatus || 'Unknown'}`,
      `First target: ${
        realRenderConfigurationSummary.firstTarget.key || 'Unknown'
      } (${
        realRenderConfigurationSummary.firstTarget.status || 'Unknown'
      })`,
      '',
      `Renderer: ${
        realRenderConfigurationSummary.rendererImplementation
          .selectedRenderer || 'not connected'
      } (${
        realRenderConfigurationSummary.rendererImplementation.status ||
        'Unknown'
      })`,
      `Renderer candidate: ${
          realRenderConfigurationSummary.rendererCandidatePlan
            .recommendedFirstRenderer || 'not declared'
        } (${
          realRenderConfigurationSummary.rendererCandidatePlan.status || 'Unknown'
        })`,
        `Renderer candidate selected: ${
          realRenderConfigurationSummary.rendererCandidatePlan.selectedRenderer ||
          'not selected'
        }`,
        realRenderConfigurationSummary.rendererCandidatePlan.reason
          ? `Renderer candidate reason: ${realRenderConfigurationSummary.rendererCandidatePlan.reason}`
          : '',
        ...(realRenderConfigurationSummary.rendererCandidatePlan
          .mustRemainBlockedUntil.length > 0
          ? [
              'Renderer candidate must remain blocked until:',
              ...realRenderConfigurationSummary.rendererCandidatePlan.mustRemainBlockedUntil.map(
                (item) => `- ${item}`,
              ),
              '',
            ]
          : []),
     `Format candidate: ${
          realRenderConfigurationSummary.outputFormat.recommendedFirstFormat ||
          'not declared'
        } (${
          realRenderConfigurationSummary.outputFormat.status || 'Unknown'
        })`,
        `Format selected: ${
          realRenderConfigurationSummary.outputFormat.selectedFormat ||
          'not selected'
        }`,
        realRenderConfigurationSummary.outputFormat.reason
          ? `Format candidate reason: ${realRenderConfigurationSummary.outputFormat.reason}`
          : '',
...(realRenderConfigurationSummary.outputFormat.mustRemainBlockedUntil
  .length > 0
  ? [
      'Format candidate must remain blocked until:',
      ...realRenderConfigurationSummary.outputFormat.mustRemainBlockedUntil.map(
        (item) => `- ${item}`,
      ),
      '',
    ]
  : []),
`Sample-rate candidate: ${
  realRenderConfigurationSummary.sampleRate
    .recommendedFirstSampleRateHz ?? 'not declared'
} Hz (${
  realRenderConfigurationSummary.sampleRate.status || 'Unknown'
})`,
`Sample rate selected: ${
  realRenderConfigurationSummary.sampleRate.selectedSampleRateHz ??
  'not selected'
}`,
realRenderConfigurationSummary.sampleRate.reason
  ? `Sample-rate candidate reason: ${realRenderConfigurationSummary.sampleRate.reason}`
  : '',
...(realRenderConfigurationSummary.sampleRate.mustRemainBlockedUntil
  .length > 0
  ? [
      'Sample-rate candidate must remain blocked until:',
      ...realRenderConfigurationSummary.sampleRate.mustRemainBlockedUntil.map(
        (item) => `- ${item}`,
      ),
      '',
    ]
  : []),
      `Storage candidate: ${
          realRenderConfigurationSummary.storage.recommendedFirstProvider ||
          'not declared'
        } (${
          realRenderConfigurationSummary.storage.status || 'Unknown'
        })`,
        `Storage selected: ${
          realRenderConfigurationSummary.storage.selectedProvider ||
          'not configured'
        }`,
        realRenderConfigurationSummary.storage.reason
          ? `Storage candidate reason: ${realRenderConfigurationSummary.storage.reason}`
          : '',
        ...(realRenderConfigurationSummary.storage.mustRemainBlockedUntil.length > 0
          ? [
              'Storage candidate must remain blocked until:',
              ...realRenderConfigurationSummary.storage.mustRemainBlockedUntil.map(
                (item) => `- ${item}`,
              ),
              '',
            ]
          : []),
      '',

      ...(realRenderConfigurationSummary.unlockRequirements.length > 0
        ? [
            'Unlock requirements:',
            ...realRenderConfigurationSummary.unlockRequirements.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  
    'ARTEFACT PACKAGE JSON',
        '',
    JSON.stringify(dryRunArtifactPackage, null, 2),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewArtifactPackage(true)
    setAudioPreviewRenderMessage('Audio preview dry-run artefact package copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewArtifactPackage(false)
    }, 1500)
  } catch {
    setAudioPreviewRenderMessage('Could not copy audio preview dry-run artefact package.')
  }
}


const copyAudioPreviewHandoffBundle = async () => {
  if (!dryRunHandoffBundle) {
    setAudioPreviewRenderMessage('No audio preview dry-run handoff bundle available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
    'AUDIO PREVIEW DRY-RUN HANDOFF BUNDLE',
    '',
     ...getAudioPreviewReadinessCopyLines(),
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'DRY-RUN ONLY WARNING',
    '',
    'No audio file has been generated.',
    'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
    '',
    'HANDOFF BUNDLE VALIDATION',
    '',
    dryRunHandoffBundleValidation?.ready === true ? 'Passed' : 'Needs review',
    typeof dryRunHandoffBundleValidation?.detail === 'string'
      ? dryRunHandoffBundleValidation.detail
      : 'Validation details unavailable.',
    '',
    'HANDOFF BUNDLE JSON',
    '',
    JSON.stringify(dryRunHandoffBundle, null, 2),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewHandoffBundle(true)
    setAudioPreviewRenderMessage('Audio preview dry-run handoff bundle copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewHandoffBundle(false)
    }, 1500)
  } catch {
    setAudioPreviewRenderMessage('Could not copy audio preview dry-run handoff bundle.')
  }
}


const copyAudioPreviewRenderManifest = async () => {
  if (!dryRunRenderManifest) {
    setAudioPreviewRenderMessage('No audio preview dry-run render manifest available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()
  const expectedOutputRows = getDryRunExpectedOutputRows()
  const dryRunRendererContractSummary = getDryRunRendererContractSummary()

  const copyText = [
    'AUDIO PREVIEW DRY-RUN RENDER MANIFEST',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'DRY-RUN ONLY WARNING',
    '',
    'No audio file has been generated.',
    'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
    '',
    'MANIFEST VALIDATION',
'',
dryRunRenderManifestValidation?.ready === true ? 'Passed' : 'Needs review',
typeof dryRunRenderManifestValidation?.detail === 'string'
  ? dryRunRenderManifestValidation.detail
  : 'Validation details unavailable.',
'',
...(dryRunRendererContractSummary.contractStatus
  ? [
      'RENDERER CONTRACT',
      '',
      `Contract status: ${dryRunRendererContractSummary.contractStatus}`,
      `Renderer mode: ${dryRunRendererContractSummary.rendererMode || 'Unknown'}`,
      `Consumes: ${dryRunRendererContractSummary.consumes.join(', ') || 'None listed'}`,
      `Produces: ${dryRunRendererContractSummary.produces.join(', ') || 'None listed'}`,
      '',
      'Required before real render:',
      ...dryRunRendererContractSummary.requiredBeforeRealRender.map(
        (item) => `- ${item}`,
      ),
      '',
      'Safety notes:',
      ...dryRunRendererContractSummary.safetyNotes.map((item) => `- ${item}`),
      '',
    ]
  : []),
...(expectedOutputRows.length > 0
  ? [
      'EXPECTED AUDIO OUTPUTS',
      '',
     ...expectedOutputRows.flatMap((output) => [
      output.label,
      output.description ? `Description: ${output.description}` : '',
      output.role ? `Role: ${output.role}` : '',
      output.suggestedFileName
        ? `Suggested file: ${output.suggestedFileName}`
        : '',
      `Status: ${output.status}`,
      `Format: ${output.format}`,
      `URL: ${output.url || 'Not generated'}`,
      '',
    ]),
    ]
  : []),
'MANIFEST JSON',
'',
JSON.stringify(dryRunRenderManifest, null, 2),
    ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewRenderManifest(true)
    setAudioPreviewRenderMessage('Audio preview dry-run render manifest copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewRenderManifest(false)
    }, 1500)
  } catch {
    setAudioPreviewRenderMessage('Could not copy audio preview dry-run render manifest.')
  }
}


const copyAudioPreviewCueSheet = async () => {
  if (!audioPreviewDryRunRenderPlan) {
    setAudioPreviewRenderMessage('No audio preview dry-run cue sheet available to copy.')
    return
  }

  const cueSheet =
    audioPreviewDryRunRenderPlan.cueSheet &&
    typeof audioPreviewDryRunRenderPlan.cueSheet === 'object' &&
    !Array.isArray(audioPreviewDryRunRenderPlan.cueSheet)
      ? (audioPreviewDryRunRenderPlan.cueSheet as Record<string, unknown>)
      : null

  if (!cueSheet) {
    setAudioPreviewRenderMessage('No audio preview dry-run cue sheet available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
    'AUDIO PREVIEW DRY-RUN CUE SHEET',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'DRY-RUN ONLY WARNING',
    '',
    'No audio file has been generated.',
    'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
    '',
    'CUE SHEET VALIDATION',
    '',
    dryRunCueSheetValidation?.ready === true ? 'Passed' : 'Needs review',
    typeof dryRunCueSheetValidation?.detail === 'string'
      ? dryRunCueSheetValidation.detail
      : 'Validation details unavailable.',
    '',
    'CUE SHEET JSON',
    '',
    JSON.stringify(cueSheet, null, 2),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewCueSheet(true)
    setAudioPreviewRenderMessage('Audio preview dry-run cue sheet copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewCueSheet(false)
    }, 1500)
  } catch {
    setAudioPreviewRenderMessage('Could not copy audio preview dry-run cue sheet.')
  }
}



const copyAudioPreviewDryRunPlan = async () => {
  if (!audioPreviewDryRunRenderPlan) {
    setAudioPreviewRenderMessage('No audio preview dry-run render plan available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
    'AUDIO PREVIEW DRY-RUN RENDER PLAN',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'DRY-RUN ONLY WARNING',
    '',
    'No audio file has been generated.',
    'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
    '',
    'DRY-RUN RENDER PLAN JSON',
    '',
    JSON.stringify(audioPreviewDryRunRenderPlan, null, 2),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewDryRunPlan(true)
    setAudioPreviewRenderMessage('Audio preview dry-run render plan copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewDryRunPlan(false)
    }, 1500)
  } catch {
    setAudioPreviewRenderMessage('Could not copy audio preview dry-run render plan.')
  }
}


const copyAudioPreviewRendererPayload = async () => {
  if (!audioPreviewRendererPayload) {
    setAudioPreviewMessage('No audio preview renderer payload available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const validationText = audioPreviewRendererPayloadValidation
    ? [
        `Validation: ${
          audioPreviewRendererPayloadValidation.ready === true
            ? 'Passed'
            : 'Needs review'
        }`,
        typeof audioPreviewRendererPayloadValidation.detail === 'string'
          ? audioPreviewRendererPayloadValidation.detail
          : 'Validation details unavailable.',
      ]
    : ['Validation: Not available']

  const copyText = [
    'AUDIO PREVIEW RENDERER PAYLOAD',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'RENDERER PAYLOAD VALIDATION',
    '',
    ...validationText,
    '',
    'RENDERER PAYLOAD JSON',
    '',
    JSON.stringify(audioPreviewRendererPayload, null, 2),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewRendererPayload(true)
    setAudioPreviewMessage('Audio preview renderer payload copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewRendererPayload(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio preview renderer payload.')
  }
}


const copyAudioPreviewChecklist = async () => {
  const copyText = buildAudioPreviewChecklistCopyText()

  if (!copyText.trim()) {
    setAudioPreviewMessage('No audio preview checklist available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewChecklist(true)
    setAudioPreviewMessage('Audio preview checklist copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewChecklist(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio preview checklist.')
  }
}


const copyAudioPreviewSongSheet = async () => {
  if (!audioPreviewSongSheetText.trim()) {
    setAudioPreviewMessage('No audio preview placed songsheet available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
    'AUDIO PREVIEW PLACED SONGSHEET',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'PLACED SONGSHEET',
    '',
    audioPreviewSongSheetText,
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewSongSheet(true)
    setAudioPreviewMessage('Audio preview placed songsheet copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewSongSheet(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio preview placed songsheet.')
  }
}


const copyAudioPreviewSectionGuide = async () => {
  if (!audioPreviewSectionGuideText.trim()) {
    setAudioPreviewMessage('No audio preview section guide available to copy.')
    return
  }

  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

  const copyText = [
    'AUDIO PREVIEW SECTION GUIDE',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Audio preview result: ${audioPreviewResultStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewResultStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'SECTION GUIDE',
    '',
    audioPreviewSectionGuideText,
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewSectionGuide(true)
    setAudioPreviewMessage('Audio preview section guide copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewSectionGuide(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio preview section guide.')
  }
}


const copyAudioPreviewSpec = async () => {
  if (!audioPreviewSpecPreview.trim()) {
    setAudioPreviewMessage('No audio preview spec available to copy.')
    return
  }

  const audioPreviewHandoffStatus = getAudioPreviewHandoffStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()
  const songsheetReviewStatusLabel = getSongsheetReviewStatusLabel()
  const songsheetReviewSummaryLine = getSongsheetReviewSummaryLine()

  const copyText = [
    'AUDIO PREVIEW SPEC',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Songsheet status: ${songsheetReviewStatusLabel}`,
    songsheetReviewSummaryLine ? songsheetReviewSummaryLine : '',
    `Audio preview handoff: ${audioPreviewHandoffStatus.label}`,
    `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'STATUS DETAIL',
    '',
    audioPreviewHandoffStatus.detail,
    fullPackAudioPreviewStatus.detail,
    '',
    'AUDIO PREVIEW SPEC JSON',
    '',
    audioPreviewSpecPreview,
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioPreviewSpec(true)
    setAudioPreviewMessage('Audio preview spec copied.')

    window.setTimeout(() => {
      setJustCopiedAudioPreviewSpec(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio preview spec.')
  }
}

const copyAudioRenderSteps = async () => {
  const copyText = buildAudioRenderStepsCopyText()

  if (!copyText) {
    setAudioPreviewMessage('No audio render steps available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioRenderSteps(true)
    setAudioPreviewMessage('Audio render steps copied.')

    window.setTimeout(() => {
      setJustCopiedAudioRenderSteps(false)
    }, 1500)
  } catch {
    setAudioPreviewMessage('Could not copy audio render steps.')
  }
}


const copyAudioGuidePrompt = async () => {
  const copyText = buildAudioGuidePromptCopyText()

  if (!copyText) {
    setChordExtractionMessage('No performance songsheet available for an audio guide prompt.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioGuidePrompt(true)
    setChordExtractionMessage('Audio guide prompt copied.')

    window.setTimeout(() => {
      setJustCopiedAudioGuidePrompt(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy audio guide prompt.')
  }
}

const copyAudioGuideSummary = async () => {
  const copyText = buildAudioGuideSummaryCopyText()

  if (!copyText) {
    setChordExtractionMessage('No audio guide summary available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedAudioGuideSummary(true)
    setChordExtractionMessage('Audio guide summary copied.')

    window.setTimeout(() => {
      setJustCopiedAudioGuideSummary(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy audio guide summary.')
  }
}


const copyPerformanceDesignNotes = async () => {
  const copyText = buildPerformanceDesignNotesCopyText()

  if (!copyText) {
    setChordExtractionMessage('No performance design notes available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedPerformanceDesignNotes(true)
    setChordExtractionMessage('Performance design notes copied.')

    window.setTimeout(() => {
      setJustCopiedPerformanceDesignNotes(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy performance design notes.')
  }
}


const copyPerformanceIntent = async () => {
  const copyText = buildPerformanceIntentCopyText()

  if (!copyText) {
    setChordExtractionMessage('No performance intent available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedPerformanceIntent(true)
    setChordExtractionMessage('Performance intent copied.')

    window.setTimeout(() => {
      setJustCopiedPerformanceIntent(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy performance intent.')
  }
}


const copyFullPerformancePack = async () => {
  const copyText = buildFullPerformancePackCopyText()

  if (!copyText) {
    setChordExtractionMessage('No full performance pack available to copy.')
    return
  }

  try {
    await navigator.clipboard.writeText(copyText)
    setJustCopiedFullPerformancePack(true)
    setChordExtractionMessage('Full performance pack copied.')

    window.setTimeout(() => {
      setJustCopiedFullPerformancePack(false)
    }, 1500)
  } catch {
    setChordExtractionMessage('Could not copy full performance pack.')
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

const getSongsheetReviewStatusLabel = () => {
  const reviewSummary = getSongsheetReviewSummaryLine()

  if (reviewSummary) {
    return 'Needs songsheet review'
  }

  const placedLines = getPlacedSongSheetLines(getChordDataFromEditorJson())

  if (placedLines.length > 0) {
    return 'Songsheet checks clear'
  }

  return 'No placed songsheet yet'
}



const getSongsheetReviewSummaryLine = () => {
  const sourceMatch = getPlacedSongsheetSourceMatch()
  const serverValidation = getSongsheetServerValidation()
  const sourceCoverage = getPlacedSongsheetSourceCoverage()

  const warnings = [
    sourceMatch.unmatchedCount > 0
      ? `${sourceMatch.unmatchedCount} unmatched placed line${sourceMatch.unmatchedCount === 1 ? '' : 's'}`
      : '',
    serverValidation.rejectedLineCount > 0
      ? `${serverValidation.rejectedLineCount} rejected line${serverValidation.rejectedLineCount === 1 ? '' : 's'}`
      : '',
    sourceCoverage.missingLineCount > 0
      ? `${sourceCoverage.missingLineCount} missing source line${sourceCoverage.missingLineCount === 1 ? '' : 's'}`
      : '',
  ].filter(Boolean)

  if (warnings.length === 0) {
    return ''
  }

  return `Songsheet review: ${warnings.join(', ')}.`
}


const buildPerformanceDesignNotesCopyText = () => {
  const chordData = getChordDataFromEditorJson()
  const intentRows = getPerformanceIntentRows(chordData)
  const quality = getPlacedSongSheetQuality()
  const keyCheck = getKeyChordConsistency(chordData)
  const songsheetReviewText = buildSongsheetReviewCopyText()
  const audioReadinessText = buildAudioGuideReadinessCopyText()

  if (!chordData || intentRows.length === 0) {
    return ''
  }

  return [
    'PERFORMANCE DESIGN NOTES',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    '',
    'PERFORMANCE INTENT',
    '',
    ...intentRows.map((row) => `${row.label}: ${row.value}`),
    '',
    songsheetReviewText,
    '',
    'KEY / CHORD CHECK',
    '',
    keyCheck.label,
    keyCheck.detail,
    keyCheck.warning ? `Review note: ${keyCheck.warning}` : '',
    '',
    ...(audioReadinessText
      ? [
          'AUDIO GUIDE READINESS',
          '',
          audioReadinessText
            .replace(/^AUDIO GUIDE READINESS\s*/i, '')
            .trim(),
          '',
        ]
      : []),
    '',
    'PERFORMER NOTES',
    '',
    '- Use these notes to remember the intended feel before rehearsing.',
    '- Treat chord-over-lyric placement as a performance proposal, not a fixed rule.',
    '- Review after-lyric chords as possible turnarounds, held chords, pickups, breaths, or instrumental responses.',
    '- If the rhythm or melody is uncertain, capture a quick audio snippet before changing the design.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}


const buildCompactPerformanceDesignNotesCopyText = () => {
  const songsheetReviewText = buildSongsheetReviewCopyText()
  const chordData = getChordDataFromEditorJson()
  const quality = getPlacedSongSheetQuality()
  const keyCheck = getKeyChordConsistency(chordData)
  const audioReadinessText = buildAudioGuideReadinessCopyText()

  if (!chordData) {
    return ''
  }

  return [
    songsheetReviewText,
    '',
    'KEY / CHORD CHECK',
    '',
    keyCheck.label,
    keyCheck.detail,
    keyCheck.warning ? `Review note: ${keyCheck.warning}` : '',
    '',
    ...(audioReadinessText
      ? [
          'AUDIO GUIDE READINESS',
          '',
          audioReadinessText
            .replace(/^AUDIO GUIDE READINESS\s*/i, '')
            .trim(),
          '',
        ]
      : []),
    '',
    'PERFORMER NOTES',
    '',
    '- Use these notes to remember the intended feel before rehearsing.',
    '- Treat chord-over-lyric placement as a performance proposal, not a fixed rule.',
    '- Review after-lyric chords as possible turnarounds, held chords, pickups, breaths, or instrumental responses.',
    '- If the rhythm or melody is uncertain, capture a quick audio snippet before changing the design.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}


const buildPerformanceIntentCopyText = () => {
  const chordData = getChordDataFromEditorJson()
  const rows = getPerformanceIntentRows(chordData)

  if (rows.length === 0) {
    return ''
  }

  return [
    'PERFORMANCE INTENT',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
  ].join('\n')
}

const buildFullPerformancePackCopyText = () => {
  const fullPackPipelineComplete =
  Boolean(audioPreviewRendererPayload) &&
  audioPreviewRendererPayloadValidation?.ready === true &&
  Boolean(audioPreviewDryRunRenderPlan) &&
  dryRunRenderPlanValidation?.ready === true &&
  dryRunCueSheetValidation?.ready === true &&
  Boolean(dryRunRenderManifest) &&
  dryRunRenderManifestValidation?.ready === true &&
  dryRunHandoffBundleValidation?.ready === true &&
  Boolean(dryRunArtifactPackage) &&
  dryRunArtifactPackageValidation?.ready === true

const fullPackPipelineStatus = fullPackPipelineComplete
  ? {
      label: 'Audio preview pipeline complete',
      progress: 'Complete',
      nextAction: 'Ready for future renderer integration.',
      detail:
      'Preview spec, renderer payload, dry-run plan, cue sheet, manifest, handoff bundle, artefact package, validations, and real-render blockers are ready.'
    }
  : {
      label: 'Audio preview pipeline in progress',
      progress: 'Incomplete',
      nextAction: 'Complete the audio preview request and dry-run handoff.',
      detail:
        'The Full Performance Pack does not yet have every audio-preview dry-run artefact and validation.',
    }
  const songsheetText = buildCompactPlacedSongSheetCopyText()
  const designNotesText = buildCompactPerformanceDesignNotesCopyText()
  const guideTrackPlanText = buildGuideTrackPlanCopyText()
  const audioGuidePromptText = buildCompactAudioGuidePromptCopyText()
  const generationUsageText = buildChordGenerationUsageCopyText()
  const songsheetReviewStatusLabel = getSongsheetReviewStatusLabel()
  const audioPreviewResultStatus = getAudioPreviewResultStatus()
  const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()
  const audioPreviewDryRunCueSheet = getAudioPreviewDryRunCueSheet()
  const expectedOutputRows = getDryRunExpectedOutputRows()
  const dryRunRendererContractSummary = getDryRunRendererContractSummary()
  const renderTargetRows = getDryRunRenderTargetRows()
  const guideTrackRenderRecipeSummary =
  getDryRunGuideTrackRenderRecipeSummary()
  const clickTrackRenderRecipeSummary =
  getDryRunClickTrackRenderRecipeSummary()
  const chordReferenceRenderRecipeSummary =
  getDryRunChordReferenceRenderRecipeSummary()
  const vocalGuideRenderRecipeSummary =
  getDryRunVocalGuideRenderRecipeSummary()
  const expectedOutputFileRows = getDryRunExpectedOutputFileRows()
  const rendererInputContractSummary =
  getDryRunRendererInputContractSummary()
  const realRenderGateSummary = getDryRunRealRenderGateSummary()
  const firstRealRenderPlanSummary =
  getDryRunFirstRealRenderPlanSummary()
  const realRenderRouteScaffoldSummary =
  getDryRunRealRenderRouteScaffoldSummary()
  const realRenderConfigurationSummary =
  getDryRunRealRenderConfigurationSummary()
  const blockedRealRenderRouteTestPassed =
  getBlockedRealRenderRouteTestPassed()
  const receivedConfigurationSummary =
  getRealRenderRouteReceivedConfigurationSummary()
  const receivedConfigurationCheck =
  getRealRenderRouteReceivedConfigurationCheck()
  const receivedContractSummary =
  getRealRenderRouteReceivedContractSummary()
  const receivedContractCheck =
  getRealRenderRouteReceivedContractCheck()
  const intentRows = getPerformanceIntentRows(getChordDataFromEditorJson())
  const realRenderReadinessSummary = getDryRunRealRenderReadinessSummary()

  const compactGuideTrackPlanText = guideTrackPlanText
    .replace(/^GUIDE TRACK PLAN\s*/i, '')
    .trim()

  if (
    !songsheetText &&
    !designNotesText &&
    !compactGuideTrackPlanText &&
    !audioGuidePromptText
  ) {
    return ''
  }

 return [
  'FULL PERFORMANCE PACK',
  '',
  ...getAudioPreviewReadinessCopyLines(),
  `Project: ${activeProject?.title || 'Untitled project'}`,
  `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
  `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
  `Songsheet status: ${songsheetReviewStatusLabel}`,
  `Audio preview result: ${audioPreviewResultStatus.label}`,
  `Full pack audio status: ${fullPackAudioPreviewStatus.label}`,
  `Audio preview pipeline: ${fullPackPipelineStatus.label}`,
  `Audio preview progress: ${fullPackPipelineStatus.progress}`,
  `Audio preview next step: ${fullPackPipelineStatus.nextAction}`,
  `Generated at: ${new Date().toLocaleString()}`,
  ...getSongsheetTransposeCopyRows(),
  '',
 ...(audioPreviewResultStatus.detail ||
        fullPackAudioPreviewStatus.detail ||
        audioPreviewPipelineStatus.detail
            ? [
                'AUDIO PREVIEW STATUS',
                '',
                `Result: ${audioPreviewResultStatus.detail}`,
                `Full pack: ${fullPackAudioPreviewStatus.detail}`,
                `Pipeline: ${fullPackPipelineStatus.detail}`,
                '',
            ]
     : []),
  ...(intentRows.length > 0
    ? [
          '============================================================',
          'PERFORMANCE INTENT',
          '============================================================',
          '',
          ...intentRows.map((row) => `${row.label}: ${row.value}`),
          '',
        ]
      : []),
    ...(songsheetText
      ? [
          '============================================================',
          'PERFORMANCE SONGSHEET',
          '============================================================',
          '',
          songsheetText,
          '',
        ]
      : []),
    ...(designNotesText
      ? [
          '============================================================',
          'PERFORMANCE DESIGN NOTES',
          '============================================================',
          '',
          designNotesText,
          '',
        ]
      : []),
    ...(generationUsageText
      ? [
          '============================================================',
          'STAGED GENERATION USAGE',
          '============================================================',
          '',
          generationUsageText
            .replace(/^STAGED CHORD GENERATION USAGE\s*/i, '')
            .trim(),
          '',
        ]
      : []),
    ...(compactGuideTrackPlanText
      ? [
          '============================================================',
          'GUIDE TRACK PLAN',
          '============================================================',
          '',
          compactGuideTrackPlanText,
          '',
        ]
      : []),
    ...(audioGuidePromptText
      ? [
          '============================================================',
          'AUDIO GUIDE PROMPT',
          '============================================================',
          '',
          audioGuidePromptText,
            ]
          : []),
          ...(audioPreviewSongSheetText
          ? [
              '============================================================',
              'AUDIO PREVIEW PLACED SONGSHEET',
              '============================================================',
              '',
              'Exact chord-over-lyric songsheet included in the audio preview render prompt.',
              '',
              audioPreviewSongSheetText,
              '',
            ]
          : []),
          ...(audioPreviewSectionGuideText
      ? [
          '============================================================',
          'AUDIO PREVIEW SECTION GUIDE',
          '============================================================',
          '',
          'Section-by-section render guidance derived from the guide track plan.',
          '',
          audioPreviewSectionGuideText,
          '',
        ]
      : []),
     ...(audioPreviewRenderPrompt
      ? [
          '============================================================',
          'AUDIO PREVIEW RENDER PROMPT',
          '============================================================',
          '',
          'Renderer-ready prompt generated from the current performance intent, placed songsheet, and section guide.',
          '',
          audioPreviewRenderPrompt,
          '',
        ]
      : []),
      ...(!audioPreviewRenderPrompt
      ? [
          '============================================================',
          'AUDIO PREVIEW RENDER PROMPT',
          '============================================================',
          '',
          'No audio preview render prompt has been requested yet.',
          'Use Request audio preview before copying the final Full Performance Pack if you want this handoff included.',
          '',
        ]
      : []),
      ...(audioPreviewRendererPayload
      ? [
          '============================================================',
          'AUDIO PREVIEW RENDERER PAYLOAD',
          '============================================================',
          '',
          'Structured machine-readable payload intended for a future audio preview renderer.',
          '',
          `Validation: ${
              audioPreviewRendererPayloadValidation?.ready === true
                ? 'Passed'
                : 'Needs review'
            }`,
            typeof audioPreviewRendererPayloadValidation?.detail === 'string'
              ? audioPreviewRendererPayloadValidation.detail
              : 'Validation details unavailable.',
            '',
          JSON.stringify(audioPreviewRendererPayload, null, 2),
          '',
            ]
          : []),
          ...(audioPreviewRenderJob
          ? [
              '============================================================',
              'AUDIO PREVIEW DRY-RUN JOB',
              '============================================================',
              '',
              'Dry-run handoff response from /api/audio-preview/render. No audio file is generated yet.',
              '',
              JSON.stringify(audioPreviewRenderJob, null, 2),
              '',
            ]
          : []),
          ...(audioPreviewDryRunRenderPlan
  ? [
      '============================================================',
      'AUDIO PREVIEW DRY-RUN RENDER PLAN',
      '============================================================',
      '',
      'Renderer-facing dry-run plan derived from the audio preview payload. No audio file is generated yet.',
      '',
      'DRY-RUN ONLY WARNING',
        '',
        'No audio file has been generated.',
        'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
'',
      'RENDER PLAN VALIDATION',
      '',
      dryRunRenderPlanValidation?.ready === true ? 'Passed' : 'Needs review',
      typeof dryRunRenderPlanValidation?.detail === 'string'
        ? dryRunRenderPlanValidation.detail
        : 'Validation details unavailable.',
      '',
      'RENDER PLAN JSON',
      '',
      JSON.stringify(audioPreviewDryRunRenderPlan, null, 2),
      '',
    ]
  : []),
          ...(audioPreviewDryRunCueSheet
  ? [
      '============================================================',
      'AUDIO PREVIEW DRY-RUN CUE SHEET',
      '============================================================',
      '',
      'Estimated timing cue sheet derived from the dry-run timeline. These timings are approximate and are not final rendered audio timings.',
      '',
      'DRY-RUN ONLY WARNING',
        '',
        'No audio file has been generated.',
        'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
        '',
      'CUE SHEET VALIDATION',
      '',
      dryRunCueSheetValidation?.ready === true ? 'Passed' : 'Needs review',
      typeof dryRunCueSheetValidation?.detail === 'string'
        ? dryRunCueSheetValidation.detail
        : 'Validation details unavailable.',
      '',
      'CUE SHEET JSON',
      '',
      JSON.stringify(audioPreviewDryRunCueSheet, null, 2),
      '',
    ]
  : []),

...(dryRunRenderManifest
  ? [
      '============================================================',
      'AUDIO PREVIEW DRY-RUN RENDER MANIFEST',
      '============================================================',
      '',
      'Renderer-facing dry-run manifest with validation status and future audio output placeholders. No audio file is generated yet.',
      '',
      'DRY-RUN ONLY WARNING',
      '',
      'No audio file has been generated.',
      'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
      '',
      'MANIFEST VALIDATION',
      '',
      dryRunRenderManifestValidation?.ready === true ? 'Passed' : 'Needs review',
      typeof dryRunRenderManifestValidation?.detail === 'string'
        ? dryRunRenderManifestValidation.detail
        : 'Validation details unavailable.',
      '',
      ...(dryRunRendererContractSummary.contractStatus
        ? [
            'RENDERER CONTRACT',
            '',
            `Contract status: ${dryRunRendererContractSummary.contractStatus}`,
            `Renderer mode: ${dryRunRendererContractSummary.rendererMode || 'Unknown'}`,
            `Consumes: ${dryRunRendererContractSummary.consumes.join(', ') || 'None listed'}`,
            `Produces: ${dryRunRendererContractSummary.produces.join(', ') || 'None listed'}`,
            '',
            'Required before real render:',
            ...dryRunRendererContractSummary.requiredBeforeRealRender.map(
              (item) => `- ${item}`,
            ),
            '',
            'Safety notes:',
            ...dryRunRendererContractSummary.safetyNotes.map(
              (item) => `- ${item}`,
            ),
            '',
          ]
        : []),
      ...(expectedOutputRows.length > 0
        ? [
            'EXPECTED AUDIO OUTPUTS',
            '',
            ...expectedOutputRows.flatMap((output) => [
              output.label,
              output.description ? `Description: ${output.description}` : '',
              output.role ? `Role: ${output.role}` : '',
              output.suggestedFileName
                ? `Suggested file: ${output.suggestedFileName}`
                : '',
              `Status: ${output.status}`,
              `Format: ${output.format}`,
              `URL: ${output.url || 'Not generated'}`,
              '',
            ]),
          ]
        : []),
      'MANIFEST JSON',
      '',
      JSON.stringify(dryRunRenderManifest, null, 2),
      '',
    ]
  : []),

...(dryRunHandoffBundle
  ? [
      '============================================================',
      'AUDIO PREVIEW DRY-RUN HANDOFF BUNDLE',
      '============================================================',
      '',
      'Consolidated dry-run handoff summary for future renderer integration. No audio file is generated yet.',
      '',
      'HANDOFF BUNDLE VALIDATION',
      '',
      dryRunHandoffBundleValidation?.ready === true
        ? 'Passed'
        : 'Needs review',
      typeof dryRunHandoffBundleValidation?.detail === 'string'
        ? dryRunHandoffBundleValidation.detail
        : 'Validation details unavailable.',
      '',
      'HANDOFF BUNDLE JSON',
      '',
      JSON.stringify(dryRunHandoffBundle, null, 2),
      '',
    ]
  : []),

  ...(dryRunArtifactPackage
  ? [
      '============================================================',
      'AUDIO PREVIEW DRY-RUN ARTEFACT PACKAGE',
      '============================================================',
      '',
      'Machine-readable package containing the dry-run render job, render plan, cue sheet, manifest, handoff bundle, and validations. No audio file is generated yet.',
      '',
      'DRY-RUN ONLY WARNING',
      '',
      'No audio file has been generated.',
      'Real rendering is blocked until renderer, format, storage, and timing decisions are made.',
      '',
      'ARTEFACT PACKAGE VALIDATION',
      '',
      dryRunArtifactPackageValidation?.ready === true
        ? 'Passed'
        : 'Needs review',
      typeof dryRunArtifactPackageValidation?.detail === 'string'
        ? dryRunArtifactPackageValidation.detail
        : 'Validation details unavailable.',
      '',
      ...(realRenderReadinessSummary.readinessStatus
        ? [
            'REAL-RENDER READINESS',
            '',
            `Ready for real render: ${
              realRenderReadinessSummary.readyForRealRender === true
                ? 'Yes'
                : 'No'
            }`,
            `Status: ${realRenderReadinessSummary.readinessStatus}`,
            '',
            'Blockers:',
            ...realRenderReadinessSummary.blockers.map((item) => `- ${item}`),
            '',
            'Required decisions:',
            ...realRenderReadinessSummary.requiredDecisions.map(
              (item) => `- ${item}`,
            ),
            '',
            'Safety notes:',
            ...realRenderReadinessSummary.safetyNotes.map(
              (item) => `- ${item}`,
            ),
            '',
          ]
        : []),
        ...(renderTargetRows.length > 0
        ? [
          'DECLARED RENDER TARGETS',
          '',
          ...renderTargetRows.flatMap((target) => [
            `${target.priority}. ${target.label}`,
            `Status: ${target.selected ? 'Selected' : 'Optional'}`,
            target.reason ? `Reason: ${target.reason}` : '',
            '',
          ]),
        ]
      : []),
      ...(guideTrackRenderRecipeSummary
  ? [
      'GUIDE-TRACK RENDER RECIPE',
      '',
      `Recipe status: ${guideTrackRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${guideTrackRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Output status: ${guideTrackRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Count-in: ${
        guideTrackRenderRecipeSummary.countIn.enabled
          ? `${guideTrackRenderRecipeSummary.countIn.bars} bar`
          : 'Not declared'
      }`,
      `Primary bed: ${
        guideTrackRenderRecipeSummary.musicalBed.primaryInstrument ||
        'Not declared'
      }`,
      '',
      guideTrackRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${guideTrackRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      ...(guideTrackRenderRecipeSummary.musicalBed.supportInstruments.length > 0
        ? [
            'Support instruments:',
            ...guideTrackRenderRecipeSummary.musicalBed.supportInstruments.map(
              (instrument) => `- ${instrument}`,
            ),
            '',
          ]
        : []),
      ...(guideTrackRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...guideTrackRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(guideTrackRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...guideTrackRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(clickTrackRenderRecipeSummary
  ? [
      'CLICK-TRACK RENDER RECIPE',
      '',
      `Recipe status: ${clickTrackRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${clickTrackRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Output status: ${clickTrackRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Count-in: ${
        clickTrackRenderRecipeSummary.countIn.enabled
          ? `${clickTrackRenderRecipeSummary.countIn.bars} bar`
          : 'Not declared'
      }`,
      `Click sound: ${
        clickTrackRenderRecipeSummary.clickSound.subdivision || 'Not declared'
      }${
        clickTrackRenderRecipeSummary.clickSound.downbeatEmphasis
          ? ' with downbeat emphasis'
          : ''
      }`,
      '',
      clickTrackRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${clickTrackRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      ...(clickTrackRenderRecipeSummary.sectionMarkers.enabled
        ? [
            'Section markers:',
            clickTrackRenderRecipeSummary.sectionMarkers.description ||
              'Section markers declared.',
            '',
          ]
        : []),
      ...(clickTrackRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...clickTrackRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(clickTrackRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...clickTrackRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(chordReferenceRenderRecipeSummary
  ? [
      'CHORD-REFERENCE RENDER RECIPE',
      '',
      `Recipe status: ${chordReferenceRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${chordReferenceRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Output status: ${chordReferenceRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Count-in: ${
        chordReferenceRenderRecipeSummary.countIn.enabled
          ? `${chordReferenceRenderRecipeSummary.countIn.bars} bar`
          : 'Not declared'
      }`,
      `Voicing: ${
        chordReferenceRenderRecipeSummary.voicing.primaryInstrument ||
        'Not declared'
      }${
        chordReferenceRenderRecipeSummary.voicing.density
          ? `, ${chordReferenceRenderRecipeSummary.voicing.density}`
          : ''
      }`,
      '',
      chordReferenceRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${chordReferenceRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      chordReferenceRenderRecipeSummary.chordSource.description
        ? `Chord source: ${chordReferenceRenderRecipeSummary.chordSource.description}`
        : '',
      '',
      ...(chordReferenceRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...chordReferenceRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(chordReferenceRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...chordReferenceRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(vocalGuideRenderRecipeSummary
  ? [
      'OPTIONAL VOCAL-GUIDE RENDER RECIPE',
      '',
      `Recipe status: ${vocalGuideRenderRecipeSummary.recipeStatus || 'Unknown'}`,
      `Target: ${vocalGuideRenderRecipeSummary.targetKey || 'Unknown'}`,
      `Selection: ${vocalGuideRenderRecipeSummary.targetSelection || 'Unknown'}`,
      `Output status: ${vocalGuideRenderRecipeSummary.outputStatus || 'Unknown'}`,
      `Melody source: ${
        vocalGuideRenderRecipeSummary.melodySource.status || 'Unknown'
      }`,
      '',
      vocalGuideRenderRecipeSummary.rendererRequirement
        ? `Renderer requirement: ${vocalGuideRenderRecipeSummary.rendererRequirement}`
        : '',
      '',
      ...(vocalGuideRenderRecipeSummary.activationRequirements.length > 0
        ? [
            'Activation requirements:',
            ...vocalGuideRenderRecipeSummary.activationRequirements.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.melodySource.acceptedSources.length > 0
        ? [
            'Accepted melody sources:',
            ...vocalGuideRenderRecipeSummary.melodySource.acceptedSources.map(
              (source) => `- ${source}`,
            ),
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.vocalStyle.defaultReference
        ? [
            'Vocal style placeholder:',
            vocalGuideRenderRecipeSummary.vocalStyle.defaultReference,
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.mixPriorities.length > 0
        ? [
            'Mix priorities:',
            ...vocalGuideRenderRecipeSummary.mixPriorities.map(
              (priority) => `- ${priority}`,
            ),
            '',
          ]
        : []),
      ...(vocalGuideRenderRecipeSummary.completionCriteria.length > 0
        ? [
            'Completion criteria:',
            ...vocalGuideRenderRecipeSummary.completionCriteria.map(
              (criterion) => `- ${criterion}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(expectedOutputFileRows.length > 0
  ? [
      'EXPECTED OUTPUT FILE PLACEHOLDERS',
      '',
      ...expectedOutputFileRows.flatMap((output) => [
        `${output.label || output.key || 'Unnamed output'}`,
        `Key: ${output.key || 'Unknown'}`,
        `Selected: ${output.selected ? 'yes' : 'no'}`,
        `Status: ${output.status || 'Unknown'}`,
        `File: ${output.file === null ? 'null' : 'unexpected file value'}`,
        ...(output.requiredBeforeGenerated.length > 0
          ? [
              'Required before generated:',
              ...output.requiredBeforeGenerated.map(
                (requirement) => `- ${requirement}`,
              ),
            ]
          : []),
        '',
      ]),
    ]
  : []),
  ...(rendererInputContractSummary
  ? [
      'RENDERER INPUT CONTRACT',
      '',
      `Contract status: ${rendererInputContractSummary.contractStatus || 'Unknown'}`,
      `Audio status: ${rendererInputContractSummary.audioStatus || 'Unknown'}`,
      `Renderer status: ${rendererInputContractSummary.rendererStatus || 'Unknown'}`,
      `Storage status: ${rendererInputContractSummary.storageStatus || 'Unknown'}`,
      `Format status: ${rendererInputContractSummary.formatStatus || 'Unknown'}`,
      '',
      rendererInputContractSummary.purpose
        ? `Purpose: ${rendererInputContractSummary.purpose}`
        : '',
      '',
      ...(rendererInputContractSummary.requiredBeforeRealRender.length > 0
        ? [
            'Required before real render:',
            ...rendererInputContractSummary.requiredBeforeRealRender.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(rendererInputContractSummary.selectedOutputKeys.length > 0
        ? [
            'Selected outputs:',
            ...rendererInputContractSummary.selectedOutputKeys.map(
              (key) => `- ${key}`,
            ),
            '',
          ]
        : []),
      ...(rendererInputContractSummary.optionalOutputKeys.length > 0
        ? [
            'Optional outputs:',
            ...rendererInputContractSummary.optionalOutputKeys.map(
              (key) => `- ${key}`,
            ),
            '',
          ]
        : []),
      ...(rendererInputContractSummary.handoffRules.length > 0
        ? [
            'Handoff rules:',
            ...rendererInputContractSummary.handoffRules.map(
              (rule) => `- ${rule}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(realRenderGateSummary
  ? [
      'REAL-RENDER SAFETY GATE',
      '',
      `Gate status: ${realRenderGateSummary.gateStatus || 'Unknown'}`,
      `Can render audio: ${realRenderGateSummary.canRenderAudio ? 'yes' : 'no'}`,
      `Audio status: ${realRenderGateSummary.audioStatus || 'Unknown'}`,
      `Renderer status: ${realRenderGateSummary.rendererStatus || 'Unknown'}`,
      `Storage status: ${realRenderGateSummary.storageStatus || 'Unknown'}`,
      `Format status: ${realRenderGateSummary.formatStatus || 'Unknown'}`,
      `Dry run ready: ${realRenderGateSummary.dryRunReady ? 'yes' : 'no'}`,
      '',
      ...(realRenderGateSummary.blockedReasons.length > 0
        ? [
            'Blocked reasons:',
            ...realRenderGateSummary.blockedReasons.map(
              (reason) => `- ${reason}`,
            ),
            '',
          ]
        : []),
      ...(realRenderGateSummary.requiredToUnlock.length > 0
        ? [
            'Required to unlock:',
            ...realRenderGateSummary.requiredToUnlock.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(realRenderGateSummary.safetyRules.length > 0
        ? [
            'Safety rules:',
            ...realRenderGateSummary.safetyRules.map((rule) => `- ${rule}`),
            '',
          ]
        : []),
    ]
  : []),
  ...(firstRealRenderPlanSummary
  ? [
      'FIRST REAL-RENDER PLAN',
      '',
      `Plan status: ${firstRealRenderPlanSummary.planStatus || 'Unknown'}`,
      `Audio status: ${firstRealRenderPlanSummary.audioStatus || 'Unknown'}`,
      `Recommended first target: ${
        firstRealRenderPlanSummary.recommendedFirstTarget || 'Unknown'
      }`,
      `Strategy: ${
        firstRealRenderPlanSummary.rendererStrategy.strategyType || 'Unknown'
      }`,
      `Implementation status: ${
        firstRealRenderPlanSummary.rendererStrategy.implementationStatus ||
        'Unknown'
      }`,
      '',
      firstRealRenderPlanSummary.recommendedReason
        ? `Reason: ${firstRealRenderPlanSummary.recommendedReason}`
        : '',
      '',
      ...(firstRealRenderPlanSummary.firstUnlockRequirements.length > 0
        ? [
            'First unlock requirements:',
            ...firstRealRenderPlanSummary.firstUnlockRequirements.map(
              (requirement) => `- ${requirement}`,
            ),
            '',
          ]
        : []),
      ...(firstRealRenderPlanSummary.firstValidationChecks.length > 0
        ? [
            'First validation checks:',
            ...firstRealRenderPlanSummary.firstValidationChecks.map(
              (check) => `- ${check}`,
            ),
            '',
          ]
        : []),
      ...(firstRealRenderPlanSummary.laterTargets.length > 0
        ? [
            'Later targets:',
            ...firstRealRenderPlanSummary.laterTargets.map(
              (target) => `- ${target}`,
            ),
            '',
          ]
        : []),
      ...(firstRealRenderPlanSummary.notes.length > 0
        ? [
            'Notes:',
            ...firstRealRenderPlanSummary.notes.map((note) => `- ${note}`),
            '',
          ]
        : []),
    ]
  : []),
  ...(realRenderRouteScaffoldSummary
  ? [
      'BLOCKED REAL-RENDER ROUTE SCAFFOLD',
      '',
      `Route status: ${realRenderRouteScaffoldSummary.routeStatus || 'Unknown'}`,
      `Method: ${realRenderRouteScaffoldSummary.method || 'Unknown'}`,
      `Path: ${realRenderRouteScaffoldSummary.path || 'Unknown'}`,
      `Expected blocked status code: ${
        realRenderRouteScaffoldSummary.expectedBlockedStatusCode || 'Unknown'
      }`,
      `Audio status: ${realRenderRouteScaffoldSummary.audioStatus || 'Unknown'}`,
      `Renderer status: ${
        realRenderRouteScaffoldSummary.rendererStatus || 'Unknown'
      }`,
      '',
      realRenderRouteScaffoldSummary.purpose
        ? `Purpose: ${realRenderRouteScaffoldSummary.purpose}`
        : '',
      '',
      'Expected request shape:',
      `- requestedTarget: ${
        realRenderRouteScaffoldSummary.expectedRequestShape.requestedTarget ||
        'Unknown'
      }`,
      `- rendererInputContract: ${
        realRenderRouteScaffoldSummary.expectedRequestShape
          .rendererInputContract || 'Unknown'
      }`,
      `- realRenderGate: ${
        realRenderRouteScaffoldSummary.expectedRequestShape.realRenderGate ||
        'Unknown'
      }`,
     `- firstRealRenderPlan: ${
          realRenderRouteScaffoldSummary.expectedRequestShape
            .firstRealRenderPlan || 'Unknown'
        }`,
        `- realRenderConfiguration: ${
          realRenderRouteScaffoldSummary.expectedRequestShape
            .realRenderConfiguration || 'Unknown'
        }`,
        '',
      'Expected blocked response:',
      `- status: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.status ||
        'Unknown'
      }`,
      `- audioStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.audioStatus ||
        'Unknown'
      }`,
      `- rendererStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse
          .rendererStatus || 'Unknown'
      }`,
      `- storageStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.storageStatus ||
        'Unknown'
      }`,
      `  - recommendedFirstProvider: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedConfigurationSummary.recommendedFirstProvider || 'Unknown'
        }`,
        `  - selectedProvider: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedConfigurationSummary.selectedProvider || 'none'
        }`,
      `- formatStatus: ${
        realRenderRouteScaffoldSummary.expectedBlockedResponse.formatStatus ||
        'Unknown'
      }`,
      '- receivedContractSummary:',
        `  - rendererInputContract: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasRendererInputContract
            ? 'yes'
            : 'no'
        }`,
        `  - realRenderGate: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasRealRenderGate
            ? 'yes'
            : 'no'
        }`,
        `  - firstRealRenderPlan: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasFirstRealRenderPlan
            ? 'yes'
            : 'no'
        }`,
        `  - realRenderConfiguration: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.hasRealRenderConfiguration
            ? 'yes'
            : 'no'
        }`,
        `  - requestedTarget: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractSummary.requestedTarget || 'Unknown'
        }`,
      `- receivedContractCheck.passed: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedContractCheck.passed
            ? 'true'
            : 'false'
        }`,
        ...(realRenderRouteScaffoldSummary.expectedBlockedResponse
          .receivedContractCheck.missingOrInvalid.length > 0
          ? [
              '- receivedContractCheck.missingOrInvalid:',
              ...realRenderRouteScaffoldSummary.expectedBlockedResponse.receivedContractCheck.missingOrInvalid.map(
                (item) => `  - ${item}`,
              ),
            ]
          : ['- receivedContractCheck.missingOrInvalid: none']),
          '- receivedConfigurationSummary:',
`  - configurationStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.configurationStatus || 'Unknown'
}`,
`  - audioStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.audioStatus || 'Unknown'
}`,
`  - rendererStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererStatus || 'Unknown'
}`,
`  - rendererCandidateStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererCandidateStatus || 'Unknown'
}`,
`  - recommendedFirstRenderer: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstRenderer || 'Unknown'
}`,
`  - rendererCandidateSelectedRenderer: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererCandidateSelectedRenderer ||
  'none'
}`,
`  - outputFormatStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.outputFormatStatus || 'Unknown'
}`,
`  - sampleRateStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.sampleRateStatus || 'Unknown'
}`,
`  - recommendedFirstSampleRateHz: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstSampleRateHz ??
  'Unknown'
}`,
`  - selectedSampleRateHz: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.selectedSampleRateHz ?? 'none'
}`,
`  - storageStatus: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.storageStatus || 'Unknown'
}`,
`  - firstTargetKey: ${
  realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.firstTargetKey || 'Unknown'
}`,
      `- receivedConfigurationCheck.passed: ${
          realRenderRouteScaffoldSummary.expectedBlockedResponse
            .receivedConfigurationCheck.passed
            ? 'true'
            : 'false'
        }`,
        ...(realRenderRouteScaffoldSummary.expectedBlockedResponse
          .receivedConfigurationCheck.missingOrInvalid.length > 0
          ? [
              '- receivedConfigurationCheck.missingOrInvalid:',
              ...realRenderRouteScaffoldSummary.expectedBlockedResponse.receivedConfigurationCheck.missingOrInvalid.map(
                (item) => `  - ${item}`,
              ),
            ]
          : ['- receivedConfigurationCheck.missingOrInvalid: none']),
      '',
      ...(realRenderRouteScaffoldSummary.safetyRules.length > 0
        ? [
            'Safety rules:',
            ...realRenderRouteScaffoldSummary.safetyRules.map(
              (rule) => `- ${rule}`,
            ),
            '',
          ]
        : []),
    ]
  : []),
  ...(realRenderRouteScaffoldSummary
  ? [
      'BLOCKED REAL-RENDER ROUTE TEST',
      '',
      `Test status: ${
        blockedRealRenderRouteTestPassed ? 'passed' : 'not passed'
      }`,
      realRenderRouteTestResponse
        ? `HTTP status: ${
            typeof realRenderRouteTestResponse.httpStatus === 'number'
              ? realRenderRouteTestResponse.httpStatus
              : 'not available'
          }`
        : 'HTTP status: not run',
      realRenderRouteTestResponse
        ? `Status: ${
            typeof realRenderRouteTestResponse.status === 'string'
              ? realRenderRouteTestResponse.status
              : 'unknown'
          }`
        : 'Status: not run',
      realRenderRouteTestResponse
        ? `Audio status: ${
            typeof realRenderRouteTestResponse.audioStatus === 'string'
              ? realRenderRouteTestResponse.audioStatus
              : 'unknown'
          }`
        : 'Audio status: not run',
      realRenderRouteTestResponse
        ? `Renderer status: ${
            typeof realRenderRouteTestResponse.rendererStatus === 'string'
              ? realRenderRouteTestResponse.rendererStatus
              : 'unknown'
          }`
        : 'Renderer status: not run',
        `Real-render configuration received: ${getRealRenderRouteReceivedConfigurationStatus()}`,
      '',
      blockedRealRenderRouteTestPassed
        ? 'Result: The blocked real-render route safely returned 423 blocked, verified received contract/configuration summaries including the renderer, WAV format, and 44.1 kHz sample-rate candidates, verified checks, and did not generate audio.'
        : 'Result: Run Test blocked route before relying on this full pack as a verified route-test record.',
      '',
      ...(receivedConfigurationSummary
  ? [
      'Received configuration summary:',
      `- Configuration status: ${
        receivedConfigurationSummary.configurationStatus || 'unknown'
      }`,
      `- Audio status: ${
        receivedConfigurationSummary.audioStatus || 'unknown'
      }`,
      `- Renderer status: ${
        receivedConfigurationSummary.rendererStatus || 'unknown'
      }`,
      `- Renderer candidate status: ${
          receivedConfigurationSummary.rendererCandidateStatus || 'unknown'
        }`,
        `- Recommended first renderer: ${
          receivedConfigurationSummary.recommendedFirstRenderer || 'unknown'
        }`,
        `- Renderer candidate selected: ${
          receivedConfigurationSummary.rendererCandidateSelectedRenderer || 'none'
        }`,
      `- Output format status: ${
        receivedConfigurationSummary.outputFormatStatus || 'unknown'
      }`,
      `- Recommended first format: ${
         receivedConfigurationSummary.recommendedFirstFormat || 'unknown'
        }`,
        `- Selected format: ${
          receivedConfigurationSummary.selectedFormat || 'none'
        }`,
      `- Sample rate status: ${
        receivedConfigurationSummary.sampleRateStatus || 'unknown'
      }`,
      `- Recommended first sample rate: ${
          receivedConfigurationSummary.recommendedFirstSampleRateHz ?? 'unknown'
        } Hz`,
        `- Selected sample rate: ${
          receivedConfigurationSummary.selectedSampleRateHz ?? 'none'
        }`,
      `- Storage status: ${
        receivedConfigurationSummary.storageStatus || 'unknown'
      }`,
      `- Recommended first storage: ${
          receivedConfigurationSummary.recommendedFirstProvider || 'unknown'
        }`,
        `- Selected storage: ${
  receivedConfigurationSummary.selectedProvider || 'none'
}`,
      `- First target: ${
        receivedConfigurationSummary.firstTargetKey || 'unknown'
      }`,
      '',
    ]
  : []),
  ...(receivedConfigurationCheck
  ? [
      'Received configuration check:',
      `- Passed: ${receivedConfigurationCheck.passed ? 'yes' : 'no'}`,
      ...(receivedConfigurationCheck.missingOrInvalid.length > 0
        ? [
            '- Missing or invalid:',
            ...receivedConfigurationCheck.missingOrInvalid.map(
              (item) => `  - ${item}`,
            ),
          ]
        : ['- Missing or invalid: none']),
      '',
    ]
  : []),
  ...(receivedContractSummary
  ? [
      'Received contract summary:',
      `- rendererInputContract: ${
        receivedContractSummary.hasRendererInputContract ? 'yes' : 'no'
      }`,
      `- realRenderGate: ${
        receivedContractSummary.hasRealRenderGate ? 'yes' : 'no'
      }`,
      `- firstRealRenderPlan: ${
        receivedContractSummary.hasFirstRealRenderPlan ? 'yes' : 'no'
      }`,
      `- realRenderConfiguration: ${
        receivedContractSummary.hasRealRenderConfiguration ? 'yes' : 'no'
      }`,
      `- requestedTarget: ${
        receivedContractSummary.requestedTarget || 'unknown'
      }`,
      '',
    ]
  : []),
  ...(receivedContractCheck
  ? [
      'Received contract check:',
      `- Passed: ${receivedContractCheck.passed ? 'yes' : 'no'}`,
      ...(receivedContractCheck.missingOrInvalid.length > 0
        ? [
            '- Missing or invalid:',
            ...receivedContractCheck.missingOrInvalid.map(
              (item) => `  - ${item}`,
            ),
          ]
        : ['- Missing or invalid: none']),
      '',
    ]
  : []),
      ...(realRenderRouteTestResponse
        ? [
            'Raw blocked route response:',
            JSON.stringify(realRenderRouteTestResponse, null, 2),
            '',
          ]
        : []),
    ]
  : []),
  ...(realRenderConfigurationSummary
  ? [
      'REAL-RENDER CONFIGURATION PLACEHOLDERS',
      '',
      `Configuration status: ${
        realRenderConfigurationSummary.configurationStatus || 'Unknown'
      }`,
      `Audio status: ${realRenderConfigurationSummary.audioStatus || 'Unknown'}`,
      `First target: ${
        realRenderConfigurationSummary.firstTarget.key || 'Unknown'
      } (${
        realRenderConfigurationSummary.firstTarget.status || 'Unknown'
      })`,
      '',
      `Renderer: ${
        realRenderConfigurationSummary.rendererImplementation
          .selectedRenderer || 'not connected'
      } (${
        realRenderConfigurationSummary.rendererImplementation.status ||
        'Unknown'
      })`,
      `Renderer candidate: ${
          realRenderConfigurationSummary.rendererCandidatePlan
            .recommendedFirstRenderer || 'not declared'
        } (${
          realRenderConfigurationSummary.rendererCandidatePlan.status || 'Unknown'
        })`,
        `Renderer candidate selected: ${
          realRenderConfigurationSummary.rendererCandidatePlan.selectedRenderer ||
          'not selected'
        }`,
        realRenderConfigurationSummary.rendererCandidatePlan.reason
          ? `Renderer candidate reason: ${realRenderConfigurationSummary.rendererCandidatePlan.reason}`
          : '',
        ...(realRenderConfigurationSummary.rendererCandidatePlan
          .mustRemainBlockedUntil.length > 0
          ? [
              'Renderer candidate must remain blocked until:',
              ...realRenderConfigurationSummary.rendererCandidatePlan.mustRemainBlockedUntil.map(
                (item) => `- ${item}`,
              ),
              '',
            ]
          : []),
      `Format candidate: ${
          realRenderConfigurationSummary.outputFormat.recommendedFirstFormat ||
          'not declared'
        } (${
          realRenderConfigurationSummary.outputFormat.status || 'Unknown'
        })`,
        `Format selected: ${
          realRenderConfigurationSummary.outputFormat.selectedFormat ||
          'not selected'
        }`,
        realRenderConfigurationSummary.outputFormat.reason
          ? `Format candidate reason: ${realRenderConfigurationSummary.outputFormat.reason}`
          : '',
        ...(realRenderConfigurationSummary.outputFormat.mustRemainBlockedUntil
          .length > 0
          ? [
              'Format candidate must remain blocked until:',
              ...realRenderConfigurationSummary.outputFormat.mustRemainBlockedUntil.map(
                (item) => `- ${item}`,
              ),
              '',
            ]
          : []),
      `Sample-rate candidate: ${
  realRenderConfigurationSummary.sampleRate
    .recommendedFirstSampleRateHz ?? 'not declared'
} Hz (${
  realRenderConfigurationSummary.sampleRate.status || 'Unknown'
})`,
`Sample rate selected: ${
  realRenderConfigurationSummary.sampleRate.selectedSampleRateHz ??
  'not selected'
}`,
realRenderConfigurationSummary.sampleRate.reason
  ? `Sample-rate candidate reason: ${realRenderConfigurationSummary.sampleRate.reason}`
  : '',
...(realRenderConfigurationSummary.sampleRate.mustRemainBlockedUntil
  .length > 0
  ? [
      'Sample-rate candidate must remain blocked until:',
      ...realRenderConfigurationSummary.sampleRate.mustRemainBlockedUntil.map(
        (item) => `- ${item}`,
      ),
      '',
    ]
  : []),
     `Storage candidate: ${
          realRenderConfigurationSummary.storage.recommendedFirstProvider ||
          'not declared'
        } (${
          realRenderConfigurationSummary.storage.status || 'Unknown'
        })`,
        `Storage selected: ${
          realRenderConfigurationSummary.storage.selectedProvider ||
          'not configured'
        }`,
        realRenderConfigurationSummary.storage.reason
          ? `Storage candidate reason: ${realRenderConfigurationSummary.storage.reason}`
          : '',
        ...(realRenderConfigurationSummary.storage.mustRemainBlockedUntil.length > 0
          ? [
              'Storage candidate must remain blocked until:',
              ...realRenderConfigurationSummary.storage.mustRemainBlockedUntil.map(
                (item) => `- ${item}`,
              ),
              '',
            ]
          : []),
    ]
  : []),

      'ARTEFACT PACKAGE JSON',
      '',
      JSON.stringify(dryRunArtifactPackage, null, 2),
      '',
    ]
  : []),

 

          ...(audioPreviewRenderResponse
          ? [
              '============================================================',
              'AUDIO PREVIEW DRY-RUN RESPONSE',
              '============================================================',
              '',
              audioPreviewRenderResponse,
              '',
            ]
          : []),
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

const buildCompactAudioGuidePromptCopyText = () => {
  const chordData = getChordDataFromEditorJson()
  const intentRows = getPerformanceIntentRows(chordData)
  
  if (!chordData) {
    return ''
  }

  return [
    'Purpose:',
    'Create a simple performance guide track, not a finished production. The goal is to preserve the intended tempo, groove, phrasing, chord timing, and vocal entry points so the songwriter can remember how the song should be performed.',
    '',
    'Guide track requirements:',
    '- Simple acoustic guitar only, unless the performance intent clearly suggests a light metronome or foot-tap pulse.',
    '- Keep the arrangement sparse and readable.',
    '- Emphasize chord change timing and phrasing over production quality.',
    '- Use the chord-over-lyric songsheet as the main timing reference.',
    '- Respect any after-lyric chords as possible turnarounds, held chords, pickups, breaths, or instrumental responses.',
    '- If vocal melody is included, use a simple guide melody only; do not over-sing.',
    '- Avoid full-band production.',
    '',
    ...(intentRows.length > 0
      ? [
          'Performance intent reference:',
          ...intentRows.map((row) => `${row.label}: ${row.value}`),
        ]
      : []),
  ].join('\n')
}


  const buildAudioGuidePromptCopyText = () => {
  const chordData = getChordDataFromEditorJson()
  const intentRows = getPerformanceIntentRows(chordData)
  const guideTrackPlanText = buildGuideTrackPlanCopyText()
  const songsheetText = buildPlacedSongSheetCopyText()

  if (!chordData || !songsheetText) {
    return ''
  }

  return [
    'AUDIO GUIDE PROMPT',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    '',
    'Purpose:',
    'Create a simple performance guide track, not a finished production. The goal is to preserve the intended tempo, groove, phrasing, chord timing, and vocal entry points so the songwriter can remember how the song should be performed.',
    '',
    'Guide track requirements:',
    '- Simple acoustic guitar only, unless the performance intent clearly suggests a light metronome or foot-tap pulse.',
    '- Keep the arrangement sparse and readable.',
    '- Emphasize chord change timing and phrasing over production quality.',
    '- Use the chord-over-lyric songsheet as the main timing reference.',
    '- Respect any after-lyric chords as possible turnarounds, held chords, pickups, breaths, or instrumental responses.',
    '- If vocal melody is included, use a simple guide melody only; do not over-sing.',
    '- Avoid full-band production.',
    '',
    ...(intentRows.length > 0
      ? [
          'PERFORMANCE INTENT',
          '',
          ...intentRows.map((row) => `${row.label}: ${row.value}`),
          '',
        ]
      : []),
      ...(guideTrackPlanText
      ? [
          '',
          guideTrackPlanText,
        ]
      : []),
    songsheetText,
  ].join('\n')
}

const buildAudioPreviewSpecCopyText = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return ''
  }

  const record = chordData as Record<string, unknown>
  const intentRows = getPerformanceIntentRows(record)
  const guideTrackPlanRows = getGuideTrackPlanRows(record)
  const guideTrackSectionPlanRows = getGuideTrackSectionPlanRows(record)
  const songsheetLines = getPlacedSongSheetLines(record)
  const readiness = getAudioGuideReadiness()

  if (intentRows.length === 0 && songsheetLines.length === 0) {
    return ''
  }

  const spec = {
    type: 'audio-preview-spec',
    version: 1,
    project: activeProject?.title || 'Untitled project',
    songVersion: activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version',
    chordVersion: chordVersionTitle || 'Unsaved or untitled chord version',
    generatedAt: new Date().toISOString(),
    key: getDisplayedKeyLabel() || getOriginalKeyLabel() || '',
    transposeSemitones: chordTransposeSemitones,
    readiness: {
      label: readiness.label,
      detail: readiness.detail,
      checks: readiness.checks,
    },
    songsheetStatus: getSongsheetReviewStatusLabel(),
    songsheetReview: getSongsheetReviewSummaryLine(),
    performanceIntent: Object.fromEntries(
      intentRows.map((row) => [row.label, row.value]),
    ),
    guideTrackPlan: {
      rows: Object.fromEntries(
        guideTrackPlanRows.map((row) => [row.label, row.value]),
      ),
      sectionPlan: guideTrackSectionPlanRows,
    },
    songsheetLines: songsheetLines.map((line) =>
      transposePlacedSongSheetLine(line),
    ),
    notes: [
      'This is a machine-readable planning spec for a future simple audio guide track.',
      'It is not a finished production request.',
      'Chord placement should be treated as performance intent and reviewed against phrasing.',
    ],
  }

  return JSON.stringify(spec, null, 2)
}

const getFullPackAudioPreviewStatus = () => {
  const hasPlacedSongsheet = Boolean(audioPreviewSongSheetText.trim())
  const hasSectionGuide = Boolean(audioPreviewSectionGuideText.trim())
  const hasRenderPrompt = Boolean(audioPreviewRenderPrompt.trim())
  const hasRendererPayload = Boolean(audioPreviewRendererPayload)
  const hasDryRunJob = isAudioPreviewDryRunReady()
  const hasDryRunPlan = isAudioPreviewDryRunPlanReady()
  const hasValidatedRendererPayload = isAudioPreviewRendererPayloadValidated()
  const hasValidatedDryRunPlan = dryRunRenderPlanValidation?.ready === true
  const hasDryRunManifest = Boolean(dryRunRenderManifest)
  const hasValidatedManifest = dryRunRenderManifestValidation?.ready === true
  const hasDryRunHandoffBundle = Boolean(dryRunHandoffBundle)
  const hasReadyDryRunHandoffBundle =
    dryRunHandoffBundleValidation?.ready === true
  const hasDryRunArtifactPackage = Boolean(dryRunArtifactPackage)
  const hasValidatedDryRunArtifactPackage =
    dryRunArtifactPackageValidation?.ready === true

  if (
    hasPlacedSongsheet &&
    hasSectionGuide &&
    hasRenderPrompt &&
    hasRendererPayload &&
    hasValidatedRendererPayload &&
    hasDryRunJob &&
    hasDryRunPlan &&
    hasValidatedDryRunPlan &&
    hasDryRunManifest &&
    hasValidatedManifest &&
    hasDryRunHandoffBundle &&
    hasReadyDryRunHandoffBundle &&
    hasDryRunArtifactPackage &&
    hasValidatedDryRunArtifactPackage
  ) {
    return {
      label: 'Full pack includes audio preview artefacts',
    detail:
      'Preview spec, renderer payload, dry-run plan, cue sheet, manifest, handoff bundle, artefact package, validations, real-render blockers, and render targets are ready.', 
    }
  }

  if (
    hasRenderPrompt ||
    hasRendererPayload ||
    audioPreviewRendererPayloadValidation ||
    hasDryRunJob ||
    hasDryRunPlan ||
    hasValidatedManifest ||
    hasDryRunHandoffBundle ||
    hasDryRunArtifactPackage
  ) {
    return {
      label: 'Full pack includes audio preview render prompt',
      detail:
        'The Full Performance Pack includes some audio-preview handoff artefacts, but one or more expected artefacts are missing.',
      tone: 'review',
    }
  }

  return {
    label: 'Full pack audio preview handoff incomplete',
    detail:
      'Request audio preview before copying the final Full Performance Pack if you want audio-preview artefacts included.',
    tone: 'missing',
  }
}

const buildAudioPreviewChecklistCopyText = () => {
  const checklist = getAudioPreviewChecklist()
  const summary = getAudioPreviewChecklistSummary()
  const pipelineStatus = getAudioPreviewPipelineStatus()
  const handoffStatus = getAudioPreviewHandoffStatus()
  const fullPackStatus = getFullPackAudioPreviewStatus()
  const rendererValidation = audioPreviewRendererPayloadValidation
  const songsheetReviewStatusLabel = getSongsheetReviewStatusLabel()
  const songsheetReviewSummaryLine = getSongsheetReviewSummaryLine()

  return [
    'AUDIO PREVIEW WORKFLOW CHECKLIST',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${getChordVersionCopyTitle()}`,
    `Songsheet status: ${songsheetReviewStatusLabel}`,
    songsheetReviewSummaryLine ? songsheetReviewSummaryLine : '',
    `Generated at: ${new Date().toLocaleString()}`,
    '',
    'PIPELINE STATUS',
    '',
    pipelineStatus.label,
    pipelineStatus.detail,
    `Progress: ${pipelineStatus.completeCount}/${pipelineStatus.totalCount} complete`,
    `Next: ${pipelineStatus.nextAction}`,
    '',
    'READINESS',
    '',
    summary.label,
    summary.detail,
    '',
    'AUDIO PREVIEW HANDOFF',
    '',
    handoffStatus.label,
    handoffStatus.detail,
    '',
    'FULL PERFORMANCE PACK AUDIO STATUS',
    '',
    fullPackStatus.label,
    fullPackStatus.detail,
    '',
    ...(rendererValidation
      ? [
          'RENDERER PAYLOAD VALIDATION',
          '',
          rendererValidation.ready === true ? 'Validation: Passed' : 'Validation: Needs review',
          typeof rendererValidation.detail === 'string'
            ? rendererValidation.detail
            : 'Validation details unavailable.',
          '',
        ]
      : []),
        'CHECKLIST',
        '',
        ...checklist.flatMap((item) => [
          `${item.complete ? '[x]' : '[ ]'} ${item.label}`,
          item.detail,
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

    const getAudioPreviewDryRunCueSheet = () => {
      if (!audioPreviewDryRunRenderPlan) {
        return null
      }

      const cueSheet =
        audioPreviewDryRunRenderPlan.cueSheet &&
        typeof audioPreviewDryRunRenderPlan.cueSheet === 'object' &&
        !Array.isArray(audioPreviewDryRunRenderPlan.cueSheet)
          ? (audioPreviewDryRunRenderPlan.cueSheet as Record<string, unknown>)
          : null

      return cueSheet
    }


    const getAudioPreviewDryRunCueSheetRows = () => {
  if (!audioPreviewDryRunRenderPlan) {
    return []
  }

  const cueSheet =
    audioPreviewDryRunRenderPlan.cueSheet &&
    typeof audioPreviewDryRunRenderPlan.cueSheet === 'object' &&
    !Array.isArray(audioPreviewDryRunRenderPlan.cueSheet)
      ? (audioPreviewDryRunRenderPlan.cueSheet as Record<string, unknown>)
      : null

  const sections =
    cueSheet && Array.isArray(cueSheet.sections) ? cueSheet.sections : []

  return sections
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
    .map((item, index) => ({
      order:
        typeof item.order === 'number' && Number.isFinite(item.order)
          ? item.order
          : index + 1,
      section:
        typeof item.section === 'string' && item.section.trim()
          ? item.section
          : `Section ${index + 1}`,
      estimatedBars:
        typeof item.estimatedBars === 'number' ? item.estimatedBars : 0,
      estimatedSeconds:
        typeof item.estimatedSeconds === 'number' ? item.estimatedSeconds : 0,
      startSeconds:
        typeof item.startSeconds === 'number' ? item.startSeconds : 0,
      endSeconds:
        typeof item.endSeconds === 'number' ? item.endSeconds : 0,
      lyricLineCount:
        typeof item.lyricLineCount === 'number' ? item.lyricLineCount : 0,
      chordPlacementCount:
        typeof item.chordPlacementCount === 'number'
          ? item.chordPlacementCount
          : 0,
    }))
}


    const getAudioPreviewDryRunTimelineRows = () => {
  if (!audioPreviewDryRunRenderPlan) {
    return []
  }

  const timeline = Array.isArray(audioPreviewDryRunRenderPlan.timeline)
    ? audioPreviewDryRunRenderPlan.timeline
    : []

  return timeline
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
    .map((item, index) => ({
      order:
        typeof item.order === 'number' && Number.isFinite(item.order)
          ? item.order
          : index + 1,
      section:
        typeof item.section === 'string' && item.section.trim()
          ? item.section
          : `Section ${index + 1}`,
      lyricLineCount:
        typeof item.lyricLineCount === 'number'
          ? item.lyricLineCount
          : 0,
      chordPlacementCount:
        typeof item.chordPlacementCount === 'number'
          ? item.chordPlacementCount
          : 0,
      firstLyric:
        typeof item.firstLyric === 'string' ? item.firstLyric : '',
      lastLyric:
        typeof item.lastLyric === 'string' ? item.lastLyric : '',
      goal:
        typeof item.goal === 'string' ? item.goal : '',
      guitarInstruction:
        typeof item.guitarInstruction === 'string'
          ? item.guitarInstruction
          : '',
      vocalInstruction:
        typeof item.vocalInstruction === 'string'
          ? item.vocalInstruction
          : '',
      dynamicInstruction:
        typeof item.dynamicInstruction === 'string'
          ? item.dynamicInstruction
          : '',
    }))
}

const getDryRunExpectedOutputRows = () => {
  if (!dryRunRenderManifest) {
    return []
  }

  const expectedOutputs =
    dryRunRenderManifest.expectedOutputs &&
    typeof dryRunRenderManifest.expectedOutputs === 'object' &&
    !Array.isArray(dryRunRenderManifest.expectedOutputs)
      ? (dryRunRenderManifest.expectedOutputs as Record<string, unknown>)
      : {}

 return Object.entries(expectedOutputs)
  .filter((entry) => {
    const value = entry[1]

    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  })
  .map(([key, value]) => {
    const output = value as Record<string, unknown>

    return {
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (letter) => letter.toUpperCase()),
        role:
          typeof output.role === 'string' ? output.role : '',
        description:
          typeof output.description === 'string' ? output.description : '',
        suggestedFileName:
          typeof output.suggestedFileName === 'string'
            ? output.suggestedFileName
            : '',
      status:
        typeof output.status === 'string' ? output.status : 'unknown',
      format:
        typeof output.format === 'string' ? output.format : 'unknown',
      url:
        typeof output.url === 'string' && output.url.trim()
          ? output.url
          : '',
    }
  })
}

const getAudioPreviewReadinessSummary = () => {
  const checklist = getAudioPreviewChecklist()

  const complete = checklist.filter((item) => item.complete).length
  const total = checklist.length
  const percentage =
    total === 0 ? 0 : Math.round((complete / total) * 100)

  return {
    complete,
    total,
    percentage,
    ready: complete === total && total > 0,
  }
}

const getAudioPreviewReadinessCopyLines = () => {
  const summary = getAudioPreviewReadinessSummary()
  const remainingChecks = audioPreviewChecklist.filter(
    (item) => !item.complete,
  )

  return [
    'AUDIO PREVIEW READINESS',
    '',
    `${summary.percentage}%`,
    `${summary.complete} / ${summary.total} checks complete`,
    '',
    summary.ready
      ? 'Ready for future renderer integration'
      : 'Waiting for remaining checks',
    '',
    'Blocked route received-contract and received-configuration checks may pass, but they only verify safe blocked-route inputs; real audio rendering remains locked until renderer, format, storage, and execution are deliberately enabled.',
    '',
    ...(remainingChecks.length > 0
      ? [
          'REMAINING CHECKS',
          '',
          ...remainingChecks.flatMap((item) => [
            `- ${item.label}`,
            item.detail ? `  ${item.detail}` : '',
          ]),
          '',
        ]
      : []),
  ]
}

const renderAudioPreviewReadinessCard = (
  size: 'standard' | 'compact' = 'standard',
) => {
  const percentageClassName =
    size === 'compact'
      ? 'mt-2 text-2xl font-semibold text-gray-100'
      : 'mt-3 text-3xl font-semibold text-gray-100'

  const wrapperClassName =
    size === 'compact'
      ? 'mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400'
      : 'rounded border border-gray-800 bg-gray-950 p-4'

  const remainingChecks = audioPreviewChecklist.filter(
    (item) => !item.complete,
  )

  const remainingChecksToShow = remainingChecks.slice(0, 3)
  const remainingChecksNotShown = Math.max(
    remainingChecks.length - remainingChecksToShow.length,
    0,
  )

  return (



    <div className={wrapperClassName}>
    
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Audio Preview Readiness
      </div>

      <div className={percentageClassName}>
        {audioPreviewReadinessSummary.percentage}%
      </div>

      <div className={size === 'compact' ? 'mt-1 text-gray-400' : 'mt-1 text-sm text-gray-400'}>
        {audioPreviewReadinessSummary.complete} /{' '}
        {audioPreviewReadinessSummary.total} checks complete
      </div>

      <div
        className={
          audioPreviewReadinessSummary.ready
            ? size === 'compact'
              ? 'mt-2 font-medium text-green-300'
              : 'mt-3 text-sm font-medium text-green-300'
            : size === 'compact'
              ? 'mt-2 font-medium text-yellow-300'
              : 'mt-3 text-sm font-medium text-yellow-300'
        }
      >
        {audioPreviewReadinessSummary.ready
          ? 'Ready for future renderer integration'
          : 'Waiting for remaining checks'}
          <div className="mt-2 text-xs text-yellow-100/80">
              Blocked route received-contract and received-configuration checks may pass,
              but they only verify safe blocked-route inputs; real audio rendering remains
              locked until renderer, format, storage, and execution are deliberately
              enabled.
            </div>
                  </div>

            {size === 'standard' &&
      !audioPreviewReadinessSummary.ready &&
      remainingChecksToShow.length > 0 ? (
        <div className="mt-4 rounded border border-yellow-900 bg-yellow-950/20 p-3 text-sm text-yellow-100">
          <div className="font-medium">Remaining checks</div>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-yellow-100/80">
            {remainingChecksToShow.map((item) => (
              <li key={item.label}>
                <span className="font-medium">{item.label}</span>
                {item.detail ? (
                  <span className="text-yellow-100/60"> — {item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>

          {remainingChecksNotShown > 0 ? (
            <div className="mt-2 text-xs text-yellow-100/60">
              + {remainingChecksNotShown} more remaining check
              {remainingChecksNotShown === 1 ? '' : 's'}.
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  )
}


const getDryRunRealRenderReadinessSummary = () => {
  if (!dryRunArtifactPackage) {
    return {
      readyForRealRender: null as boolean | null,
      readinessStatus: '',
      blockers: [] as string[],
      requiredDecisions: [] as string[],
      safetyNotes: [] as string[],
    }
  }

  const readiness =
    dryRunArtifactPackage.realRenderReadiness &&
    typeof dryRunArtifactPackage.realRenderReadiness === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderReadiness)
      ? (dryRunArtifactPackage.realRenderReadiness as Record<string, unknown>)
      : {}

  return {
    readyForRealRender:
      typeof readiness.readyForRealRender === 'boolean'
        ? readiness.readyForRealRender
        : null,
    readinessStatus:
      typeof readiness.readinessStatus === 'string'
        ? readiness.readinessStatus
        : '',
    blockers: Array.isArray(readiness.blockers)
      ? readiness.blockers.filter((item): item is string => typeof item === 'string')
      : [],
    requiredDecisions: Array.isArray(readiness.requiredDecisions)
      ? readiness.requiredDecisions.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    safetyNotes: Array.isArray(readiness.safetyNotes)
      ? readiness.safetyNotes.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

const getDryRunRenderTargetRows = () => {
  if (!dryRunArtifactPackage) {
    return []
  }

 

  const renderTargets =
    dryRunArtifactPackage.renderTargets &&
    typeof dryRunArtifactPackage.renderTargets === 'object' &&
    !Array.isArray(dryRunArtifactPackage.renderTargets)
      ? (dryRunArtifactPackage.renderTargets as Record<string, unknown>)
      : {}

  const selectedOutputs = Array.isArray(renderTargets.selectedOutputs)
    ? renderTargets.selectedOutputs
    : []

  return selectedOutputs
    .map((output) => {
      const target =
        output && typeof output === 'object' && !Array.isArray(output)
          ? (output as Record<string, unknown>)
          : null

      if (!target) {
        return null
      }

      return {
        key: typeof target.key === 'string' ? target.key : '',
        label: typeof target.label === 'string' ? target.label : 'Unnamed target',
        priority:
          typeof target.priority === 'number'
            ? target.priority
            : Number.MAX_SAFE_INTEGER,
        selected: target.selected === true,
        reason: typeof target.reason === 'string' ? target.reason : '',
      }
    })
    .filter((target): target is {
      key: string
      label: string
      priority: number
      selected: boolean
      reason: string
    } => Boolean(target))
    .sort((a, b) => a.priority - b.priority)
}


 const getDryRunGuideTrackRenderRecipeSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const guideTrackRenderRecipe =
    dryRunArtifactPackage.guideTrackRenderRecipe &&
    typeof dryRunArtifactPackage.guideTrackRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.guideTrackRenderRecipe)
      ? (dryRunArtifactPackage.guideTrackRenderRecipe as Record<string, unknown>)
      : null

  if (!guideTrackRenderRecipe) {
    return null
  }

  const countIn =
    guideTrackRenderRecipe.countIn &&
    typeof guideTrackRenderRecipe.countIn === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.countIn)
      ? (guideTrackRenderRecipe.countIn as Record<string, unknown>)
      : null

  const timing =
    guideTrackRenderRecipe.timing &&
    typeof guideTrackRenderRecipe.timing === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.timing)
      ? (guideTrackRenderRecipe.timing as Record<string, unknown>)
      : null

  const musicalBed =
    guideTrackRenderRecipe.musicalBed &&
    typeof guideTrackRenderRecipe.musicalBed === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.musicalBed)
      ? (guideTrackRenderRecipe.musicalBed as Record<string, unknown>)
      : null

  const chordHandling =
    guideTrackRenderRecipe.chordHandling &&
    typeof guideTrackRenderRecipe.chordHandling === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.chordHandling)
      ? (guideTrackRenderRecipe.chordHandling as Record<string, unknown>)
      : null

  const vocalGuide =
    guideTrackRenderRecipe.vocalGuide &&
    typeof guideTrackRenderRecipe.vocalGuide === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.vocalGuide)
      ? (guideTrackRenderRecipe.vocalGuide as Record<string, unknown>)
      : null

  const supportInstruments = Array.isArray(musicalBed?.supportInstruments)
    ? musicalBed.supportInstruments.filter(
        (instrument): instrument is string =>
          typeof instrument === 'string' && instrument.trim().length > 0,
      )
    : []

  const mixPriorities = Array.isArray(guideTrackRenderRecipe.mixPriorities)
    ? guideTrackRenderRecipe.mixPriorities.filter(
        (priority): priority is string =>
          typeof priority === 'string' && priority.trim().length > 0,
      )
    : []

  const completionCriteria = Array.isArray(
    guideTrackRenderRecipe.completionCriteria,
  )
    ? guideTrackRenderRecipe.completionCriteria.filter(
        (criterion): criterion is string =>
          typeof criterion === 'string' && criterion.trim().length > 0,
      )
    : []

  return {
    recipeStatus:
      typeof guideTrackRenderRecipe.recipeStatus === 'string'
        ? guideTrackRenderRecipe.recipeStatus
        : '',
    targetKey:
      typeof guideTrackRenderRecipe.targetKey === 'string'
        ? guideTrackRenderRecipe.targetKey
        : '',
    outputStatus:
      typeof guideTrackRenderRecipe.outputStatus === 'string'
        ? guideTrackRenderRecipe.outputStatus
        : '',
    rendererRequirement:
      typeof guideTrackRenderRecipe.rendererRequirement === 'string'
        ? guideTrackRenderRecipe.rendererRequirement
        : '',
    countIn: {
      enabled: countIn?.enabled === true,
      bars: typeof countIn?.bars === 'number' ? countIn.bars : 0,
      description:
        typeof countIn?.description === 'string' ? countIn.description : '',
    },
    timing: {
      tempoSource:
        typeof timing?.tempoSource === 'string' ? timing.tempoSource : '',
      sectionTimingSource:
        typeof timing?.sectionTimingSource === 'string'
          ? timing.sectionTimingSource
          : '',
      description:
        typeof timing?.description === 'string' ? timing.description : '',
    },
    musicalBed: {
      primaryInstrument:
        typeof musicalBed?.primaryInstrument === 'string'
          ? musicalBed.primaryInstrument
          : '',
      supportInstruments,
      description:
        typeof musicalBed?.description === 'string'
          ? musicalBed.description
          : '',
    },
    chordHandling: {
      source:
        typeof chordHandling?.source === 'string'
          ? chordHandling.source
          : '',
      description:
        typeof chordHandling?.description === 'string'
          ? chordHandling.description
          : '',
    },
    vocalGuide: {
      status:
        typeof vocalGuide?.status === 'string' ? vocalGuide.status : '',
      description:
        typeof vocalGuide?.description === 'string'
          ? vocalGuide.description
          : '',
    },
    mixPriorities,
    completionCriteria,
  }
}




const getDryRunClickTrackRenderRecipeSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const clickTrackRenderRecipe =
    dryRunArtifactPackage.clickTrackRenderRecipe &&
    typeof dryRunArtifactPackage.clickTrackRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.clickTrackRenderRecipe)
      ? (dryRunArtifactPackage.clickTrackRenderRecipe as Record<string, unknown>)
      : null

  if (!clickTrackRenderRecipe) {
    return null
  }

  const countIn =
    clickTrackRenderRecipe.countIn &&
    typeof clickTrackRenderRecipe.countIn === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.countIn)
      ? (clickTrackRenderRecipe.countIn as Record<string, unknown>)
      : null

  const timing =
    clickTrackRenderRecipe.timing &&
    typeof clickTrackRenderRecipe.timing === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.timing)
      ? (clickTrackRenderRecipe.timing as Record<string, unknown>)
      : null

  const clickSound =
    clickTrackRenderRecipe.clickSound &&
    typeof clickTrackRenderRecipe.clickSound === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.clickSound)
      ? (clickTrackRenderRecipe.clickSound as Record<string, unknown>)
      : null

  const sectionMarkers =
    clickTrackRenderRecipe.sectionMarkers &&
    typeof clickTrackRenderRecipe.sectionMarkers === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.sectionMarkers)
      ? (clickTrackRenderRecipe.sectionMarkers as Record<string, unknown>)
      : null

  const mixPriorities = Array.isArray(clickTrackRenderRecipe.mixPriorities)
    ? clickTrackRenderRecipe.mixPriorities.filter(
        (priority): priority is string =>
          typeof priority === 'string' && priority.trim().length > 0,
      )
    : []

  const completionCriteria = Array.isArray(
    clickTrackRenderRecipe.completionCriteria,
  )
    ? clickTrackRenderRecipe.completionCriteria.filter(
        (criterion): criterion is string =>
          typeof criterion === 'string' && criterion.trim().length > 0,
      )
    : []

  return {
    recipeStatus:
      typeof clickTrackRenderRecipe.recipeStatus === 'string'
        ? clickTrackRenderRecipe.recipeStatus
        : '',
    targetKey:
      typeof clickTrackRenderRecipe.targetKey === 'string'
        ? clickTrackRenderRecipe.targetKey
        : '',
    outputStatus:
      typeof clickTrackRenderRecipe.outputStatus === 'string'
        ? clickTrackRenderRecipe.outputStatus
        : '',
    rendererRequirement:
      typeof clickTrackRenderRecipe.rendererRequirement === 'string'
        ? clickTrackRenderRecipe.rendererRequirement
        : '',
    countIn: {
      enabled: countIn?.enabled === true,
      bars: typeof countIn?.bars === 'number' ? countIn.bars : 0,
      description:
        typeof countIn?.description === 'string' ? countIn.description : '',
    },
    timing: {
      tempoSource:
        typeof timing?.tempoSource === 'string' ? timing.tempoSource : '',
      sectionTimingSource:
        typeof timing?.sectionTimingSource === 'string'
          ? timing.sectionTimingSource
          : '',
      description:
        typeof timing?.description === 'string' ? timing.description : '',
    },
    clickSound: {
      downbeatEmphasis: clickSound?.downbeatEmphasis === true,
      subdivision:
        typeof clickSound?.subdivision === 'string'
          ? clickSound.subdivision
          : '',
      description:
        typeof clickSound?.description === 'string'
          ? clickSound.description
          : '',
    },
    sectionMarkers: {
      enabled: sectionMarkers?.enabled === true,
      description:
        typeof sectionMarkers?.description === 'string'
          ? sectionMarkers.description
          : '',
    },
    mixPriorities,
    completionCriteria,
  }
}

  const getDryRunChordReferenceRenderRecipeSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const chordReferenceRenderRecipe =
    dryRunArtifactPackage.chordReferenceRenderRecipe &&
    typeof dryRunArtifactPackage.chordReferenceRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.chordReferenceRenderRecipe)
      ? (dryRunArtifactPackage.chordReferenceRenderRecipe as Record<
          string,
          unknown
        >)
      : null

  if (!chordReferenceRenderRecipe) {
    return null
  }

  const countIn =
    chordReferenceRenderRecipe.countIn &&
    typeof chordReferenceRenderRecipe.countIn === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.countIn)
      ? (chordReferenceRenderRecipe.countIn as Record<string, unknown>)
      : null

  const timing =
    chordReferenceRenderRecipe.timing &&
    typeof chordReferenceRenderRecipe.timing === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.timing)
      ? (chordReferenceRenderRecipe.timing as Record<string, unknown>)
      : null

  const chordSource =
    chordReferenceRenderRecipe.chordSource &&
    typeof chordReferenceRenderRecipe.chordSource === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.chordSource)
      ? (chordReferenceRenderRecipe.chordSource as Record<string, unknown>)
      : null

  const voicing =
    chordReferenceRenderRecipe.voicing &&
    typeof chordReferenceRenderRecipe.voicing === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.voicing)
      ? (chordReferenceRenderRecipe.voicing as Record<string, unknown>)
      : null

  const sectionMarkers =
    chordReferenceRenderRecipe.sectionMarkers &&
    typeof chordReferenceRenderRecipe.sectionMarkers === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.sectionMarkers)
      ? (chordReferenceRenderRecipe.sectionMarkers as Record<string, unknown>)
      : null

  const mixPriorities = Array.isArray(
    chordReferenceRenderRecipe.mixPriorities,
  )
    ? chordReferenceRenderRecipe.mixPriorities.filter(
        (priority): priority is string =>
          typeof priority === 'string' && priority.trim().length > 0,
      )
    : []

  const completionCriteria = Array.isArray(
    chordReferenceRenderRecipe.completionCriteria,
  )
    ? chordReferenceRenderRecipe.completionCriteria.filter(
        (criterion): criterion is string =>
          typeof criterion === 'string' && criterion.trim().length > 0,
      )
    : []

  return {
    recipeStatus:
      typeof chordReferenceRenderRecipe.recipeStatus === 'string'
        ? chordReferenceRenderRecipe.recipeStatus
        : '',
    targetKey:
      typeof chordReferenceRenderRecipe.targetKey === 'string'
        ? chordReferenceRenderRecipe.targetKey
        : '',
    outputStatus:
      typeof chordReferenceRenderRecipe.outputStatus === 'string'
        ? chordReferenceRenderRecipe.outputStatus
        : '',
    rendererRequirement:
      typeof chordReferenceRenderRecipe.rendererRequirement === 'string'
        ? chordReferenceRenderRecipe.rendererRequirement
        : '',
    countIn: {
      enabled: countIn?.enabled === true,
      bars: typeof countIn?.bars === 'number' ? countIn.bars : 0,
      description:
        typeof countIn?.description === 'string' ? countIn.description : '',
    },
    timing: {
      tempoSource:
        typeof timing?.tempoSource === 'string' ? timing.tempoSource : '',
      sectionTimingSource:
        typeof timing?.sectionTimingSource === 'string'
          ? timing.sectionTimingSource
          : '',
      description:
        typeof timing?.description === 'string' ? timing.description : '',
    },
    chordSource: {
      source:
        typeof chordSource?.source === 'string' ? chordSource.source : '',
      description:
        typeof chordSource?.description === 'string'
          ? chordSource.description
          : '',
    },
    voicing: {
      primaryInstrument:
        typeof voicing?.primaryInstrument === 'string'
          ? voicing.primaryInstrument
          : '',
      density: typeof voicing?.density === 'string' ? voicing.density : '',
      description:
        typeof voicing?.description === 'string' ? voicing.description : '',
    },
    sectionMarkers: {
      enabled: sectionMarkers?.enabled === true,
      description:
        typeof sectionMarkers?.description === 'string'
          ? sectionMarkers.description
          : '',
    },
    mixPriorities,
    completionCriteria,
  }
}

const getDryRunVocalGuideRenderRecipeSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const vocalGuideRenderRecipe =
    dryRunArtifactPackage.vocalGuideRenderRecipe &&
    typeof dryRunArtifactPackage.vocalGuideRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.vocalGuideRenderRecipe)
      ? (dryRunArtifactPackage.vocalGuideRenderRecipe as Record<
          string,
          unknown
        >)
      : null

  if (!vocalGuideRenderRecipe) {
    return null
  }

  const countIn =
    vocalGuideRenderRecipe.countIn &&
    typeof vocalGuideRenderRecipe.countIn === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.countIn)
      ? (vocalGuideRenderRecipe.countIn as Record<string, unknown>)
      : null

  const timing =
    vocalGuideRenderRecipe.timing &&
    typeof vocalGuideRenderRecipe.timing === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.timing)
      ? (vocalGuideRenderRecipe.timing as Record<string, unknown>)
      : null

  const melodySource =
    vocalGuideRenderRecipe.melodySource &&
    typeof vocalGuideRenderRecipe.melodySource === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.melodySource)
      ? (vocalGuideRenderRecipe.melodySource as Record<string, unknown>)
      : null

  const vocalStyle =
    vocalGuideRenderRecipe.vocalStyle &&
    typeof vocalGuideRenderRecipe.vocalStyle === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.vocalStyle)
      ? (vocalGuideRenderRecipe.vocalStyle as Record<string, unknown>)
      : null

  const activationRequirements = Array.isArray(
    vocalGuideRenderRecipe.activationRequirements,
  )
    ? vocalGuideRenderRecipe.activationRequirements.filter(
        (requirement): requirement is string =>
          typeof requirement === 'string' && requirement.trim().length > 0,
      )
    : []

  const acceptedSources = Array.isArray(melodySource?.acceptedSources)
    ? melodySource.acceptedSources.filter(
        (source): source is string =>
          typeof source === 'string' && source.trim().length > 0,
      )
    : []

  const mixPriorities = Array.isArray(vocalGuideRenderRecipe.mixPriorities)
    ? vocalGuideRenderRecipe.mixPriorities.filter(
        (priority): priority is string =>
          typeof priority === 'string' && priority.trim().length > 0,
      )
    : []

  const completionCriteria = Array.isArray(
    vocalGuideRenderRecipe.completionCriteria,
  )
    ? vocalGuideRenderRecipe.completionCriteria.filter(
        (criterion): criterion is string =>
          typeof criterion === 'string' && criterion.trim().length > 0,
      )
    : []

  return {
    recipeStatus:
      typeof vocalGuideRenderRecipe.recipeStatus === 'string'
        ? vocalGuideRenderRecipe.recipeStatus
        : '',
    targetKey:
      typeof vocalGuideRenderRecipe.targetKey === 'string'
        ? vocalGuideRenderRecipe.targetKey
        : '',
    targetSelection:
      typeof vocalGuideRenderRecipe.targetSelection === 'string'
        ? vocalGuideRenderRecipe.targetSelection
        : '',
    outputStatus:
      typeof vocalGuideRenderRecipe.outputStatus === 'string'
        ? vocalGuideRenderRecipe.outputStatus
        : '',
    rendererRequirement:
      typeof vocalGuideRenderRecipe.rendererRequirement === 'string'
        ? vocalGuideRenderRecipe.rendererRequirement
        : '',
    activationRequirements,
    countIn: {
      enabled: countIn?.enabled === true,
      bars: typeof countIn?.bars === 'number' ? countIn.bars : 0,
      description:
        typeof countIn?.description === 'string' ? countIn.description : '',
    },
    timing: {
      tempoSource:
        typeof timing?.tempoSource === 'string' ? timing.tempoSource : '',
      sectionTimingSource:
        typeof timing?.sectionTimingSource === 'string'
          ? timing.sectionTimingSource
          : '',
      description:
        typeof timing?.description === 'string' ? timing.description : '',
    },
    melodySource: {
      status:
        typeof melodySource?.status === 'string' ? melodySource.status : '',
      acceptedSources,
      description:
        typeof melodySource?.description === 'string'
          ? melodySource.description
          : '',
    },
    vocalStyle: {
      status:
        typeof vocalStyle?.status === 'string' ? vocalStyle.status : '',
      defaultReference:
        typeof vocalStyle?.defaultReference === 'string'
          ? vocalStyle.defaultReference
          : '',
      description:
        typeof vocalStyle?.description === 'string'
          ? vocalStyle.description
          : '',
    },
    mixPriorities,
    completionCriteria,
  }
}

const getDryRunExpectedOutputFileRows = () => {
  if (!dryRunArtifactPackage) {
    return []
  }

  const expectedOutputFiles =
    dryRunArtifactPackage.expectedOutputFiles &&
    typeof dryRunArtifactPackage.expectedOutputFiles === 'object' &&
    !Array.isArray(dryRunArtifactPackage.expectedOutputFiles)
      ? (dryRunArtifactPackage.expectedOutputFiles as Record<string, unknown>)
      : null

  if (!expectedOutputFiles || !Array.isArray(expectedOutputFiles.outputs)) {
    return []
  }

  return expectedOutputFiles.outputs
    .filter(
      (output): output is Record<string, unknown> =>
        output !== null &&
        typeof output === 'object' &&
        !Array.isArray(output),
    )
    .map((output) => {
      const requiredBeforeGenerated = Array.isArray(
        output.requiredBeforeGenerated,
      )
        ? output.requiredBeforeGenerated.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : []

      return {
        key: typeof output.key === 'string' ? output.key : '',
        label: typeof output.label === 'string' ? output.label : '',
        selected: output.selected === true,
        status: typeof output.status === 'string' ? output.status : '',
        file: output.file === null ? null : output.file,
        requiredBeforeGenerated,
      }
    })
}


const getDryRunRendererInputContractSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const rendererInputContract =
    dryRunArtifactPackage.rendererInputContract &&
    typeof dryRunArtifactPackage.rendererInputContract === 'object' &&
    !Array.isArray(dryRunArtifactPackage.rendererInputContract)
      ? (dryRunArtifactPackage.rendererInputContract as Record<string, unknown>)
      : null

  if (!rendererInputContract) {
    return null
  }

  const requiredInputObjects = Array.isArray(
    rendererInputContract.requiredInputObjects,
  )
    ? rendererInputContract.requiredInputObjects.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const selectedOutputKeys = Array.isArray(
    rendererInputContract.selectedOutputKeys,
  )
    ? rendererInputContract.selectedOutputKeys.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const optionalOutputKeys = Array.isArray(
    rendererInputContract.optionalOutputKeys,
  )
    ? rendererInputContract.optionalOutputKeys.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const requiredBeforeRealRender = Array.isArray(
    rendererInputContract.requiredBeforeRealRender,
  )
    ? rendererInputContract.requiredBeforeRealRender.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const handoffRules = Array.isArray(rendererInputContract.handoffRules)
    ? rendererInputContract.handoffRules.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  return {
    contractStatus:
      typeof rendererInputContract.contractStatus === 'string'
        ? rendererInputContract.contractStatus
        : '',
    audioStatus:
      typeof rendererInputContract.audioStatus === 'string'
        ? rendererInputContract.audioStatus
        : '',
    rendererStatus:
      typeof rendererInputContract.rendererStatus === 'string'
        ? rendererInputContract.rendererStatus
        : '',
    storageStatus:
      typeof rendererInputContract.storageStatus === 'string'
        ? rendererInputContract.storageStatus
        : '',
    formatStatus:
      typeof rendererInputContract.formatStatus === 'string'
        ? rendererInputContract.formatStatus
        : '',
    purpose:
      typeof rendererInputContract.purpose === 'string'
        ? rendererInputContract.purpose
        : '',
    requiredInputObjects,
    selectedOutputKeys,
    optionalOutputKeys,
    requiredBeforeRealRender,
    handoffRules,
  }
}

const getDryRunRealRenderGateSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const realRenderGate =
    dryRunArtifactPackage.realRenderGate &&
    typeof dryRunArtifactPackage.realRenderGate === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderGate)
      ? (dryRunArtifactPackage.realRenderGate as Record<string, unknown>)
      : null

  if (!realRenderGate) {
    return null
  }

  const blockedReasons = Array.isArray(realRenderGate.blockedReasons)
    ? realRenderGate.blockedReasons.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const requiredToUnlock = Array.isArray(realRenderGate.requiredToUnlock)
    ? realRenderGate.requiredToUnlock.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const safetyRules = Array.isArray(realRenderGate.safetyRules)
    ? realRenderGate.safetyRules.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  return {
    gateStatus:
      typeof realRenderGate.gateStatus === 'string'
        ? realRenderGate.gateStatus
        : '',
    canRenderAudio: realRenderGate.canRenderAudio === true,
    audioStatus:
      typeof realRenderGate.audioStatus === 'string'
        ? realRenderGate.audioStatus
        : '',
    rendererStatus:
      typeof realRenderGate.rendererStatus === 'string'
        ? realRenderGate.rendererStatus
        : '',
    storageStatus:
      typeof realRenderGate.storageStatus === 'string'
        ? realRenderGate.storageStatus
        : '',
    formatStatus:
      typeof realRenderGate.formatStatus === 'string'
        ? realRenderGate.formatStatus
        : '',
    dryRunReady:
      typeof realRenderGate.dryRunReady === 'boolean'
        ? realRenderGate.dryRunReady
        : false,
    blockedReasons,
    requiredToUnlock,
    safetyRules,
  }
}

const getDryRunFirstRealRenderPlanSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }



  const firstRealRenderPlan =
    dryRunArtifactPackage.firstRealRenderPlan &&
    typeof dryRunArtifactPackage.firstRealRenderPlan === 'object' &&
    !Array.isArray(dryRunArtifactPackage.firstRealRenderPlan)
      ? (dryRunArtifactPackage.firstRealRenderPlan as Record<string, unknown>)
      : null

  if (!firstRealRenderPlan) {
    return null
  }

  const rendererStrategy =
    firstRealRenderPlan.rendererStrategy &&
    typeof firstRealRenderPlan.rendererStrategy === 'object' &&
    !Array.isArray(firstRealRenderPlan.rendererStrategy)
      ? (firstRealRenderPlan.rendererStrategy as Record<string, unknown>)
      : null

  const firstUnlockRequirements = Array.isArray(
    firstRealRenderPlan.firstUnlockRequirements,
  )
    ? firstRealRenderPlan.firstUnlockRequirements.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const firstValidationChecks = Array.isArray(
    firstRealRenderPlan.firstValidationChecks,
  )
    ? firstRealRenderPlan.firstValidationChecks.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const laterTargets = Array.isArray(firstRealRenderPlan.laterTargets)
    ? firstRealRenderPlan.laterTargets.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  const notes = Array.isArray(firstRealRenderPlan.notes)
    ? firstRealRenderPlan.notes.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  return {
    planStatus:
      typeof firstRealRenderPlan.planStatus === 'string'
        ? firstRealRenderPlan.planStatus
        : '',
    audioStatus:
      typeof firstRealRenderPlan.audioStatus === 'string'
        ? firstRealRenderPlan.audioStatus
        : '',
    recommendedFirstTarget:
      typeof firstRealRenderPlan.recommendedFirstTarget === 'string'
        ? firstRealRenderPlan.recommendedFirstTarget
        : '',
    recommendedReason:
      typeof firstRealRenderPlan.recommendedReason === 'string'
        ? firstRealRenderPlan.recommendedReason
        : '',
    rendererStrategy: {
      strategyType:
        typeof rendererStrategy?.strategyType === 'string'
          ? rendererStrategy.strategyType
          : '',
      implementationStatus:
        typeof rendererStrategy?.implementationStatus === 'string'
          ? rendererStrategy.implementationStatus
          : '',
      description:
        typeof rendererStrategy?.description === 'string'
          ? rendererStrategy.description
          : '',
    },
    firstUnlockRequirements,
    firstValidationChecks,
    laterTargets,
    notes,
  }
}

const getDryRunRealRenderRouteScaffoldSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const realRenderRouteScaffold =
    dryRunArtifactPackage.realRenderRouteScaffold &&
    typeof dryRunArtifactPackage.realRenderRouteScaffold === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderRouteScaffold)
      ? (dryRunArtifactPackage.realRenderRouteScaffold as Record<
          string,
          unknown
        >)
      : null

  if (!realRenderRouteScaffold) {
    return null
  }

  const expectedRequestShape =
    realRenderRouteScaffold.expectedRequestShape &&
    typeof realRenderRouteScaffold.expectedRequestShape === 'object' &&
    !Array.isArray(realRenderRouteScaffold.expectedRequestShape)
      ? (realRenderRouteScaffold.expectedRequestShape as Record<
          string,
          unknown
        >)
      : null

  const expectedBlockedResponse =
    realRenderRouteScaffold.expectedBlockedResponse &&
    typeof realRenderRouteScaffold.expectedBlockedResponse === 'object' &&
    !Array.isArray(realRenderRouteScaffold.expectedBlockedResponse)
      ? (realRenderRouteScaffold.expectedBlockedResponse as Record<
          string,
          unknown
        >)
      : null

  const safetyRules = Array.isArray(realRenderRouteScaffold.safetyRules)
    ? realRenderRouteScaffold.safetyRules.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

  return {
    routeStatus:
      typeof realRenderRouteScaffold.routeStatus === 'string'
        ? realRenderRouteScaffold.routeStatus
        : '',
    method:
      typeof realRenderRouteScaffold.method === 'string'
        ? realRenderRouteScaffold.method
        : '',
    path:
      typeof realRenderRouteScaffold.path === 'string'
        ? realRenderRouteScaffold.path
        : '',
    expectedBlockedStatusCode:
      typeof realRenderRouteScaffold.expectedBlockedStatusCode === 'number'
        ? realRenderRouteScaffold.expectedBlockedStatusCode
        : 0,
    audioStatus:
      typeof realRenderRouteScaffold.audioStatus === 'string'
        ? realRenderRouteScaffold.audioStatus
        : '',
    rendererStatus:
      typeof realRenderRouteScaffold.rendererStatus === 'string'
        ? realRenderRouteScaffold.rendererStatus
        : '',
    purpose:
      typeof realRenderRouteScaffold.purpose === 'string'
        ? realRenderRouteScaffold.purpose
        : '',
    expectedRequestShape: {
      requestedTarget:
        typeof expectedRequestShape?.requestedTarget === 'string'
          ? expectedRequestShape.requestedTarget
          : '',
      rendererInputContract:
        typeof expectedRequestShape?.rendererInputContract === 'string'
          ? expectedRequestShape.rendererInputContract
          : '',
      realRenderGate:
        typeof expectedRequestShape?.realRenderGate === 'string'
          ? expectedRequestShape.realRenderGate
          : '',
      firstRealRenderPlan:
        typeof expectedRequestShape?.firstRealRenderPlan === 'string'
          ? expectedRequestShape.firstRealRenderPlan
          : '',
      realRenderConfiguration:
          typeof expectedRequestShape?.realRenderConfiguration === 'string'
            ? expectedRequestShape.realRenderConfiguration
            : '',
    },
    expectedBlockedResponse: {
      status:
        typeof expectedBlockedResponse?.status === 'string'
          ? expectedBlockedResponse.status
          : '',
      audioStatus:
        typeof expectedBlockedResponse?.audioStatus === 'string'
          ? expectedBlockedResponse.audioStatus
          : '',
      rendererStatus:
        typeof expectedBlockedResponse?.rendererStatus === 'string'
          ? expectedBlockedResponse.rendererStatus
          : '',
      storageStatus:
        typeof expectedBlockedResponse?.storageStatus === 'string'
          ? expectedBlockedResponse.storageStatus
          : '',
      formatStatus:
        typeof expectedBlockedResponse?.formatStatus === 'string'
          ? expectedBlockedResponse.formatStatus
          : '',
     
      receivedContractSummary: {
          hasRendererInputContract:
            expectedBlockedResponse?.receivedContractSummary &&
            typeof expectedBlockedResponse.receivedContractSummary === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedContractSummary) &&
            (expectedBlockedResponse.receivedContractSummary as Record<
              string,
              unknown
            >).hasRendererInputContract === true,
          hasRealRenderGate:
            expectedBlockedResponse?.receivedContractSummary &&
            typeof expectedBlockedResponse.receivedContractSummary === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedContractSummary) &&
            (expectedBlockedResponse.receivedContractSummary as Record<
              string,
              unknown
            >).hasRealRenderGate === true,
          hasFirstRealRenderPlan:
            expectedBlockedResponse?.receivedContractSummary &&
            typeof expectedBlockedResponse.receivedContractSummary === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedContractSummary) &&
            (expectedBlockedResponse.receivedContractSummary as Record<
              string,
              unknown
            >).hasFirstRealRenderPlan === true,
          hasRealRenderConfiguration:
            expectedBlockedResponse?.receivedContractSummary &&
            typeof expectedBlockedResponse.receivedContractSummary === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedContractSummary) &&
            (expectedBlockedResponse.receivedContractSummary as Record<
              string,
              unknown
            >).hasRealRenderConfiguration === true,
          requestedTarget:
            expectedBlockedResponse?.receivedContractSummary &&
            typeof expectedBlockedResponse.receivedContractSummary === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedContractSummary) &&
            typeof (expectedBlockedResponse.receivedContractSummary as Record<
              string,
              unknown
            >).requestedTarget === 'string'
              ? ((expectedBlockedResponse.receivedContractSummary as Record<
                  string,
                  unknown
                >).requestedTarget as string)
              : '',
        },
      receivedContractCheck: {
        passed:
        expectedBlockedResponse?.receivedContractCheck &&
        typeof expectedBlockedResponse.receivedContractCheck === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedContractCheck) &&
        (expectedBlockedResponse.receivedContractCheck as Record<
          string,
          unknown
        >).passed === true,
      missingOrInvalid:
        expectedBlockedResponse?.receivedContractCheck &&
        typeof expectedBlockedResponse.receivedContractCheck === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedContractCheck) &&
        Array.isArray(
          (expectedBlockedResponse.receivedContractCheck as Record<
            string,
            unknown
          >).missingOrInvalid,
        )
          ? (
              (expectedBlockedResponse.receivedContractCheck as Record<
                string,
                unknown
              >).missingOrInvalid as unknown[]
            ).filter(
              (item): item is string =>
                typeof item === 'string' && item.trim().length > 0,
            )
          : [],
    },

     

        receivedConfigurationSummary: {
      configurationStatus:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).configurationStatus === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).configurationStatus as string)
          : '',
      audioStatus:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).audioStatus === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).audioStatus as string)
          : '',
      rendererStatus:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).rendererStatus === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).rendererStatus as string)
          : '',
          rendererCandidateStatus:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).rendererCandidateStatus === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).rendererCandidateStatus as string)
                : '',
            recommendedFirstRenderer:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).recommendedFirstRenderer === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).recommendedFirstRenderer as string)
                : '',
            rendererCandidateSelectedRenderer:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).rendererCandidateSelectedRenderer === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).rendererCandidateSelectedRenderer as string)
                : null,
      outputFormatStatus:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).outputFormatStatus === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).outputFormatStatus as string)
          : '',
          recommendedFirstFormat:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).recommendedFirstFormat === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).recommendedFirstFormat as string)
                : '',
            selectedFormat:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).selectedFormat === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).selectedFormat as string)
                : null,
      sampleRateStatus:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).sampleRateStatus === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).sampleRateStatus as string)
          : '',
          recommendedFirstSampleRateHz:
  expectedBlockedResponse?.receivedConfigurationSummary &&
  typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
  !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
  typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
    string,
    unknown
  >).recommendedFirstSampleRateHz === 'number'
    ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
        string,
        unknown
      >).recommendedFirstSampleRateHz as number)
    : null,
selectedSampleRateHz:
  expectedBlockedResponse?.receivedConfigurationSummary &&
  typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
  !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
  typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
    string,
    unknown
  >).selectedSampleRateHz === 'number'
    ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
        string,
        unknown
      >).selectedSampleRateHz as number)
    : null,

      storageStatus:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).storageStatus === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).storageStatus as string)
          : '',
          recommendedFirstProvider:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).recommendedFirstProvider === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).recommendedFirstProvider as string)
                : '',
            selectedProvider:
              expectedBlockedResponse?.receivedConfigurationSummary &&
              typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
              !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
              typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
                string,
                unknown
              >).selectedProvider === 'string'
                ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
                    string,
                    unknown
                  >).selectedProvider as string)
                : null,
      firstTargetKey:
        expectedBlockedResponse?.receivedConfigurationSummary &&
        typeof expectedBlockedResponse.receivedConfigurationSummary === 'object' &&
        !Array.isArray(expectedBlockedResponse.receivedConfigurationSummary) &&
        typeof (expectedBlockedResponse.receivedConfigurationSummary as Record<
          string,
          unknown
        >).firstTargetKey === 'string'
          ? ((expectedBlockedResponse.receivedConfigurationSummary as Record<
              string,
              unknown
            >).firstTargetKey as string)
          : '',
    },

      receivedConfigurationCheck: {
          passed:
            expectedBlockedResponse?.receivedConfigurationCheck &&
            typeof expectedBlockedResponse.receivedConfigurationCheck === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedConfigurationCheck) &&
            (expectedBlockedResponse.receivedConfigurationCheck as Record<
              string,
              unknown
            >).passed === true,
          missingOrInvalid:
            expectedBlockedResponse?.receivedConfigurationCheck &&
            typeof expectedBlockedResponse.receivedConfigurationCheck === 'object' &&
            !Array.isArray(expectedBlockedResponse.receivedConfigurationCheck) &&
            Array.isArray(
              (expectedBlockedResponse.receivedConfigurationCheck as Record<
                string,
                unknown
              >).missingOrInvalid,
            )
              ? (
                  (expectedBlockedResponse.receivedConfigurationCheck as Record<
                    string,
                    unknown
                  >).missingOrInvalid as unknown[]
                ).filter(
                  (item): item is string =>
                    typeof item === 'string' && item.trim().length > 0,
                )
              : [],
        },
    },
    safetyRules,
  }
}

const getDryRunRealRenderConfigurationSummary = () => {
  if (!dryRunArtifactPackage) {
    return null
  }

  const realRenderConfiguration =
    dryRunArtifactPackage.realRenderConfiguration &&
    typeof dryRunArtifactPackage.realRenderConfiguration === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderConfiguration)
      ? (dryRunArtifactPackage.realRenderConfiguration as Record<
          string,
          unknown
        >)
      : null

  if (!realRenderConfiguration) {
    return null
  }

  const rendererImplementation =
    realRenderConfiguration.rendererImplementation &&
    typeof realRenderConfiguration.rendererImplementation === 'object' &&
    !Array.isArray(realRenderConfiguration.rendererImplementation)
      ? (realRenderConfiguration.rendererImplementation as Record<
          string,
          unknown
        >)
      : null

      const rendererCandidatePlan =
      realRenderConfiguration.rendererCandidatePlan &&
      typeof realRenderConfiguration.rendererCandidatePlan === 'object' &&
      !Array.isArray(realRenderConfiguration.rendererCandidatePlan)
        ? (realRenderConfiguration.rendererCandidatePlan as Record<
            string,
            unknown
          >)
        : null

  const outputFormat =
    realRenderConfiguration.outputFormat &&
    typeof realRenderConfiguration.outputFormat === 'object' &&
    !Array.isArray(realRenderConfiguration.outputFormat)
      ? (realRenderConfiguration.outputFormat as Record<string, unknown>)
      : null

  const sampleRate =
    realRenderConfiguration.sampleRate &&
    typeof realRenderConfiguration.sampleRate === 'object' &&
    !Array.isArray(realRenderConfiguration.sampleRate)
      ? (realRenderConfiguration.sampleRate as Record<string, unknown>)
      : null

  const storage =
    realRenderConfiguration.storage &&
    typeof realRenderConfiguration.storage === 'object' &&
    !Array.isArray(realRenderConfiguration.storage)
      ? (realRenderConfiguration.storage as Record<string, unknown>)
      : null

  const firstTarget =
    realRenderConfiguration.firstTarget &&
    typeof realRenderConfiguration.firstTarget === 'object' &&
    !Array.isArray(realRenderConfiguration.firstTarget)
      ? (realRenderConfiguration.firstTarget as Record<string, unknown>)
      : null

  const unlockRequirements = Array.isArray(
    realRenderConfiguration.unlockRequirements,
  )
    ? realRenderConfiguration.unlockRequirements.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

return {
  configurationStatus:
    typeof realRenderConfiguration.configurationStatus === 'string'
      ? realRenderConfiguration.configurationStatus
      : '',
  audioStatus:
    typeof realRenderConfiguration.audioStatus === 'string'
      ? realRenderConfiguration.audioStatus
      : '',
  rendererImplementation: {
    status:
      typeof rendererImplementation?.status === 'string'
        ? rendererImplementation.status
        : '',
    selectedRenderer:
      typeof rendererImplementation?.selectedRenderer === 'string'
        ? rendererImplementation.selectedRenderer
        : null,
    requiredDecision:
      typeof rendererImplementation?.requiredDecision === 'string'
        ? rendererImplementation.requiredDecision
        : '',
  },
  rendererCandidatePlan: {
    status:
      typeof rendererCandidatePlan?.status === 'string'
        ? rendererCandidatePlan.status
        : '',
    recommendedFirstRenderer:
      typeof rendererCandidatePlan?.recommendedFirstRenderer === 'string'
        ? rendererCandidatePlan.recommendedFirstRenderer
        : '',
    selectedRenderer:
      typeof rendererCandidatePlan?.selectedRenderer === 'string'
        ? rendererCandidatePlan.selectedRenderer
        : null,
    reason:
      typeof rendererCandidatePlan?.reason === 'string'
        ? rendererCandidatePlan.reason
        : '',
    mustRemainBlockedUntil: Array.isArray(
      rendererCandidatePlan?.mustRemainBlockedUntil,
    )
      ? rendererCandidatePlan.mustRemainBlockedUntil.filter(
          (item): item is string =>
            typeof item === 'string' && item.trim().length > 0,
        )
      : [],
  },

    outputFormat: {
      status:
        typeof outputFormat?.status === 'string'
          ? outputFormat.status
          : '',
      recommendedFirstFormat:
        typeof outputFormat?.recommendedFirstFormat === 'string'
          ? outputFormat.recommendedFirstFormat
          : '',
      selectedFormat:
        typeof outputFormat?.selectedFormat === 'string'
          ? outputFormat.selectedFormat
          : null,
      reason:
        typeof outputFormat?.reason === 'string' ? outputFormat.reason : '',
      mustRemainBlockedUntil: Array.isArray(
        outputFormat?.mustRemainBlockedUntil,
      )
        ? outputFormat.mustRemainBlockedUntil.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : [],
      allowedFirstFormats: Array.isArray(outputFormat?.allowedFirstFormats)
        ? outputFormat.allowedFirstFormats.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : [],
      requiredDecision:
        typeof outputFormat?.requiredDecision === 'string'
          ? outputFormat.requiredDecision
          : '',
    },
    sampleRate: {
      status:
        typeof sampleRate?.status === 'string' ? sampleRate.status : '',
      recommendedFirstSampleRateHz:
        typeof sampleRate?.recommendedFirstSampleRateHz === 'number'
          ? sampleRate.recommendedFirstSampleRateHz
          : null,
      selectedSampleRateHz:
        typeof sampleRate?.selectedSampleRateHz === 'number'
          ? sampleRate.selectedSampleRateHz
          : null,
      reason:
        typeof sampleRate?.reason === 'string' ? sampleRate.reason : '',
      mustRemainBlockedUntil: Array.isArray(
        sampleRate?.mustRemainBlockedUntil,
      )
        ? sampleRate.mustRemainBlockedUntil.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : [],
      allowedFirstSampleRatesHz: Array.isArray(
        sampleRate?.allowedFirstSampleRatesHz,
      )
        ? sampleRate.allowedFirstSampleRatesHz.filter(
            (item): item is number => typeof item === 'number',
          )
        : [],
      requiredDecision:
        typeof sampleRate?.requiredDecision === 'string'
          ? sampleRate.requiredDecision
          : '',
    },
    storage: {
      status:
        typeof storage?.status === 'string' ? storage.status : '',
      recommendedFirstProvider:
        typeof storage?.recommendedFirstProvider === 'string'
          ? storage.recommendedFirstProvider
          : '',
      selectedProvider:
        typeof storage?.selectedProvider === 'string'
          ? storage.selectedProvider
          : null,
      reason:
        typeof storage?.reason === 'string' ? storage.reason : '',
      mustRemainBlockedUntil: Array.isArray(storage?.mustRemainBlockedUntil)
        ? storage.mustRemainBlockedUntil.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : [],
      requiredDecision:
        typeof storage?.requiredDecision === 'string'
          ? storage.requiredDecision
          : '',
    },
    firstTarget: {
      key: typeof firstTarget?.key === 'string' ? firstTarget.key : '',
      status:
        typeof firstTarget?.status === 'string' ? firstTarget.status : '',
      requiredDecision:
        typeof firstTarget?.requiredDecision === 'string'
          ? firstTarget.requiredDecision
          : '',
    },
    unlockRequirements,
  }
}

const getDryRunRendererContractSummary = () => {
  if (!dryRunRenderManifest) {
    return {
      contractStatus: '',
      rendererMode: '',
      consumes: [] as string[],
      produces: [] as string[],
      requiredBeforeRealRender: [] as string[],
      safetyNotes: [] as string[],
    }
  }

  const rendererContract =
    dryRunRenderManifest.rendererContract &&
    typeof dryRunRenderManifest.rendererContract === 'object' &&
    !Array.isArray(dryRunRenderManifest.rendererContract)
      ? (dryRunRenderManifest.rendererContract as Record<string, unknown>)
      : {}

  return {
    contractStatus:
      typeof rendererContract.contractStatus === 'string'
        ? rendererContract.contractStatus
        : '',
    rendererMode:
      typeof rendererContract.rendererMode === 'string'
        ? rendererContract.rendererMode
        : '',
    consumes: Array.isArray(rendererContract.consumes)
      ? rendererContract.consumes.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    produces: Array.isArray(rendererContract.produces)
      ? rendererContract.produces.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    requiredBeforeRealRender: Array.isArray(
      rendererContract.requiredBeforeRealRender,
    )
      ? rendererContract.requiredBeforeRealRender.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    safetyNotes: Array.isArray(rendererContract.safetyNotes)
      ? rendererContract.safetyNotes.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
  }
}

const getDryRunRenderManifestSummary = () => {
  if (!dryRunRenderManifest) {
    return {
      manifestStatus: '',
      audioStatus: '',
      outputSlotCount: 0,
      notGeneratedOutputCount: 0,
      totalEstimatedSeconds: 0,
      totalEstimatedBars: 0,
      cueSheetSectionCount: 0,
      dryRunRenderPlanReady: false,
      dryRunCueSheetReady: false,
    }
  }

  const expectedOutputs =
    dryRunRenderManifest.expectedOutputs &&
    typeof dryRunRenderManifest.expectedOutputs === 'object' &&
    !Array.isArray(dryRunRenderManifest.expectedOutputs)
      ? (dryRunRenderManifest.expectedOutputs as Record<string, unknown>)
      : {}

  const outputSlots = Object.values(expectedOutputs).filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  )

  const sourceSummary =
    dryRunRenderManifest.sourceSummary &&
    typeof dryRunRenderManifest.sourceSummary === 'object' &&
    !Array.isArray(dryRunRenderManifest.sourceSummary)
      ? (dryRunRenderManifest.sourceSummary as Record<string, unknown>)
      : {}

  const validation =
    dryRunRenderManifest.validation &&
    typeof dryRunRenderManifest.validation === 'object' &&
    !Array.isArray(dryRunRenderManifest.validation)
      ? (dryRunRenderManifest.validation as Record<string, unknown>)
      : {}

  return {
    manifestStatus:
      typeof dryRunRenderManifest.manifestStatus === 'string'
        ? dryRunRenderManifest.manifestStatus
        : '',
    audioStatus:
      typeof dryRunRenderManifest.audioStatus === 'string'
        ? dryRunRenderManifest.audioStatus
        : '',
    outputSlotCount: outputSlots.length,
    notGeneratedOutputCount: outputSlots.filter(
      (slot) => slot.status === 'not-generated',
    ).length,
    totalEstimatedSeconds:
      typeof sourceSummary.totalEstimatedSeconds === 'number'
        ? sourceSummary.totalEstimatedSeconds
        : 0,
    totalEstimatedBars:
      typeof sourceSummary.totalEstimatedBars === 'number'
        ? sourceSummary.totalEstimatedBars
        : 0,
    cueSheetSectionCount:
      typeof sourceSummary.cueSheetSectionCount === 'number'
        ? sourceSummary.cueSheetSectionCount
        : 0,
    dryRunRenderPlanReady: validation.dryRunRenderPlanReady === true,
    dryRunCueSheetReady: validation.dryRunCueSheetReady === true,
  }
}

   const getAudioPreviewDryRunPlanSummary = () => {
  if (!audioPreviewDryRunRenderPlan) {
    return {
      hasPlan: false,
      type: '',
      renderMode: '',
      audioStatus: '',
      songsheetLineCount: 0,
      renderStepCount: 0,
      sectionCount: 0,
      timelineSectionCount: 0,
      cueSheetSectionCount: 0,
      totalEstimatedSeconds: 0,
      totalEstimatedBars: 0,
      hasInstructions: false,
    }
  }

  const sections = Array.isArray(audioPreviewDryRunRenderPlan.sections)
    ? audioPreviewDryRunRenderPlan.sections
    : []

  const timeline = Array.isArray(audioPreviewDryRunRenderPlan.timeline)
    ? audioPreviewDryRunRenderPlan.timeline
    : []

  const cueSheet =
    audioPreviewDryRunRenderPlan.cueSheet &&
    typeof audioPreviewDryRunRenderPlan.cueSheet === 'object' &&
    !Array.isArray(audioPreviewDryRunRenderPlan.cueSheet)
      ? (audioPreviewDryRunRenderPlan.cueSheet as Record<string, unknown>)
      : null

  const cueSheetSections =
    cueSheet && Array.isArray(cueSheet.sections) ? cueSheet.sections : []

  const rendererInstructions = Array.isArray(
    audioPreviewDryRunRenderPlan.rendererInstructions,
  )
    ? audioPreviewDryRunRenderPlan.rendererInstructions
    : []

  return {
    hasPlan: true,
    type:
      typeof audioPreviewDryRunRenderPlan.type === 'string'
        ? audioPreviewDryRunRenderPlan.type
        : '',
    renderMode:
      typeof audioPreviewDryRunRenderPlan.renderMode === 'string'
        ? audioPreviewDryRunRenderPlan.renderMode
        : '',
    audioStatus:
      typeof audioPreviewDryRunRenderPlan.audioStatus === 'string'
        ? audioPreviewDryRunRenderPlan.audioStatus
        : '',
    songsheetLineCount:
      typeof audioPreviewDryRunRenderPlan.songsheetLineCount === 'number'
        ? audioPreviewDryRunRenderPlan.songsheetLineCount
        : 0,
    renderStepCount:
      typeof audioPreviewDryRunRenderPlan.renderStepCount === 'number'
        ? audioPreviewDryRunRenderPlan.renderStepCount
        : 0,
    sectionCount: sections.length,
    timelineSectionCount: timeline.length,
    cueSheetSectionCount: cueSheetSections.length,
    totalEstimatedSeconds:
      cueSheet && typeof cueSheet.totalEstimatedSeconds === 'number'
        ? cueSheet.totalEstimatedSeconds
        : 0,
    totalEstimatedBars:
      cueSheet && typeof cueSheet.totalEstimatedBars === 'number'
        ? cueSheet.totalEstimatedBars
        : 0,
    hasInstructions: rendererInstructions.length > 0,
  }
}


    const getAudioPreviewResultStatus = () => {
  if (!audioPreviewPlan) {
    return {
      label: 'Audio preview not requested',
      detail: 'Request audio preview to create the planner output and renderer payload.',
      tone: 'missing',
    }
  }

  if (audioPreviewRendererPayloadValidation?.ready === true) {
    return {
      label: 'Audio preview result ready',
      detail:
        'Planner output, render prompt, renderer payload, and payload validation are ready.',
      tone: 'ready',
    }
  }

  if (audioPreviewRendererPayload) {
    return {
      label: 'Audio preview result needs review',
      detail:
        typeof audioPreviewRendererPayloadValidation?.detail === 'string'
          ? audioPreviewRendererPayloadValidation.detail
          : 'Renderer payload exists, but validation details are unavailable.',
      tone: 'review',
    }
  }

  return {
    label: 'Audio preview result incomplete',
    detail:
      'Planner output exists, but the structured renderer payload was not created.',
    tone: 'review',
  }
}

const clearAudioPreviewOutput = () => {
  setAudioPreviewMessage('Audio preview output cleared.')
  setAudioPreviewResponse('')
  setAudioPreviewPlan(null)
  setAudioPreviewRenderPrompt('')
  setAudioPreviewRenderSteps([])
  setAudioPreviewSongSheetText('')
  setAudioPreviewSectionGuideText('')
  setAudioPreviewRendererPayload(null)
  setAudioPreviewRendererPayloadValidation(null)
  setAudioPreviewMeta(null)
  setJustCopiedAudioPreviewSpec(false)
  setJustCopiedAudioPreviewChecklist(false)
  setJustCopiedAudioPreviewSongSheet(false)
  setJustCopiedAudioPreviewSectionGuide(false)
  setJustCopiedAudioRenderPrompt(false)
  setJustCopiedAudioPreviewRendererPayload(false)
  setSubmittingAudioPreviewRender(false)
  setAudioPreviewRenderMessage('')
  setAudioPreviewRenderJob(null)
  setAudioPreviewRenderResponse('')
  setAudioPreviewDryRunRenderPlan(null)
  setDryRunRenderPlanValidation(null)
  setDryRunRenderManifest(null)
  setDryRunRenderManifestValidation(null)
  setDryRunHandoffBundle(null)
  setDryRunHandoffBundleValidation(null)
  setDryRunArtifactPackage(null)
  setDryRunArtifactPackageValidation(null)
  setDryRunCueSheetValidation(null)
  
}


const getAudioPreviewRendererPayloadSummary = () => {
  if (!audioPreviewRendererPayload) {
    return {
      hasPayload: false,
      type: '',
      renderStatus: '',
      songsheetLineCount: 0,
      renderStepCount: 0,
      hasRenderPrompt: false,
      hasPreviewSongSheetText: false,
      hasSectionGuideText: false,
    }
  }

  const songsheetLines = Array.isArray(audioPreviewRendererPayload.songsheetLines)
    ? audioPreviewRendererPayload.songsheetLines
    : []

  const renderSteps = Array.isArray(audioPreviewRendererPayload.renderSteps)
    ? audioPreviewRendererPayload.renderSteps
    : []

  return {
    hasPayload: true,
    type:
      typeof audioPreviewRendererPayload.type === 'string'
        ? audioPreviewRendererPayload.type
        : '',
    renderStatus:
      typeof audioPreviewRendererPayload.renderStatus === 'string'
        ? audioPreviewRendererPayload.renderStatus
        : '',
    songsheetLineCount: songsheetLines.length,
    renderStepCount: renderSteps.length,
    hasRenderPrompt:
      typeof audioPreviewRendererPayload.renderPrompt === 'string' &&
      audioPreviewRendererPayload.renderPrompt.trim().length > 0,
    hasPreviewSongSheetText:
      typeof audioPreviewRendererPayload.previewSongSheetText === 'string' &&
      audioPreviewRendererPayload.previewSongSheetText.trim().length > 0,
    hasSectionGuideText:
      typeof audioPreviewRendererPayload.sectionGuideText === 'string' &&
      audioPreviewRendererPayload.sectionGuideText.trim().length > 0,
  }
}

const getAudioPreviewPipelineStatus = () => {
  const checklist = getAudioPreviewChecklist()
  const completeCount = checklist.filter((item) => item.complete).length
  const nextIncomplete = checklist.find((item) => !item.complete)

  if (completeCount === checklist.length) {
  return {
    label: 'Audio preview pipeline complete',
    progress: 'Complete',
detail:
  'Preview spec, renderer payload, dry-run plan, cue sheet, manifest, handoff bundle, artefact package, validations, real-render blockers, and render targets are ready.',    totalCount: checklist.length,
    nextAction: 'Ready for future renderer integration.',
    tone: 'ready',
  }
}

  if (nextIncomplete) {
    return {
      label: 'Audio preview pipeline in progress',
      detail: nextIncomplete.detail,
      completeCount,
      totalCount: checklist.length,
      nextAction: nextIncomplete.label,
      tone: completeCount > 0 ? 'review' : 'missing',
    }
  }

  return {
    label: 'Audio preview pipeline not started',
    detail: 'Generate a placed songsheet and guide plan before requesting audio preview.',
    completeCount,
    totalCount: checklist.length,
    nextAction: 'Request audio preview when inputs are ready.',
    tone: 'missing',
  }
}





const getAudioPreviewChecklistSummary = () => {
  const checklist = getAudioPreviewChecklist()
  const completeCount = checklist.filter((item) => item.complete).length
  const totalCount = checklist.length

  if (totalCount === 0) {
    return {
      completeCount: 0,
      totalCount: 0,
      label: 'Audio preview readiness unknown',
      detail: 'No audio preview checklist items are available.',
      tone: 'missing',
    }
  }

  if (completeCount === totalCount) {
    return {
      completeCount,
      totalCount,
      label: 'Audio preview workflow ready',
      detail: `${completeCount}/${totalCount} audio preview items are ready.`,
      tone: 'ready',
    }
  }

  if (completeCount >= 3) {
    return {
      completeCount,
      totalCount,
      label: 'Audio preview workflow partly ready',
      detail: `${completeCount}/${totalCount} audio preview items are ready.`,
      tone: 'review',
    }
  }

  return {
    completeCount,
    totalCount,
    label: 'Audio preview workflow not ready',
    detail: `${completeCount}/${totalCount} audio preview items are ready.`,
    tone: 'missing',
  }
}

 


const getAudioPreviewChecklist = () => {
  const hasPlacedSongsheet =
    getPlacedSongSheetLines(getChordDataFromEditorJson()).length > 0

  const hasGuidePlan =
    getGuideTrackPlanRows(getChordDataFromEditorJson()).length > 0 ||
    getGuideTrackSectionPlanRows(getChordDataFromEditorJson()).length > 0
  const hasDryRunArtifactPackage = Boolean(dryRunArtifactPackage)
    const hasValidatedDryRunArtifactPackage =
    dryRunArtifactPackageValidation?.ready === true

  const hasGuideTrackRenderRecipe = Boolean(
    dryRunArtifactPackage &&
      dryRunArtifactPackage.guideTrackRenderRecipe &&
      typeof dryRunArtifactPackage.guideTrackRenderRecipe === 'object' &&
      !Array.isArray(dryRunArtifactPackage.guideTrackRenderRecipe),
  )

  const hasClickTrackRenderRecipe = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.clickTrackRenderRecipe &&
    typeof dryRunArtifactPackage.clickTrackRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.clickTrackRenderRecipe),
)

const hasChordReferenceRenderRecipe = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.chordReferenceRenderRecipe &&
    typeof dryRunArtifactPackage.chordReferenceRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.chordReferenceRenderRecipe),
)

const hasVocalGuideRenderRecipe = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.vocalGuideRenderRecipe &&
    typeof dryRunArtifactPackage.vocalGuideRenderRecipe === 'object' &&
    !Array.isArray(dryRunArtifactPackage.vocalGuideRenderRecipe),
)
const hasExpectedOutputFiles = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.expectedOutputFiles &&
    typeof dryRunArtifactPackage.expectedOutputFiles === 'object' &&
    !Array.isArray(dryRunArtifactPackage.expectedOutputFiles),
)

const hasRendererInputContract = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.rendererInputContract &&
    typeof dryRunArtifactPackage.rendererInputContract === 'object' &&
    !Array.isArray(dryRunArtifactPackage.rendererInputContract),
)
const hasRealRenderGate = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderGate &&
    typeof dryRunArtifactPackage.realRenderGate === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderGate),
)
const hasFirstRealRenderPlan = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.firstRealRenderPlan &&
    typeof dryRunArtifactPackage.firstRealRenderPlan === 'object' &&
    !Array.isArray(dryRunArtifactPackage.firstRealRenderPlan),
)

const hasRealRenderRouteScaffold = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderRouteScaffold &&
    typeof dryRunArtifactPackage.realRenderRouteScaffold === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderRouteScaffold),
)

const hasRealRenderConfiguration = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderConfiguration &&
    typeof dryRunArtifactPackage.realRenderConfiguration === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderConfiguration),
)

const hasRendererCandidatePlan = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderConfiguration &&
    typeof dryRunArtifactPackage.realRenderConfiguration === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderConfiguration) &&
    (dryRunArtifactPackage.realRenderConfiguration as Record<string, unknown>)
      .rendererCandidatePlan &&
    typeof (
      dryRunArtifactPackage.realRenderConfiguration as Record<string, unknown>
    ).rendererCandidatePlan === 'object' &&
    !Array.isArray(
      (dryRunArtifactPackage.realRenderConfiguration as Record<string, unknown>)
        .rendererCandidatePlan,
    ) &&
    (
      (
        dryRunArtifactPackage.realRenderConfiguration as Record<string, unknown>
      ).rendererCandidatePlan as Record<string, unknown>
    ).status === 'candidate-declared-not-selected' &&
    (
      (
        dryRunArtifactPackage.realRenderConfiguration as Record<string, unknown>
      ).rendererCandidatePlan as Record<string, unknown>
    ).recommendedFirstRenderer === 'local-click-track-wav-renderer' &&
    (
      (
        dryRunArtifactPackage.realRenderConfiguration as Record<string, unknown>
      ).rendererCandidatePlan as Record<string, unknown>
    ).selectedRenderer === null,
)

const hasExpectedReceivedContractSummary = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderRouteScaffold &&
    typeof dryRunArtifactPackage.realRenderRouteScaffold === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderRouteScaffold) &&
    (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
      .expectedBlockedResponse &&
    typeof (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
    ).expectedBlockedResponse === 'object' &&
    !Array.isArray(
      (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
        .expectedBlockedResponse,
    ) &&
    (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedContractSummary &&
    typeof (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedContractSummary === 'object' &&
    !Array.isArray(
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractSummary,
    ) &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractSummary as Record<string, unknown>
    ).hasRendererInputContract === true &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractSummary as Record<string, unknown>
    ).hasRealRenderGate === true &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractSummary as Record<string, unknown>
    ).hasFirstRealRenderPlan === true &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractSummary as Record<string, unknown>
    ).hasRealRenderConfiguration === true &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractSummary as Record<string, unknown>
    ).requestedTarget === 'clickTrack',
)

const hasExpectedReceivedContractCheck = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderRouteScaffold &&
    typeof dryRunArtifactPackage.realRenderRouteScaffold === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderRouteScaffold) &&
    (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
      .expectedBlockedResponse &&
    typeof (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
    ).expectedBlockedResponse === 'object' &&
    !Array.isArray(
      (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
        .expectedBlockedResponse,
    ) &&
    (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedContractCheck &&
    typeof (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedContractCheck === 'object' &&
    !Array.isArray(
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractCheck,
    ) &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedContractCheck as Record<string, unknown>
    ).passed === true &&
    Array.isArray(
      (
        (
          (
            dryRunArtifactPackage.realRenderRouteScaffold as Record<
              string,
              unknown
            >
          ).expectedBlockedResponse as Record<string, unknown>
        ).receivedContractCheck as Record<string, unknown>
      ).missingOrInvalid,
    ) &&
    (
      (
        (
          (
            dryRunArtifactPackage.realRenderRouteScaffold as Record<
              string,
              unknown
            >
          ).expectedBlockedResponse as Record<string, unknown>
        ).receivedContractCheck as Record<string, unknown>
      ).missingOrInvalid as unknown[]
    ).length === 0,
)

const hasExpectedReceivedConfigurationSummary = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderRouteScaffold &&
    typeof dryRunArtifactPackage.realRenderRouteScaffold === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderRouteScaffold) &&
    (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
      .expectedBlockedResponse &&
    typeof (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
    ).expectedBlockedResponse === 'object' &&
    !Array.isArray(
      (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
        .expectedBlockedResponse,
    ) &&
    (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedConfigurationSummary &&
    typeof (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedConfigurationSummary === 'object' &&
    !Array.isArray(
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary,
    ) &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary as Record<string, unknown>
    ).configurationStatus ===
      'dry-run-real-render-configuration-placeholder' &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary as Record<string, unknown>
    ).audioStatus === 'not-generated' &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary as Record<string, unknown>
).rendererStatus === 'not-connected' &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).rendererCandidateStatus === 'candidate-declared-not-selected' &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).recommendedFirstRenderer === 'local-click-track-wav-renderer' &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).rendererCandidateSelectedRenderer === null &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).outputFormatStatus === 'format-candidate-declared-not-selected' &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).recommendedFirstFormat === 'wav' &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).selectedFormat === null && 'not-selected' &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary as Record<string, unknown>
    ).sampleRateStatus === 'sample-rate-candidate-declared-not-selected' &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).recommendedFirstSampleRateHz === 44100 &&
(
  (
    (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<
        string,
        unknown
      >
    ).expectedBlockedResponse as Record<string, unknown>
  ).receivedConfigurationSummary as Record<string, unknown>
).selectedSampleRateHz === null &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary as Record<string, unknown>
    ).storageStatus === 'not-configured' &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationSummary as Record<string, unknown>
    ).firstTargetKey === 'clickTrack',
)

const hasExpectedReceivedConfigurationCheck = Boolean(
  dryRunArtifactPackage &&
    dryRunArtifactPackage.realRenderRouteScaffold &&
    typeof dryRunArtifactPackage.realRenderRouteScaffold === 'object' &&
    !Array.isArray(dryRunArtifactPackage.realRenderRouteScaffold) &&
    (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
      .expectedBlockedResponse &&
    typeof (
      dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
    ).expectedBlockedResponse === 'object' &&
    !Array.isArray(
      (dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>)
        .expectedBlockedResponse,
    ) &&
    (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedConfigurationCheck &&
    typeof (
      (
        dryRunArtifactPackage.realRenderRouteScaffold as Record<string, unknown>
      ).expectedBlockedResponse as Record<string, unknown>
    ).receivedConfigurationCheck === 'object' &&
    !Array.isArray(
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationCheck,
    ) &&
    (
      (
        (
          dryRunArtifactPackage.realRenderRouteScaffold as Record<
            string,
            unknown
          >
        ).expectedBlockedResponse as Record<string, unknown>
      ).receivedConfigurationCheck as Record<string, unknown>
    ).passed === true &&
    Array.isArray(
      (
        (
          (
            dryRunArtifactPackage.realRenderRouteScaffold as Record<
              string,
              unknown
            >
          ).expectedBlockedResponse as Record<string, unknown>
        ).receivedConfigurationCheck as Record<string, unknown>
      ).missingOrInvalid,
    ) &&
    (
      (
        (
          (
            dryRunArtifactPackage.realRenderRouteScaffold as Record<
              string,
              unknown
            >
          ).expectedBlockedResponse as Record<string, unknown>
        ).receivedConfigurationCheck as Record<string, unknown>
      ).missingOrInvalid as unknown[]
    ).length === 0,
)

const hasBlockedRealRenderRouteTestPassed =
  getBlockedRealRenderRouteTestPassed()

  const realRenderReadinessSummary = getDryRunRealRenderReadinessSummary()
  const hasRealRenderReadiness =
   Boolean(realRenderReadinessSummary.readinessStatus)
  const realRenderIsCorrectlyBlocked =
   realRenderReadinessSummary.readyForRealRender === false &&
   realRenderReadinessSummary.readinessStatus ===
    'blocked-until-renderer-connected'
    const renderTargetRows = getDryRunRenderTargetRows()
    const hasDeclaredRenderTargets = renderTargetRows.length > 0
    const selectedRenderTargetCount = renderTargetRows.filter(
      (target) => target.selected,
    ).length
    const optionalRenderTargetCount = renderTargetRows.filter(
      (target) => !target.selected,
    ).length
    const hasExpectedRenderTargetShape =
      hasDeclaredRenderTargets &&
      selectedRenderTargetCount > 0 &&
      optionalRenderTargetCount > 0
  const hasPreviewSpec = Boolean(audioPreviewSpecPreview.trim())
  const hasPreviewPlan = Boolean(audioPreviewPlan)
  const hasPreviewSongSheet = Boolean(audioPreviewSongSheetText.trim())
  const hasSectionGuide = Boolean(audioPreviewSectionGuideText.trim())
  const hasRenderPrompt = Boolean(audioPreviewRenderPrompt.trim())
  const hasRendererPayload = Boolean(audioPreviewRendererPayload)
  const hasValidatedRendererPayload = isAudioPreviewRendererPayloadValidated()
  const hasDryRunJob = isAudioPreviewDryRunReady()
  const hasDryRunPlan = isAudioPreviewDryRunPlanReady()
  const hasDryRunManifest = Boolean(dryRunRenderManifest)
  const rendererContractSummary = getDryRunRendererContractSummary()
  const hasRendererContract = Boolean(rendererContractSummary.contractStatus)
  const hasRendererContractLists =
  hasRendererContract &&
  rendererContractSummary.consumes.length > 0 &&
  rendererContractSummary.produces.length > 0 &&
  rendererContractSummary.requiredBeforeRealRender.length > 0 &&
  rendererContractSummary.safetyNotes.length > 0
  const hasValidatedManifest = dryRunRenderManifestValidation?.ready === true
  const hasDryRunHandoffBundle = Boolean(dryRunHandoffBundle)
  const hasReadyDryRunHandoffBundle =
  dryRunHandoffBundleValidation?.ready === true
  const expectedOutputRows = getDryRunExpectedOutputRows()
  const hasExpectedOutputSlots = expectedOutputRows.length > 0
  const hasOnlyNotGeneratedOutputs =
  hasExpectedOutputSlots &&
  expectedOutputRows.every((output) => output.status === 'not-generated')
  const hasExpectedOutputMetadata =
  hasExpectedOutputSlots &&
  expectedOutputRows.every(
    (output) =>
      Boolean(output.role) &&
      Boolean(output.description) &&
      Boolean(output.suggestedFileName),
  )

  return [
    {
      label: 'Placed songsheet ready',
      complete: hasPlacedSongsheet,
      detail: hasPlacedSongsheet
        ? 'Chord-over-lyric songsheet is available.'
        : 'Generate placed songsheet first.',
    },
    {
      label: 'Guide plan ready',
      complete: hasGuidePlan,
      detail: hasGuidePlan
        ? 'Guide track plan or section plan is available.'
        : 'Generate guide plan before requesting audio preview.',
    },
    {
      label: 'Preview spec ready',
      complete: hasPreviewSpec,
      detail: hasPreviewSpec
        ? 'Audio preview request spec can be copied or sent.'
        : 'Preview spec is not available yet.',
    },
    {
      label: 'Planner response ready',
      complete: hasPreviewPlan,
      detail: hasPreviewPlan
        ? 'Audio preview planner returned a preview plan.'
        : 'Request audio preview to create planner output.',
    },
    
    {
      label: 'Section guide ready',
      complete: hasSectionGuide,
      detail: hasSectionGuide
        ? 'Section-by-section render guide is available.'
        : 'Request audio preview to derive the section guide.',
    },
    {
      label: 'Render prompt ready',
          complete: hasRenderPrompt,
          detail: hasRenderPrompt
            ? 'Renderer-ready audio preview prompt is available.'
            : 'Request audio preview to generate the render prompt.',
        },
       {
          label: 'Renderer payload ready',
          complete: hasRendererPayload,
          detail: hasRendererPayload
            ? 'Structured machine-readable renderer payload is available.'
            : 'Request audio preview to generate the renderer payload.',
        },
       

        {
  label: 'Dry-run handoff ready',
  complete: Boolean(hasDryRunJob),
  detail: hasDryRunJob
    ? 'Renderer payload was accepted by the dry-run handoff route.'
    : hasValidatedRendererPayload
      ? 'Submit dry run to confirm the renderer handoff route accepts the payload.'
      : 'Validate the renderer payload before submitting a dry run.',
},
{
  label: 'Dry-run artefact package ready',
  complete: hasDryRunArtifactPackage,
  detail: hasDryRunArtifactPackage
    ? 'Machine-readable dry-run artefact package is available.'
    : 'Submit dry run to create the artefact package.',
},
{
  label: 'Dry-run artefact package validated',
  complete: hasValidatedDryRunArtifactPackage,
  detail: hasValidatedDryRunArtifactPackage
    ? 'Artefact package validation passed and confirms audio status is not-generated.'
    : hasDryRunArtifactPackage
      ? 'Review artefact package validation before future renderer integration.'
      : 'Submit dry run to validate the artefact package.',
},
{
  label: 'Guide-track render recipe',
  detail: hasGuideTrackRenderRecipe
    ? 'Guide-track render recipe is present in the dry-run artefact package.'
    : 'Guide-track render recipe is pending until dry run creates the artefact package.',
  complete: hasGuideTrackRenderRecipe,
},
{
  label: 'Click-track render recipe',
  detail: hasClickTrackRenderRecipe
    ? 'Click-track render recipe is present in the dry-run artefact package.'
    : 'Click-track render recipe is pending until dry run creates the artefact package.',
  complete: hasClickTrackRenderRecipe,
},
{
  label: 'Chord-reference render recipe',
  detail: hasChordReferenceRenderRecipe
    ? 'Chord-reference render recipe is present in the dry-run artefact package.'
    : 'Chord-reference render recipe is pending until dry run creates the artefact package.',
  complete: hasChordReferenceRenderRecipe,
},
{
  label: 'Optional vocal-guide render recipe',
  detail: hasVocalGuideRenderRecipe
    ? 'Optional vocal-guide render recipe is present in the dry-run artefact package.'
    : 'Optional vocal-guide render recipe is pending until dry run creates the artefact package.',
  complete: hasVocalGuideRenderRecipe,
},
{
  label: 'Expected output file placeholders',
  detail: hasExpectedOutputFiles
    ? 'Expected output file placeholders are present and remain marked not-generated.'
    : 'Expected output file placeholders are pending until dry run creates the artefact package.',
  complete: hasExpectedOutputFiles,
},
{
  label: 'Renderer input contract',
  detail: hasRendererInputContract
    ? 'Renderer input contract is present and confirms the real renderer is not connected yet.'
    : 'Renderer input contract is pending until dry run creates the artefact package.',
  complete: hasRendererInputContract,
},
{
  label: 'Real-render safety gate',
  detail: hasRealRenderGate
    ? 'Real-render safety gate is present and keeps audio generation blocked until renderer, format, storage, and execution are configured.'
    : 'Real-render safety gate is pending until dry run creates the artefact package.',
  complete: hasRealRenderGate,
},

{
  label: 'First real-render plan',
  detail: hasFirstRealRenderPlan
    ? 'First real-render plan is present and declares clickTrack as the safest first audio target.'
    : 'First real-render plan is pending until dry run creates the artefact package.',
  complete: hasFirstRealRenderPlan,
},

{
  label: 'Blocked real-render route scaffold',
  detail: hasRealRenderRouteScaffold
    ? 'Blocked real-render route scaffold is present and declares the future endpoint while keeping audio generation disabled.'
    : 'Blocked real-render route scaffold is pending until dry run creates the artefact package.',
  complete: hasRealRenderRouteScaffold,
},

{
  label: 'Blocked real-render route test',
  detail: hasBlockedRealRenderRouteTestPassed
    ? 'Blocked real-render route test passed and confirmed the endpoint returns 423 blocked, generated no audio, and verified the received contract/configuration summaries including renderer, WAV format, 44.1 kHz sample-rate, and browser-download storage candidate fields.'
    : hasRealRenderRouteScaffold
      ? 'Run Test blocked route to confirm the real-render scaffold safely returns blocked status and receives the real-render configuration placeholders.'
      : 'Blocked real-render route test is pending until the scaffold is declared.',
  complete: hasBlockedRealRenderRouteTestPassed,
},

{
  label: 'Real-render configuration placeholders',
  detail: hasRendererCandidatePlan
    ? 'Real-render candidate placeholder is present in the dry-run configuration, recommends the local click-track WAV renderer, and keeps it unselected.'
    : 'Real-render candidate placeholder is pending until dry run creates the real-render configuration.',
  complete: hasRealRenderConfiguration,
},

{
  label: 'Real-render candidate placeholder',
  detail: hasRendererCandidatePlan
    ? 'First renderer candidate placeholder is present, recommends the local click-track WAV renderer, and keeps it unselected.'
    : 'First renderer candidate placeholder is pending until dry run creates the real-render configuration.',
  complete: hasRendererCandidatePlan,
},

{
  label: 'Expected received-contract summary',
  detail: hasExpectedReceivedContractSummary
    ? 'Blocked route scaffold declares the expected received-contract summary with all required top-level contract fields present.'
    : 'Expected received-contract summary is pending until the dry-run scaffold declares it in the expected blocked response.',
  complete: hasExpectedReceivedContractSummary,
},

{
  label: 'Expected received-contract check',
  detail: hasExpectedReceivedContractCheck
    ? 'Blocked route scaffold declares the expected received-contract check with passed true and no missing or invalid fields.'
    : 'Expected received-contract check is pending until the dry-run scaffold declares it in the expected blocked response.',
  complete: hasExpectedReceivedContractCheck,
},

{
  label: 'Expected received-configuration summary',
  detail: hasExpectedReceivedConfigurationSummary
    ? 'Blocked route scaffold declares the expected received-configuration summary, including renderer, WAV format, and 44.1 kHz sample-rate candidate fields, before any real renderer can be connected.'
    : 'Expected received-configuration summary is pending until the dry-run scaffold declares it in the expected blocked response.',
  complete: hasExpectedReceivedConfigurationSummary,
},

{
  label: 'Expected received-configuration check',
  detail: hasExpectedReceivedConfigurationCheck
    ? 'Blocked route scaffold declares the expected received-configuration check with passed true and no missing or invalid fields.'
    : 'Expected received-configuration check is pending until the dry-run scaffold declares it in the expected blocked response.',
  complete: hasExpectedReceivedConfigurationCheck,
},

{
  label: 'Real-render readiness documented',
  complete: hasRealRenderReadiness,
  detail: hasRealRenderReadiness
    ? 'Real-render readiness blockers and required decisions are documented.'
    : 'Submit dry run to create real-render readiness blockers.',
},
{
  label: 'Real-render correctly blocked',
  complete: realRenderIsCorrectlyBlocked,
  detail: realRenderIsCorrectlyBlocked
    ? 'Real rendering is correctly blocked until renderer, format, storage, and timing decisions are made.'
    : hasRealRenderReadiness
      ? 'Review real-render readiness status before allowing renderer integration.'
      : 'Submit dry run to confirm real rendering remains blocked.',
},

{
  label: 'Render targets declared',
  complete: hasDeclaredRenderTargets,
  detail: hasDeclaredRenderTargets
    ? `${renderTargetRows.length} future render target${renderTargetRows.length === 1 ? '' : 's'} declared.`
    : 'Submit dry run to declare future render targets.',
},
{
  label: 'Render target selection ready',
  complete: hasExpectedRenderTargetShape,
  detail: hasExpectedRenderTargetShape
    ? `${selectedRenderTargetCount} selected target${selectedRenderTargetCount === 1 ? '' : 's'} and ${optionalRenderTargetCount} optional target${optionalRenderTargetCount === 1 ? '' : 's'} are documented.`
    : hasDeclaredRenderTargets
      ? 'Review selected and optional render targets before future renderer integration.'
      : 'Submit dry run to create render target selection details.',
},

{
  label: 'Dry-run render plan ready',
  complete: hasDryRunPlan,
  detail: hasDryRunPlan
    ? 'Structured dry-run render plan is available.'
    : hasDryRunJob
      ? 'Dry-run handoff succeeded, but no render plan was returned.'
      : 'Submit dry run to create the structured render plan.',
},

 {
          label: 'Renderer payload validated',
          complete: hasValidatedRendererPayload,
          detail: hasValidatedRendererPayload
            ? 'Renderer payload validation passed.'
            : hasRendererPayload
              ? 'Renderer payload exists but validation needs review.'
              : 'Request audio preview to validate the renderer payload.',
        },
{
      label: 'Renderer songsheet ready',
      complete: hasPreviewSongSheet,
      detail: hasPreviewSongSheet
        ? 'Audio-preview placed songsheet is available.'
        : 'Request audio preview to derive the renderer songsheet.',
    },
    {
  label: 'Dry-run render manifest ready',
  complete: hasDryRunManifest,
  detail: hasDryRunManifest
    ? 'Renderer-facing dry-run manifest is available.'
    : 'Submit dry run to create the renderer-facing manifest.',
},
{
  label: 'Dry-run render manifest validated',
  complete: hasValidatedManifest,
  detail: hasValidatedManifest
    ? 'Dry-run render manifest validation passed.'
    : hasDryRunManifest
      ? 'Dry-run render manifest exists but validation needs review.'
      : 'Submit dry run to create and validate the render manifest.',
},
{
  label: 'Expected audio output slots ready',
  complete: hasExpectedOutputSlots,
  detail: hasExpectedOutputSlots
    ? `${expectedOutputRows.length} expected audio output slot${expectedOutputRows.length === 1 ? '' : 's'} available.`
    : 'Submit dry run to create expected future audio output slots.',
},
{
  label: 'Expected audio outputs not generated',
  complete: hasOnlyNotGeneratedOutputs,
  detail: hasOnlyNotGeneratedOutputs
    ? 'All expected audio output slots are correctly marked not-generated.'
    : hasExpectedOutputSlots
      ? 'Review expected output slot statuses before connecting a real renderer.'
      : 'Submit dry run to confirm expected audio output statuses.',
},
{
  label: 'Expected audio output metadata ready',
  complete: hasExpectedOutputMetadata,
  detail: hasExpectedOutputMetadata
    ? 'Expected audio output slots include role, description, and suggested file names.'
    : hasExpectedOutputSlots
      ? 'Review expected output metadata before connecting a real renderer.'
      : 'Submit dry run to create expected output metadata.',
},
{
  label: 'Renderer contract ready',
  complete: hasRendererContract,
  detail: hasRendererContract
    ? 'Dry-run renderer contract is available in the manifest.'
    : 'Submit dry run to create the renderer contract.',
},
{
  label: 'Renderer contract lists complete',
  complete: hasRendererContractLists,
  detail: hasRendererContractLists
    ? 'Renderer contract includes consumes, produces, required-before-render, and safety notes.'
    : hasRendererContract
      ? 'Review renderer contract lists before connecting a real renderer.'
      : 'Submit dry run to create renderer contract lists.',
},
{
  label: 'Dry-run handoff bundle ready',
  complete: hasDryRunHandoffBundle,
  detail: hasDryRunHandoffBundle
    ? 'Consolidated dry-run handoff bundle is available.'
    : 'Submit dry run to create the consolidated handoff bundle.',
},
{
  label: 'Dry-run handoff bundle validated',
  complete: hasReadyDryRunHandoffBundle,
  detail: hasReadyDryRunHandoffBundle
    ? 'Handoff bundle is ready and confirms audio status is not-generated.'
    : hasDryRunHandoffBundle
      ? 'Review handoff bundle status before future renderer integration.'
      : 'Submit dry run to validate the handoff bundle.',
},

  ]
}

const getAudioPreviewHandoffStatus = () => {
  if (audioPreviewRenderPrompt.trim()) {
    return {
      label: 'Audio preview handoff ready',
      detail:
        'The Full Performance Pack will include the renderer-ready audio preview prompt.',
      tone: 'ready',
    }
  }

  const hasPreviewInputs =
    getPlacedSongSheetLines(getChordDataFromEditorJson()).length > 0 &&
    getGuideTrackPlanRows(getChordDataFromEditorJson()).length > 0

  if (hasPreviewInputs) {
    return {
      label: 'Audio preview handoff not requested yet',
      detail:
        'The Full Performance Pack will include a reminder placeholder until you request audio preview.',
      tone: 'review',
    }
  }

  return {
    label: 'Audio preview handoff not ready',
    detail:
      'Generate a placed songsheet and guide plan before requesting audio preview.',
    tone: 'missing',
  }
}


const getAudioPreviewSpecStatus = () => {
  const previewSpec = buildAudioPreviewSpecCopyText()

  if (!previewSpec) {
    return {
      label: 'No preview spec available',
      detail: 'Generate or load chord data with performance intent or songsheet lines.',
      isValid: false,
    }
  }

  try {
    JSON.parse(previewSpec)

    return {
      label: 'Preview spec JSON is valid',
      detail: 'The audio preview spec can be copied as machine-readable JSON.',
      isValid: true,
    }
  } catch {
    return {
      label: 'Preview spec JSON is invalid',
      detail: 'The generated preview spec could not be parsed as JSON.',
      isValid: false,
    }
  }
}

const getCompactChordContext = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>

  const compactKeys = [
    'draftType',
    'key',
    'capo',
    'tuning',
    'genre',
    'tempoBpm',
    'timeSignature',
    'groove',
    'performanceFeel',
    'vocalDelivery',
    'guitarPattern',
    'intro',
    'verse',
    'preChorus',
    'chorus',
    'bridge',
    'outro',
    'notes',
    'songsheetNotes',
    'generationHistory',
  ]

  return Object.fromEntries(
    compactKeys
      .map((key) => [key, record[key]])
      .filter(([, entryValue]) => {
        if (typeof entryValue === 'string') {
          return entryValue.trim()
        }

        if (typeof entryValue === 'number') {
          return Number.isFinite(entryValue)
        }

        return Boolean(entryValue)
      }),
  )
}


const getCompactSongSheetContext = (value: unknown) => {
  return getPlacedSongSheetLines(value).map((line) => ({
    section: line.section,
    lyric: line.lyric,
    chords: line.chords,
  }))
}


const getNextChordWorkflowAction = () => {
  const chordData = getChordDataFromEditorJson()
  const placedLines = getPlacedSongSheetLines(chordData)
  const guideTrackPlanRows = getGuideTrackPlanRows(chordData)
  const guideTrackSectionPlanRows = getGuideTrackSectionPlanRows(chordData)

  const hasChordDraft =
    Boolean(chordData) &&
    typeof chordData === 'object' &&
    !Array.isArray(chordData) &&
    Object.keys(chordData as Record<string, unknown>).length > 0

  const hasPlacedSongsheet = placedLines.length > 0
  const hasGuideTrackPlan = guideTrackPlanRows.length > 0
  const hasSectionPlan = guideTrackSectionPlanRows.length > 0
  const hasPreviewRequest = Boolean(audioPreviewPlan || audioPreviewRenderPrompt)
  const sourceMatch = getPlacedSongsheetSourceMatch()
const serverValidation = getSongsheetServerValidation()
const sourceCoverage = getPlacedSongsheetSourceCoverage()

const hasSongsheetReviewWarnings =
  sourceMatch.unmatchedCount > 0 ||
  serverValidation.rejectedLineCount > 0 ||
  sourceCoverage.missingLineCount > 0

  const isBusy =
    generatingChords ||
    generatingBasicChords ||
    generatingPlacedSongsheet ||
    generatingGuideTrackPlan ||
    requestingAudioPreview

  if (!performanceSheet.trim()) {
    return {
      label: 'Add lyrics first',
      disabled: true,
      action: null as (() => void) | null,
    }
  }

  if (isBusy) {
    return {
      label: 'Working...',
      disabled: true,
      action: null as (() => void) | null,
    }
  }

  if (!hasChordDraft) {
    return {
      label: 'Next: generate basic draft',
      disabled: false,
      action: () => {
        void generateBasicChords()
      },
    }
  }

  if (!hasPlacedSongsheet) {
    return {
      label: 'Next: generate placed songsheet',
      disabled: false,
      action: () => {
        void generatePlacedSongsheet()
      },
    }
  }

  if (!hasGuideTrackPlan || !hasSectionPlan) {
      return {
        label: hasSongsheetReviewWarnings
          ? 'Next: generate guide plan anyway'
          : 'Next: generate guide plan',
        disabled: false,
        action: () => {
          void generateGuideTrackPlan()
        },
      }
    }

  if (!hasPreviewRequest) {
    return {
      label: 'Next: request preview',
      disabled: false,
      action: () => {
        void requestAudioPreview()
      },
    }
  }

  return {
    label: 'Workflow complete',
    disabled: true,
    action: null as (() => void) | null,
  }
}



const getChordWorkflowStatus = () => {
  const chordData = getChordDataFromEditorJson()
  const intentRows = getPerformanceIntentRows(chordData)
  const placedLines = getPlacedSongSheetLines(chordData)
  const guideTrackPlanRows = getGuideTrackPlanRows(chordData)
  const guideTrackSectionPlanRows = getGuideTrackSectionPlanRows(chordData)

  const hasChordDraft =
    Boolean(chordData) &&
    typeof chordData === 'object' &&
    !Array.isArray(chordData) &&
    Object.keys(chordData as Record<string, unknown>).length > 0

  const hasPerformanceIntent = intentRows.length > 0
  const hasPlacedSongsheet = placedLines.length > 0
  const hasGuideTrackPlan = guideTrackPlanRows.length > 0
  const hasSectionPlan = guideTrackSectionPlanRows.length > 0
  const hasPreviewRequest = Boolean(audioPreviewPlan || audioPreviewRenderPrompt)
  const sourceMatch = getPlacedSongsheetSourceMatch()
    const serverValidation = getSongsheetServerValidation()
    const sourceCoverage = getPlacedSongsheetSourceCoverage()

    const hasSongsheetReviewWarnings =
      sourceMatch.unmatchedCount > 0 ||
      serverValidation.rejectedLineCount > 0 ||
      sourceCoverage.missingLineCount > 0
    const activeProcess =
    generatingChords
      ? 'Generating full chord draft...'
      : generatingBasicChords
        ? 'Generating basic chord draft...'
        : generatingPlacedSongsheet
          ? 'Generating placed songsheet...'
          : generatingGuideTrackPlan
            ? 'Generating guide track plan...'
            : requestingAudioPreview
              ? 'Requesting audio preview plan...'
              : ''
  const steps = [
    {
      label: 'Basic chord draft',
      complete: hasChordDraft,
      working: generatingBasicChords || generatingChords,
      detail:
        generatingBasicChords
          ? 'Generating basic chord draft...'
          : generatingChords
            ? 'Generating full chord draft...'
            : hasChordDraft
              ? 'Chord draft data is available.'
              : 'Start with Generate basic draft.',
        },
    {
      label: 'Performance intent',
      complete: hasPerformanceIntent,
      detail: hasPerformanceIntent
        ? 'Tempo, groove, feel, or delivery information is available.'
        : 'Generate a basic draft or full chord draft.',
    },
       
          {
          label: 'Placed songsheet',
              complete: hasPlacedSongsheet && !hasSongsheetReviewWarnings,
              working: generatingPlacedSongsheet,
              review: hasPlacedSongsheet && hasSongsheetReviewWarnings,
              detail: generatingPlacedSongsheet
                ? 'Generating placed songsheet...'
                : hasPlacedSongsheet && hasSongsheetReviewWarnings
                  ? 'Placed songsheet exists, but lyric match, validation, or coverage needs review.'
                  : hasPlacedSongsheet
                    ? `${placedLines.length} placed songsheet line${placedLines.length === 1 ? '' : 's'} available.`
                    : 'Use Generate placed songsheet after a chord draft exists.',
            },
         {
          label: 'Guide track plan',
          complete: hasGuideTrackPlan,
          working: generatingGuideTrackPlan,
          detail: generatingGuideTrackPlan
            ? 'Generating guide track plan...'
            : hasGuideTrackPlan
              ? 'Guide track plan rows are available.'
              : 'Use Generate guide plan after a chord draft exists.',
          },
    {
      label: 'Section plan',
      complete: hasSectionPlan,
      detail: hasSectionPlan
        ? `${guideTrackSectionPlanRows.length} section plan item${guideTrackSectionPlanRows.length === 1 ? '' : 's'} available.`
        : 'Generate guide plan to add section-level audio planning.',
    },
       {
          label: 'Preview requested',
          complete: hasPreviewRequest,
          working: requestingAudioPreview,
          detail: requestingAudioPreview
            ? 'Requesting audio preview plan...'
            : hasPreviewRequest
              ? 'Audio preview route has returned a preview plan.'
              : 'Request preview after the audio guide ingredients are ready.',
        },
  ]

  const completeCount = steps.filter((step) => step.complete).length

  const label =
    completeCount === steps.length
      ? 'Workflow complete'
      : completeCount >= 4
        ? 'Ready for preview'
        : completeCount >= 2
          ? 'In progress'
          : hasChordDraft
            ? 'Draft started'
            : 'Not started'

    return {
    label: activeProcess ? 'Working...' : label,
    detail: activeProcess || `${completeCount} of ${steps.length} workflow steps are complete.`,
    activeProcess,
    steps,
  }
}


const buildAudioGuideSummaryCopyText = () => {
  const chordData = getChordDataFromEditorJson()
  const intentRows = getPerformanceIntentRows(chordData)
  const readiness = getAudioGuideReadiness()
  const guideTrackPlanText = buildGuideTrackPlanCopyText()

  if (!chordData || intentRows.length === 0) {
    return ''
  }

  return [
    'AUDIO GUIDE SUMMARY',
    '',
    `Project: ${activeProject?.title || 'Untitled project'}`,
    `Song version: ${activeSongVersion?.title || songVersionTitle || 'Unsaved or untitled version'}`,
    `Chord version: ${chordVersionTitle || 'Unsaved or untitled chord version'}`,
    '',
    'READINESS',
    '',
    readiness.label,
    readiness.detail,
    '',
    'PERFORMANCE INTENT',
    '',
    ...intentRows.map((row) => `${row.label}: ${row.value}`),
    '',
    ...(guideTrackPlanText
      ? [
          'GUIDE TRACK PLAN',
          '',
          guideTrackPlanText
            .replace(/^GUIDE TRACK PLAN\s*/i, '')
            .trim(),
        ]
      : []),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')
}


const buildGuideTrackPlanCopyText = () => {
  const chordData = getChordDataFromEditorJson()
  const planRows = getGuideTrackPlanRows(chordData)
  const sectionRows = getGuideTrackSectionPlanRows(chordData)
  const intentRows = getPerformanceIntentRows(chordData)

  if (planRows.length === 0 && sectionRows.length === 0) {
    if (intentRows.length === 0) {
      return ''
    }

    return [
      'GUIDE TRACK PLAN',
      '',
      'Source: Performance intent fallback',
      'Purpose: Create a simple guide track that preserves tempo, groove, phrasing, chord timing, and vocal entry points.',
      'Instrumentation: Sparse acoustic guitar guide with optional light count-in, foot tap, or metronome.',
      'Vocal guide style: Simple guide melody or understated vocal reference only; not a polished lead vocal.',
      '',
      'PERFORMANCE INTENT REFERENCE',
      '',
      ...intentRows.map((row) => `${row.label}: ${row.value}`),
    ].join('\n')
  }

  return [
    'GUIDE TRACK PLAN',
    '',
    ...(planRows.length > 0
      ? [
          ...planRows.map((row) => `${row.label}: ${row.value}`),
          '',
        ]
      : []),
    ...(sectionRows.length > 0
      ? [
          'SECTION PLAN',
          '',
          ...sectionRows.flatMap((row) => [
            row.section,
            row.feel ? `Feel: ${row.feel}` : '',
            row.guitarApproach ? `Guitar: ${row.guitarApproach}` : '',
            row.vocalApproach ? `Vocal: ${row.vocalApproach}` : '',
            row.dynamicShape ? `Dynamics: ${row.dynamicShape}` : '',
            row.notes ? `Notes: ${row.notes}` : '',
            '',
          ]),
        ]
      : []),
  ]
    .filter((line, index, lines) => {
      if (line !== '') {
        return true
      }

      return lines[index - 1] !== ''
    })
    .join('\n')
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

const fixOutOfRangeChordPlacements = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return
  }

  const record = chordData as Record<string, unknown>
  const lines = getPlacedSongSheetLines(record)

  if (lines.length === 0) {
    return
  }

  const fixedLines = lines.map((line) => {
    const maxIndex = Math.max(0, line.lyric.length - 1)

    return {
      ...line,
      chords: line.chords.map((placement) => ({
        ...placement,
        charIndex: Math.min(placement.charIndex, maxIndex),
      })),
    }
  })

  const nextRecord = {
    ...record,
    songSheetLines: fixedLines,
  }

  setChords(nextRecord)
  setChordsText(JSON.stringify(nextRecord, null, 2))
  resetAudioPreviewRequestState()
  setActiveChordVersionId(null)
  setLastAppliedTransposeSnapshot(null)
  setChordExtractionMessage('After-lyric chord placements moved to the final lyric character. Review the phrasing before saving.')
  setProjectMessage('')
}

const getPerformanceIntentRows = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>

  const fields = [
    ['Tempo', record.tempoBpm ? `${record.tempoBpm} BPM` : ''],
    ['Time signature', record.timeSignature],
    ['Groove', record.groove],
    ['Performance feel', record.performanceFeel],
    ['Phrasing notes', record.phrasingNotes],
    ['Vocal delivery', record.vocalDelivery],
    ['Guitar pattern', record.guitarPattern],
  ]

  return fields
    .map(([label, rawValue]) => {
      const value =
        typeof rawValue === 'string' || typeof rawValue === 'number'
          ? String(rawValue).trim()
          : ''

      return {
        label: String(label),
        value,
      }
    })
    .filter((row) => row.value)
}

const getGuideTrackPlanRows = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>
  const guideTrackPlan = record.guideTrackPlan

  if (
    !guideTrackPlan ||
    typeof guideTrackPlan !== 'object' ||
    Array.isArray(guideTrackPlan)
  ) {
    return []
  }

  const plan = guideTrackPlan as Record<string, unknown>

  const fields = [
    ['Purpose', plan.purpose],
    ['Count-in', plan.countIn],
    ['Instrumentation', plan.instrumentation],
    ['Guitar tone', plan.guitarTone],
    ['Rhythm reference', plan.rhythmReference],
    ['Vocal guide style', plan.vocalGuideStyle],
  ]

  return fields
    .map(([label, rawValue]) => {
      const value =
        typeof rawValue === 'string' || typeof rawValue === 'number'
          ? String(rawValue).trim()
          : ''

      return {
        label: String(label),
        value,
      }
    })
    .filter((row) => row.value)
}

const getGuideTrackSectionPlanRows = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>
  const guideTrackPlan = record.guideTrackPlan

  if (
    !guideTrackPlan ||
    typeof guideTrackPlan !== 'object' ||
    Array.isArray(guideTrackPlan)
  ) {
    return []
  }

  const plan = guideTrackPlan as Record<string, unknown>
  const sectionPlan = plan.sectionPlan

  if (!Array.isArray(sectionPlan)) {
    return []
  }

  return sectionPlan
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null
      }

      const section = entry as Record<string, unknown>

      return {
        section: getStringValue(section.section) || 'Untitled section',
        feel: getStringValue(section.feel),
        guitarApproach: getStringValue(section.guitarApproach),
        vocalApproach: getStringValue(section.vocalApproach),
        dynamicShape: getStringValue(section.dynamicShape),
        notes: getStringValue(section.notes),
      }
    })
    .filter((row): row is {
      section: string
      feel: string
      guitarApproach: string
      vocalApproach: string
      dynamicShape: string
      notes: string
    } => Boolean(row))
}





const getChordRoot = (chord: string) => {
  const match = chord.trim().match(/^([A-G](?:#|b)?)/)

  return match ? match[1] : ''
}

const getSongSheetChordRoots = (value: unknown) => {
  const lines = getPlacedSongSheetLines(value)

  return Array.from(
    new Set(
      lines
        .flatMap((line) => line.chords.map((placement) => placement.chord))
        .map(getChordRoot)
        .filter(Boolean),
    ),
  )
}

const normalizeChordSymbol = (value: string) => {
  return value.trim().replace(/\s+/g, '')
}

const getSongSheetChordSymbols = (value: unknown) => {
  const lines = getPlacedSongSheetLines(value)

  return Array.from(
    new Set(
      lines
        .flatMap((line) => line.chords.map((placement) => placement.chord))
        .map(normalizeChordSymbol)
        .filter(Boolean),
    ),
  )
}


const getKeyChordConsistency = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      label: 'No key check available',
      detail: 'No chord JSON is available.',
      warning: '',
    }
  }

  const record = value as Record<string, unknown>
  const keyValue = getStringValue(record.key)
  const chordSymbols = getSongSheetChordSymbols(record)

  if (!keyValue || chordSymbols.length === 0) {
    return {
      label: 'No key check available',
      detail: 'Key or placed songsheet chords are missing.',
      warning: '',
    }
  }

  const normalizedKey = normalizeChordSymbol(keyValue)
  const keyRoot = getChordRoot(normalizedKey)
  const chordRoots = Array.from(
    new Set(chordSymbols.map(getChordRoot).filter(Boolean)),
  )

  const exactKeyChordAppears = chordSymbols.includes(normalizedKey)
  const keyRootAppears = chordRoots.includes(keyRoot)

  if (!exactKeyChordAppears) {
    return {
      label: 'Key metadata may not match chord symbols',
      detail: `Key metadata is ${keyValue}, but the placed songsheet chords are: ${chordSymbols.join(', ')}.`,
      warning: keyRootAppears
        ? 'The key root appears in the chords, but the exact key chord does not. Changing the key field only changes metadata; use transpose controls to change actual chord symbols.'
        : 'The key root does not appear in the placed songsheet chords. Changing the key field only changes metadata; use transpose controls to change actual chord symbols.',
    }
  }

  return {
    label: 'Key metadata appears consistent with songsheet chords',
    detail: `Key metadata is ${keyValue}. The placed songsheet includes ${normalizedKey}.`,
    warning: '',
  }
}


const isSourceLyricContentLine = (line: string) => {
  const trimmed = line.trim()

  if (!trimmed) {
    return false
  }

  if (/^\[[^\]]+\]$/.test(trimmed)) {
    return false
  }

  if (/^\{[^}]+:[^}]*\}$/.test(trimmed)) {
    return false
  }

  if (/^(intro|verse|verse\s+\d+|chorus|pre-chorus|prechorus|bridge|outro|tag|breakdown|final chorus)$/i.test(trimmed)) {
    return false
  }

  return true
}


const normalizeLyricMatchText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const getPlacedSongsheetSourceCoverage = () => {
    if (generatingBasicChords || generatingChords) {
      return {
        label: 'Waiting for chord draft',
        detail:
          'A new chord draft is being generated. Source lyric coverage will update after a placed songsheet exists.',
        sourceLineCount: 0,
        coveredLineCount: 0,
        missingLineCount: 0,
        missingLines: [],
        isChecking: true,
      }
    }

    if (generatingPlacedSongsheet) {
      return {
        label: 'Checking after generation',
        detail:
          'A new placed songsheet is being generated. Source lyric coverage will update when it completes.',
        sourceLineCount: 0,
        coveredLineCount: 0,
        missingLineCount: 0,
        missingLines: [],
        isChecking: true,
      }
    }
  const chordData = getChordDataFromEditorJson()
  const placedLines = getPlacedSongSheetLines(chordData)

  const sourceLines = performanceSheet
      .split('\n')
      .map((line) => line.trim())
      .filter(isSourceLyricContentLine)

  const placedLyricSet = new Set(
    placedLines
      .map((line) => normalizeLyricMatchText(line.lyric))
      .filter(Boolean),
  )

  const missingLines = sourceLines.filter((line) => {
    const normalizedLine = normalizeLyricMatchText(line)

    if (!normalizedLine) {
      return false
    }

    return !placedLyricSet.has(normalizedLine)
  })

  const sourceLineCount = sourceLines.length
  const coveredLineCount = Math.max(0, sourceLineCount - missingLines.length)

  const label =
    sourceLineCount === 0
      ? 'No source lyrics to check'
      : missingLines.length === 0
        ? 'Placed songsheet covers source lyrics'
        : 'Placed songsheet may be incomplete'

  const detail =
    sourceLineCount === 0
      ? 'Add lyrics before checking songsheet coverage.'
      : `${coveredLineCount} of ${sourceLineCount} source lyric line${
          sourceLineCount === 1 ? '' : 's'
        } are covered by the placed songsheet.`

  return {
    label,
    detail,
    sourceLineCount,
    coveredLineCount,
    missingLineCount: missingLines.length,
    missingLines: missingLines.slice(0, 10),
    isChecking: false,
  }
}


const getSongsheetServerValidation = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return {
      hasValidation: false,
      sourceLineCount: 0,
      acceptedLineCount: 0,
      rejectedLineCount: 0,
      rejectedLines: [] as string[],
    }
  }

  const record = chordData as Record<string, unknown>
  const validation = record.songsheetValidation

  if (!validation || typeof validation !== 'object' || Array.isArray(validation)) {
    return {
      hasValidation: false,
      sourceLineCount: 0,
      acceptedLineCount: 0,
      rejectedLineCount: 0,
      rejectedLines: [] as string[],
    }
  }

  const validationRecord = validation as Record<string, unknown>

  const sourceLineCount =
    typeof validationRecord.sourceLineCount === 'number'
      ? validationRecord.sourceLineCount
      : 0

  const acceptedLineCount =
    typeof validationRecord.acceptedLineCount === 'number'
      ? validationRecord.acceptedLineCount
      : 0

  const rejectedLineCount =
    typeof validationRecord.rejectedLineCount === 'number'
      ? validationRecord.rejectedLineCount
      : 0

  const rejectedLines = Array.isArray(validationRecord.rejectedLines)
    ? validationRecord.rejectedLines.filter(
        (line): line is string => typeof line === 'string',
      )
    : []

  return {
    hasValidation: true,
    sourceLineCount,
    acceptedLineCount,
    rejectedLineCount,
    rejectedLines,
  }
}


const getPlacedSongsheetSourceMatch = () => {
   if (generatingBasicChords || generatingChords) {
  return {
    label: 'Waiting for chord draft',
    detail:
      'A new chord draft is being generated. Source lyric matching will update after a placed songsheet exists.',
    checkedCount: 0,
    unmatchedCount: 0,
    unmatchedLines: [],
    isChecking: true,
  }
}

if (generatingPlacedSongsheet) {
  return {
    label: 'Checking after generation',
    detail:
      'A new placed songsheet is being generated. Source lyric matching will update when it completes.',
    checkedCount: 0,
    unmatchedCount: 0,
    unmatchedLines: [],
    isChecking: true,
  }
}
  const chordData = getChordDataFromEditorJson()
  const placedLines = getPlacedSongSheetLines(chordData)

  const sourceLines = performanceSheet
      .split('\n')
      .map((line) => line.trim())
      .filter(isSourceLyricContentLine)

  const normalizedSourceLines = new Set(
    sourceLines.map((line) => normalizeLyricMatchText(line)).filter(Boolean),
  )

  const lyricLines = placedLines.filter((line) => line.lyric.trim())

  const unmatchedLines = lyricLines.filter((line) => {
    const normalizedLyric = normalizeLyricMatchText(line.lyric)

    if (!normalizedLyric) {
      return false
    }

    return !normalizedSourceLines.has(normalizedLyric)
  })

  const checkedCount = lyricLines.length
  const unmatchedCount = unmatchedLines.length

  const label =
    checkedCount === 0
      ? 'No placed lyric lines to check'
      : unmatchedCount === 0
        ? 'Songsheet lyrics match source'
        : 'Songsheet may contain rewritten lines'

  const detail =
    checkedCount === 0
      ? 'Generate a placed songsheet to check source lyric matching.'
      : unmatchedCount === 0
        ? `${checkedCount} placed lyric line${checkedCount === 1 ? '' : 's'} match the source lyrics.`
        : `${unmatchedCount} of ${checkedCount} placed lyric line${checkedCount === 1 ? '' : 's'} were not found in the source lyrics.`

  return {
    label,
    detail,
    checkedCount,
    unmatchedCount,
    unmatchedLines: unmatchedLines.slice(0, 8),
    isChecking: false,
  }
}

const getPlacedSongSheetQuality = () => {
  const chordData = getChordDataFromEditorJson()
  const lines = getPlacedSongSheetLines(chordData)

  if (lines.length === 0) {
    return {
      label: 'No placed songsheet',
      detail: 'No chord-over-lyric placement data is available yet.',
      totalLines: 0,
      linesWithChords: 0,
      linesWithoutChords: 0,
      totalChords: 0,
      zeroIndexChords: 0,
      outOfRangeChords: 0,
      placementIssues: [],
      warning: '',
    }
  }

  const totalChords = lines.reduce(
    (count, line) => count + line.chords.length,
    0,
  )

  const zeroIndexChords = lines.reduce(
    (count, line) =>
      count +
      line.chords.filter((placement) => placement.charIndex === 0).length,
    0,
  )

  const placementIssues = lines.flatMap((line, lineIndex) => {
    const maxIndex = Math.max(0, line.lyric.length - 1)

    return line.chords
      .filter((placement) => placement.charIndex > maxIndex)
      .map((placement) => ({
        lineNumber: lineIndex + 1,
        section: line.section || 'Unsectioned',
        lyric: line.lyric,
        chord: placement.chord,
        charIndex: placement.charIndex,
        maxIndex,
      }))
  })

  const outOfRangeChords = placementIssues.length

  const linesWithChords = lines.filter((line) => line.chords.length > 0).length
  const linesWithoutChords = lines.length - linesWithChords

  const zeroIndexRatio =
    totalChords > 0 ? Math.round((zeroIndexChords / totalChords) * 100) : 0

  const warnings = [
    totalChords > 0 && zeroIndexRatio >= 80
      ? 'Most chords are placed at the start of the line. The songsheet may need more natural phrasing placement.'
      : '',
    outOfRangeChords > 0
      ? `${outOfRangeChords} chord placement${outOfRangeChords === 1 ? '' : 's'} occur after the final lyric character on a line. This may be intentional as a turnaround, held chord, pickup, breath, or instrumental movement. Review against the intended performance.`
      : '',
      ].filter(Boolean)

  const warning = warnings.join(' ')

  return {
    label: warning ? 'Needs review' : 'Placed songsheet ready',
    detail: `${linesWithChords} of ${lines.length} lyric line${lines.length === 1 ? '' : 's'} include chord placements.`,
    totalLines: lines.length,
    linesWithChords,
    linesWithoutChords,
    totalChords,
    zeroIndexChords,
    outOfRangeChords,
    placementIssues,
    warning,
  }
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


const getOriginalKeyLabel = () => {
  const chordData = getChordDataFromEditorJson()

  if (!chordData || typeof chordData !== 'object' || Array.isArray(chordData)) {
    return ''
  }

  const record = chordData as Record<string, unknown>

  return getStringValue(record.key)
}

const getDisplayedKeyLabel = () => {
  const originalKey = getOriginalKeyLabel()

  if (!originalKey) {
    return ''
  }

  return transposeChordSymbol(originalKey, chordTransposeSemitones)
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

    const intentRows = getPerformanceIntentRows(chordData)

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
      ...getSongsheetTransposeCopyRows(),
      '',
      ...(intentRows.length > 0
        ? [
            'PERFORMANCE INTENT',
            '',
            ...intentRows.map((row) => `${row.label}: ${row.value}`),
            '',
          ]
        : []),
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


const buildCompactPlacedSongSheetCopyText = () => {
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

  return renderedLines
    .filter((line, index, linesToFilter) => {
      if (line !== '') {
        return true
      }

      return linesToFilter[index - 1] !== ''
    })
    .join('\n')
}

const buildAudioGuideReadinessCopyText = () => {
  const readiness = getAudioGuideReadiness()

  return [
    'AUDIO GUIDE READINESS',
    '',
    readiness.label,
    readiness.detail,
    '',
    ...readiness.checks.flatMap((check) => [
      `${check.passed ? 'Available' : 'Needs attention'}: ${check.label}`,
      check.detail,
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


const getAudioGuideReadiness = () => {
  const chordData = getChordDataFromEditorJson()
  const intentRows = getPerformanceIntentRows(chordData)
  const guideTrackPlanRows = getGuideTrackPlanRows(chordData)
  const guideTrackSectionPlanRows = getGuideTrackSectionPlanRows(chordData)
  const placedLines = getPlacedSongSheetLines(chordData)

  const hasTempo = intentRows.some((row) => row.label === 'Tempo')
  const hasGroove = intentRows.some((row) => row.label === 'Groove')
  const hasPerformanceIntent = intentRows.length > 0
  const hasGuideTrackPlan = guideTrackPlanRows.length > 0
  const hasSectionPlan = guideTrackSectionPlanRows.length > 0
  const hasPlacedSongsheet = placedLines.length > 0

  const checks = [
    {
      label: 'Performance intent',
      passed: hasPerformanceIntent,
      detail: hasPerformanceIntent
        ? 'Tempo, feel, phrasing, or delivery information is available.'
        : 'Generate chords with performance intent.',
    },
    {
      label: 'Tempo',
      passed: hasTempo,
      detail: hasTempo
        ? 'Tempo is available for guide-track timing.'
        : 'Tempo is missing.',
    },
    {
      label: 'Groove',
      passed: hasGroove,
      detail: hasGroove
        ? 'Groove is available for rhythmic feel.'
        : 'Groove is missing.',
    },
    {
      label: 'Placed songsheet',
      passed: hasPlacedSongsheet,
      detail: hasPlacedSongsheet
        ? `${placedLines.length} songsheet line${placedLines.length === 1 ? '' : 's'} available.`
        : 'Chord-over-lyric placement data is missing.',
    },
    {
      label: 'Guide track plan',
      passed: hasGuideTrackPlan,
      detail: hasGuideTrackPlan
        ? 'Structured guide-track plan is available.'
        : 'Using fallback guide plan from performance intent if available.',
    },
    {
      label: 'Section plan',
      passed: hasSectionPlan,
      detail: hasSectionPlan
        ? `${guideTrackSectionPlanRows.length} section plan item${guideTrackSectionPlanRows.length === 1 ? '' : 's'} available.`
        : 'Section-by-section guide-track plan is missing.',
    },
  ]

  const passedCount = checks.filter((check) => check.passed).length

  const label =
    passedCount >= 5
      ? 'Ready for audio guide'
      : passedCount >= 3
        ? 'Partly ready'
        : 'Not ready yet'

  return {
    label,
    detail: `${passedCount} of ${checks.length} audio guide ingredients are available.`,
    checks,
  }
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
const audioGuidePromptPreview = buildAudioGuidePromptCopyText()
const performanceDesignNotesPreview = buildPerformanceDesignNotesCopyText()
const guideTrackPlanPreview = buildGuideTrackPlanCopyText()
const audioGuideSummaryPreview = buildAudioGuideSummaryCopyText()

const audioPreviewSpecPreview = buildAudioPreviewSpecCopyText()
const audioPreviewSpecStatus = getAudioPreviewSpecStatus()
const audioGuideReadiness = getAudioGuideReadiness()
const chordWorkflowStatus = getChordWorkflowStatus()
const nextChordWorkflowAction = getNextChordWorkflowAction()
const songsheetReviewSummaryLine = getSongsheetReviewSummaryLine()
const audioPreviewHandoffStatus = getAudioPreviewHandoffStatus()
const fullPackAudioPreviewStatus = getFullPackAudioPreviewStatus()

const audioPreviewChecklist = getAudioPreviewChecklist()
const audioPreviewChecklistSummary = getAudioPreviewChecklistSummary()
const audioPreviewPipelineStatus = getAudioPreviewPipelineStatus()

const audioPreviewRendererPayloadSummary = getAudioPreviewRendererPayloadSummary()
const audioPreviewDryRunPlanSummary = getAudioPreviewDryRunPlanSummary()
const audioPreviewDryRunTimelineRows = getAudioPreviewDryRunTimelineRows()
const audioPreviewDryRunCueSheetRows = getAudioPreviewDryRunCueSheetRows()
const dryRunRenderManifestSummary = getDryRunRenderManifestSummary()
const dryRunRendererContractSummary = getDryRunRendererContractSummary()
const dryRunExpectedOutputRows = getDryRunExpectedOutputRows()
const audioPreviewReadinessSummary = getAudioPreviewReadinessSummary()
const dryRunRealRenderReadinessSummary =
  getDryRunRealRenderReadinessSummary()
  const dryRunRenderTargetRows = getDryRunRenderTargetRows()
  const dryRunGuideTrackRenderRecipeSummary =
  getDryRunGuideTrackRenderRecipeSummary()
  const dryRunClickTrackRenderRecipeSummary =
  getDryRunClickTrackRenderRecipeSummary()
  const dryRunChordReferenceRenderRecipeSummary =
  getDryRunChordReferenceRenderRecipeSummary()
  const vocalGuideRenderRecipeSummary =
  getDryRunVocalGuideRenderRecipeSummary()

  const dryRunVocalGuideRenderRecipeSummary =
  getDryRunVocalGuideRenderRecipeSummary()
const dryRunExpectedOutputFileRows = getDryRunExpectedOutputFileRows()
const dryRunRendererInputContractSummary =
  getDryRunRendererInputContractSummary()
const dryRunRealRenderGateSummary = getDryRunRealRenderGateSummary()
const dryRunFirstRealRenderPlanSummary =
  getDryRunFirstRealRenderPlanSummary()
  const realRenderRouteScaffoldSummary =
  getDryRunRealRenderRouteScaffoldSummary()
  const realRenderConfigurationSummary =
  getDryRunRealRenderConfigurationSummary()
  const dryRunRealRenderRouteScaffoldSummary =
  getDryRunRealRenderRouteScaffoldSummary()
const showRealRenderBlockedBanner =
  dryRunRealRenderReadinessSummary.readyForRealRender === false &&
  dryRunRealRenderReadinessSummary.readinessStatus ===
    'blocked-until-renderer-connected'
const audioPreviewResultStatus = getAudioPreviewResultStatus()

const chordGenerationMetaRows = getChordGenerationMetaRows()
const chordGenerationHistorySummary = getChordGenerationHistorySummary()
const chordGenerationHistoryRows = getChordGenerationHistoryRows()
const chordGenerationUsageWarning = getChordGenerationUsageWarning()

const placedSongSheetQuality = getPlacedSongSheetQuality()
const placedSongsheetSourceMatch = getPlacedSongsheetSourceMatch()
const songsheetServerValidation = getSongsheetServerValidation()
const placedSongsheetSourceCoverage = getPlacedSongsheetSourceCoverage()

const performanceIntentRows = getPerformanceIntentRows(
  getChordDataFromEditorJson(),
)
const guideTrackPlanRows = getGuideTrackPlanRows(getChordDataFromEditorJson())
const guideTrackSectionPlanRows = getGuideTrackSectionPlanRows(
  getChordDataFromEditorJson(),
)

const keyChordConsistency = getKeyChordConsistency(getChordDataFromEditorJson())

const fullPerformancePackPreview = buildFullPerformancePackCopyText()

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

const generateGuideTrackPlan = async () => {
  if (!performanceSheet.trim()) {
    setChordExtractionMessage('Add lyrics before generating a guide track plan.')
    return
  }

  const chordData = getUsableChordDataFromEditor()

  const compactChordContext = getCompactChordContext(chordData)
  const compactSongSheetContext = getCompactSongSheetContext(chordData)

  if (!chordData) {
    setChordExtractionMessage(
      'Generate or load a chord draft before generating a guide track plan.',
    )
    return
  }

  setGeneratingGuideTrackPlan(true)
  setChordExtractionMessage('Generating guide track plan...')
  setProjectMessage('')

  try {
    const response = await fetch('/api/chords/guide-track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          lyrics: performanceSheet,
          chordData: {
            ...(compactChordContext || {}),
            songSheetLines: compactSongSheetContext,
          },
          songTitle: activeProject?.title || '',
          songVersionTitle: activeSongVersion?.title || songVersionTitle || '',
        }),
    })

    const result = await response.json()

    if (!response.ok) {
      setChordExtractionMessage(
        typeof result.error === 'string'
          ? result.error
          : 'Could not generate guide track plan.',
      )
      return
    }

    setChords(result)
    setChordsText(JSON.stringify(result, null, 2))
    setActiveChordVersionId(null)
    setChordVersionTitle((currentTitle) => {
      const baseTitle = currentTitle
        .trim()
        .replace(/\s+with songsheet and guide plan$/i, '')
        .replace(/\s+with guide plan$/i, '')
        .replace(/\s+with songsheet$/i, '')
        .trim()

      return `${baseTitle || 'Basic chord draft'} with songsheet and guide plan`
    })
    setChordTransposeSemitones(0)
    setLastAppliedTransposeSnapshot(null)
    resetAudioPreviewRequestState()
    setChordExtractionMessage('Guide track plan generated.')
  } catch {
    setChordExtractionMessage('Could not generate guide track plan.')
  } finally {
    setGeneratingGuideTrackPlan(false)
  }
}



const generatePlacedSongsheet = async () => {
  if (!performanceSheet.trim()) {
    setChordExtractionMessage('Add lyrics before generating a placed songsheet.')
    return
  }

  const chordData = getUsableChordDataFromEditor()

  if (!chordData) {
    setChordExtractionMessage(
      'Generate or load a chord draft before generating a placed songsheet.',
    )
    return
  }

  setGeneratingPlacedSongsheet(true)
  setChordExtractionMessage('Generating placed songsheet...')
  setProjectMessage('')

  try {
    const response = await fetch('/api/chords/songsheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          lyrics: performanceSheet,
          chordData: getCompactChordContext(chordData) || chordData,
          songTitle: activeProject?.title || '',
          songVersionTitle: activeSongVersion?.title || songVersionTitle || '',
        }),
    })

    const result = await response.json()

    if (!response.ok) {
      setChordExtractionMessage(
        typeof result.error === 'string'
          ? result.error
          : 'Could not generate placed songsheet.',
      )
      return
    }

    setChords(result)
    setChordsText(JSON.stringify(result, null, 2))
    setActiveChordVersionId(null)
    setChordVersionTitle((currentTitle) => {
  const baseTitle = currentTitle
    .trim()
    .replace(/\s+with songsheet and guide plan$/i, '')
    .replace(/\s+with guide plan$/i, '')
    .replace(/\s+with songsheet$/i, '')
    .trim()

  return `${baseTitle || 'Basic chord draft'} with songsheet`
})
    setChordTransposeSemitones(0)
    setLastAppliedTransposeSnapshot(null)
    resetAudioPreviewRequestState()
    setChordExtractionMessage('Placed songsheet generated.')
  } catch {
    setChordExtractionMessage('Could not generate placed songsheet.')
  } finally {
    setGeneratingPlacedSongsheet(false)
  }
}


const generateBasicChords = async () => {
  if (!performanceSheet.trim()) {
    setChordExtractionMessage('Add lyrics before generating a basic chord draft.')
    return
  }

  setGeneratingBasicChords(true)
  setChordExtractionMessage('Generating basic chord draft...')
  setProjectMessage('')

  try {
    const response = await fetch('/api/chords/basic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lyrics: performanceSheet,
        songTitle: activeProject?.title || '',
        songVersionTitle: activeSongVersion?.title || songVersionTitle || '',
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setChordExtractionMessage(
        typeof result.error === 'string'
          ? result.error
          : 'Could not generate basic chord draft.',
      )
      return
    }

    setChords(result)
    setChordsText(JSON.stringify(result, null, 2))
    setChordVersionTitle('Basic chord draft')
    setActiveChordVersionId(null)
    setChordTransposeSemitones(0)
    setLastAppliedTransposeSnapshot(null)
    resetAudioPreviewRequestState()
    setChordExtractionMessage('Basic chord draft generated.')
  } catch {
    setChordExtractionMessage('Could not generate basic chord draft.')
  } finally {
    setGeneratingBasicChords(false)
  }
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
    setLastAppliedTransposeSnapshot(null)
    setChordTransposeSemitones(0)
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
  setLastAppliedTransposeSnapshot(null)
  setSubmittingAudioPreviewRender(false)
  setAudioPreviewRenderMessage('')
  setAudioPreviewRenderJob(null)
  setAudioPreviewRenderResponse('')
  setAudioPreviewDryRunRenderPlan(null)
  setDryRunRenderPlanValidation(null)
  setDryRunRenderManifest(null)
  setDryRunRenderManifestValidation(null)
  setDryRunHandoffBundle(null)
  setDryRunHandoffBundleValidation(null)
  setDryRunArtifactPackage(null)
  setDryRunArtifactPackageValidation(null)
  setDryRunCueSheetValidation(null)
 

  setAudioPreviewMessage('')
  setAudioPreviewResponse('')
  setAudioPreviewPlan(null)
  setAudioPreviewRenderPrompt('')
  setAudioPreviewRenderSteps([])
  setAudioPreviewSectionGuideText('')
  setAudioPreviewMeta(null)
  setAudioPreviewRendererPayload(null)
  setAudioPreviewRendererPayloadValidation(null)

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
    setLastAppliedTransposeSnapshot(null)
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
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Performance intent
      </div>

      <button
        type="button"
        onClick={() => copyPerformanceIntent()}
        disabled={performanceIntentRows.length === 0}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {justCopiedPerformanceIntent ? 'Copied ✓' : 'Copy intent'}
      </button>
    </div>

  {performanceIntentRows.length > 0 ? (
    <div className="mt-3 space-y-3">
      {performanceIntentRows.map((row) => (
        <div
          key={row.label}
          className="rounded border border-gray-800 bg-gray-900 p-3"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {row.label}
          </div>
          <div className="mt-1 text-sm leading-6 text-gray-200">
            {row.value}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-2 text-sm text-gray-500">
      No performance intent yet. Generate chords to include tempo, groove, phrasing, vocal delivery, and guitar pattern.
    </p>
  )}
</div>

<div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
    Key and chord consistency
  </div>

  <div className="mt-1 text-sm text-gray-200">
    {keyChordConsistency.label}
  </div>

  <div className="mt-1 text-xs leading-5 text-gray-500">
    {keyChordConsistency.detail}
  </div>

  {keyChordConsistency.warning && (
    <div className="mt-2 rounded border border-yellow-900/60 bg-yellow-950/30 p-2 text-xs text-yellow-200">
      {keyChordConsistency.warning}
    </div>
  )}
</div>


<div className="rounded border border-gray-800 bg-gray-950 p-4">
  <div className="flex items-center justify-between gap-3">
      <div className="flex items-center justify-between gap-3">
  <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
    Guide track plan
  </div>

  <button
    type="button"
    onClick={() => copyGuideTrackPlan()}
    disabled={!guideTrackPlanPreview}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
  >
    {justCopiedGuideTrackPlan ? 'Copied ✓' : 'Copy guide plan'}
  </button>
</div>

      <button
        type="button"
        onClick={() => copyGuideTrackPlan()}
        disabled={!guideTrackPlanPreview}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {justCopiedGuideTrackPlan ? 'Copied ✓' : 'Copy guide plan'}
      </button>
    </div>

  {guideTrackPlanRows.length > 0 || guideTrackSectionPlanRows.length > 0 ? (
    <div className="mt-3 space-y-4">
      {guideTrackPlanRows.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {guideTrackPlanRows.map((row) => (
            <div
              key={row.label}
              className="rounded border border-gray-800 bg-gray-900 p-3"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {row.label}
              </div>
              <div className="mt-1 text-sm leading-6 text-gray-200">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {guideTrackSectionPlanRows.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Section plan
          </div>

          {guideTrackSectionPlanRows.map((row, index) => (
            <div
              key={`${row.section}-${index}`}
              className="rounded border border-gray-800 bg-gray-900 p-3"
            >
              <div className="font-medium text-gray-200">
                {row.section}
              </div>

              <div className="mt-2 space-y-1 text-sm leading-6 text-gray-400">
                {row.feel && <div>Feel: {row.feel}</div>}
                {row.guitarApproach && (
                  <div>Guitar: {row.guitarApproach}</div>
                )}
                {row.vocalApproach && (
                  <div>Vocal: {row.vocalApproach}</div>
                )}
                {row.dynamicShape && (
                  <div>Dynamics: {row.dynamicShape}</div>
                )}
                {row.notes && <div>Notes: {row.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : (
    <p className="mt-2 text-sm text-gray-500">
      No guide track plan yet. Generate chords to include a structured plan for a future audio guide.
    </p>
  )}
</div>

<div className="rounded border border-gray-800 bg-gray-950 p-4">
 <div className="flex items-center justify-between gap-3">
  <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
    Audio guide readiness
  </div>

  <div className="flex flex-wrap items-center justify-end gap-2">
    <button
      type="button"
      onClick={() => copyAudioGuideSummary()}
      disabled={!audioGuideSummaryPreview}
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {justCopiedAudioGuideSummary ? 'Copied ✓' : 'Copy audio summary'}
    </button>

    <button
      type="button"
      onClick={() => copyAudioPreviewSpec()}
      disabled={!audioPreviewSpecPreview}
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {justCopiedAudioPreviewSpec ? 'Copied ✓' : 'Copy preview spec'}
    </button>


   <div
      className={`w-full rounded border px-3 py-2 text-xs leading-5 ${
        audioPreviewHandoffStatus.tone === 'ready'
          ? 'border-green-900 bg-green-950/20 text-green-100'
          : audioPreviewHandoffStatus.tone === 'review'
            ? 'border-yellow-900 bg-yellow-950/20 text-yellow-100'
            : 'border-gray-800 bg-gray-950 text-gray-400'
      }`}
    >
      <div className="font-medium">
        {audioPreviewHandoffStatus.label}
      </div>
      <div className="mt-1">
        {audioPreviewHandoffStatus.detail}
      </div>
    </div>


    {renderAudioPreviewReadinessCard()}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {audioPreviewChecklist.map((item) => (
          <div
            key={item.label}
            className="rounded border border-gray-800 bg-gray-900 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-gray-200">
                {item.label}
              </div>

              <div
                className={`text-xs ${
                  item.complete ? 'text-green-300' : 'text-yellow-300'
                }`}
              >
                {item.complete ? 'Done' : 'Needed'}
              </div>
            </div>

            <div className="mt-1 text-xs leading-5 text-gray-500">
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </div>

    <button
      type="button"
      onClick={() => requestAudioPreview()}
      disabled={!audioPreviewSpecPreview || requestingAudioPreview}
      className="rounded border border-blue-700 px-3 py-1 text-xs font-medium text-blue-200 hover:bg-blue-950 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
    >
      {requestingAudioPreview ? 'Requesting...' : 'Request preview'}
    </button>

    <button
      type="button"
      onClick={() => clearAudioPreviewOutput()}
      disabled={
        !audioPreviewResponse &&
        !audioPreviewPlan &&
        !audioPreviewRenderPrompt &&
        audioPreviewRenderSteps.length === 0 &&
        !audioPreviewSongSheetText &&
        !audioPreviewSectionGuideText &&
        !audioPreviewRendererPayload &&
        !audioPreviewRendererPayloadValidation &&
        !audioPreviewMeta
      }
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      Clear preview output
    </button>

  </div>
</div>

  <div className="mt-2 text-gray-300">
    {audioGuideReadiness.label}
  </div>

  <div className="mt-1 text-sm text-gray-500">
    {audioGuideReadiness.detail}
  </div>

  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-gray-200">
          Audio preview spec
        </div>

        <div
          className={`text-xs ${
            audioPreviewSpecStatus.isValid ? 'text-green-300' : 'text-yellow-300'
          }`}
        >
          {audioPreviewSpecStatus.isValid ? 'Valid JSON' : 'Not ready'}
        </div>
      </div>

      <div className="mt-1 text-xs leading-5 text-gray-500">
        {audioPreviewSpecStatus.label}
      </div>

      <div className="mt-1 text-xs leading-5 text-gray-500">
        {audioPreviewSpecStatus.detail}
      </div>

      {audioPreviewMessage ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
    <div className="text-sm font-medium text-gray-200">
      Audio preview request
    </div>

    <div className="mt-1 text-xs leading-5 text-gray-500">
      {audioPreviewMessage}
    </div>

    {audioPreviewPlan ? (
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {[
          ['Render mode', getPreviewPlanValue('renderMode')],
          ['Render status', getPreviewPlanValue('renderStatus')],
          ['Key', getPreviewPlanValue('key')],
          ['Tempo', getPreviewPlanValue('tempo')],
          ['Instrumentation', getPreviewPlanValue('instrumentation')],
          ['Count-in', getPreviewPlanValue('countIn')],
          ['Songsheet lines', getPreviewPlanValue('songsheetLineCount')],
          ['Section plans', getPreviewPlanValue('sectionPlanCount')],
        ]
          .filter((row) => row[1])
          .map(([label, value]) => (
            <div
              key={label}
              className="rounded border border-gray-800 bg-gray-950 p-2"
            >
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {label}
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {value}
              </div>
            </div>
          ))}
      </div>
    ) : null}

    {audioPreviewMeta ? (
  <div className="rounded border border-gray-800 bg-gray-950 p-4">
    <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview planner
    </div>

    <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      {[
        {
          label: 'Route',
          value:
            typeof audioPreviewMeta.route === 'string'
              ? audioPreviewMeta.route
              : '',
        },
        {
          label: 'Planner',
          value:
            typeof audioPreviewMeta.planner === 'string'
              ? audioPreviewMeta.planner
              : '',
        },
        {
          label: 'Model',
          value:
            typeof audioPreviewMeta.model === 'string'
              ? audioPreviewMeta.model
              : '',
        },
        {
          label: 'Duration',
          value:
            typeof audioPreviewMeta.durationSeconds === 'number'
              ? `${audioPreviewMeta.durationSeconds}s`
              : '',
        },
        {
          label: 'Input tokens',
          value:
            typeof audioPreviewMeta.inputTokens === 'number'
              ? audioPreviewMeta.inputTokens.toLocaleString()
              : '',
        },
        {
          label: 'Output tokens',
          value:
            typeof audioPreviewMeta.outputTokens === 'number'
              ? audioPreviewMeta.outputTokens.toLocaleString()
              : '',
        },
        {
          label: 'Total tokens',
          value:
            typeof audioPreviewMeta.totalTokens === 'number'
              ? audioPreviewMeta.totalTokens.toLocaleString()
              : '',
        },
        {
          label: 'Generated at',
          value:
            typeof audioPreviewMeta.generatedAt === 'string'
              ? new Date(audioPreviewMeta.generatedAt).toLocaleString()
              : '',
        },
      ]
        .filter((row) => row.value)
        .map((row) => (
          <div
            key={row.label}
            className="rounded border border-gray-800 bg-gray-900 p-3"
          >
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {row.label}
            </div>

            <div className="mt-1 text-sm text-gray-300">
              {row.value}
            </div>
          </div>
        ))}
    </div>
  </div>
) : null}

{audioPreviewSongSheetText ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview placed songsheet
    </summary>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs leading-5 text-gray-500">
        Exact chord-over-lyric songsheet included in the audio preview render prompt.
      </div>

      <button
        type="button"
        onClick={() => copyAudioPreviewSongSheet()}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
      >
        {justCopiedAudioPreviewSongSheet ? 'Copied ✓' : 'Copy placed songsheet'}
      </button>
    </div>

    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
      {audioPreviewSongSheetText}
    </pre>
  </details>
) : null}

<div
  className={`rounded border px-4 py-3 text-sm ${
    audioPreviewPipelineStatus.tone === 'ready'
      ? 'border-green-900 bg-green-950/20 text-green-100'
      : audioPreviewPipelineStatus.tone === 'review'
        ? 'border-yellow-900 bg-yellow-950/20 text-yellow-100'
        : 'border-gray-800 bg-gray-950 text-gray-300'
  }`}
>
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <div className="font-medium">
        {audioPreviewPipelineStatus.label}
      </div>
      <div className="mt-1 text-xs leading-5 opacity-80">
        {audioPreviewPipelineStatus.detail}
      </div>
    </div>

    <div className="text-right text-xs leading-5 opacity-80">
      <div>
        {audioPreviewPipelineStatus.completeCount}/
        {audioPreviewPipelineStatus.totalCount} complete
      </div>
      <div>
        Next: {audioPreviewPipelineStatus.nextAction}
      </div>
    </div>
  </div>
</div>

    {audioPreviewSectionGuideText ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview section guide
    </summary>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs leading-5 text-gray-500">
        Section-by-section render guidance derived from the guide track plan.
      </div>

      <button
        type="button"
        onClick={() => copyAudioPreviewSectionGuide()}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
      >
        {justCopiedAudioPreviewSectionGuide ? 'Copied ✓' : 'Copy section guide'}
      </button>
    </div>

    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
      {audioPreviewSectionGuideText}
    </pre>
  </details>
) : null}


    {audioPreviewRenderSteps.length > 0 ? (
      <details className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-300">
          Show render steps
        </summary>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => copyAudioRenderSteps()}
            disabled={audioPreviewRenderSteps.length === 0}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {justCopiedAudioRenderSteps ? 'Copied ✓' : 'Copy render steps'}
          </button>
        </div>


        <div className="mt-3 grid gap-3">
          {audioPreviewRenderSteps.map((step, index) => {
            const stepNumber = getRenderStepValue(step, 'step') || String(index + 1)
            const section = getRenderStepValue(step, 'section') || `Section ${stepNumber}`
            const goal = getRenderStepValue(step, 'goal')
            const guitarInstruction = getRenderStepValue(step, 'guitarInstruction')
            const vocalInstruction = getRenderStepValue(step, 'vocalInstruction')
            const dynamicInstruction = getRenderStepValue(step, 'dynamicInstruction')
            const notes = getRenderStepValue(step, 'notes')

            return (
              <div
                key={`${stepNumber}-${section}`}
                className="rounded border border-gray-800 bg-gray-900 p-3"
              >
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Step {stepNumber}
                </div>

                <div className="mt-1 text-sm font-medium text-gray-200">
                  {section}
                </div>

                <div className="mt-2 grid gap-2 text-xs leading-5 text-gray-500">
                  {goal ? <div><span className="text-gray-400">Goal:</span> {goal}</div> : null}
                  {guitarInstruction ? <div><span className="text-gray-400">Guitar:</span> {guitarInstruction}</div> : null}
                  {vocalInstruction ? <div><span className="text-gray-400">Vocal:</span> {vocalInstruction}</div> : null}
                  {dynamicInstruction ? <div><span className="text-gray-400">Dynamics:</span> {dynamicInstruction}</div> : null}
                  {notes ? <div><span className="text-gray-400">Notes:</span> {notes}</div> : null}
                </div>
              </div>
            )
          })}
        </div>
  </details>
) : null}


    {audioPreviewRenderPrompt ? (
  <details className="mt-3 rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview render prompt
    </summary>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs leading-5 text-gray-500">
        Full renderer-ready prompt containing performance intent, placed songsheet, and section guidance.
      </div>

      <button
        type="button"
        onClick={() => copyAudioRenderPrompt()}
        disabled={!audioPreviewRenderPrompt}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {justCopiedAudioRenderPrompt ? 'Copied ✓' : 'Copy render prompt'}
      </button>
    </div>

    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
      {audioPreviewRenderPrompt}
    </pre>
  </details>
) : null}

{audioPreviewRendererPayload ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview renderer payload
    </summary>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs leading-5 text-gray-500">
        Structured machine-readable payload intended for a future audio preview renderer.
      </div>

      <button
        type="button"
        onClick={() => copyAudioPreviewRendererPayload()}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
      >
        {justCopiedAudioPreviewRendererPayload ? 'Copied ✓' : 'Copy renderer payload'}
      </button>

      <button
          type="button"
          onClick={() => submitAudioPreviewRendererPayload()}
          disabled={
            submittingAudioPreviewRender ||
            !audioPreviewRendererPayload ||
            audioPreviewRendererPayloadValidation?.ready !== true
          }
          className="rounded border border-blue-700 px-3 py-1 text-xs font-medium text-blue-200 hover:bg-blue-950 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
        >
          {submittingAudioPreviewRender ? 'Submitting...' : 'Submit dry run'}
        </button>

        <button
          type="button"
          disabled
          title="Real audio rendering is blocked until a renderer, output format, storage, and execution endpoint are configured."
          className="rounded border border-red-800 px-3 py-1 text-xs font-medium text-red-200 opacity-70 disabled:cursor-not-allowed"
        >
          Generate audio blocked
        </button>

        <button
          type="button"
          onClick={() => testBlockedRealRenderRoute()}
          disabled={testingRealRenderRoute || !dryRunArtifactPackage}
          title="Safely call the blocked real-render route and confirm it returns blocked status."
          className="rounded border border-purple-800 px-3 py-1 text-xs font-medium text-purple-200 hover:bg-purple-950 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
        >
          {testingRealRenderRoute ? 'Testing blocked route...' : 'Test blocked route'}
        </button>

        {realRenderRouteTestResponse ? (
  <div className="mt-2 rounded border border-purple-900 bg-purple-950/20 p-3 text-xs leading-5 text-purple-100">
    <div className="font-medium">Blocked real-render route test</div>

    <div className="mt-1 text-purple-100/80">
      HTTP status:{' '}
      {typeof realRenderRouteTestResponse.httpStatus === 'number'
        ? realRenderRouteTestResponse.httpStatus
        : 'not available'}
    </div>

    <div className="mt-1 text-purple-100/80">
      Status:{' '}
      {typeof realRenderRouteTestResponse.status === 'string'
        ? realRenderRouteTestResponse.status
        : 'unknown'}
    </div>

    <div className="mt-1 text-purple-100/80">
      Audio status:{' '}
      {typeof realRenderRouteTestResponse.audioStatus === 'string'
        ? realRenderRouteTestResponse.audioStatus
        : 'unknown'}
    </div>

    <div className="mt-1 text-purple-100/80">
      Renderer status:{' '}
      {typeof realRenderRouteTestResponse.rendererStatus === 'string'
        ? realRenderRouteTestResponse.rendererStatus
        : 'unknown'}
    </div>

    <div className="mt-1 text-purple-100/80">
  Real-render configuration received:{' '}
  {getRealRenderRouteReceivedConfigurationStatus()}
</div>

<div className="mt-2 text-purple-100/80">
  Result:{' '}
  {getBlockedRealRenderRouteTestPassed()
    ? 'Passed — route returned 423 blocked, verified received contract/configuration summaries including the renderer, WAV format, 44.1 kHz sample-rate, and browser-download storage candidates, verified checks, and generated no audio.'
    : 'Not passed — confirm the route returns 423 blocked and receives the configuration placeholders without generating audio.'}
</div>

{getRealRenderRouteReceivedConfigurationSummary() ? (
  <div className="mt-2 rounded border border-purple-900 bg-gray-950 p-3">
    <div className="font-medium text-purple-100">
      Received configuration summary
    </div>

    <div className="mt-1 text-purple-100/80">
      Configuration status:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.configurationStatus || 'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Audio status:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()?.audioStatus ||
        'unknown'}
    </div>
   <div className="mt-1 text-purple-100/80">
      Renderer candidate status:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.rendererCandidateStatus || 'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Recommended first renderer:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.recommendedFirstRenderer || 'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Renderer candidate selected:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.rendererCandidateSelectedRenderer || 'none'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Output format status:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.outputFormatStatus || 'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Recommended first format:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.recommendedFirstFormat || 'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Selected format:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()?.selectedFormat ||
        'none'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Sample rate status:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.sampleRateStatus || 'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Recommended first sample rate:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.recommendedFirstSampleRateHz ?? 'unknown'}{' '}
      Hz
    </div>
    <div className="mt-1 text-purple-100/80">
      Selected sample rate:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.selectedSampleRateHz ?? 'none'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Storage status:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()?.storageStatus ||
        'unknown'}
    </div>
    <div className="mt-1 text-purple-100/80">
      Recommended first storage:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()
        ?.recommendedFirstProvider || 'unknown'}
    </div>
<div className="mt-1 text-purple-100/80">
  Selected storage:{' '}
  {getRealRenderRouteReceivedConfigurationSummary()?.selectedProvider ||
    'none'}
</div>
    <div className="mt-1 text-purple-100/80">
      First target:{' '}
      {getRealRenderRouteReceivedConfigurationSummary()?.firstTargetKey ||
        'unknown'}
    </div>
  </div>
) : null}

{getRealRenderRouteReceivedConfigurationCheck() ? (
  <div className="mt-2 rounded border border-purple-900 bg-gray-950 p-3">
    <div className="font-medium text-purple-100">
      Received configuration check
    </div>

    <div className="mt-1 text-purple-100/80">
      Passed:{' '}
      {getRealRenderRouteReceivedConfigurationCheck()?.passed ? 'yes' : 'no'}
    </div>

    {getRealRenderRouteReceivedConfigurationCheck()?.missingOrInvalid
      .length ? (
      <div className="mt-2">
        <div className="font-medium text-purple-100">
          Missing or invalid:
        </div>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-purple-100/80">
          {getRealRenderRouteReceivedConfigurationCheck()?.missingOrInvalid.map(
            (item) => (
              <li key={item}>{item}</li>
            ),
          )}
        </ul>
      </div>
    ) : (
      <div className="mt-1 text-purple-100/80">
        Missing or invalid: none
      </div>
    )}
  </div>
) : null}

    <details className="mt-2">
      <summary className="cursor-pointer text-purple-200">
        Raw blocked route response
      </summary>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-3 text-[11px] text-purple-100/80">
        {JSON.stringify(realRenderRouteTestResponse, null, 2)}
      </pre>
    </details>
  </div>
) : null}

{getRealRenderRouteReceivedContractSummary() ? (
  <div className="mt-2 rounded border border-purple-900 bg-gray-950 p-3">
    <div className="font-medium text-purple-100">
      Received contract summary
    </div>

    <div className="mt-1 text-purple-100/80">
      rendererInputContract:{' '}
      {getRealRenderRouteReceivedContractSummary()
        ?.hasRendererInputContract
        ? 'yes'
        : 'no'}
    </div>
    <div className="mt-1 text-purple-100/80">
      realRenderGate:{' '}
      {getRealRenderRouteReceivedContractSummary()?.hasRealRenderGate
        ? 'yes'
        : 'no'}
    </div>
    <div className="mt-1 text-purple-100/80">
      firstRealRenderPlan:{' '}
      {getRealRenderRouteReceivedContractSummary()
        ?.hasFirstRealRenderPlan
        ? 'yes'
        : 'no'}
    </div>
    <div className="mt-1 text-purple-100/80">
      realRenderConfiguration:{' '}
      {getRealRenderRouteReceivedContractSummary()
        ?.hasRealRenderConfiguration
        ? 'yes'
        : 'no'}
    </div>
    <div className="mt-1 text-purple-100/80">
      requestedTarget:{' '}
      {getRealRenderRouteReceivedContractSummary()?.requestedTarget ||
        'unknown'}
    </div>
  </div>
) : null}

{getRealRenderRouteReceivedContractCheck() ? (
  <div className="mt-2 rounded border border-purple-900 bg-gray-950 p-3">
    <div className="font-medium text-purple-100">
      Received contract check
    </div>

    <div className="mt-1 text-purple-100/80">
      Passed:{' '}
      {getRealRenderRouteReceivedContractCheck()?.passed ? 'yes' : 'no'}
    </div>

    {getRealRenderRouteReceivedContractCheck()?.missingOrInvalid.length ? (
      <div className="mt-2">
        <div className="font-medium text-purple-100">
          Missing or invalid:
        </div>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-purple-100/80">
          {getRealRenderRouteReceivedContractCheck()?.missingOrInvalid.map(
            (item) => (
              <li key={item}>{item}</li>
            ),
          )}
        </ul>
      </div>
    ) : (
      <div className="mt-1 text-purple-100/80">
        Missing or invalid: none
      </div>
    )}
  </div>
) : null}

        {dryRunRealRenderGateSummary ? (
          <div className="mt-2 rounded border border-red-900 bg-red-950/20 p-3 text-xs leading-5 text-red-100">
            <div className="font-medium">Real audio rendering is blocked</div>
            <div className="mt-1 text-red-100/80">
              Gate status: {dryRunRealRenderGateSummary.gateStatus || 'Unknown'}.
              Renderer: {dryRunRealRenderGateSummary.rendererStatus || 'Unknown'}.
              Storage: {dryRunRealRenderGateSummary.storageStatus || 'Unknown'}.
              Format: {dryRunRealRenderGateSummary.formatStatus || 'Unknown'}.
            </div>
          </div>
        ) : null}

      {!dryRunHandoffBundle || !dryRunArtifactPackage ? (
  <div className="mt-3 rounded border border-yellow-900 bg-yellow-950/20 p-4 text-sm leading-6 text-yellow-100">
    <div className="font-medium">
      Audio preview dry-run packages pending
    </div>

    <div className="mt-2 text-yellow-100/80">
      Submit dry run to generate the deterministic handoff bundle, artefact package, manifest, real-render blockers, render targets, validation outputs, and future audio output placeholders.
    </div>

    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-yellow-100/70">
      {!dryRunHandoffBundle ? (
        <li>Handoff bundle pending</li>
      ) : null}

      {!dryRunArtifactPackage ? (
        <li>Artefact package pending</li>
      ) : null}
    </ul>
  </div>
) : null}

    </div>

    {audioPreviewRendererPayloadSummary.hasPayload ? (
      <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Type
          </div>
          <div className="mt-1 text-sm text-gray-300">
            {audioPreviewRendererPayloadSummary.type || 'Unknown'}
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Status
          </div>
          <div className="mt-1 text-sm text-gray-300">
            {audioPreviewRendererPayloadSummary.renderStatus || 'Unknown'}
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Songsheet lines
          </div>
          <div className="mt-1 text-sm text-gray-300">
            {audioPreviewRendererPayloadSummary.songsheetLineCount}
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Render steps
          </div>
          <div className="mt-1 text-sm text-gray-300">
            {audioPreviewRendererPayloadSummary.renderStepCount}
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Render prompt
          </div>
          <div
            className={`mt-1 text-sm ${
              audioPreviewRendererPayloadSummary.hasRenderPrompt
                ? 'text-green-300'
                : 'text-yellow-300'
            }`}
          >
            {audioPreviewRendererPayloadSummary.hasRenderPrompt ? 'Included' : 'Missing'}
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Placed songsheet
          </div>
          <div
            className={`mt-1 text-sm ${
              audioPreviewRendererPayloadSummary.hasPreviewSongSheetText
                ? 'text-green-300'
                : 'text-yellow-300'
            }`}
          >
            {audioPreviewRendererPayloadSummary.hasPreviewSongSheetText ? 'Included' : 'Missing'}
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Section guide
          </div>
          <div
            className={`mt-1 text-sm ${
              audioPreviewRendererPayloadSummary.hasSectionGuideText
                ? 'text-green-300'
                : 'text-yellow-300'
            }`}
          >
            {audioPreviewRendererPayloadSummary.hasSectionGuideText ? 'Included' : 'Missing'}
                  </div>
                </div>
              </div>
            ) : null}

            {audioPreviewRendererPayloadValidation ? (
          <div
            className={`mt-3 rounded border px-3 py-2 text-xs leading-5 ${
              audioPreviewRendererPayloadValidation.ready === true
                ? 'border-green-900 bg-green-950/20 text-green-100'
                : 'border-yellow-900 bg-yellow-950/20 text-yellow-100'
            }`}
          >
            <div className="font-medium">
              {audioPreviewRendererPayloadValidation.ready === true
                ? 'Renderer payload validation passed'
                : 'Renderer payload validation needs review'}
            </div>

            <div className="mt-1">
              {typeof audioPreviewRendererPayloadValidation.detail === 'string'
                ? audioPreviewRendererPayloadValidation.detail
                : 'Validation details unavailable.'}
            </div>
          </div>
        ) : null}

    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
      {JSON.stringify(audioPreviewRendererPayload, null, 2)}
    </pre>
  </details>
) : null}


{audioPreviewRenderMessage ? (
  <div className="rounded border border-gray-800 bg-gray-950 px-3 py-2 text-xs leading-5 text-gray-300">
    {audioPreviewRenderMessage}
  </div>
) : null}

{showRealRenderBlockedBanner ? (
  <div className="rounded border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
    <div className="font-semibold uppercase tracking-wide text-amber-300">
      Dry-run only — real rendering is blocked
    </div>

    <div className="mt-2 text-xs text-amber-100">
      The audio preview dry run is validated, but no audio has been generated.
      Real rendering remains blocked until renderer, format, storage, and timing
      decisions are made.
    </div>

    {dryRunRealRenderReadinessSummary.blockers.length > 0 ? (
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-100">
        {dryRunRealRenderReadinessSummary.blockers.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : null}
  </div>
) : null}

{audioPreviewRenderJob ? (
  <div className="rounded border border-green-900 bg-green-950/20 p-4">
    <div className="text-sm font-medium uppercase tracking-wide text-green-200">
      Audio preview dry-run job
    </div>

    <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      {[
        {
          label: 'Status',
          value:
            typeof audioPreviewRenderJob.status === 'string'
              ? audioPreviewRenderJob.status
              : '',
        },
        {
          label: 'Renderer',
          value:
            typeof audioPreviewRenderJob.renderer === 'string'
              ? audioPreviewRenderJob.renderer
              : '',
        },
        {
          label: 'Audio status',
          value:
            typeof audioPreviewRenderJob.audioStatus === 'string'
              ? audioPreviewRenderJob.audioStatus
              : '',
        },
        {
          label: 'Render mode',
          value:
            typeof audioPreviewRenderJob.renderMode === 'string'
              ? audioPreviewRenderJob.renderMode
              : '',
        },
        {
          label: 'Created at',
          value:
            typeof audioPreviewRenderJob.createdAt === 'string'
              ? new Date(audioPreviewRenderJob.createdAt).toLocaleString()
              : '',
        },
      ]
        .filter((row) => row.value)
        .map((row) => (
          <div
            key={row.label}
            className="rounded border border-green-900 bg-gray-950 p-3"
          >
            <div className="text-xs uppercase tracking-wide text-green-300">
              {row.label}
            </div>
            <div className="mt-1 text-sm text-green-100">
              {row.value}
            </div>
          </div>
        ))}
    </div>
  </div>
) : null}


 {audioPreviewDryRunRenderPlan ? (
              <details className="rounded border border-gray-800 bg-gray-950 p-4">
                <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
                  Audio preview dry-run render plan
                </summary>

               <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs leading-5 text-gray-500">
                    Structured section-by-section plan returned by the dry-run renderer route. No audio file is generated yet.
                  </div>

                  <button
                    type="button"
                    onClick={() => copyAudioPreviewDryRunPlan()}
                    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
                  >
                    {justCopiedAudioPreviewDryRunPlan ? 'Copied ✓' : 'Copy dry-run plan'}
                  </button>
                </div>

               

                


                {audioPreviewDryRunPlanSummary.hasPlan ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Type
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.type || 'Unknown'}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Render mode
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.renderMode || 'Unknown'}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Audio status
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.audioStatus || 'Unknown'}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Sections
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.sectionCount}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Songsheet lines
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.songsheetLineCount}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Render steps
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.renderStepCount}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Timeline sections
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.timelineSectionCount}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Cue sections
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.cueSheetSectionCount}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Estimated bars
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.totalEstimatedBars}
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Estimated length
                      </div>
                      <div className="mt-1 text-sm text-gray-300">
                        {audioPreviewDryRunPlanSummary.totalEstimatedSeconds}s
                      </div>
                    </div>

                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Instructions
                      </div>
                      <div
                        className={`mt-1 text-sm ${
                          audioPreviewDryRunPlanSummary.hasInstructions
                            ? 'text-green-300'
                            : 'text-yellow-300'
                        }`}
                      >
                        {audioPreviewDryRunPlanSummary.hasInstructions ? 'Included' : 'Missing'}
                      </div>
                    </div>
                  </div>
                ) : null}

                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
                  {JSON.stringify(audioPreviewDryRunRenderPlan, null, 2)}
                </pre>
              </details>
            ) : null}

{audioPreviewDryRunTimelineRows.length > 0 ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview dry-run timeline
    </summary>

    <div className="mt-3 text-xs leading-5 text-gray-500">
      Renderer-style section timeline grouped from the placed songsheet.
    </div>

    <div className="mt-3 grid gap-3">
      {audioPreviewDryRunTimelineRows.map((row) => (
        <div
          key={`${row.order}-${row.section}`}
          className="rounded border border-gray-800 bg-gray-900 p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-200">
                {row.order}. {row.section}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {row.lyricLineCount} lyric line{row.lyricLineCount === 1 ? '' : 's'} · {row.chordPlacementCount} chord placement{row.chordPlacementCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {(row.firstLyric || row.lastLyric) ? (
            <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3 text-xs leading-5 text-gray-300">
              {row.firstLyric ? (
                <div>
                  <span className="text-gray-500">First:</span> {row.firstLyric}
                </div>
              ) : null}
              {row.lastLyric && row.lastLyric !== row.firstLyric ? (
                <div className="mt-1">
                  <span className="text-gray-500">Last:</span> {row.lastLyric}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {row.goal ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Goal
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-300">
                  {row.goal}
                </div>
              </div>
            ) : null}

            {row.guitarInstruction ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Guitar
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-300">
                  {row.guitarInstruction}
                </div>
              </div>
            ) : null}

            {row.vocalInstruction ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Vocal
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-300">
                  {row.vocalInstruction}
                </div>
              </div>
            ) : null}

            {row.dynamicInstruction ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Dynamics
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-300">
                  {row.dynamicInstruction}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  </details>
) : null}


{audioPreviewDryRunCueSheetRows.length > 0 ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview dry-run cue sheet
    </summary>

   <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
  <div className="text-xs leading-5 text-gray-500">
    Estimated timing cue sheet derived from the dry-run timeline. These timings are approximate and are not final rendered audio timings.
  </div>

  <button
    type="button"
    onClick={() => copyAudioPreviewCueSheet()}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
  >
    {justCopiedAudioPreviewCueSheet ? 'Copied ✓' : 'Copy cue sheet'}
  </button>
</div>

{dryRunCueSheetValidation ? (
  <div
    className={`mt-3 rounded border px-3 py-2 text-xs leading-5 ${
      dryRunCueSheetValidation.ready === true
        ? 'border-green-900 bg-green-950/20 text-green-100'
        : 'border-yellow-900 bg-yellow-950/20 text-yellow-100'
    }`}
  >
    <div className="font-medium">
      {dryRunCueSheetValidation.ready === true
        ? 'Dry-run cue sheet validation passed'
        : 'Dry-run cue sheet validation needs review'}
    </div>
    <div className="mt-1">
      {typeof dryRunCueSheetValidation.detail === 'string'
        ? dryRunCueSheetValidation.detail
        : 'Validation details unavailable.'}
    </div>
  </div>
) : null}

    <div className="mt-3 grid gap-3">
      {audioPreviewDryRunCueSheetRows.map((row) => (
        <div
          key={`${row.order}-${row.section}`}
          className="rounded border border-gray-800 bg-gray-900 p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-200">
                {row.order}. {row.section}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {row.lyricLineCount} lyric line{row.lyricLineCount === 1 ? '' : 's'} · {row.chordPlacementCount} chord placement{row.chordPlacementCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="text-xs leading-5 text-gray-400">
              {row.startSeconds.toFixed(1)}s → {row.endSeconds.toFixed(1)}s
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded border border-gray-800 bg-gray-950 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Estimated bars
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.estimatedBars}
              </div>
            </div>

            <div className="rounded border border-gray-800 bg-gray-950 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Estimated seconds
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.estimatedSeconds.toFixed(1)}s
              </div>
            </div>

            <div className="rounded border border-gray-800 bg-gray-950 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Time range
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.startSeconds.toFixed(1)}s–{row.endSeconds.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </details>
) : null}


{dryRunRenderManifest ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview dry-run render manifest
    </summary>

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs leading-5 text-gray-500">
        Renderer-facing dry-run manifest with validation status and future audio output placeholders. No audio file is generated yet.
      </div>

      <button
        type="button"
        onClick={() => copyAudioPreviewRenderManifest()}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
      >
        {justCopiedAudioPreviewRenderManifest ? 'Copied ✓' : 'Copy manifest'}
      </button>
    </div>

    {dryRunRenderManifestValidation ? (
      <div
        className={`mt-3 rounded border px-3 py-2 text-xs leading-5 ${
          dryRunRenderManifestValidation.ready === true
            ? 'border-green-900 bg-green-950/20 text-green-100'
            : 'border-yellow-900 bg-yellow-950/20 text-yellow-100'
        }`}
      >
        <div className="font-medium">
          {dryRunRenderManifestValidation.ready === true
            ? 'Dry-run render manifest validation passed'
            : 'Dry-run render manifest validation needs review'}
        </div>
        <div className="mt-1">
          {typeof dryRunRenderManifestValidation.detail === 'string'
            ? dryRunRenderManifestValidation.detail
            : 'Validation details unavailable.'}
        </div>
      </div>
    ) : null}

    <div className="mt-3 grid gap-3 md:grid-cols-4">
      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Manifest status
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.manifestStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Audio status
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.audioStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Output slots
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.notGeneratedOutputCount}/
          {dryRunRenderManifestSummary.outputSlotCount} not generated
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Cue sections
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.cueSheetSectionCount}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Estimated bars
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.totalEstimatedBars}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Estimated length
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.totalEstimatedSeconds}s
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Plan validation
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.dryRunRenderPlanReady
            ? 'Passed'
            : 'Needs review'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Cue validation
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRenderManifestSummary.dryRunCueSheetReady
            ? 'Passed'
            : 'Needs review'}
        </div>
      </div>
    </div>


    {dryRunRendererContractSummary.contractStatus ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
      Renderer contract
    </div>

    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Contract status
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRendererContractSummary.contractStatus}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Renderer mode
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {dryRunRendererContractSummary.rendererMode || 'Unknown'}
        </div>
      </div>
    </div>

    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Consumes
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-gray-400">
          {dryRunRendererContractSummary.consumes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Produces
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-gray-400">
          {dryRunRendererContractSummary.produces.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mt-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        Required before real render
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-gray-400">
        {dryRunRendererContractSummary.requiredBeforeRealRender.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>

    <div className="mt-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        Safety notes
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-gray-400">
        {dryRunRendererContractSummary.safetyNotes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  </div>
) : null}

    {dryRunExpectedOutputRows.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Expected audio outputs
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {dryRunExpectedOutputRows.map((output) => (
            <div
              key={output.key}
              className="rounded border border-gray-800 bg-gray-900 p-3"
            >
              <div className="text-sm font-medium text-gray-200">
                {output.label}
              </div>

              {output.description ? (
                <div className="mt-1 text-xs leading-5 text-gray-500">
                  {output.description}
                </div>
              ) : null}

              <div className="mt-2 grid gap-1 text-xs leading-5 text-gray-400">
                {output.role ? (
                  <div>
                    <span className="text-gray-500">Role:</span>{' '}
                    {output.role}
                  </div>
                ) : null}

                {output.suggestedFileName ? (
                  <div>
                    <span className="text-gray-500">Suggested file:</span>{' '}
                    {output.suggestedFileName}
                  </div>
                ) : null}

                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  {output.status}
                </div>

                <div>
                  <span className="text-gray-500">Format:</span>{' '}
                  {output.format}
                </div>

                <div>
                  <span className="text-gray-500">URL:</span>{' '}
                  {output.url || 'Not generated'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null}

    <pre className="mt-3 max-h-96 overflow-auto rounded bg-black p-3 text-xs leading-5 text-gray-300">
      {JSON.stringify(dryRunRenderManifest, null, 2)}
    </pre>
  </details>
) : null}

{dryRunHandoffBundle ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">
    <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
      Audio preview dry-run handoff bundle
    </summary>

   {renderAudioPreviewReadinessCard('compact')}

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
  <div className="text-xs leading-5 text-gray-500">
    Consolidated dry-run handoff summary for future renderer integration. No audio file is generated yet.
  </div>

  <button
    type="button"
    onClick={() => copyAudioPreviewHandoffBundle()}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
  >
    {justCopiedAudioPreviewHandoffBundle ? 'Copied ✓' : 'Copy handoff bundle'}
  </button>
</div>

{dryRunHandoffBundleValidation ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Handoff bundle validation
    </div>
    <div className="mt-2">
      {dryRunHandoffBundleValidation.ready === true ? 'Passed' : 'Needs review'}
    </div>
    <div className="mt-1 text-gray-500">
      {typeof dryRunHandoffBundleValidation.detail === 'string'
        ? dryRunHandoffBundleValidation.detail
        : 'Validation details unavailable.'}
    </div>
  </div>
) : null}

    <pre className="mt-3 max-h-96 overflow-auto rounded bg-black p-3 text-xs leading-5 text-gray-300">
      {JSON.stringify(dryRunHandoffBundle, null, 2)}
    </pre>
  </details>
) : null}


{renderAudioPreviewReadinessCard('compact')}

    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
  <div className="text-xs leading-5 text-gray-500">
    Machine-readable package containing the dry-run render job, render plan, cue sheet, manifest, handoff bundle, and validations. No audio file is generated yet.
  </div>

  
</div>

{dryRunArtifactPackageValidation ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Artefact package validation
    </div>
    <div className="mt-2">
      {dryRunArtifactPackageValidation.ready === true
        ? 'Passed'
        : 'Needs review'}
    </div>
    <div className="mt-1 text-gray-500">
      {typeof dryRunArtifactPackageValidation.detail === 'string'
        ? dryRunArtifactPackageValidation.detail
        : 'Validation details unavailable.'}
    </div>
  </div>
) : null}

{dryRunRealRenderReadinessSummary.readinessStatus ? (
  <div className="mt-3 rounded border border-amber-900/60 bg-amber-950/20 p-3 text-xs leading-5 text-amber-100">
    <div className="font-medium uppercase tracking-wide text-amber-300">
      Real-render readiness
    </div>

    <div className="mt-2">
      Ready for real render:{' '}
      {dryRunRealRenderReadinessSummary.readyForRealRender === true
        ? 'Yes'
        : 'No'}
    </div>

    <div className="mt-1 text-amber-200">
      Status: {dryRunRealRenderReadinessSummary.readinessStatus}
    </div>

    {dryRunRealRenderReadinessSummary.blockers.length > 0 ? (
      <div className="mt-3">
        <div className="font-medium text-amber-300">Blockers</div>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {dryRunRealRenderReadinessSummary.blockers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {dryRunRealRenderReadinessSummary.requiredDecisions.length > 0 ? (
      <div className="mt-3">
        <div className="font-medium text-amber-300">Required decisions</div>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {dryRunRealRenderReadinessSummary.requiredDecisions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {dryRunRealRenderReadinessSummary.safetyNotes.length > 0 ? (
      <div className="mt-3">
        <div className="font-medium text-amber-300">Safety notes</div>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {dryRunRealRenderReadinessSummary.safetyNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{dryRunArtifactPackage ? (
  <details className="rounded border border-gray-800 bg-gray-950 p-4">

  <button
    type="button"
    onClick={() => copyAudioPreviewArtifactPackage()}
    className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
  >
    {justCopiedAudioPreviewArtifactPackage ? 'Copied ✓' : 'Copy artefact package'}
  </button>

    <summary className="cursor-pointer text-sm font-medium text-gray-200">
      Audio preview dry-run artefact package
    </summary>

        {renderAudioPreviewReadinessCard('compact')}

{dryRunRenderTargetRows.length > 0 ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Declared render targets
    </div>

    <div className="mt-2 grid gap-2">
      {dryRunRenderTargetRows.map((target) => (
        <div
          key={target.key || target.label}
          className="rounded border border-gray-800 bg-gray-950 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-gray-300">
              {target.priority}. {target.label}
            </div>

            <div className={target.selected ? 'text-green-300' : 'text-gray-500'}>
              {target.selected ? 'Selected' : 'Optional'}
            </div>
          </div>

          {target.reason ? (
            <div className="mt-2 text-gray-500">{target.reason}</div>
          ) : null}
        </div>
      ))}
    </div>
  </div>
) : null}

{dryRunGuideTrackRenderRecipeSummary ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Guide-track render recipe
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Target</div>
        <div className="mt-1 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.targetKey || 'No target key'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Output status</div>
        <div className="mt-1 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.outputStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Count-in</div>
        <div className="mt-1 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.countIn.enabled
            ? `${dryRunGuideTrackRenderRecipeSummary.countIn.bars} bar count-in`
            : 'No count-in declared'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Primary bed</div>
        <div className="mt-1 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.musicalBed.primaryInstrument ||
            'No primary instrument declared'}
        </div>
      </div>
    </div>

    {dryRunGuideTrackRenderRecipeSummary.rendererRequirement ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Renderer requirement
        </div>
        <div className="mt-1 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.rendererRequirement}
        </div>
      </div>
    ) : null}

    {dryRunGuideTrackRenderRecipeSummary.musicalBed.supportInstruments.length >
    0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Support instruments
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.musicalBed.supportInstruments.map(
            (instrument) => (
              <li key={instrument}>{instrument}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {dryRunGuideTrackRenderRecipeSummary.mixPriorities.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Mix priorities</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunGuideTrackRenderRecipeSummary.mixPriorities.map(
            (priority) => (
              <li key={priority}>{priority}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{dryRunClickTrackRenderRecipeSummary ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Click-track render recipe
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Target</div>
        <div className="mt-1 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.targetKey || 'No target key'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Output status</div>
        <div className="mt-1 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.outputStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Count-in</div>
        <div className="mt-1 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.countIn.enabled
            ? `${dryRunClickTrackRenderRecipeSummary.countIn.bars} bar count-in`
            : 'No count-in declared'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Click sound</div>
        <div className="mt-1 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.clickSound.subdivision ||
            'No subdivision declared'}
          {dryRunClickTrackRenderRecipeSummary.clickSound.downbeatEmphasis
            ? ' with downbeat emphasis'
            : ''}
        </div>
      </div>
    </div>

    {dryRunClickTrackRenderRecipeSummary.rendererRequirement ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Renderer requirement
        </div>
        <div className="mt-1 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.rendererRequirement}
        </div>
      </div>
    ) : null}

    {dryRunClickTrackRenderRecipeSummary.sectionMarkers.enabled ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Section markers</div>
        <div className="mt-1 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.sectionMarkers.description ||
            'Section markers declared.'}
        </div>
      </div>
    ) : null}

    {dryRunClickTrackRenderRecipeSummary.mixPriorities.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Mix priorities</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunClickTrackRenderRecipeSummary.mixPriorities.map(
            (priority) => (
              <li key={priority}>{priority}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{dryRunChordReferenceRenderRecipeSummary ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Chord-reference render recipe
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Target</div>
        <div className="mt-1 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.targetKey ||
            'No target key'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Output status</div>
        <div className="mt-1 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.outputStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Count-in</div>
        <div className="mt-1 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.countIn.enabled
            ? `${dryRunChordReferenceRenderRecipeSummary.countIn.bars} bar count-in`
            : 'No count-in declared'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Voicing</div>
        <div className="mt-1 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.voicing.primaryInstrument ||
            'No voicing declared'}
          {dryRunChordReferenceRenderRecipeSummary.voicing.density
            ? `, ${dryRunChordReferenceRenderRecipeSummary.voicing.density}`
            : ''}
        </div>
      </div>
    </div>

    {dryRunChordReferenceRenderRecipeSummary.rendererRequirement ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Renderer requirement
        </div>
        <div className="mt-1 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.rendererRequirement}
        </div>
      </div>
    ) : null}

    {dryRunChordReferenceRenderRecipeSummary.chordSource.description ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Chord source</div>
        <div className="mt-1 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.chordSource.description}
        </div>
      </div>
    ) : null}

    {dryRunChordReferenceRenderRecipeSummary.mixPriorities.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Mix priorities</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunChordReferenceRenderRecipeSummary.mixPriorities.map(
            (priority) => (
              <li key={priority}>{priority}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{dryRunVocalGuideRenderRecipeSummary ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Optional vocal-guide render recipe
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Target</div>
        <div className="mt-1 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.targetKey || 'No target key'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Selection</div>
        <div className="mt-1 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.targetSelection || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Output status</div>
        <div className="mt-1 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.outputStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Melody source</div>
        <div className="mt-1 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.melodySource.status ||
            'Unknown'}
        </div>
      </div>
    </div>

    {dryRunVocalGuideRenderRecipeSummary.rendererRequirement ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Renderer requirement
        </div>
        <div className="mt-1 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.rendererRequirement}
        </div>
      </div>
    ) : null}

    {dryRunVocalGuideRenderRecipeSummary.activationRequirements.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Activation requirements
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.activationRequirements.map(
            (requirement) => (
              <li key={requirement}>{requirement}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {dryRunVocalGuideRenderRecipeSummary.melodySource.acceptedSources.length >
    0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Accepted melody sources
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.melodySource.acceptedSources.map(
            (source) => (
              <li key={source}>{source}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {dryRunVocalGuideRenderRecipeSummary.vocalStyle.defaultReference ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Vocal style placeholder
        </div>
        <div className="mt-1 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.vocalStyle.defaultReference}
        </div>
      </div>
    ) : null}

    {dryRunVocalGuideRenderRecipeSummary.mixPriorities.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Mix priorities</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunVocalGuideRenderRecipeSummary.mixPriorities.map(
            (priority) => (
              <li key={priority}>{priority}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}
  </div>
) : null}


{dryRunExpectedOutputFileRows.length > 0 ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Expected output file placeholders
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      {dryRunExpectedOutputFileRows.map((output) => (
        <div
          key={output.key || output.label}
          className="rounded border border-gray-800 bg-gray-950 p-3"
        >
          <div className="font-medium text-gray-300">
            {output.label || output.key || 'Unnamed output'}
          </div>

          <div className="mt-1 text-gray-500">
            Key: {output.key || 'Unknown'}
          </div>

          <div className="mt-1 text-gray-500">
            Selected: {output.selected ? 'yes' : 'no'}
          </div>

          <div className="mt-1 text-gray-500">
            Status: {output.status || 'Unknown'}
          </div>

          <div className="mt-1 text-gray-500">
            File: {output.file === null ? 'null' : 'unexpected file value'}
          </div>

          {output.requiredBeforeGenerated.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
              {output.requiredBeforeGenerated.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  </div>
) : null}

{dryRunRendererInputContractSummary ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-400">
    <div className="font-medium uppercase tracking-wide text-gray-500">
      Renderer input contract
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Contract status</div>
        <div className="mt-1 text-gray-500">
          {dryRunRendererInputContractSummary.contractStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Audio status</div>
        <div className="mt-1 text-gray-500">
          {dryRunRendererInputContractSummary.audioStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Renderer status</div>
        <div className="mt-1 text-gray-500">
          {dryRunRendererInputContractSummary.rendererStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Storage / format</div>
        <div className="mt-1 text-gray-500">
          {dryRunRendererInputContractSummary.storageStatus || 'Unknown'} /{' '}
          {dryRunRendererInputContractSummary.formatStatus || 'Unknown'}
        </div>
      </div>
    </div>

    {dryRunRendererInputContractSummary.purpose ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Purpose</div>
        <div className="mt-1 text-gray-500">
          {dryRunRendererInputContractSummary.purpose}
        </div>
      </div>
    ) : null}

    {dryRunRendererInputContractSummary.requiredBeforeRealRender.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">
          Required before real render
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunRendererInputContractSummary.requiredBeforeRealRender.map(
            (requirement) => (
              <li key={requirement}>{requirement}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {dryRunRendererInputContractSummary.selectedOutputKeys.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Selected outputs</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunRendererInputContractSummary.selectedOutputKeys.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {dryRunRendererInputContractSummary.optionalOutputKeys.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Optional outputs</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunRendererInputContractSummary.optionalOutputKeys.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {dryRunRendererInputContractSummary.handoffRules.length > 0 ? (
      <div className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <div className="font-medium text-gray-300">Handoff rules</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-500">
          {dryRunRendererInputContractSummary.handoffRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{dryRunRealRenderGateSummary ? (
  <div className="mt-3 rounded border border-red-900 bg-red-950/20 p-3 text-xs leading-5 text-red-100">
    <div className="font-medium uppercase tracking-wide text-red-200">
      Real-render safety gate
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Gate status</div>
        <div className="mt-1 text-red-100/80">
          {dryRunRealRenderGateSummary.gateStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Can render audio</div>
        <div className="mt-1 text-red-100/80">
          {dryRunRealRenderGateSummary.canRenderAudio ? 'yes' : 'no'}
        </div>
      </div>

      <div className="rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Audio status</div>
        <div className="mt-1 text-red-100/80">
          {dryRunRealRenderGateSummary.audioStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Renderer status</div>
        <div className="mt-1 text-red-100/80">
          {dryRunRealRenderGateSummary.rendererStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Storage / format</div>
        <div className="mt-1 text-red-100/80">
          {dryRunRealRenderGateSummary.storageStatus || 'Unknown'} /{' '}
          {dryRunRealRenderGateSummary.formatStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Dry run ready</div>
        <div className="mt-1 text-red-100/80">
          {dryRunRealRenderGateSummary.dryRunReady ? 'yes' : 'no'}
        </div>
      </div>
    </div>

    {dryRunRealRenderGateSummary.blockedReasons.length > 0 ? (
      <div className="mt-3 rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Blocked reasons</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100/80">
          {dryRunRealRenderGateSummary.blockedReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {dryRunRealRenderGateSummary.requiredToUnlock.length > 0 ? (
      <div className="mt-3 rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Required to unlock</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100/80">
          {dryRunRealRenderGateSummary.requiredToUnlock.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {dryRunRealRenderGateSummary.safetyRules.length > 0 ? (
      <div className="mt-3 rounded border border-red-900 bg-gray-950 p-3">
        <div className="font-medium text-red-100">Safety rules</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-red-100/80">
          {dryRunRealRenderGateSummary.safetyRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{dryRunFirstRealRenderPlanSummary ? (
  <div className="mt-3 rounded border border-yellow-900 bg-yellow-950/20 p-3 text-xs leading-5 text-yellow-100">
    <div className="font-medium uppercase tracking-wide text-yellow-200">
      First real-render plan
    </div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div className="rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">Recommended first target</div>
        <div className="mt-1 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.recommendedFirstTarget ||
            'Unknown'}
        </div>
      </div>

      <div className="rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">Audio status</div>
        <div className="mt-1 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.audioStatus || 'Unknown'}
        </div>
      </div>

      <div className="rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">Strategy</div>
        <div className="mt-1 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.rendererStrategy.strategyType ||
            'Unknown'}
        </div>
      </div>

      <div className="rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">Implementation</div>
        <div className="mt-1 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.rendererStrategy
            .implementationStatus || 'Unknown'}
        </div>
      </div>
    </div>

    {dryRunFirstRealRenderPlanSummary.recommendedReason ? (
      <div className="mt-3 rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">Reason</div>
        <div className="mt-1 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.recommendedReason}
        </div>
      </div>
    ) : null}

    {dryRunFirstRealRenderPlanSummary.firstUnlockRequirements.length > 0 ? (
      <div className="mt-3 rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">
          First unlock requirements
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.firstUnlockRequirements.map(
            (requirement) => (
              <li key={requirement}>{requirement}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {dryRunFirstRealRenderPlanSummary.firstValidationChecks.length > 0 ? (
      <div className="mt-3 rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">
          First validation checks
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.firstValidationChecks.map(
            (check) => (
              <li key={check}>{check}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {dryRunFirstRealRenderPlanSummary.laterTargets.length > 0 ? (
      <div className="mt-3 rounded border border-yellow-900 bg-gray-950 p-3">
        <div className="font-medium text-yellow-100">Later targets</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-yellow-100/80">
          {dryRunFirstRealRenderPlanSummary.laterTargets.map((target) => (
            <li key={target}>{target}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{realRenderRouteScaffoldSummary ? (
  <div className="mt-3 rounded border border-purple-900 bg-purple-950/20 p-3 text-xs leading-5 text-purple-100">
    <div className="font-medium">Blocked real-render route scaffold</div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div>
        <div>
          Route status:{' '}
          {realRenderRouteScaffoldSummary.routeStatus || 'Unknown'}
        </div>
        <div>
          Method: {realRenderRouteScaffoldSummary.method || 'Unknown'}
        </div>
        <div>
          Path: {realRenderRouteScaffoldSummary.path || 'Unknown'}
        </div>
        <div>
          Expected blocked status code:{' '}
          {realRenderRouteScaffoldSummary.expectedBlockedStatusCode ||
            'Unknown'}
        </div>
      </div>

      <div>
        <div>
          Audio status:{' '}
          {realRenderRouteScaffoldSummary.audioStatus || 'Unknown'}
        </div>
        <div>
          Renderer status:{' '}
          {realRenderRouteScaffoldSummary.rendererStatus || 'Unknown'}
        </div>
       <div>
  Expected contract check:{' '}
      {realRenderRouteScaffoldSummary.expectedBlockedResponse
        .receivedContractCheck.passed
        ? 'passed'
        : 'not passed'}
    </div>
    <div>
      Expected contract missing/invalid:{' '}
      {realRenderRouteScaffoldSummary.expectedBlockedResponse
        .receivedContractCheck.missingOrInvalid.length > 0
        ? realRenderRouteScaffoldSummary.expectedBlockedResponse.receivedContractCheck.missingOrInvalid.join(
            ', ',
          )
        : 'none'}
    </div>
    <div>
      Expected configuration check:{' '}
      {realRenderRouteScaffoldSummary.expectedBlockedResponse
        .receivedConfigurationCheck.passed
        ? 'passed'
        : 'not passed'}
    </div>
    <div>
      Expected configuration missing/invalid:{' '}
      {realRenderRouteScaffoldSummary.expectedBlockedResponse
        .receivedConfigurationCheck.missingOrInvalid.length > 0
        ? realRenderRouteScaffoldSummary.expectedBlockedResponse.receivedConfigurationCheck.missingOrInvalid.join(
            ', ',
          )
        : 'none'}
    </div>
      </div>
    </div>

    <div className="mt-3 rounded border border-purple-900 bg-gray-950 p-3">
      <div className="font-medium text-purple-100">
        Expected request shape
      </div>

      <div className="mt-1 text-purple-100/80">
        requestedTarget:{' '}
        {realRenderRouteScaffoldSummary.expectedRequestShape
          .requestedTarget || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        rendererInputContract:{' '}
        {realRenderRouteScaffoldSummary.expectedRequestShape
          .rendererInputContract || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        realRenderGate:{' '}
        {realRenderRouteScaffoldSummary.expectedRequestShape
          .realRenderGate || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        firstRealRenderPlan:{' '}
        {realRenderRouteScaffoldSummary.expectedRequestShape
          .firstRealRenderPlan || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        realRenderConfiguration:{' '}
        {realRenderRouteScaffoldSummary.expectedRequestShape
          .realRenderConfiguration || 'Unknown'}
      </div>
    </div>

    <div className="mt-3 rounded border border-purple-900 bg-gray-950 p-3">
      <div className="font-medium text-purple-100">
        Expected blocked response
      </div>

      <div className="mt-1 text-purple-100/80">
        status:{' '}
        {realRenderRouteScaffoldSummary.expectedBlockedResponse.status ||
          'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        audioStatus:{' '}
        {realRenderRouteScaffoldSummary.expectedBlockedResponse
          .audioStatus || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        rendererStatus:{' '}
        {realRenderRouteScaffoldSummary.expectedBlockedResponse
          .rendererStatus || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        storageStatus:{' '}
        {realRenderRouteScaffoldSummary.expectedBlockedResponse
          .storageStatus || 'Unknown'}
      </div>
      <div className="mt-1 text-purple-100/80">
        formatStatus:{' '}
        {realRenderRouteScaffoldSummary.expectedBlockedResponse
          .formatStatus || 'Unknown'}
      </div>
      <div className="mt-3 font-medium text-purple-100">
  Expected received contract summary
</div>
<div className="mt-1 text-purple-100/80">
  rendererInputContract:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedContractSummary.hasRendererInputContract
    ? 'yes'
    : 'no'}
</div>
<div className="mt-1 text-purple-100/80">
  realRenderGate:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedContractSummary.hasRealRenderGate
    ? 'yes'
    : 'no'}
</div>
<div className="mt-1 text-purple-100/80">
  firstRealRenderPlan:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedContractSummary.hasFirstRealRenderPlan
    ? 'yes'
    : 'no'}
</div>
<div className="mt-1 text-purple-100/80">
  realRenderConfiguration:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedContractSummary.hasRealRenderConfiguration
    ? 'yes'
    : 'no'}
</div>
<div className="mt-1 text-purple-100/80">
  requestedTarget:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedContractSummary.requestedTarget || 'Unknown'}
</div>
<div className="mt-3 font-medium text-purple-100">
  Expected received configuration summary
</div>
<div className="mt-1 text-purple-100/80">
  configurationStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.configurationStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  audioStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.audioStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  rendererStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  rendererCandidateStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererCandidateStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  recommendedFirstRenderer:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstRenderer || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  rendererCandidateSelectedRenderer:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.rendererCandidateSelectedRenderer ||
    'none'}
</div>
<div className="mt-1 text-purple-100/80">
  outputFormatStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.outputFormatStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  recommendedFirstFormat:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstFormat || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  selectedFormat:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.selectedFormat || 'none'}
</div>
<div className="mt-1 text-purple-100/80">
  sampleRateStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.sampleRateStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  recommendedFirstSampleRateHz:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstSampleRateHz ??
    'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  selectedSampleRateHz:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.selectedSampleRateHz ?? 'none'}
</div>
<div className="mt-1 text-purple-100/80">
  storageStatus:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.storageStatus || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  recommendedFirstProvider:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.recommendedFirstProvider || 'Unknown'}
</div>
<div className="mt-1 text-purple-100/80">
  selectedProvider:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.selectedProvider || 'none'}
</div>
<div className="mt-1 text-purple-100/80">
  firstTargetKey:{' '}
  {realRenderRouteScaffoldSummary.expectedBlockedResponse
    .receivedConfigurationSummary.firstTargetKey || 'Unknown'}
</div>
    </div>

    {realRenderRouteScaffoldSummary.safetyRules.length > 0 ? (
      <div className="mt-3">
        <div className="font-medium">Safety rules:</div>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {realRenderRouteScaffoldSummary.safetyRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

{realRenderConfigurationSummary ? (
  <div className="mt-3 rounded border border-cyan-900 bg-cyan-950/20 p-3 text-xs leading-5 text-cyan-100">
    <div className="font-medium">Real-render configuration placeholders</div>

    <div className="mt-2 grid gap-2 md:grid-cols-2">
      <div>
        <div>
          Configuration status:{' '}
          {realRenderConfigurationSummary.configurationStatus || 'Unknown'}
        </div>
        <div>
          Audio status:{' '}
          {realRenderConfigurationSummary.audioStatus || 'Unknown'}
        </div>
        <div>
          First target:{' '}
          {realRenderConfigurationSummary.firstTarget.key || 'Unknown'} (
          {realRenderConfigurationSummary.firstTarget.status || 'Unknown'})
        </div>
      </div>

      <div>
        <div>
          Renderer:{' '}
          {realRenderConfigurationSummary.rendererImplementation
            .selectedRenderer || 'not connected'}{' '}
          (
          {realRenderConfigurationSummary.rendererImplementation.status ||
            'Unknown'}
          )
        </div>
        <div>
          Renderer candidate:{' '}
          {realRenderConfigurationSummary.rendererCandidatePlan
            .recommendedFirstRenderer || 'not declared'}{' '}
          (
          {realRenderConfigurationSummary.rendererCandidatePlan.status ||
            'Unknown'}
          )
        </div>
        <div>
          Format candidate:{' '}
          {realRenderConfigurationSummary.outputFormat.recommendedFirstFormat ||
            'not declared'}{' '}
          ({realRenderConfigurationSummary.outputFormat.status || 'Unknown'})
        </div>
        <div>
          Format selected:{' '}
          {realRenderConfigurationSummary.outputFormat.selectedFormat ||
            'not selected'}
        </div>
        {realRenderConfigurationSummary.outputFormat.reason ? (
          <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
            <div className="font-medium text-cyan-100">
              Output format candidate reason
            </div>
            <div className="mt-1 text-cyan-100/80">
              {realRenderConfigurationSummary.outputFormat.reason}
            </div>
          </div>
        ) : null}

        {realRenderConfigurationSummary.outputFormat.mustRemainBlockedUntil
          .length > 0 ? (
          <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
            <div className="font-medium text-cyan-100">
              Output format must remain blocked until
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-cyan-100/80">
              {realRenderConfigurationSummary.outputFormat.mustRemainBlockedUntil.map(
                (item) => (
                  <li key={item}>{item}</li>
                ),
              )}
            </ul>
          </div>
        ) : null}
       <div>
          Sample-rate candidate:{' '}
          {realRenderConfigurationSummary.sampleRate
            .recommendedFirstSampleRateHz ?? 'not declared'}{' '}
          Hz ({realRenderConfigurationSummary.sampleRate.status || 'Unknown'})
        </div>
        <div>
          Sample rate selected:{' '}
          {realRenderConfigurationSummary.sampleRate.selectedSampleRateHz ??
            'not selected'}
        </div>
        {realRenderConfigurationSummary.sampleRate.reason ? (
          <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
            <div className="font-medium text-cyan-100">
              Sample-rate candidate reason
            </div>
            <div className="mt-1 text-cyan-100/80">
              {realRenderConfigurationSummary.sampleRate.reason}
            </div>
          </div>
        ) : null}

        {realRenderConfigurationSummary.sampleRate.mustRemainBlockedUntil
          .length > 0 ? (
          <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
            <div className="font-medium text-cyan-100">
              Sample rate must remain blocked until
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-cyan-100/80">
              {realRenderConfigurationSummary.sampleRate.mustRemainBlockedUntil.map(
                (item) => (
                  <li key={item}>{item}</li>
                ),
              )}
            </ul>
          </div>
        ) : null}
        <div>
          Storage candidate:{' '}
          {realRenderConfigurationSummary.storage.recommendedFirstProvider ||
            'not declared'}{' '}
          ({realRenderConfigurationSummary.storage.status || 'Unknown'})
        </div>
        <div>
          Storage selected:{' '}
          {realRenderConfigurationSummary.storage.selectedProvider ||
            'not configured'}
        </div>
        {realRenderConfigurationSummary.storage.reason ? (
          <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
            <div className="font-medium text-cyan-100">
              Storage candidate reason
            </div>
            <div className="mt-1 text-cyan-100/80">
              {realRenderConfigurationSummary.storage.reason}
            </div>
          </div>
        ) : null}

        {realRenderConfigurationSummary.storage.mustRemainBlockedUntil.length > 0 ? (
          <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
            <div className="font-medium text-cyan-100">
              Storage must remain blocked until
            </div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-cyan-100/80">
              {realRenderConfigurationSummary.storage.mustRemainBlockedUntil.map(
                (item) => (
                  <li key={item}>{item}</li>
                ),
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>

    {realRenderConfigurationSummary.rendererCandidatePlan.reason ? (
      <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
        <div className="font-medium text-cyan-100">
          Renderer candidate reason
        </div>
        <div className="mt-1 text-cyan-100/80">
          {realRenderConfigurationSummary.rendererCandidatePlan.reason}
        </div>
      </div>
    ) : null}

    {realRenderConfigurationSummary.rendererCandidatePlan
      .mustRemainBlockedUntil.length > 0 ? (
      <div className="mt-2 rounded border border-cyan-900 bg-gray-950 p-3">
        <div className="font-medium text-cyan-100">
          Must remain blocked until
        </div>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-cyan-100/80">
          {realRenderConfigurationSummary.rendererCandidatePlan.mustRemainBlockedUntil.map(
            (item) => (
              <li key={item}>{item}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}

    {realRenderConfigurationSummary.unlockRequirements.length > 0 ? (
      <div className="mt-2">
        <div className="font-medium">Unlock requirements:</div>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {realRenderConfigurationSummary.unlockRequirements.map(
            (requirement) => (
              <li key={requirement}>{requirement}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}
  </div>
) : null}

    <pre className="mt-3 max-h-96 overflow-auto rounded bg-black p-3 text-xs leading-5 text-gray-300">
      {JSON.stringify(dryRunArtifactPackage, null, 2)}
    </pre>
  </details>
) : null}




    {audioPreviewRenderResponse ? (
      <details className="rounded border border-gray-800 bg-gray-950 p-4">
        <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-gray-500">
          Audio preview dry-run response
        </summary>

        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
          {audioPreviewRenderResponse}
        </pre>
      </details>
    ) : null}

    {audioPreviewResponse ? (
      <details className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
        <summary className="cursor-pointer text-xs font-medium text-gray-300">
          Show raw preview response JSON
        </summary>



        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-3 text-xs leading-5 text-gray-300">
          {audioPreviewResponse}
        </pre>
      </details>
    ) : null}
  </div>
) : null}

    {audioPreviewSpecPreview ? (
      <details className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-200">
          Preview audio spec JSON
        </summary>

        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-gray-950 p-3 text-xs leading-5 text-gray-300">
          {audioPreviewSpecPreview}
        </pre>
      </details>
    ) : null}
   </div>

<>
  <div className="mt-3 grid gap-2 lg:grid-cols-2">
    {audioGuideReadiness.checks.map((check) => (
      <div
        key={check.label}
        className="rounded border border-gray-800 bg-gray-900 p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-200">
            {check.label}
          </div>
          <div
            className={`text-xs ${
              check.passed ? 'text-green-300' : 'text-yellow-300'
            }`}
          >
            {check.passed ? 'Available' : 'Needs attention'}
          </div>
        </div>

        <div className="mt-1 text-xs leading-5 text-gray-500">
          {check.detail}
        </div>
      </div>
    ))}
  </div>




<div className="rounded border border-gray-800 bg-gray-950 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Performance design notes
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Human-readable notes for remembering how the song is intended to be performed.
      </p>
    </div>

    <button
      type="button"
      onClick={() => copyPerformanceDesignNotes()}
      disabled={!performanceDesignNotesPreview}
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {justCopiedPerformanceDesignNotes ? 'Copied ✓' : 'Copy design notes'}
    </button>
  </div>

  <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-4 text-sm leading-6 text-gray-100">
    {performanceDesignNotesPreview ||
      'No performance design notes yet. Generate chords with performance intent to create this summary.'}
  </pre>
</div>
</>

    <div className="rounded border border-gray-800 bg-gray-950 p-4">
      <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
      Performance songsheet quality
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Checks placement, lyric match, server validation, and source coverage.
        </div>
      </div>

      <button
        type="button"
        onClick={() => copySongsheetReview()}
        disabled={!hasUsableChordData()}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {justCopiedSongsheetReview ? 'Copied ✓' : 'Copy review'}
      </button>
    </div>

          <button
            type="button"
            onClick={() => fixOutOfRangeChordPlacements()}
            disabled={placedSongSheetQuality.outOfRangeChords === 0}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            Move after-lyric chords inside line
          </button>
        </div>

      <div className="mt-2 text-gray-300">
        {placedSongSheetQuality.label}
      </div>

      <div className="mt-1 text-sm text-gray-500">
        {placedSongSheetQuality.detail}
      </div>





      <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          Lines: {placedSongSheetQuality.totalLines}
        </div>
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          Lines with chords: {placedSongSheetQuality.linesWithChords}
        </div>
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          Total chords: {placedSongSheetQuality.totalChords}
        </div>
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          Start-of-line chords: {placedSongSheetQuality.zeroIndexChords}
        </div>
        <div className="rounded border border-gray-800 bg-gray-900 p-3">
          After-lyric chords: {placedSongSheetQuality.outOfRangeChords ?? 0}
        </div>
      </div>

      {placedSongSheetQuality.warning && (
        <div className="mt-3 rounded border border-yellow-900/60 bg-yellow-950/30 p-3 text-sm text-yellow-200">
          {placedSongSheetQuality.warning}
        </div>
      )}
      {placedSongSheetQuality.placementIssues.length > 0 && (
  <div className="mt-3 rounded border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
    <div className="font-medium">
      Placement review items
    </div>

    <div className="mt-2 space-y-2">
      {placedSongSheetQuality.placementIssues.slice(0, 5).map((issue) => (
        <div
          key={`${issue.lineNumber}-${issue.chord}-${issue.charIndex}`}
          className="rounded border border-red-900/50 bg-red-950/30 p-2"
        >
          <div>
            Line {issue.lineNumber} · {issue.section} · chord {issue.chord}
          </div>
          <div className="mt-1 text-xs text-red-300">
            charIndex {issue.charIndex} falls after the final lyric character index {issue.maxIndex}
          </div>
          <div className="mt-1 text-xs text-red-300">
            {issue.lyric}
          </div>



        </div>
      ))}
    </div>

    {placedSongSheetQuality.placementIssues.length > 5 && (
          <div className="mt-2 text-xs text-red-300">
            Showing first 5 of {placedSongSheetQuality.placementIssues.length} issues.
          </div>
        )}
      </div>
    )}
    </div>

    <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
  <div className="flex items-center justify-between gap-3">
    <div className="text-sm font-medium text-gray-200">
      Source lyric match
    </div>

    <div
      className={`text-xs ${
        placedSongsheetSourceMatch.isChecking
          ? 'text-blue-300'
          : placedSongsheetSourceMatch.unmatchedCount > 0
            ? 'text-yellow-300'
            : 'text-green-300'
      }`}
    >
      {placedSongsheetSourceMatch.isChecking
        ? 'Checking'
        : placedSongsheetSourceMatch.unmatchedCount > 0
          ? 'Review'
          : 'OK'}
    </div>

    {songsheetServerValidation.hasValidation ? (
  <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-medium text-gray-200">
        Server validation
      </div>

      <div
        className={`text-xs ${
          songsheetServerValidation.rejectedLineCount > 0
            ? 'text-yellow-300'
            : 'text-green-300'
        }`}
      >
        {songsheetServerValidation.rejectedLineCount > 0
          ? 'Rejected lines'
          : 'Accepted'}
      </div>
    </div>

    <div className="mt-3 rounded border border-gray-800 bg-gray-900 p-3">
  <div className="flex items-center justify-between gap-3">
    <div className="text-sm font-medium text-gray-200">
      Source lyric coverage
    </div>

    <div
          className={`text-xs ${
            placedSongsheetSourceCoverage.isChecking
              ? 'text-blue-300'
              : placedSongsheetSourceCoverage.missingLineCount > 0
                ? 'text-yellow-300'
                : 'text-green-300'
          }`}
        >
          {placedSongsheetSourceCoverage.isChecking
            ? 'Checking'
            : placedSongsheetSourceCoverage.missingLineCount > 0
              ? 'Incomplete'
              : 'Covered'}
        </div>
  </div>

  <div className="mt-1 text-xs leading-5 text-gray-500">
    {placedSongsheetSourceCoverage.label}
  </div>

  <div className="mt-1 text-xs leading-5 text-gray-500">
    {placedSongsheetSourceCoverage.detail}
  </div>

  {placedSongsheetSourceCoverage.missingLines.length > 0 ? (
    <div className="mt-3 grid gap-2">
      {placedSongsheetSourceCoverage.missingLines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          className="rounded border border-yellow-900 bg-yellow-950/20 p-2 text-xs leading-5 text-yellow-100"
        >
          {line}
        </div>
      ))}
    </div>
  ) : null}
</div>

    <div className="mt-1 text-xs leading-5 text-gray-500">
      Source lines: {songsheetServerValidation.sourceLineCount}
    </div>

    <div className="mt-1 text-xs leading-5 text-gray-500">
      Accepted placed lines: {songsheetServerValidation.acceptedLineCount}
    </div>

    <div className="mt-1 text-xs leading-5 text-gray-500">
      Rejected rewritten lines: {songsheetServerValidation.rejectedLineCount}
    </div>

    {songsheetServerValidation.rejectedLines.length > 0 ? (
      <div className="mt-3 grid gap-2">
        {songsheetServerValidation.rejectedLines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            className="rounded border border-yellow-900 bg-yellow-950/20 p-2 text-xs leading-5 text-yellow-100"
          >
            {line}
          </div>
        ))}
      </div>
    ) : null}
  </div>
) : null}

  </div>

  <div className="mt-1 text-xs leading-5 text-gray-500">
    {placedSongsheetSourceMatch.label}
  </div>

  <div className="mt-1 text-xs leading-5 text-gray-500">
    {placedSongsheetSourceMatch.detail}
  </div>

  {placedSongsheetSourceMatch.unmatchedLines.length > 0 ? (
    <div className="mt-3 grid gap-2">
      {placedSongsheetSourceMatch.unmatchedLines.map((line, index) => (
        <div
          key={`${line.section}-${line.lyric}-${index}`}
          className="rounded border border-yellow-900 bg-yellow-950/20 p-2 text-xs leading-5 text-yellow-100"
        >
          <div className="font-medium">
            {line.section || 'Unknown section'}
          </div>
          <div className="mt-1 text-yellow-200">
            {line.lyric}
          </div>
        </div>
      ))}
    </div>
  ) : null}
</div>


   <div className="rounded border border-gray-800 bg-gray-950 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Performance songsheet preview
      </div>
     <p className="mt-1 text-sm text-gray-500">
      Chords placed above the lyric position where the change happens.
      {getOriginalKeyLabel()
        ? ` Key metadata: ${getOriginalKeyLabel()}. Use transpose controls to change actual chord symbols.`
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
      onClick={() => resetOrUndoChordTranspose()}
      disabled={
        !placedSongSheetPreview ||
        (chordTransposeSemitones === 0 && !lastAppliedTransposeSnapshot)
      }
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {chordTransposeSemitones !== 0
        ? 'Reset'
        : lastAppliedTransposeSnapshot
          ? 'Undo apply'
          : 'Reset'}
    </button>

  <button
  type="button"
  onClick={() => applyTransposeToChordEditor()}
  disabled={!placedSongSheetPreview || chordTransposeSemitones === 0}
  className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
>
  Apply transpose
</button>

<button
  type="button"
  onClick={() => copyAudioGuidePrompt()}
  disabled={!placedSongSheetPreview}
  className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
>
  {justCopiedAudioGuidePrompt ? 'Copied ✓' : 'Copy audio guide prompt'}
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
        Audio guide prompt preview
      </div>
      <p className="mt-1 text-sm text-gray-500">
        A sparse guide-track prompt designed to preserve tempo, groove, phrasing, and chord timing.
      </p>
    </div>

    <button
      type="button"
      onClick={() => copyAudioGuidePrompt()}
      disabled={!audioGuidePromptPreview}
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {justCopiedAudioGuidePrompt ? 'Copied ✓' : 'Copy audio guide prompt'}
    </button>
  </div>

  <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-4 text-sm leading-6 text-gray-100">
    {audioGuidePromptPreview ||
      'No audio guide prompt yet. Generate or paste chord JSON with performance songsheet placement data.'}
  </pre>
</div>

<div className="rounded border border-gray-800 bg-gray-950 p-4">
<div
  className={`mt-3 rounded border px-3 py-2 text-xs leading-5 ${
    fullPackAudioPreviewStatus.tone === 'ready'
      ? 'border-green-900 bg-green-950/20 text-green-100'
      : fullPackAudioPreviewStatus.tone === 'review'
        ? 'border-yellow-900 bg-yellow-950/20 text-yellow-100'
        : 'border-gray-800 bg-gray-950 text-gray-400'
  }`}
>
  <div className="font-medium">
    {fullPackAudioPreviewStatus.label}
  </div>
  <div className="mt-1">
    {fullPackAudioPreviewStatus.detail}
  </div>
</div>
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Full performance pack
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Combined copy of songsheet, design notes, and audio guide prompt for rehearsal or archiving.
      </p>
    </div>

    <button
      type="button"
      onClick={() => copyFullPerformancePack()}
      disabled={!fullPerformancePackPreview}
      className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
    >
      {justCopiedFullPerformancePack ? 'Copied ✓' : 'Copy full pack'}
    </button>
  </div>

  <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-4 text-sm leading-6 text-gray-100">
    {fullPerformancePackPreview ||
      'No full performance pack yet. Generate chords with performance songsheet placement data to create this bundle.'}
  </pre>
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

<div className="rounded border border-gray-800 bg-gray-950 p-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
  <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
    Chord workflow status
  </div>

  <button
    type="button"
    onClick={() => nextChordWorkflowAction.action?.()}
    disabled={nextChordWorkflowAction.disabled}
    className="rounded border border-blue-600 bg-blue-950/50 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-transparent disabled:text-gray-500"
  >
    {nextChordWorkflowAction.label}
  </button>
</div>

{nextChordWorkflowAction.label.includes('anyway') ? (
  <div className="mt-3 rounded border border-yellow-900 bg-yellow-950/20 px-3 py-2 text-xs leading-5 text-yellow-100">
    The placed songsheet has review warnings. You can continue to the guide plan, but check lyric match, validation, and coverage before treating the songsheet as final.
  </div>
) : null}

{songsheetReviewSummaryLine ? (
  <div className="mt-3 rounded border border-yellow-900 bg-yellow-950/20 px-3 py-2 text-xs leading-5 text-yellow-100">
    {songsheetReviewSummaryLine}
  </div>
) : null}

  <div
      className={`mt-2 ${
        chordWorkflowStatus.activeProcess ? 'text-blue-300' : 'text-gray-300'
      }`}
    >
      {chordWorkflowStatus.label}
    </div>

  <div className="mt-1 text-sm text-gray-500">
    {chordWorkflowStatus.detail}
  </div>

  {chordWorkflowStatus.activeProcess ? (
      <div className="mt-3 rounded border border-blue-900 bg-blue-950/40 px-3 py-2 text-sm text-blue-200">
        {chordWorkflowStatus.activeProcess}
      </div>
    ) : null}

  <div className="mt-3 grid gap-2 lg:grid-cols-3">
    {chordWorkflowStatus.steps.map((step) => (
      <div
        key={step.label}
        className="rounded border border-gray-800 bg-gray-900 p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-200">
            {step.label}
          </div>

          <div
          className={`text-xs ${
            step.working
              ? 'text-blue-300'
              : step.review
                ? 'text-yellow-300'
                : step.complete
                  ? 'text-green-300'
                  : 'text-yellow-300'
          }`}
        >
          {step.working
            ? 'Working'
            : step.review
              ? 'Review'
              : step.complete
                ? 'Done'
                : 'Next'}
        </div>
        </div>

        <div className="mt-1 text-xs leading-5 text-gray-500">
          {step.detail}
        </div>
      </div>
    ))}
  </div>
</div>

{chordGenerationMetaRows.length > 0 ? (
  <div className="rounded border border-gray-800 bg-gray-950 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm font-medium uppercase tracking-wide text-gray-500">
        Last staged generation
      </div>

      <button
        type="button"
        onClick={() => copyChordGenerationUsage()}
        disabled={!chordGenerationHistorySummary.hasHistory}
        className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
      >
        {justCopiedGenerationUsage ? 'Copied ✓' : 'Copy usage'}
      </button>
    </div>

    <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      {chordGenerationMetaRows.map((row) => (
            <div
              key={row.label}
              className="rounded border border-gray-800 bg-gray-900 p-3"
            >
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        {row.label}
                      </div>

                      <div className="mt-1 text-sm text-gray-300">
                        {row.value}
                      </div>
            </div>
      ))}
    </div>

    {chordGenerationHistorySummary.hasHistory ? (
  <div className="mt-4 rounded border border-gray-800 bg-gray-900 p-3">
    <div className="text-sm font-medium text-gray-200">
      Staged workflow totals
    </div>

    <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-5">
      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Stages run
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {chordGenerationHistorySummary.stageCount}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Total duration
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {chordGenerationHistorySummary.totalDurationSeconds.toFixed(1)}s
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Input tokens
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {chordGenerationHistorySummary.totalInputTokens.toLocaleString()}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Output tokens
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {chordGenerationHistorySummary.totalOutputTokens.toLocaleString()}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-950 p-3">
        <div className="text-xs uppercase tracking-wide text-gray-500">
          Total tokens
        </div>
        <div className="mt-1 text-sm text-gray-300">
          {chordGenerationHistorySummary.totalTokens.toLocaleString()}
        </div>
      </div>
    </div>

    {chordGenerationUsageWarning.hasWarning ? (
  <div className="mt-3 rounded border border-yellow-900 bg-yellow-950/20 px-3 py-2 text-xs leading-5 text-yellow-100">
    <div className="font-medium">
      {chordGenerationUsageWarning.label}
    </div>
    <div className="mt-1 text-yellow-200">
      {chordGenerationUsageWarning.detail}
    </div>
  </div>
) : null}


    {chordGenerationHistorySummary.routes.length > 0 ? (
      <div className="mt-3 text-xs leading-5 text-gray-500">
        Routes: {chordGenerationHistorySummary.routes.join(' → ')}
      </div>
    ) : null}

{chordGenerationHistoryRows.length > 0 ? (
  <details className="mt-3 rounded border border-gray-800 bg-gray-950 p-3">
    <summary className="cursor-pointer text-xs font-medium text-gray-300">
      Show staged generation history
    </summary>

    <div className="mt-3 grid gap-3">
      {chordGenerationHistoryRows.map((row) => (
        <div
          key={`${row.stage}-${row.route}-${row.generatedAt}`}
          className="rounded border border-gray-800 bg-gray-900 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-gray-200">
              Stage {row.stage}: {row.route}
            </div>

            <div className="text-xs text-gray-500">
              {row.generatedAt}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Model
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.model}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Duration
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.duration}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Input
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.inputTokens}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Output
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.outputTokens}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Total
              </div>
              <div className="mt-1 text-sm text-gray-300">
                {row.totalTokens}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </details>
) : null}

  </div>
) : null}

  </div>
) : null}

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

          <div className="mb-3 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-xs leading-5 text-gray-400">
              Manual generation controls. The recommended path is the Chord workflow status button above.
              Generate full draft is an advanced all-in-one option and may take longer.
            </div>

            <button
              type="button"
              onClick={() => generateChords()}
              disabled={generatingChords || !performanceSheet.trim()}
              className="rounded border border-gray-800 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-900 disabled:cursor-not-allowed disabled:text-gray-600"
            >
              {generatingChords ? 'Generating full draft...' : 'Generate full draft'}
            </button>

            <button
              type="button"
              onClick={() => generateBasicChords()}
              disabled={generatingBasicChords || generatingChords || !performanceSheet.trim()}
              className="rounded border border-gray-700 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {generatingBasicChords ? 'Generating basic...' : 'Generate basic draft'}
            </button>

            <button
              type="button"
              onClick={() => generatePlacedSongsheet()}
              disabled={
                generatingPlacedSongsheet ||
                generatingBasicChords ||
                generatingChords ||
                !performanceSheet.trim() ||
                !hasUsableChordData()
              }
              className="rounded border border-gray-700 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {generatingPlacedSongsheet
                ? 'Generating songsheet...'
                : 'Generate placed songsheet'}
            </button>

            <button
              type="button"
              onClick={() => generateGuideTrackPlan()}
              disabled={
                generatingGuideTrackPlan ||
                generatingPlacedSongsheet ||
                generatingBasicChords ||
                generatingChords ||
                !performanceSheet.trim() ||
                !hasUsableChordData()
              }
              className="rounded border border-gray-700 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {generatingGuideTrackPlan
                ? 'Generating guide plan...'
                : 'Generate guide plan'}
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
        resetAudioPreviewRequestState()
        setLastAppliedTransposeSnapshot(null)
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
