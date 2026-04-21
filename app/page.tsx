// /app/page.tsx

'use client'

import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { createClient } from '@/lib/supabase/client'
import SongSheet from '@/components/SongSheet'
import SectionJumpButtons from '@/components/SectionJumpButtons'
import {
  buildPreviewBars,
  findMatchingSectionId,
  parsePerformanceSections,
  removeChordLinesFromSheet,
  transposeTextPreservingLayout,
} from '@/lib/parseSong'
import {
  chordSymbolToBassNote,
  chordSymbolToNotes,
  ensurePreviewInstruments,
  scheduleBalladStrum,
  scheduleBassForBar,
  scheduleClickForBar,
  scheduleCountryTrain,
  scheduleFingerpick,
  schedulePianoBlock,
  schedulePlaybackFollowForBar,
  stopPreviewPlayback as stopPreviewPlaybackEngine,
} from '@/lib/previewEngine'
import {
  ArtistDNAProfile,
  ChordResponse,
  ChordRewriteMode,
  ChordVersionRecord,
  DNAAnalysisInput,
  FormState,
  GenerateResponse,
  PreviewBarMeta,
  PreviewFeel,
  PreviewInstrument,
  PreviewPattern,
  PreviewSectionKey,
  Project,
  ProjectSortKey,
  RewriteMode,
  SongVersionRecord,
  SortDirection,
} from '@/types/song'

const defaultForm: FormState = {
  genre: '',
  moods: [],
  theme: '',
  hook: '',
  dnaId: 'mpj-master',
}

const defaultArtistDNA: ArtistDNAProfile = {
  artist_name: '',
  vocal_range: '',
  core_genres: '',
  lyrical_style: '',
  emotional_tone: '',
  writing_strengths: '',
  avoid_list: '',
  visual_style: '',
  performance_style: '',
  dna_summary: '',
}

const defaultDNAAnalysisInput: DNAAnalysisInput = {
  lyrics_samples: '',
  chord_examples: '',
  artist_references: '',
  self_description: '',
}

const dnaOptions = [
  { id: 'mpj-master', label: 'MPJ Master' },
  { id: 'commercial-hit', label: 'Commercial Hit' },
  { id: 'raw-folk', label: 'Raw Folk' },
]

const genreOptions = [
  'Modern Country',
  'Acoustic Folk',
  'Folk Rock',
  'Indie Pop',
  'Bedroom Pop',
  'Blues Ballad',
  'Cinematic Americana',
  'Festival Anthem',
]

const moodOptions = ['Reflective', 'Hopeful', 'Melancholic', 'Heartfelt', 'Gritty', 'Warm']

const rewriteButtons: Array<{ mode: RewriteMode; label: string }> = [
  { mode: 'strengthen_chorus', label: 'Strengthen Chorus' },
  { mode: 'more_conversational', label: 'More Conversational' },
  { mode: 'more_poetic', label: 'More Poetic' },
  { mode: 'more_universal', label: 'More Universal' },
  { mode: 'more_personal', label: 'More Personal' },
  { mode: 'simplify_lyrics', label: 'Simplify Lyrics' },
  { mode: 'improve_opening_line', label: 'Improve Opening Line' },
  { mode: 'tighten_live', label: 'Tighten for Live' },
]

const chordRewriteButtons: Array<{ mode: ChordRewriteMode; label: string }> = [
  { mode: 'lift_chorus', label: 'Make Chorus Lift Harder' },
  { mode: 'simpler_live', label: 'Simpler Live Version' },
  { mode: 'richer_chords', label: 'Richer Colour Chords' },
  { mode: 'better_bridge', label: 'Better Bridge Contrast' },
  { mode: 'baritone_key', label: 'Baritone-Friendly Key' },
  { mode: 'capo_friendly', label: 'Capo-Friendly Version' },
]

async function readJsonSafe(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Non-JSON response from ${res.url}: ${text.slice(0, 200)}`)
  }
}

function formatUkDateTime(value?: string) {
  if (!value) return ''

  let normalized = value.trim()
  const hasTimezone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(normalized)
  if (!hasTimezone) normalized = `${normalized}Z`

  return new Date(normalized).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Home() {
  const supabase = useMemo(() => createClient(), [])
  const latestProjectLoadRef = useRef(0)
  const performanceScrollRef = useRef<HTMLDivElement | null>(null)
  const performanceIntervalRef = useRef<number | null>(null)
  const performanceSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const previewEventIdsRef = useRef<number[]>([])
  const previewChordInstrumentRef = useRef<Tone.PolySynth | null>(null)
  const previewBassSynthRef = useRef<Tone.MonoSynth | null>(null)
  const previewClickSynthRef = useRef<Tone.MembraneSynth | null>(null)
  const lastFollowedSectionIdRef = useRef<string | null>(null)

  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [projectMessage, setProjectMessage] = useState('')

  const [projectSortKey, setProjectSortKey] = useState<ProjectSortKey>('updated_at')
  const [projectSortDirection, setProjectSortDirection] = useState<SortDirection>('desc')

  const [autoSave, setAutoSave] = useState(true)

  const [form, setForm] = useState<FormState>(defaultForm)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [chords, setChords] = useState<ChordResponse | null>(null)
  const [songSheet, setSongSheet] = useState('')
  const [editableLyrics, setEditableLyrics] = useState('')

  const [songVersions, setSongVersions] = useState<SongVersionRecord[]>([])
  const [chordVersions, setChordVersions] = useState<ChordVersionRecord[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  const [activeSongVersionId, setActiveSongVersionId] = useState<string | null>(null)
  const [activeChordVersionId, setActiveChordVersionId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [chordLoading, setChordLoading] = useState(false)
  const [songSheetLoading, setSongSheetLoading] = useState(false)
  const [rewriteLoading, setRewriteLoading] = useState<RewriteMode | null>(null)
  const [chordRewriteLoading, setChordRewriteLoading] = useState<ChordRewriteMode | null>(null)

  const [manualSongSaveLoading, setManualSongSaveLoading] = useState(false)
  const [manualChordSaveLoading, setManualChordSaveLoading] = useState(false)
  const [duplicateProjectLoading, setDuplicateProjectLoading] = useState(false)
  const [renameProjectLoading, setRenameProjectLoading] = useState(false)
  const [deleteProjectLoading, setDeleteProjectLoading] = useState(false)
  const [importLyricsLoading, setImportLyricsLoading] = useState(false)
  const [saveEditedLyricsLoading, setSaveEditedLyricsLoading] = useState(false)

  const [artistDNA, setArtistDNA] = useState<ArtistDNAProfile>(defaultArtistDNA)
  const [artistDNALoading, setArtistDNALoading] = useState(false)
  const [artistDNASaving, setArtistDNASaving] = useState(false)
  const [artistDNAMessage, setArtistDNAMessage] = useState('')

  const [dnaAnalysisInput, setDNAAnalysisInput] = useState<DNAAnalysisInput>(defaultDNAAnalysisInput)
  const [dnaAnalyzing, setDNAAnalyzing] = useState(false)
  const [dnaAnalyzerMessage, setDNAAnalyzerMessage] = useState('')

  const [manualVersionName, setManualVersionName] = useState('')
  const [importLyricsTitle, setImportLyricsTitle] = useState('Imported Lyrics')

  const [transposeAmount, setTransposeAmount] = useState(0)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [performanceShowChords, setPerformanceShowChords] = useState(true)
  const [performanceScrollSpeed, setPerformanceScrollSpeed] = useState(2)
  const [performanceIsScrolling, setPerformanceIsScrolling] = useState(false)
  const [performanceFontSize, setPerformanceFontSize] = useState(28)
  const [activePerformanceSectionId, setActivePerformanceSectionId] = useState<string | null>(null)

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
  const [currentPreviewBarIndex, setCurrentPreviewBarIndex] = useState(0)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setAuthLoading(true)
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setUser(data.session?.user ?? null)
      } catch (err) {
        console.error('Failed to load auth session', err)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    return () => {
      if (performanceIntervalRef.current) {
        window.clearInterval(performanceIntervalRef.current)
      }
    }
  }, [])

  const stopPreviewPlayback = () => {
    stopPreviewPlaybackEngine({
      previewEventIdsRef,
      previewChordInstrumentRef,
      lastFollowedSectionIdRef,
      setPreviewPlaying,
    })
    setCurrentPreviewBarIndex(0)
  }

  useEffect(() => {
    return () => {
      stopPreviewPlayback()
      previewChordInstrumentRef.current?.dispose()
      previewBassSynthRef.current?.dispose()
      previewClickSynthRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!performanceIsScrolling) {
      if (performanceIntervalRef.current) {
        window.clearInterval(performanceIntervalRef.current)
        performanceIntervalRef.current = null
      }
      return
    }

    if (performanceIntervalRef.current) {
      window.clearInterval(performanceIntervalRef.current)
    }

    performanceIntervalRef.current = window.setInterval(() => {
      const el = performanceScrollRef.current
      if (!el) return
      el.scrollTop += performanceScrollSpeed
    }, 60)

    return () => {
      if (performanceIntervalRef.current) {
        window.clearInterval(performanceIntervalRef.current)
        performanceIntervalRef.current = null
      }
    }
  }, [performanceIsScrolling, performanceScrollSpeed])

  const sortedProjects = useMemo(() => {
    const next = [...projects]
    next.sort((a, b) => {
      if (projectSortKey === 'title') {
        const av = (a.title || '').toLowerCase()
        const bv = (b.title || '').toLowerCase()
        if (av < bv) return projectSortDirection === 'asc' ? -1 : 1
        if (av > bv) return projectSortDirection === 'asc' ? 1 : -1
        return 0
      }

      const av = a.updated_at || a.created_at || ''
      const bv = b.updated_at || b.created_at || ''
      if (av < bv) return projectSortDirection === 'asc' ? -1 : 1
      if (av > bv) return projectSortDirection === 'asc' ? 1 : -1
      return 0
    })
    return next
  }, [projects, projectSortKey, projectSortDirection])

  const transposedSongSheet = useMemo(() => {
    return transposeTextPreservingLayout(songSheet, transposeAmount)
  }, [songSheet, transposeAmount])

  const performanceSheet = useMemo(() => {
    const base = performanceShowChords ? transposedSongSheet : removeChordLinesFromSheet(transposedSongSheet)
    return base
  }, [performanceShowChords, transposedSongSheet])

  const performanceSections = useMemo(() => {
    return parsePerformanceSections(performanceSheet)
  }, [performanceSheet])

  const activePerformanceSectionIndex = useMemo(() => {
    if (!performanceSections.length) return -1
    return performanceSections.findIndex((section) => section.id === activePerformanceSectionId)
  }, [performanceSections, activePerformanceSectionId])

  const nextPerformanceSection = useMemo(() => {
    if (activePerformanceSectionIndex === -1) return performanceSections[0] || null
    return performanceSections[activePerformanceSectionIndex + 1] || null
  }, [performanceSections, activePerformanceSectionIndex])

  const transposedKey = useMemo(() => {
    if (!chords?.key) return ''
    return transposeTextPreservingLayout(chords.key, transposeAmount)
  }, [chords?.key, transposeAmount])

  const transposedCapoHint = useMemo(() => {
    if (transposeAmount === 0) return chords?.capo || ''
    if (chords?.capo && /^\d+$/.test(chords.capo)) {
      return chords.capo
    }
    return ''
  }, [chords?.capo, transposeAmount])

  const previewBars = useMemo(() => {
    const transposedChordData: ChordResponse | null = chords
      ? {
          ...chords,
          key: transposeTextPreservingLayout(chords.key || '', transposeAmount),
          verse: transposeTextPreservingLayout(chords.verse || '', transposeAmount),
          chorus: transposeTextPreservingLayout(chords.chorus || '', transposeAmount),
          bridge: transposeTextPreservingLayout(chords.bridge || '', transposeAmount),
        }
      : null

    return buildPreviewBars(transposedChordData, previewSection)
  }, [chords, previewSection, transposeAmount])

  const previewBarMeta = useMemo<PreviewBarMeta[]>(() => {
    return previewBars.map((bar, index) => ({
      barIndex: index,
      label: bar.label,
      chord: bar.chord,
      sectionId: findMatchingSectionId(bar.label, performanceSections),
    }))
  }, [previewBars, performanceSections])

  useEffect(() => {
    if (previewPattern === 'piano_block') {
      setPreviewInstrument('piano')
    } else {
      setPreviewInstrument((current) => (current === 'piano' ? 'guitar' : current))
    }
  }, [previewPattern])

  const toggleProjectSort = (key: ProjectSortKey) => {
    if (projectSortKey === key) {
      setProjectSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setProjectSortKey(key)
      setProjectSortDirection(key === 'title' ? 'asc' : 'desc')
    }
  }

  const stopPerformanceScroll = () => {
    setPerformanceIsScrolling(false)
    if (performanceIntervalRef.current) {
      window.clearInterval(performanceIntervalRef.current)
      performanceIntervalRef.current = null
    }
  }

  const resetPerformanceScroll = () => {
    stopPerformanceScroll()
    if (performanceScrollRef.current) {
      performanceScrollRef.current.scrollTop = 0
    }
    setActivePerformanceSectionId(performanceSections[0]?.id || null)
  }

  const syncActivePerformanceSection = () => {
    const container = performanceScrollRef.current
    if (!container || performanceSections.length === 0) {
      setActivePerformanceSectionId(null)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const markerY = containerRect.top + Math.min(120, containerRect.height * 0.22)

    let bestId = performanceSections[0].id
    let bestDistance = Number.POSITIVE_INFINITY

    for (const section of performanceSections) {
      const el = performanceSectionRefs.current[section.id]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const distance = Math.abs(rect.top - markerY)

      if (rect.top <= markerY + 8) {
        if (distance <= bestDistance) {
          bestDistance = distance
          bestId = section.id
        }
      }
    }

    setActivePerformanceSectionId((prev) => (prev === bestId ? prev : bestId))
  }

  const jumpToPerformanceSection = (sectionId: string) => {
    const container = performanceScrollRef.current
    const target = performanceSectionRefs.current[sectionId]

    if (!container || !target) return

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const top = container.scrollTop + (targetRect.top - containerRect.top) - 12

    container.scrollTo({
      top,
      behavior: 'smooth',
    })

    setActivePerformanceSectionId(sectionId)
  }

  const findFirstPreviewBarIndexForSection = (sectionId: string) => {
    const exact = previewBarMeta.find((bar) => bar.sectionId === sectionId)
    if (exact) return exact.barIndex

    const section = performanceSections.find((item) => item.id === sectionId)
    if (!section) return -1

    const normalized = section.label.trim().toLowerCase()

    const loose = previewBarMeta.find((bar) => {
      const barLabel = bar.label.trim().toLowerCase()
      return normalized === barLabel || normalized.includes(barLabel) || barLabel.includes(normalized)
    })

    return loose ? loose.barIndex : -1
  }

  const startPreviewPlaybackFromBar = async (startBarIndex = 0) => {
    try {
      if (!previewBars.length) {
        setProjectMessage('No previewable chord bars found. Generate or load chords first.')
        return
      }

      const safeStartBarIndex = Math.max(0, Math.min(startBarIndex, previewBars.length - 1))

      await Tone.start()
      setPreviewReady(true)

      stopPreviewPlayback()

      ensurePreviewInstruments({
        previewInstrument,
        previewChordInstrumentRef,
        previewBassSynthRef,
        previewClickSynthRef,
      })

      if (followPlayback) {
        stopPerformanceScroll()
      }

      const transport = Tone.getTransport()
      const chordSynth = previewChordInstrumentRef.current
      if (!chordSynth) {
        setProjectMessage('Preview instrument could not be created.')
        return
      }

      transport.bpm.value = previewTempo
      transport.timeSignature = 4
      transport.loop = previewLoop
      transport.loopStart = 0
      transport.loopEnd = `${previewBars.length}m`
      transport.swing = previewFeel === 'swing' ? 0.25 : 0
      transport.swingSubdivision = '8n'

      previewBars.forEach((bar, index) => {
        const chordNotes = chordSymbolToNotes(bar.chord, 4)
        const bassNote = chordSymbolToBassNote(bar.chord, 2)
        const barMeta = previewBarMeta[index]

        const barPositionId = transport.schedule(() => {
          setCurrentPreviewBarIndex(index)
        }, `${index}m`)
        previewEventIdsRef.current.push(barPositionId)

        if (barMeta) {
          schedulePlaybackFollowForBar({
            transport,
            barMeta,
            index,
            followPlayback,
            performanceMode,
            lastFollowedSectionIdRef,
            setActivePerformanceSectionId,
            jumpToPerformanceSection: () => {},
            previewEventIdsRef,
          })
        }

        if (previewPattern === 'piano_block') {
          schedulePianoBlock({
            transport,
            chordSynth,
            chordNotes,
            index,
            previewEventIdsRef,
          })
        } else if (previewPattern === 'country_train') {
          scheduleCountryTrain({
            transport,
            chordSynth,
            chordNotes,
            bassNote,
            index,
            previewBassSynthRef,
            previewEventIdsRef,
          })
        } else if (previewPattern === 'fingerpick') {
          scheduleFingerpick({
            transport,
            chordSynth,
            chordNotes,
            bassNote,
            index,
            previewEventIdsRef,
          })
        } else {
          scheduleBalladStrum({
            transport,
            chordSynth,
            chordNotes,
            index,
            previewFeel,
            previewEventIdsRef,
          })
        }

        if (previewPattern !== 'country_train' && previewPattern !== 'fingerpick') {
          scheduleBassForBar({
            transport,
            index,
            bassNote,
            pattern: previewPattern,
            previewIncludeBass,
            previewBassSynthRef,
            previewEventIdsRef,
          })
        }

        scheduleClickForBar({
          transport,
          index,
          previewIncludeClick,
          previewClickSynthRef,
          previewEventIdsRef,
        })
      })

      if (!previewLoop) {
        const endId = transport.schedule(() => {
          setCurrentPreviewBarIndex(Math.max(0, previewBars.length - 1))
          setPreviewPlaying(false)
          transport.stop()
          transport.position = 0
          chordSynth.releaseAll()
          lastFollowedSectionIdRef.current = null
        }, `${previewBars.length}m`)
        previewEventIdsRef.current.push(endId)
      }

      setCurrentPreviewBarIndex(safeStartBarIndex)
      transport.position = `${safeStartBarIndex}m`
      transport.start('+0.05')
      setPreviewPlaying(true)

      const startBarMeta = previewBarMeta[safeStartBarIndex]
      const startSectionId = startBarMeta?.sectionId || null

      if (followPlayback && performanceMode && startSectionId) {
        lastFollowedSectionIdRef.current = startSectionId
        setActivePerformanceSectionId(startSectionId)
        window.requestAnimationFrame(() => {
          jumpToPerformanceSection(startSectionId)
        })
      } else {
        lastFollowedSectionIdRef.current = null
      }

      const sectionLabel =
        previewSection === 'full_song'
          ? 'Full Song'
          : previewSection.charAt(0).toUpperCase() + previewSection.slice(1)

      const patternLabel =
        previewPattern === 'ballad_strum'
          ? 'Ballad Strum'
          : previewPattern === 'country_train'
            ? 'Country Train'
            : previewPattern === 'fingerpick'
              ? 'Fingerpick'
              : 'Piano Block Chords'

      setProjectMessage(`Preview playing: ${sectionLabel} • ${patternLabel}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to start preview')
    }
  }

  const handlePerformanceSectionJump = async (sectionId: string) => {
    jumpToPerformanceSection(sectionId)

    if (!previewPlaying) return

    const startBarIndex = findFirstPreviewBarIndexForSection(sectionId)
    if (startBarIndex === -1) return

    await startPreviewPlaybackFromBar(startBarIndex)
  }

  const jumpToNextPerformanceSection = async () => {
    if (!nextPerformanceSection) return
    await handlePerformanceSectionJump(nextPerformanceSection.id)
  }

  const startPreviewPlayback = async () => {
    await startPreviewPlaybackFromBar(0)
  }

  useEffect(() => {
    performanceSectionRefs.current = {}
  }, [performanceSheet])

  useEffect(() => {
    if (!performanceMode || performanceSections.length === 0) {
      setActivePerformanceSectionId(null)
      return
    }

    setActivePerformanceSectionId((prev) => {
      if (prev && performanceSections.some((section) => section.id === prev)) return prev
      return performanceSections[0].id
    })
  }, [performanceMode, performanceSections])

  useEffect(() => {
    if (!performanceMode) return

    const container = performanceScrollRef.current
    if (!container) return

    const handleScroll = () => {
      if (!followPlayback || !previewPlaying) {
        syncActivePerformanceSection()
      }
    }

    const raf = window.requestAnimationFrame(() => {
      if (!followPlayback || !previewPlaying) {
        syncActivePerformanceSection()
      }
    })

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(raf)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [performanceMode, performanceSections, performanceFontSize, followPlayback, previewPlaying])

  u  useEffect(() => {
    if (!performanceMode || !followPlayback || !previewPlaying) return

    const container = performanceScrollRef.current
    if (!container) return
    if (!performanceSheet.trim()) return
    if (previewBars.length === 0) return

    const activeBarMeta = previewBarMeta[currentPreviewBarIndex]
    const activeSectionId = activeBarMeta?.sectionId

    if (!activeSectionId) return

    const target = performanceSectionRefs.current[activeSectionId]
    if (!target) return

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const anchorOffset = container.clientHeight * 0.22
    const rawTop = container.scrollTop + (targetRect.top - containerRect.top) - anchorOffset
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    const targetTop = Math.max(0, Math.min(rawTop, maxScrollTop))

    container.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    })
  }, [
    currentPreviewBarIndex,
    performanceMode,
    followPlayback,
    previewPlaying,
    performanceSheet,
    previewBars.length,
    previewBarMeta,
  ])

  useEffect(() => {
    if (previewPlaying) {
      stopPreviewPlayback()
    }
  }, [
    previewTempo,
    previewFeel,
    previewInstrument,
    previewSection,
    previewLoop,
    previewIncludeBass,
    previewIncludeClick,
    previewPattern,
    followPlayback,
  ])

  const loadProjects = async (preferredProjectId?: string) => {
    try {
      setProjectMessage('Loading projects...')
      const res = await fetch('/api/projects')
      const data = await readJsonSafe(res)

      if (!res.ok) throw new Error(data.error || 'Failed to load projects')

      const nextProjects: Project[] = Array.isArray(data.projects) ? data.projects : []
      setProjects(nextProjects)

      if (nextProjects.length > 0) {
        setActiveProject((prev: Project | null) => {
          const targetId = preferredProjectId || prev?.id
          return targetId ? nextProjects.find((p) => p.id === targetId) || nextProjects[0] : nextProjects[0]
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

  useEffect(() => {
    if (user) {
      void loadProjects()
      void loadArtistDNA()
    } else {
      setProjects([])
      setActiveProject(null)
      setProjectMessage('')
      setSongVersions([])
      setChordVersions([])
      setResult(null)
      setChords(null)
      setSongSheet('')
      setEditableLyrics('')
      setForm(defaultForm)
      setArtistDNA(defaultArtistDNA)
      setArtistDNAMessage('')
      setDNAAnalysisInput(defaultDNAAnalysisInput)
      setDNAAnalyzerMessage('')
      setManualVersionName('')
      setImportLyricsTitle('Imported Lyrics')
      setActiveSongVersionId(null)
      setActiveChordVersionId(null)
      setActivePerformanceSectionId(null)
      setCurrentPreviewBarIndex(0)
    }
  }, [user])

  useEffect(() => {
    if (activeProject?.id) {
      setResult(null)
      setChords(null)
      setSongSheet('')
      setEditableLyrics('')
      setTransposeAmount(0)
      setCurrentPreviewBarIndex(0)
      resetPerformanceScroll()
      setSongVersions([])
      setChordVersions([])
      setForm(defaultForm)
      setActiveSongVersionId(null)
      setActiveChordVersionId(null)
      void loadProjectData(activeProject.id)
    } else {
      setSongVersions([])
      setChordVersions([])
      setResult(null)
      setChords(null)
      setSongSheet('')
      setEditableLyrics('')
      setTransposeAmount(0)
      setCurrentPreviewBarIndex(0)
      resetPerformanceScroll()
      setForm(defaultForm)
      setActiveSongVersionId(null)
      setActiveChordVersionId(null)
    }
  }, [activeProject?.id])

  useEffect(() => {
    setEditableLyrics(result?.lyrics_full || '')
  }, [result?.lyrics_full])

  const hasSavedArtistDNA = Boolean(
    artistDNA.artist_name ||
      artistDNA.vocal_range ||
      artistDNA.core_genres ||
      artistDNA.lyrical_style ||
      artistDNA.emotional_tone ||
      artistDNA.writing_strengths ||
      artistDNA.avoid_list ||
      artistDNA.visual_style ||
      artistDNA.performance_style ||
      artistDNA.dna_summary
  )

  const appliedDNALines = [
    artistDNA.artist_name ? `Artist: ${artistDNA.artist_name}` : '',
    artistDNA.vocal_range ? `Voice: ${artistDNA.vocal_range}` : '',
    artistDNA.core_genres ? `Genres: ${artistDNA.core_genres}` : '',
    artistDNA.lyrical_style ? `Lyrics: ${artistDNA.lyrical_style}` : '',
    artistDNA.emotional_tone ? `Tone: ${artistDNA.emotional_tone}` : '',
    artistDNA.performance_style ? `Performance: ${artistDNA.performance_style}` : '',
  ].filter(Boolean)

  const loadArtistDNA = async () => {
    try {
      setArtistDNALoading(true)
      setArtistDNAMessage('Loading artist DNA...')

      const res = await fetch('/api/artist-dna')
      const data = await readJsonSafe(res)

      if (!res.ok) throw new Error(data.error || 'Failed to load artist DNA')

      setArtistDNA(data.profile || defaultArtistDNA)
      setArtistDNAMessage('')
    } catch (err: any) {
      console.error(err)
      setArtistDNAMessage(err.message || 'Failed to load artist DNA')
    } finally {
      setArtistDNALoading(false)
    }
  }

  const saveArtistDNA = async () => {
    try {
      setArtistDNASaving(true)
      setArtistDNAMessage('Saving artist DNA...')

      const res = await fetch('/api/artist-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(artistDNA),
      })

      const data = await readJsonSafe(res)

      if (!res.ok) throw new Error(data.error || 'Failed to save artist DNA')

      setArtistDNA(data.profile || artistDNA)
      setArtistDNAMessage('Artist DNA saved')
    } catch (err: any) {
      console.error(err)
      setArtistDNAMessage(err.message || 'Failed to save artist DNA')
    } finally {
      setArtistDNASaving(false)
    }
  }

  const analyzeArtistDNA = async () => {
    try {
      if (!dnaAnalysisInput.lyrics_samples.trim()) {
        setDNAAnalyzerMessage('Paste some lyrics samples first.')
        return
      }

      setDNAAnalyzerMessage('Analyzing artist DNA...')
      setDNAAnalyzing(true)

      const res = await fetch('/api/artist-dna-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dnaAnalysisInput),
      })

      const data = await readJsonSafe(res)

      if (!res.ok) throw new Error(data.error || 'Artist DNA analysis failed')

      setArtistDNA((prev) => ({ ...prev, ...data.profile }))
      setDNAAnalyzerMessage('Artist DNA analysis complete. Review and save it below.')
    } catch (err: any) {
      console.error(err)
      setDNAAnalyzerMessage(err.message || 'Artist DNA analysis failed')
    } finally {
      setDNAAnalyzing(false)
    }
  }

  const loadProjectData = async (projectId: string) => {
    const token = Date.now()
    latestProjectLoadRef.current = token

    try {
      setVersionsLoading(true)
      setProjectMessage('Loading project data...')

      const [songRes, chordRes] = await Promise.all([
        fetch(`/api/song-versions/${projectId}`),
        fetch(`/api/chord-versions/${projectId}`),
      ])

      const songData = await readJsonSafe(songRes)
      const chordData = await readJsonSafe(chordRes)

      if (latestProjectLoadRef.current !== token) return

      if (!songRes.ok) throw new Error(songData.error || 'Failed to load song versions')
      if (!chordRes.ok) throw new Error(chordData.error || 'Failed to load chord versions')

      const nextSongVersions: SongVersionRecord[] = Array.isArray(songData.versions) ? songData.versions : []
      const nextChordVersions: ChordVersionRecord[] = Array.isArray(chordData.versions) ? chordData.versions : []

      setSongVersions(nextSongVersions)
      setChordVersions(nextChordVersions)

      const nextResult = songData.latest?.result || null
      setResult(nextResult)
      setEditableLyrics(nextResult?.lyrics_full || '')
      setChords(chordData.latest?.chord_data || null)
      setSongSheet('')

      setActiveSongVersionId(songData.latest?.id || null)
      setActiveChordVersionId(chordData.latest?.id || null)

      if (songData.latest?.form) {
        setForm({
          genre: songData.latest.form.genre || '',
          moods: Array.isArray(songData.latest.form.moods) ? songData.latest.form.moods : [],
          theme: songData.latest.form.theme || '',
          hook: songData.latest.form.hook || '',
          dnaId: songData.latest.form.dnaId || 'mpj-master',
        })
      } else {
        setForm(defaultForm)
      }

      setProjectMessage('')
    } catch (err: any) {
      if (latestProjectLoadRef.current !== token) return
      console.error(err)
      setProjectMessage(err.message || 'Failed to load project data')
      setResult(null)
      setEditableLyrics('')
      setChords(null)
      setSongSheet('')
      setSongVersions([])
      setChordVersions([])
      setForm(defaultForm)
      setActiveSongVersionId(null)
      setActiveChordVersionId(null)
    } finally {
      if (latestProjectLoadRef.current === token) setVersionsLoading(false)
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
      if (!res.ok) throw new Error(data.error || 'Failed to create project')

      await loadProjects(data.id)
      setResult(null)
      setEditableLyrics('')
      setChords(null)
      setSongSheet('')
      setTransposeAmount(0)
      setCurrentPreviewBarIndex(0)
      setSongVersions([])
      setChordVersions([])
      setForm(defaultForm)
      setNewProjectName('')
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

      setRenameProjectLoading(true)

      const res = await fetch(`/api/projects/${activeProject.id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to rename project')

      await loadProjects(activeProject.id)
      setProjectMessage(`Renamed project to: ${trimmed}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to rename project')
    } finally {
      setRenameProjectLoading(false)
    }
  }

  const duplicateProject = async () => {
    try {
      if (!activeProject) {
        setProjectMessage('Select a project first.')
        return
      }

      setDuplicateProjectLoading(true)
      const res = await fetch(`/api/projects/${activeProject.id}/duplicate`, {
        method: 'POST',
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate project')

      await loadProjects(data.project?.id)
      setProjectMessage(`Duplicated project: ${data.project?.title || 'Copy created'}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to duplicate project')
    } finally {
      setDuplicateProjectLoading(false)
    }
  }

  const deleteProject = async () => {
    try {
      if (!activeProject) {
        setProjectMessage('Select a project first.')
        return
      }

      const ok = window.confirm(`Delete project "${activeProject.title}" and all its saved versions?`)
      if (!ok) return

      setDeleteProjectLoading(true)
      const projectId = activeProject.id
      const projectTitle = activeProject.title

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to delete project')

      await loadProjects()
      setProjectMessage(`Deleted project: ${projectTitle}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to delete project')
    } finally {
      setDeleteProjectLoading(false)
    }
  }

  const sendCode = async () => {
    try {
      setAuthMessage('')
      const email = emailInput.trim()
      if (!email) {
        setAuthMessage('Enter your email first.')
        return
      }
      const { error } = await supabase.auth.signInWithOtp({ email })
      setAuthMessage(error ? error.message : 'Code sent. Check your email.')
    } catch (err) {
      console.error(err)
      setAuthMessage('Failed to send code.')
    }
  }

  const verifyCode = async () => {
    try {
      setAuthMessage('')
      const email = emailInput.trim()
      const token = otpInput.trim()

      if (!email || !token) {
        setAuthMessage('Enter both email and code.')
        return
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      setAuthMessage(error ? error.message : 'Signed in successfully.')
      if (!error) setOtpInput('')
    } catch (err) {
      console.error(err)
      setAuthMessage('Failed to verify code.')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProjects([])
    setActiveProject(null)
    setResult(null)
    setEditableLyrics('')
    setChords(null)
    setSongSheet('')
    setAuthMessage('')
    setProjectMessage('')
    setSongVersions([])
    setChordVersions([])
    setForm(defaultForm)
    setArtistDNA(defaultArtistDNA)
    setArtistDNAMessage('')
    setDNAAnalysisInput(defaultDNAAnalysisInput)
    setDNAAnalyzerMessage('')
    setManualVersionName('')
    setImportLyricsTitle('Imported Lyrics')
    setActiveSongVersionId(null)
    setActiveChordVersionId(null)
    setTransposeAmount(0)
    setActivePerformanceSectionId(null)
    setCurrentPreviewBarIndex(0)
    stopPreviewPlayback()
    resetPerformanceScroll()
  }

  const toggleMood = (mood: string) => {
    setForm((prev) => ({
      ...prev,
      moods: prev.moods.includes(mood) ? prev.moods.filter((m) => m !== mood) : [...prev.moods, mood],
    }))
  }

  const saveSongVersion = async (title: string, payloadResult: GenerateResponse, payloadForm: FormState) => {
    if (!activeProject) return
    const saveRes = await fetch('/api/song-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title,
        form: payloadForm,
        result: payloadResult,
      }),
    })

    const saveData = await readJsonSafe(saveRes)
    if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save song version')
    await loadProjects(activeProject.id)
    await loadProjectData(activeProject.id)
  }

  const saveChordVersion = async (title: string, payloadChords: ChordResponse) => {
    if (!activeProject) return
    const saveRes = await fetch('/api/chord-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title,
        chord_data: payloadChords,
      }),
    })

    const saveData = await readJsonSafe(saveRes)
    if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save chord version')
    await loadProjects(activeProject.id)
    await loadProjectData(activeProject.id)
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setResult(null)
      setEditableLyrics('')
      setSongSheet('')
      setTransposeAmount(0)
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      setResult(data)
      setEditableLyrics(data.lyrics_full || '')

      if (activeProject && autoSave) {
        await saveSongVersion(form.theme || form.hook || 'Untitled Version', data, form)
        setProjectMessage(`Song saved to project: ${activeProject.title}`)
      } else if (activeProject) {
        setProjectMessage('Song generated. Auto-save is off.')
      } else {
        setProjectMessage('Song generated, but no active project is selected.')
      }
    } catch (err: any) {
      console.error(err)
      setResult({ error: err.message || 'Generation failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChords = async () => {
    try {
      setChordLoading(true)
      setSongSheet('')
      setTransposeAmount(0)
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const currentSongResult = result
      const currentEditableLyrics = editableLyrics
      const currentForm = form

      const res = await fetch('/api/chords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: activeProject?.id || null,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Chord generation failed')

      setChords(data)

      if (activeProject && autoSave) {
        await loadProjects(activeProject.id)
        await loadProjectData(activeProject.id)
        setProjectMessage(`Chords saved to project: ${activeProject.title}`)
      } else if (activeProject) {
        setProjectMessage('Chords generated. Auto-save is off.')
      }

      if (currentSongResult) setResult(currentSongResult)
      setEditableLyrics(currentEditableLyrics)
      setForm(currentForm)
    } catch (err: any) {
      console.error(err)
      setChords({ error: err.message || 'Chord generation failed' })
    } finally {
      setChordLoading(false)
    }
  }

  const handleManualSaveSong = async () => {
    try {
      if (!activeProject) {
        setProjectMessage('Select a project first.')
        return
      }

      if (!result || result.error || !editableLyrics.trim()) {
        setProjectMessage('There is no current song output to save.')
        return
      }

      setManualSongSaveLoading(true)
      const title = manualVersionName.trim() || 'Manual Song Snapshot'

      await saveSongVersion(
        title,
        {
          ...result,
          lyrics_full: editableLyrics,
        },
        form
      )

      setProjectMessage(`Saved song as: ${title}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to save song snapshot')
    } finally {
      setManualSongSaveLoading(false)
    }
  }

  const handleManualSaveChords = async () => {
    try {
      if (!activeProject) {
        setProjectMessage('Select a project first.')
        return
      }

      if (!chords || chords.error) {
        setProjectMessage('There is no current chord output to save.')
        return
      }

      setManualChordSaveLoading(true)
      const title = manualVersionName.trim() || 'Manual Chord Snapshot'
      await saveChordVersion(title, chords)
      setProjectMessage(`Saved chords as: ${title}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to save chord snapshot')
    } finally {
      setManualChordSaveLoading(false)
    }
  }

  const handleSaveEditedLyrics = async () => {
    try {
      if (!activeProject) {
        setProjectMessage('Select a project first.')
        return
      }

      const lyrics = editableLyrics.trim()
      if (!lyrics) {
        setProjectMessage('No lyrics to save.')
        return
      }

      setSaveEditedLyricsLoading(true)
      setSongSheet('')
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const title = manualVersionName.trim() || 'Edited Lyrics'

      const res = await fetch('/api/song-versions/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProject.id,
          title,
          lyrics,
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          dnaId: form.dnaId,
          style_short: result?.style_short || '',
          style_detailed: result?.style_detailed || '',
          lyrics_brief: result?.lyrics_brief || '',
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to save edited lyrics')

      setResult((prev) =>
        prev
          ? {
              ...prev,
              lyrics_full: lyrics,
            }
          : {
              lyrics_full: lyrics,
            }
      )

      await loadProjects(activeProject.id)
      await loadProjectData(activeProject.id)

      setProjectMessage(`Saved edited lyrics as: ${title}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to save edited lyrics')
    } finally {
      setSaveEditedLyricsLoading(false)
    }
  }

  const handleImportLyrics = async () => {
    try {
      const lyrics = editableLyrics.trim()
      if (!lyrics) {
        setProjectMessage('Paste lyrics first.')
        return
      }

      const projectTitle = importLyricsTitle.trim() || 'Imported Lyrics'

      setImportLyricsLoading(true)
      setSongSheet('')
      setTransposeAmount(0)
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: projectTitle }),
      })

      const createData = await readJsonSafe(createRes)
      if (!createRes.ok) throw new Error(createData.error || 'Failed to create project for imported lyrics')

      const projectId = createData.id

      const importRes = await fetch('/api/import-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          title: projectTitle,
          lyrics,
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          dnaId: form.dnaId,
        }),
      })

      const importData = await readJsonSafe(importRes)
      if (!importRes.ok) throw new Error(importData.error || 'Failed to import lyrics')

      await loadProjects(projectId)
      await loadProjectData(projectId)

      setProjectMessage(`Created new project from lyrics: ${projectTitle}`)
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to create project from lyrics')
    } finally {
      setImportLyricsLoading(false)
    }
  }

  const handleCreateSongSheet = async () => {
    try {
      const lyrics = editableLyrics.trim()
      if (!lyrics) {
        setProjectMessage('No lyrics available to build a song sheet.')
        return
      }

      if (!chords || chords.error) {
        setProjectMessage('Generate or load chords first.')
        return
      }

      setSongSheetLoading(true)
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const res = await fetch('/api/song-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics,
          chord_data: chords,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to create song sheet')

      setSongSheet(data.song_sheet || '')
      setTransposeAmount(0)
      setProjectMessage('Song sheet created.')
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to create song sheet')
    } finally {
      setSongSheetLoading(false)
    }
  }

  const handleRewrite = async (mode: RewriteMode, label: string) => {
    try {
      if (!editableLyrics.trim()) {
        setResult({ error: 'Generate or load lyrics before rewriting.' })
        return
      }

      setRewriteLoading(mode)
      setSongSheet('')
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          versionTitle: label,
          currentLyrics: editableLyrics,
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          dnaId: form.dnaId,
          project_id: activeProject?.id || null,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Rewrite failed')

      setResult(data)
      setEditableLyrics(data.lyrics_full || '')

      if (activeProject && autoSave) {
        await loadProjects(activeProject.id)
        await loadProjectData(activeProject.id)
      } else if (activeProject) {
        setProjectMessage('Rewrite generated. Auto-save is off.')
      }
    } catch (err: any) {
      console.error(err)
      setResult({ error: err.message || 'Rewrite failed' })
    } finally {
      setRewriteLoading(null)
    }
  }

  const handleChordRewrite = async (mode: ChordRewriteMode) => {
    try {
      if (!chords || chords.error) {
        setChords({ error: 'Generate or load chords before using Chord Lab.' })
        return
      }

      setChordRewriteLoading(mode)
      setSongSheet('')
      setCurrentPreviewBarIndex(0)
      stopPreviewPlayback()
      resetPerformanceScroll()

      const res = await fetch('/api/chord-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          project_id: activeProject?.id || null,
          genre: form.genre,
          moods: form.moods,
          theme: form.theme,
          hook: form.hook,
          currentChords: chords,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Chord rewrite failed')

      setChords(data)

      if (activeProject && autoSave) {
        await loadProjects(activeProject.id)
        await loadProjectData(activeProject.id)
      } else if (activeProject) {
        setProjectMessage('Chord rewrite generated. Auto-save is off.')
      }
    } catch (err: any) {
      console.error(err)
      setChords({ error: err.message || 'Chord rewrite failed' })
    } finally {
      setChordRewriteLoading(null)
    }
  }

  const deleteSongVersion = async (versionId: string) => {
    try {
      const ok = window.confirm('Delete this song version?')
      if (!ok) return

      const res = await fetch(`/api/song-version/${versionId}`, { method: 'DELETE' })
      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to delete song version')

      if (activeProject) {
        await loadProjects(activeProject.id)
        await loadProjectData(activeProject.id)
      }
      setProjectMessage('Song version deleted.')
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to delete song version')
    }
  }

  const deleteChordVersion = async (versionId: string) => {
    try {
      const ok = window.confirm('Delete this chord version?')
      if (!ok) return

      const res = await fetch(`/api/chord-version/${versionId}`, { method: 'DELETE' })
      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || 'Failed to delete chord version')

      if (activeProject) {
        await loadProjects(activeProject.id)
        await loadProjectData(activeProject.id)
      }
      setProjectMessage('Chord version deleted.')
    } catch (err: any) {
      console.error(err)
      setProjectMessage(err.message || 'Failed to delete chord version')
    }
  }

  const loadSongVersion = (version: SongVersionRecord) => {
    if (version.form) {
      setForm({
        genre: version.form.genre || '',
        moods: Array.isArray(version.form.moods) ? version.form.moods : [],
        theme: version.form.theme || '',
        hook: version.form.hook || '',
        dnaId: version.form.dnaId || 'mpj-master',
      })
    }
    setResult(version.result || null)
    setEditableLyrics(version.result?.lyrics_full || '')
    setSongSheet('')
    setTransposeAmount(0)
    setCurrentPreviewBarIndex(0)
    stopPreviewPlayback()
    resetPerformanceScroll()
    setActiveSongVersionId(version.id)
  }

  const loadChordVersion = (version: ChordVersionRecord) => {
    setChords(version.chord_data || null)
    setSongSheet('')
    setTransposeAmount(0)
    setCurrentPreviewBarIndex(0)
    stopPreviewPlayback()
    resetPerformanceScroll()
    setActiveChordVersionId(version.id)
  }

  const exportSongTxt = () => {
    if (!editableLyrics.trim()) {
      setProjectMessage('No song output to export.')
      return
    }

    const title = activeProject?.title || 'song'
    const content = [
      `Project: ${title}`,
      form.genre ? `Genre: ${form.genre}` : '',
      form.moods.length ? `Moods: ${form.moods.join(', ')}` : '',
      form.theme ? `Theme: ${form.theme}` : '',
      form.hook ? `Hook: ${form.hook}` : '',
      '',
      result?.style_short ? `Style (Short): ${result.style_short}` : '',
      result?.style_detailed ? `Style (Detailed): ${result.style_detailed}` : '',
      result?.lyrics_brief ? `Lyrics Brief: ${result.lyrics_brief}` : '',
      '',
      'Full Lyrics:',
      editableLyrics,
    ]
      .filter(Boolean)
      .join('\n')

    downloadTextFile(`${title.replace(/\s+/g, '_')}_song.txt`, content)
  }

  const exportChordsTxt = () => {
    if (!chords || chords.error) {
      setProjectMessage('No chord output to export.')
      return
    }

    const title = activeProject?.title || 'song'
    const transposedChords = {
      key: transposedKey || chords.key || '',
      capo: transposedCapoHint || chords.capo || '',
      verse: transposeTextPreservingLayout(chords.verse || '', transposeAmount),
      chorus: transposeTextPreservingLayout(chords.chorus || '', transposeAmount),
      bridge: transposeTextPreservingLayout(chords.bridge || '', transposeAmount),
      notes: chords.notes || '',
    }

    const content = [
      `Project: ${title}`,
      transposedChords.key ? `Key: ${transposedChords.key}` : '',
      transposedChords.capo ? `Capo: ${transposedChords.capo}` : '',
      '',
      `Verse: ${transposedChords.verse || ''}`,
      `Chorus: ${transposedChords.chorus || ''}`,
      `Bridge: ${transposedChords.bridge || ''}`,
      '',
      transposedChords.notes ? `Notes: ${transposedChords.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    downloadTextFile(`${title.replace(/\s+/g, '_')}_chords.txt`, content)
  }

  const exportCombinedTxt = () => {
    const title = activeProject?.title || 'song'
    const content = [
      `Project: ${title}`,
      '',
      '=== SONG ===',
      editableLyrics || 'No song output',
      '',
      '=== CHORDS ===',
      chords && !chords.error
        ? [
            `Key: ${transposedKey || chords.key || ''}`,
            `Capo: ${transposedCapoHint || chords.capo || ''}`,
            `Verse: ${transposeTextPreservingLayout(chords.verse || '', transposeAmount)}`,
            `Chorus: ${transposeTextPreservingLayout(chords.chorus || '', transposeAmount)}`,
            `Bridge: ${transposeTextPreservingLayout(chords.bridge || '', transposeAmount)}`,
            `Notes: ${chords.notes || ''}`,
          ].join('\n')
        : 'No chord output',
    ].join('\n')

    downloadTextFile(`${title.replace(/\s+/g, '_')}_combined.txt`, content)
  }

  const exportSongSheetTxt = () => {
    if (!transposedSongSheet.trim()) {
      setProjectMessage('No song sheet to export.')
      return
    }

    const title = activeProject?.title || 'song'
    downloadTextFile(`${title.replace(/\s+/g, '_')}_song_sheet.txt`, transposedSongSheet)
  }

  const pageStyle: CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: '#18181b',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
  }

  const sidebarStyle: CSSProperties = {
    width: 360,
    borderRight: '1px solid #333',
    padding: 16,
    background: '#111113',
  }

  const mainStyle: CSSProperties = {
    flex: 1,
    padding: 24,
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: '1px solid #444',
    background: '#3f3f46',
    color: 'white',
    boxSizing: 'border-box',
  }

  const textareaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: 90,
    resize: 'vertical',
  }

  const primaryButtonStyle: CSSProperties = {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: 'white',
    cursor: 'pointer',
  }

  const secondaryButtonStyle: CSSProperties = {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #52525b',
    background: '#3f3f46',
    color: 'white',
    cursor: 'pointer',
  }

  const dangerButtonStyle: CSSProperties = {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #b91c1c',
    background: '#7f1d1d',
    color: 'white',
    cursor: 'pointer',
  }

  const chipStyle = (selected: boolean): CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid',
    borderColor: selected ? '#2563eb' : '#52525b',
    background: selected ? '#2563eb' : '#3f3f46',
    color: 'white',
    cursor: 'pointer',
  })

  const panelStyle: CSSProperties = {
    background: '#27272a',
    padding: 20,
    borderRadius: 16,
  }

  const sectionTitleStyle: CSSProperties = {
    display: 'block',
    marginBottom: 8,
    fontWeight: 700,
  }

  const tableWrapStyle: CSSProperties = {
    border: '1px solid #3f3f46',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#1f1f23',
  }

  const tableScrollStyle: CSSProperties = {
    maxHeight: 320,
    overflowY: 'auto',
    overflowX: 'auto',
  }

  const projectTableScrollStyle: CSSProperties = {
    maxHeight: 'calc(100vh - 360px)',
    overflowY: 'auto',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
  }

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  }

  const projectTableStyle: CSSProperties = {
    width: '100%',
    minWidth: 560,
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  }

  const thStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    background: '#27272a',
    color: 'white',
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 13,
    borderBottom: '1px solid #3f3f46',
    whiteSpace: 'nowrap',
    zIndex: 1,
    cursor: 'pointer',
  }

  const tdStyle: CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    borderBottom: '1px solid #2f2f35',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const projectThStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    background: '#27272a',
    color: 'white',
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 13,
    borderBottom: '1px solid #3f3f46',
    whiteSpace: 'nowrap',
    zIndex: 3,
    cursor: 'pointer',
  }

  const projectTdStyle: CSSProperties = {
    padding: '10px 12px',
    fontSize: 13,
    borderBottom: '1px solid #2f2f35',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const frozenProjectColumnStyle: CSSProperties = {
    position: 'sticky',
    left: 0,
    background: '#1f1f23',
    zIndex: 2,
  }

  const frozenProjectHeaderStyle: CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 4,
  }

  const rowButtonStyle: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    color: 'white',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    font: 'inherit',
  }

  const projectRowButtonStyle: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    color: 'white',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    font: 'inherit',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const actionIconButtonStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  }

  const emptyHistoryStyle: CSSProperties = {
    color: '#a1a1aa',
    padding: '12px',
  }

  const updateArtistDNA = (key: keyof ArtistDNAProfile, value: string) => {
    setArtistDNA((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const updateDNAAnalysisInput = (key: keyof DNAAnalysisInput, value: string) => {
    setDNAAnalysisInput((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <div style={pageStyle}>
      <div style={sidebarStyle}>
        <h3 style={{ marginTop: 0 }}>Projects</h3>

        {authLoading ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>Checking sign-in status...</div>
        ) : !user ? (
          <div style={{ color: '#a1a1aa', fontSize: 14 }}>Sign in to create and manage projects.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                placeholder="New project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{ ...inputStyle, padding: '10px 12px', flex: 1 }}
              />
              <button onClick={createProject} style={primaryButtonStyle}>
                +
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <button
                onClick={renameProject}
                disabled={renameProjectLoading || !activeProject}
                style={secondaryButtonStyle}
              >
                {renameProjectLoading ? 'Renaming...' : 'Rename'}
              </button>
              <button
                onClick={duplicateProject}
                disabled={duplicateProjectLoading || !activeProject}
                style={secondaryButtonStyle}
              >
                {duplicateProjectLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
              <button
                onClick={deleteProject}
                disabled={deleteProjectLoading || !activeProject}
                style={dangerButtonStyle}
              >
                {deleteProjectLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>

            {projectMessage && (
              <div style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 10 }}>{projectMessage}</div>
            )}

            <div style={tableWrapStyle}>
              <div style={projectTableScrollStyle}>
                <table style={projectTableStyle}>
                  <thead>
                    <tr>
                      <th
                        style={{ ...projectThStyle, ...frozenProjectHeaderStyle, width: 300 }}
                        onClick={() => toggleProjectSort('title')}
                      >
                        Project {projectSortKey === 'title' ? (projectSortDirection === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th
                        style={{ ...projectThStyle, width: 260 }}
                        onClick={() => toggleProjectSort('updated_at')}
                      >
                        Last updated{' '}
                        {projectSortKey === 'updated_at' ? (projectSortDirection === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.length > 0 ? (
                      sortedProjects.map((p) => {
                        const isActive = activeProject?.id === p.id

                        return (
                          <tr
                            key={p.id}
                            style={{
                              background: isActive ? '#2563eb33' : 'transparent',
                            }}
                          >
                            <td
                              style={{
                                ...projectTdStyle,
                                ...frozenProjectColumnStyle,
                                background: isActive ? '#1d4ed833' : '#1f1f23',
                                width: 300,
                              }}
                              title={p.title}
                            >
                              <button onClick={() => setActiveProject(p)} style={projectRowButtonStyle} title={p.title}>
                                {p.title}
                              </button>
                            </td>

                            <td style={{ ...projectTdStyle, width: 260 }}>
                              <button
                                onClick={() => setActiveProject(p)}
                                style={projectRowButtonStyle}
                                title={formatUkDateTime((p.updated_at || p.created_at) as string)}
                              >
                                {formatUkDateTime((p.updated_at || p.created_at) as string)}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={2} style={emptyHistoryStyle}>
                          No projects yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={mainStyle}>
        <h1 style={{ marginTop: 0 }}>Suno Prompt Studio</h1>

        {hasSavedArtistDNA && (
          <div
            style={{
              ...panelStyle,
              marginBottom: 24,
              border: '1px solid #2563eb',
              background: '#1d2a44',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Applied Artist DNA</div>
            <div style={{ color: '#dbeafe', marginBottom: 10 }}>
              Your saved Artist DNA is currently shaping song generation, rewrites, chord generation, and chord
              rewrites.
            </div>

            {artistDNA.dna_summary && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: '#162338',
                  border: '1px solid #3b82f6',
                }}
              >
                {artistDNA.dna_summary}
              </div>
            )}

            {appliedDNALines.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {appliedDNALines.map((line) => (
                  <div
                    key={line}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: '#162338',
                      border: '1px solid #3b82f6',
                      color: '#dbeafe',
                      fontSize: 14,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!user ? (
          <div style={{ ...panelStyle, marginBottom: 24 }}>
            <h2 style={{ marginTop: 0 }}>Sign in</h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={sendCode} style={primaryButtonStyle}>
                Send Code
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="Code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={verifyCode} style={secondaryButtonStyle}>
                Verify
              </button>
            </div>

            {authMessage && <div style={{ color: '#a1a1aa' }}>{authMessage}</div>}
          </div>
        ) : (
          <div style={{ ...panelStyle, marginBottom: 24 }}>
            <div style={{ marginBottom: 8 }}>
              Logged in as <strong>{user.email}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Active project: <strong>{activeProject ? activeProject.title : 'None selected'}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Artist DNA status: <strong>{hasSavedArtistDNA ? 'Applied to outputs' : 'No saved DNA yet'}</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              Auto-save:{' '}
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                {autoSave ? 'On' : 'Off'}
              </label>
            </div>
            {versionsLoading && <div style={{ color: '#a1a1aa', marginBottom: 12 }}>Loading project history...</div>}
            <button onClick={signOut} style={secondaryButtonStyle}>
              Sign out
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(360px, 1fr) minmax(360px, 1fr)',
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Song Builder</h2>

            {hasSavedArtistDNA && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 10,
                  borderRadius: 12,
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                  color: '#d4d4d8',
                  fontSize: 14,
                }}
              >
                Using saved Artist DNA
                {artistDNA.artist_name ? ` for ${artistDNA.artist_name}` : ''}.
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Creative DNA</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {dnaOptions.map((dna) => (
                  <button
                    key={dna.id}
                    type="button"
                    onClick={() => setForm({ ...form, dnaId: dna.id })}
                    style={chipStyle(form.dnaId === dna.id)}
                  >
                    {dna.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Genre</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setForm({ ...form, genre })}
                    style={chipStyle(form.genre === genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Mood</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMood(mood)}
                    style={chipStyle(form.moods.includes(mood))}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Theme</label>
              <textarea
                placeholder="What is this song about?"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                style={textareaStyle}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={sectionTitleStyle}>Hook</label>
              <input
                placeholder="Hook phrase"
                value={form.hook}
                onChange={(e) => setForm({ ...form, hook: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Start New Project from Lyrics</h3>

              <div style={{ marginBottom: 12 }}>
                <label style={sectionTitleStyle}>New Project Title</label>
                <input
                  value={importLyricsTitle}
                  onChange={(e) => setImportLyricsTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="Imported Lyrics"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={sectionTitleStyle}>Paste Lyrics</label>
                <textarea
                  value={editableLyrics}
                  onChange={(e) => setEditableLyrics(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 180 }}
                  placeholder="Paste your lyrics here..."
                />
              </div>

              <button onClick={handleImportLyrics} disabled={importLyricsLoading} style={secondaryButtonStyle}>
                {importLyricsLoading ? 'Creating Project...' : 'Create Project from Lyrics'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <button onClick={handleGenerate} disabled={loading} style={primaryButtonStyle}>
                {loading ? 'Generating...' : 'Generate Song'}
              </button>

              <button onClick={handleGenerateChords} disabled={chordLoading} style={secondaryButtonStyle}>
                {chordLoading ? 'Generating Chords...' : 'Generate Chords'}
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sectionTitleStyle}>Version Name</label>
              <input
                placeholder="e.g. Acoustic rewrite v2"
                value={manualVersionName}
                onChange={(e) => setManualVersionName(e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <button onClick={handleManualSaveSong} disabled={manualSongSaveLoading} style={primaryButtonStyle}>
                  {manualSongSaveLoading ? 'Saving Song...' : 'Save Song As Version'}
                </button>

                <button onClick={handleManualSaveChords} disabled={manualChordSaveLoading} style={primaryButtonStyle}>
                  {manualChordSaveLoading ? 'Saving Chords...' : 'Save Chords As Version'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sectionTitleStyle}>Song Sheet</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleCreateSongSheet} disabled={songSheetLoading} style={secondaryButtonStyle}>
                  {songSheetLoading ? 'Building...' : 'Create Song Sheet'}
                </button>
                <button onClick={exportSongSheetTxt} style={secondaryButtonStyle}>
                  Export Song Sheet TXT
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sectionTitleStyle}>Export</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={exportSongTxt} style={secondaryButtonStyle}>
                  Export Song TXT
                </button>
                <button onClick={exportChordsTxt} style={secondaryButtonStyle}>
                  Export Chords TXT
                </button>
                <button onClick={exportCombinedTxt} style={secondaryButtonStyle}>
                  Export Combined TXT
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Rewrite Lab</h3>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {rewriteButtons.map((button) => (
                  <button
                    key={button.mode}
                    onClick={() => handleRewrite(button.mode, button.label)}
                    disabled={rewriteLoading !== null}
                    style={secondaryButtonStyle}
                  >
                    {rewriteLoading === button.mode ? 'Rewriting...' : button.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h3 style={{ marginTop: 0 }}>Song Version History</h3>

              <div style={tableWrapStyle}>
                <div style={tableScrollStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '48%', cursor: 'default' }}>Title</th>
                        <th style={{ ...thStyle, width: '36%', cursor: 'default' }}>Saved</th>
                        <th style={{ ...thStyle, width: '16%', cursor: 'default' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {songVersions.length > 0 ? (
                        songVersions.map((version) => (
                          <tr
                            key={version.id}
                            style={{
                              background: activeSongVersionId === version.id ? '#2563eb33' : 'transparent',
                            }}
                          >
                            <td style={tdStyle}>
                              <button onClick={() => loadSongVersion(version)} style={rowButtonStyle}>
                                {version.title ||
                                  version.result?.lyrics_brief ||
                                  version.form?.hook ||
                                  version.form?.theme ||
                                  'Untitled Version'}
                              </button>
                            </td>
                            <td style={tdStyle}>
                              <button onClick={() => loadSongVersion(version)} style={rowButtonStyle}>
                                {formatUkDateTime(version.created_at)}
                              </button>
                            </td>
                            <td style={tdStyle}>
                              <button onClick={() => deleteSongVersion(version.id)} style={actionIconButtonStyle}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={emptyHistoryStyle}>
                            No saved song versions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Output</h2>

            {result ? (
              result.error ? (
                <div style={{ color: '#f87171', marginBottom: 20 }}>{result.error}</div>
              ) : (
                <>
                  {result.style_short && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Style (Short)</div>
                      <div>{result.style_short}</div>
                    </div>
                  )}

                  {result.style_detailed && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Style (Detailed)</div>
                      <div>{result.style_detailed}</div>
                    </div>
                  )}

                  {result.lyrics_brief && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Lyrics Brief</div>
                      <div>{result.lyrics_brief}</div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div style={{ color: '#a1a1aa', marginBottom: 20 }}>No song output yet</div>
            )}

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h2 style={{ marginTop: 0 }}>Lyrics Editor</h2>

              <textarea
                value={editableLyrics}
                onChange={(e) => setEditableLyrics(e.target.value)}
                style={{ ...textareaStyle, minHeight: 260 }}
                placeholder="Lyrics will appear here..."
              />

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  onClick={() => {
                    setResult((prev) =>
                      prev
                        ? {
                            ...prev,
                            lyrics_full: editableLyrics,
                          }
                        : {
                            lyrics_full: editableLyrics,
                          }
                    )
                    setSongSheet('')
                    setCurrentPreviewBarIndex(0)
                    stopPreviewPlayback()
                    resetPerformanceScroll()
                    setProjectMessage('Lyrics updated in working view.')
                  }}
                  style={secondaryButtonStyle}
                >
                  Apply Edits
                </button>

                <button onClick={handleSaveEditedLyrics} disabled={saveEditedLyricsLoading} style={primaryButtonStyle}>
                  {saveEditedLyricsLoading ? 'Saving Edited Lyrics...' : 'Save Edited Version'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
              <h2 style={{ marginTop: 0 }}>Chord Engine</h2>

              {chords ? (
                chords.error ? (
                  <div style={{ color: '#f87171', marginBottom: 20 }}>{chords.error}</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <strong>Key:</strong> {transposedKey || chords.key || '—'}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <strong>Capo:</strong> {transposedCapoHint || chords.capo || '—'}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Verse</div>
                      <div>{transposeTextPreservingLayout(chords.verse || '—', transposeAmount)}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Chorus</div>
                      <div>{transposeTextPreservingLayout(chords.chorus || '—', transposeAmount)}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Bridge</div>
                      <div>{transposeTextPreservingLayout(chords.bridge || '—', transposeAmount)}</div>
                    </div>

                    {chords.notes && (
                      <div style={{ color: '#d4d4d8', fontStyle: 'italic', marginBottom: 20 }}>{chords.notes}</div>
                    )}
                  </>
                )
              ) : (
                <div style={{ color: '#a1a1aa', marginBottom: 20 }}>No chord output yet</div>
              )}

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h2 style={{ marginTop: 0 }}>Song Sheet</h2>

                {transposedSongSheet ? (
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      fontFamily: 'Courier New, monospace',
                      lineHeight: 1.7,
                      background: '#18181b',
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid #3f3f46',
                    }}
                  >
                    {transposedSongSheet}
                  </pre>
                ) : (
                  <div style={{ color: '#a1a1aa' }}>No song sheet yet</div>
                )}
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h3 style={{ marginTop: 0 }}>Chord Lab v2</h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {chordRewriteButtons.map((button) => (
                    <button
                      key={button.mode}
                      onClick={() => handleChordRewrite(button.mode)}
                      disabled={chordRewriteLoading !== null}
                      style={secondaryButtonStyle}
                    >
                      {chordRewriteLoading === button.mode ? 'Reworking...' : button.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #3f3f46' }}>
                <h3 style={{ marginTop: 0 }}>Chord History</h3>

                <div style={tableWrapStyle}>
                  <div style={tableScrollStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: '34%', cursor: 'default' }}>Title</th>
                          <th style={{ ...thStyle, width: '16%', cursor: 'default' }}>Key</th>
                          <th style={{ ...thStyle, width: '34%', cursor: 'default' }}>Saved</th>
                          <th style={{ ...thStyle, width: '16%', cursor: 'default' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chordVersions.length > 0 ? (
                          chordVersions.map((version) => (
                            <tr
                              key={version.id}
                              style={{
                                background: activeChordVersionId === version.id ? '#2563eb33' : 'transparent',
                              }}
                            >
                              <td style={tdStyle}>
                                <button onClick={() => loadChordVersion(version)} style={rowButtonStyle}>
                                  {version.title || 'Chord Snapshot'}
                                </button>
                              </td>
                              <td style={tdStyle}>
                                <button onClick={() => loadChordVersion(version)} style={rowButtonStyle}>
                                  {version.chord_data?.key || '—'}
                                </button>
                              </td>
                              <td style={tdStyle}>
                                <button onClick={() => loadChordVersion(version)} style={rowButtonStyle}>
                                  {formatUkDateTime(version.created_at)}
                                </button>
                              </td>
                              <td style={tdStyle}>
                                <button onClick={() => deleteChordVersion(version.id)} style={actionIconButtonStyle}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={emptyHistoryStyle}>
                              No saved chord versions yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...panelStyle, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Performance Mode</h2>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={() => setPerformanceMode((prev) => !prev)} style={primaryButtonStyle}>
              {performanceMode ? 'Hide Performance Mode' : 'Show Performance Mode'}
            </button>

            <button onClick={() => setTransposeAmount((prev) => prev - 1)} style={secondaryButtonStyle}>
              Transpose -1
            </button>

            <button onClick={() => setTransposeAmount(0)} style={secondaryButtonStyle}>
              Reset Transpose
            </button>

            <button onClick={() => setTransposeAmount((prev) => prev + 1)} style={secondaryButtonStyle}>
              Transpose +1
            </button>
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <strong>Transpose:</strong> {transposeAmount > 0 ? `+${transposeAmount}` : transposeAmount}
            </div>
            <div>
              <strong>Display Key:</strong> {transposedKey || chords?.key || '—'}
            </div>
            <div>
              <strong>Capo:</strong> {transposedCapoHint || chords?.capo || '—'}
            </div>
            {performanceMode && performanceSections.length > 0 && (
              <div>
                <strong>Current section:</strong>{' '}
                {activePerformanceSectionIndex >= 0
                  ? performanceSections[activePerformanceSectionIndex]?.label
                  : performanceSections[0]?.label}
              </div>
            )}
            {previewPlaying && (
              <div>
                <strong>Current bar:</strong> {currentPreviewBarIndex + 1} / {Math.max(1, previewBars.length)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={performanceShowChords}
                onChange={(e) => setPerformanceShowChords(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Show chords
            </label>

            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={followPlayback}
                onChange={(e) => setFollowPlayback(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Follow playback
            </label>

            <label style={{ cursor: 'pointer' }}>
              Font size
              <input
                type="range"
                min={20}
                max={44}
                value={performanceFontSize}
                onChange={(e) => setPerformanceFontSize(Number(e.target.value))}
                style={{ marginLeft: 10 }}
              />
              <span style={{ marginLeft: 8 }}>{performanceFontSize}px</span>
            </label>

            <label style={{ cursor: 'pointer' }}>
              Scroll speed
              <input
                type="range"
                min={1}
                max={10}
                value={performanceScrollSpeed}
                onChange={(e) => setPerformanceScrollSpeed(Number(e.target.value))}
                style={{ marginLeft: 10 }}
              />
              <span style={{ marginLeft: 8 }}>{performanceScrollSpeed}</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              onClick={() => setPerformanceIsScrolling(true)}
              style={secondaryButtonStyle}
              disabled={!performanceMode || !performanceSheet.trim() || (previewPlaying && followPlayback)}
            >
              Start Scroll
            </button>

            <button onClick={stopPerformanceScroll} style={secondaryButtonStyle} disabled={!performanceMode}>
              Pause Scroll
            </button>

            <button onClick={resetPerformanceScroll} style={secondaryButtonStyle} disabled={!performanceMode}>
              Reset Scroll
            </button>

            <button
              onClick={jumpToNextPerformanceSection}
              style={{
                ...primaryButtonStyle,
                opacity: !performanceMode || !nextPerformanceSection ? 0.55 : 1,
                cursor: !performanceMode || !nextPerformanceSection ? 'not-allowed' : 'pointer',
              }}
              disabled={!performanceMode || !nextPerformanceSection}
            >
              {nextPerformanceSection ? `Next Section: ${nextPerformanceSection.label}` : 'Next Section'}
            </button>
          </div>

          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 16,
              border: '1px solid #3f3f46',
              background: '#1b1b20',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Audio Preview</h3>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
              <label style={{ cursor: 'pointer' }}>
                Section
                <select
                  value={previewSection}
                  onChange={(e) => setPreviewSection(e.target.value as PreviewSectionKey)}
                  style={{ ...inputStyle, width: 170, marginLeft: 10, padding: '10px 12px' }}
                >
                  <option value="verse">Verse</option>
                  <option value="chorus">Chorus</option>
                  <option value="bridge">Bridge</option>
                  <option value="full_song">Full Song</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Pattern
                <select
                  value={previewPattern}
                  onChange={(e) => setPreviewPattern(e.target.value as PreviewPattern)}
                  style={{ ...inputStyle, width: 210, marginLeft: 10, padding: '10px 12px' }}
                >
                  <option value="ballad_strum">Ballad Strum</option>
                  <option value="country_train">Country Train</option>
                  <option value="fingerpick">Fingerpick</option>
                  <option value="piano_block">Piano Block Chords</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Instrument
                <select
                  value={previewInstrument}
                  onChange={(e) => setPreviewInstrument(e.target.value as PreviewInstrument)}
                  style={{ ...inputStyle, width: 170, marginLeft: 10, padding: '10px 12px' }}
                  disabled={previewPattern === 'piano_block'}
                >
                  <option value="guitar">Guitar</option>
                  <option value="piano">Piano</option>
                </select>
              </label>

              <label style={{ cursor: 'pointer' }}>
                Feel
                <select
                  value={previewFeel}
                  onChange={(e) => setPreviewFeel(e.target.value as PreviewFeel)}
                  style={{ ...inputStyle, width: 150, marginLeft: 10, padding: '10px 12px' }}
                  disabled={previewPattern === 'fingerpick' || previewPattern === 'piano_block'}
                >
                  <option value="straight">Straight</option>
                  <option value="swing">Swing</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <label style={{ cursor: 'pointer' }}>
                Tempo
                <input
                  type="range"
                  min={60}
                  max={150}
                  value={previewTempo}
                  onChange={(e) => setPreviewTempo(Number(e.target.value))}
                  style={{ marginLeft: 10 }}
                />
                <span style={{ marginLeft: 8 }}>{previewTempo} BPM</span>
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewLoop}
                  onChange={(e) => setPreviewLoop(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Loop
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewIncludeBass}
                  onChange={(e) => setPreviewIncludeBass(e.target.checked)}
                  style={{ marginRight: 8 }}
                  disabled={previewPattern === 'country_train'}
                />
                Add bass
              </label>

              <label style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={previewIncludeClick}
                  onChange={(e) => setPreviewIncludeClick(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Add click
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                onClick={startPreviewPlayback}
                disabled={!previewBars.length}
                style={{
                  ...primaryButtonStyle,
                  opacity: previewBars.length ? 1 : 0.55,
                  cursor: previewBars.length ? 'pointer' : 'not-allowed',
                }}
              >
                {previewPlaying ? 'Restart Preview' : previewReady ? 'Play Preview' : 'Enable Audio + Play'}
              </button>

              <button
                onClick={stopPreviewPlayback}
                disabled={!previewPlaying}
                style={{
                  ...secondaryButtonStyle,
                  opacity: previewPlaying ? 1 : 0.55,
                  cursor: previewPlaying ? 'pointer' : 'not-allowed',
                }}
              >
                Stop Preview
              </button>
            </div>

            <div style={{ color: '#a1a1aa', fontSize: 13 }}>
              {previewBars.length > 0
                ? `${previewBars.length} preview bar${previewBars.length === 1 ? '' : 's'} ready`
                : 'Generate or load chords to enable preview'}
            </div>
          </div>

          {performanceMode ? (
            <>
              <SectionJumpButtons
                performanceSections={performanceSections}
                activePerformanceSectionId={activePerformanceSectionId}
                onJumpToSection={handlePerformanceSectionJump}
              />

              <div
                ref={performanceScrollRef}
                style={{
                  maxHeight: 620,
                  overflowY: 'auto',
                  borderRadius: 16,
                  border: '1px solid #3f3f46',
                  background: '#0b0b0d',
                  padding: 8,
                  scrollBehavior: 'smooth',
                }}
              >
                <SongSheet
                  performanceSheet={performanceSheet}
                  performanceSections={performanceSections}
                  performanceFontSize={performanceFontSize}
                  activePerformanceSectionId={activePerformanceSectionId}
                  performanceSectionRefs={performanceSectionRefs}
                />
              </div>
            </>
          ) : (
            <div style={{ color: '#a1a1aa' }}>Performance Mode is hidden.</div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1fr) minmax(340px, 1fr)',
            gap: 24,
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Artist DNA Analyzer</h2>

            {dnaAnalyzerMessage && <div style={{ color: '#a1a1aa', marginBottom: 12 }}>{dnaAnalyzerMessage}</div>}

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Lyrics Samples</label>
              <textarea
                value={dnaAnalysisInput.lyrics_samples}
                onChange={(e) => updateDNAAnalysisInput('lyrics_samples', e.target.value)}
                style={{ ...textareaStyle, minHeight: 180 }}
                placeholder="Paste several lyrics samples here..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Chord Examples</label>
              <textarea
                value={dnaAnalysisInput.chord_examples}
                onChange={(e) => updateDNAAnalysisInput('chord_examples', e.target.value)}
                style={textareaStyle}
                placeholder="Optional chord examples..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Artist References</label>
              <textarea
                value={dnaAnalysisInput.artist_references}
                onChange={(e) => updateDNAAnalysisInput('artist_references', e.target.value)}
                style={textareaStyle}
                placeholder="Optional artist references..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={sectionTitleStyle}>Self Description</label>
              <textarea
                value={dnaAnalysisInput.self_description}
                onChange={(e) => updateDNAAnalysisInput('self_description', e.target.value)}
                style={textareaStyle}
                placeholder="Optional description of your voice, style, strengths, aims..."
              />
            </div>

            <button onClick={analyzeArtistDNA} disabled={dnaAnalyzing} style={primaryButtonStyle}>
              {dnaAnalyzing ? 'Analyzing...' : 'Analyze My Style'}
            </button>
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Artist DNA Profiler</h2>

            {(artistDNALoading || artistDNAMessage) && (
              <div style={{ color: '#a1a1aa', marginBottom: 12 }}>
                {artistDNALoading ? 'Loading artist DNA...' : artistDNAMessage}
              </div>
            )}

            {artistDNA.dna_summary && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 12,
                  background: '#1f1f23',
                  border: '1px solid #3f3f46',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>DNA Summary</div>
                <div>{artistDNA.dna_summary}</div>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <label style={sectionTitleStyle}>Artist Name</label>
                <input
                  value={artistDNA.artist_name}
                  onChange={(e) => updateArtistDNA('artist_name', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Vocal Range</label>
                <input
                  value={artistDNA.vocal_range}
                  onChange={(e) => updateArtistDNA('vocal_range', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Core Genres</label>
                <textarea
                  value={artistDNA.core_genres}
                  onChange={(e) => updateArtistDNA('core_genres', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Lyrical Style</label>
                <textarea
                  value={artistDNA.lyrical_style}
                  onChange={(e) => updateArtistDNA('lyrical_style', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Emotional Tone</label>
                <textarea
                  value={artistDNA.emotional_tone}
                  onChange={(e) => updateArtistDNA('emotional_tone', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Writing Strengths</label>
                <textarea
                  value={artistDNA.writing_strengths}
                  onChange={(e) => updateArtistDNA('writing_strengths', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Words / Themes to Avoid</label>
                <textarea
                  value={artistDNA.avoid_list}
                  onChange={(e) => updateArtistDNA('avoid_list', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={sectionTitleStyle}>Visual Style</label>
                <textarea
                  value={artistDNA.visual_style}
                  onChange={(e) => updateArtistDNA('visual_style', e.target.value)}
                  style={textareaStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={sectionTitleStyle}>Performance Style</label>
                <textarea
                  value={artistDNA.performance_style}
                  onChange={(e) => updateArtistDNA('performance_style', e.target.value)}
                  style={textareaStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button onClick={saveArtistDNA} disabled={artistDNASaving} style={primaryButtonStyle}>
                {artistDNASaving ? 'Saving...' : 'Save Artist DNA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}