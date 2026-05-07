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
  Project,
SongVersionRecord,
ChordVersionRecord,
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
  const [chordVersionTitle, setChordVersionTitle] = useState('')
  const [chordsText, setChordsText] = useState('{}')
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

    setUserEmail(user?.email || null)
    setAuthMessage(`Signed in as ${user?.email}`)
  }

  const signOut = async () => {
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

const rewritePresets = [
  'Make it more emotional',
  'Make it more conversational',
  'Make it more poetic',
  'Make it more radio-friendly',
  'Strengthen the hook',
  'Simplify the language',
]

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
    const latestChords = chordData.latest?.chord_data || null

    setPerformanceSheet(latestLyrics)
    setChords(latestChords)
    setChordsText(JSON.stringify(latestChords || {}, null, 2))

    setProjectMessage('')
  } catch (err: any) {
    if (latestProjectLoadRef.current !== token) return

    console.error(err)
    setProjectMessage(err.message || 'Failed to load project data')
    setPerformanceSheet('')
    setChords(null)
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




const saveChords = async () => {
  try {
    if (!activeProject) {
      setProjectMessage('Select a project first.')
      return
    }

    if (!chords) {
      setProjectMessage('No chords to save.')
      return
    }

    const res = await fetch('/api/chord-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: chordVersionTitle.trim() || 'Untitled chords',
        chord_data: chords,
      }),
    })

    const data = await readJsonSafe(res)
    if (!res.ok) throw new Error(data.error || 'Failed to save chords')

    await loadProjectData(activeProject.id)
    setChordVersionTitle('')
    setProjectMessage('Chords saved')
  } catch (err: any) {
    console.error(err)
    setProjectMessage(err.message || 'Failed to save chords')
  }
}

  if (!userEmail) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded bg-gray-800 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-2">Suno Prompt Studio</h1>
        <p className="text-gray-400 mb-4">{authMessage || 'Sign in to continue.'}</p>

        <div className="flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-2 rounded bg-gray-700 text-white"
          />

          <button
            type="button"
            onClick={sendOtp}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Send Verification Code
          </button>

          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Verification code"
            className="px-3 py-2 rounded bg-gray-700 text-white"
          />

          <button
            type="button"
            onClick={verifyOtp}
            className="px-4 py-2 rounded bg-green-600 text-white"
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

const parseSectionTarget = (sectionName: string) => {
  const match = sectionName.match(/^(.*?)(?:\s+#(\d+))?$/)

  return {
    label: normaliseSectionName(match?.[1] || sectionName),
    instance: match?.[2] ? Number(match[2]) : 1,
  }
}

const normaliseSectionName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/:$/, '')



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


const extractSectionTextStrict = (text: string, sectionName: string) => {
  if (!sectionName.trim()) return null

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

  if (startIndex === -1) return null

  let endIndex = lines.length

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (isSectionHeader(lines[i])) {
      endIndex = i
      break
    }
  }

  return lines.slice(startIndex, endIndex).join('\n')
}


const chordRegex =
  /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add|dom)?[0-9]*(maj|min|m|sus|add|dim|aug|b|#|\/|[0-9])*$/i

const looksLikeChordLine = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return false

  const cleaned = trimmed
    .replace(/\|/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')

  let tokens = cleaned.split(' ').filter(Boolean)

  const leadingLabels = ['solo', 'intro', 'outro', 'instrumental', 'break']
  if (tokens.length > 1 && leadingLabels.includes(tokens[0].toLowerCase())) {
    tokens = tokens.slice(1)
  }

  if (!tokens.length) return false

  const chordTokenRegex =
    /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add)?[0-9]*(b|#)?[0-9]*(\/[A-G](#|b)?)?$/i

  const chordCount = tokens.filter((token) =>
    chordTokenRegex.test(token)
  ).length

  return chordCount >= Math.ceil(tokens.length * 0.6)
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
  if (/^[A-Za-z0-9][A-Za-z0-9\s-]*:$/.test(trimmed)) return true

  // Verse / Chorus / Bridge etc. without brackets or colon
  const normalised = normaliseSectionName(trimmed)

  return knownSectionNames.includes(normaliseSectionName(trimmed))
}




const replaceSectionText = (
  fullText: string,
  sectionName: string,
  newSectionText: string
) => {
  if (!sectionName.trim()) return fullText

  const target = parseSectionTarget(sectionName)
  const lines = fullText.split('\n')

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

  if (startIndex === -1) return fullText

  let endIndex = lines.length

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (isSectionHeader(lines[i])) {
      endIndex = i
      break
    }
  }

  const newSectionLines = newSectionText.split('\n')

  return [
    ...lines.slice(0, startIndex),
    ...newSectionLines,
    ...lines.slice(endIndex),
  ].join('\n')
}



const detectSections = (text: string) => {
  const lines = text.split('\n')

  const counts: Record<string, number> = {}
  const result: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!isSectionHeader(line)) continue

    const base = line.replace(/[\[\]:]/g, '').trim()

    counts[base] = (counts[base] || 0) + 1

    const label = `${base} #${counts[base]}`

    result.push(label)
  }

  return result
}


const sourceForDetection =
  rewriteTarget === 'left'
    ? compareLeftText
    : rewriteTarget === 'right'
      ? compareRightText
      : performanceSheet

const detectedSections = detectSections(sourceForDetection)

const removeChordsFromRewriteSource = () => {
  setExtractingLyricsOnly(true)

  const lyricsOnly = extractLyricsOnly(sourceForDetection)

  if (rewriteTarget === 'left') {
    setCompareLeftText(lyricsOnly)
    setFlashLeftPanel(true)
    setTimeout(() => setFlashLeftPanel(false), 600)
  } else if (rewriteTarget === 'right') {
    setCompareRightText(lyricsOnly)
    setFlashRightPanel(true)
    setTimeout(() => setFlashRightPanel(false), 600)
  } else {
    setPerformanceSheet(lyricsOnly)
  }

  setRewriteMessage('Chord lines removed. Rewrite is now available.')
  setTimeout(() => setExtractingLyricsOnly(false), 800)
}


const buildRewriteInstruction = (
  instruction: string,
  constraint: string,
  sectionOnly: boolean
) => {
  const baseRules = [
    instruction,
    'Return rewritten lyrics only.',
    'Do not add new section headings unless they already existed in the supplied text.',
    'Do not explain the changes.',
    
    'Do not create a new song structure.',
  ]

  if (sectionOnly) {
    baseRules.push(
      'Rewrite ONLY the supplied section.',
      'Do not rewrite the full song.',
      'Return only the rewritten section, not the full song.',
      'Do not add other sections.'

    )
  }

  switch (constraint) {
    case 'keep-lines':
      baseRules.push(
        'Keep exactly the same number of lines as the original.',
        'Do not add lines.',
        'Do not remove lines.'
      )
      break

    case 'shorten':
      baseRules.push(
        'Shorten the wording within the existing structure.',
        'Do not add new sections.',
        'Do not make the song longer.'
      )
      break

    case 'extend':
      baseRules.push(
        'Extend the wording slightly, but do not create a new song structure.'
      )
      break

    case 'conversational':
      baseRules.push('Make the wording more natural and conversational.')
      break

    case 'poetic':
      baseRules.push('Make the wording more poetic and expressive.')
      break

    case 'stronger':
      baseRules.push('Make the emotional impact stronger.')
      break

    case 'simplify':
      baseRules.push('Simplify the language and phrasing.')
      break
  }

  return baseRules.join(' ')
}



const runRewriteLab = async () => {
  const fullSourceText =
      rewriteTarget === 'left'
        ? compareLeftText
        : rewriteTarget === 'right'
          ? compareRightText
          : performanceSheet




const sourceText = rewriteSectionOnly
  ? extractSectionText(fullSourceText, rewriteSectionName)
  : fullSourceText

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

    const originalLineCount = sourceText
    .split('\n')
    .filter((line) => line.trim().length > 0 && !isSectionHeader(line))
    .length

    const isHookMode =
  rewriteInstruction.toLowerCase().includes('hook')

  const mustPreserveLines =
  rewriteConstraint === 'keep-lines' || isHookMode


    const structuredSourceText =
 rewriteSectionOnly && (mustPreserveLines || isHookMode)
    ? (() => {
        const lines = sourceText.split('\n')

        const lyricLines = lines.filter(
          (line) => line.trim().length > 0 && !isSectionHeader(line)
        )

        const numbered = lyricLines
          .map((line, index) => `${index + 1}. ${line}`)
          .join('\n')

        return `
        FULL SECTION (for context):
        ${sourceText}

        REWRITE THESE NUMBERED LINES:
        ${numbered}
        `
              })()
            : sourceText


const runRewriteAttempt = async () => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'rewrite',
     instruction: isHookMode
  ? `
HOOK ENHANCEMENT MODE:
- You are given a numbered section.
- Change ONLY ONE line (the strongest hook).
- Keep all other lines EXACTLY the same.
- Keep numbering unchanged.
- Do NOT add or remove lines.
- Do NOT rewrite the full section.

OUTPUT:
Return the full numbered section with only ONE line changed.
`
  : rewriteSectionOnly
  ? `
STRICT RULES:
- Rewrite ONLY the provided section.
- Preserve meaning and emotional tone.
- Keep structure unless instructed otherwise.

TASK:
${buildRewriteInstruction(rewriteInstruction, rewriteConstraint, rewriteSectionOnly)}
`
  : buildRewriteInstruction(rewriteInstruction, rewriteConstraint, rewriteSectionOnly)
    }),
  })

  const data = await readJsonSafe(res)

  if (!res.ok) {
    throw new Error(data.error || 'Rewrite failed')
  }

if (rewriteSectionOnly) {
  return (
    data.rewrite ||
    data.lyrics ||
    data.text ||
    ''
  )
}

return (
  data.lyrics_full ||
  data.lyrics ||
  data.rewrite ||
  data.text ||
  ''
)
}

let rewritten = ''
let lastLineCount = originalLineCount

for (let attempt = 1; attempt <= 3; attempt++) {
  rewritten = await runRewriteAttempt()

const isChorusRewrite = normaliseSectionName(rewriteSectionName).includes('chorus')
const shouldRelaxAfterTwoFailures =
  isChorusRewrite &&
  rewriteConstraint === 'keep-lines' &&
  attempt >= 3


  const testSection =
  rewriteSectionOnly
    ? extractSectionTextStrict(rewritten, rewriteSectionName)
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
  !rewriteSectionOnly ||
  !mustPreserveLines ||
  shouldRelaxAfterTwoFailures
) {
  break
}

  if (lastLineCount === originalLineCount) {
    break
  }
}

const isChorusRewrite = normaliseSectionName(rewriteSectionName).includes('chorus')
const relaxedChorusRewrite =
  isChorusRewrite &&
  rewriteConstraint === 'keep-lines' &&
  lastLineCount !== originalLineCount

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

// 🔥 Clean AI output (remove any section headers it may have added)
const cleanedRewrite = rewritten
  .replace(/^\s*\[[^\]]+\]\s*$/gm, '')
  .replace(/^\s*\d+\.\s*/gm, '')
  .trim()

let finalText = cleanedRewrite

if (rewriteSectionOnly) {
  const safeRewrittenSection =
    rewriteConstraint === 'keep-lines'
      ? cleanedRewrite
      : extractSectionTextStrict(rewritten, rewriteSectionName) || ''

      const finalSectionForReplacement =
  isHookMode
    ? (() => {
        const originalLines = sourceText
          .split('\n')
          .filter((line) => line.trim().length > 0)

        const rewrittenLines = safeRewrittenSection
          .split('\n')
          .filter((line) => line.trim().length > 0)

        const originalLyricLines = originalLines.filter(
          (line) => !isSectionHeader(line)
        )

        const rewrittenLyricLines = rewrittenLines.filter(
          (line) => !isSectionHeader(line)
        )

        const changedIndex = rewrittenLyricLines.findIndex(
          (line, index) =>
            originalLyricLines[index] &&
            line.trim() !== originalLyricLines[index].trim()
        )

        if (changedIndex === -1) return sourceText

        let lyricCounter = -1

        return originalLines
          .map((line) => {
            if (isSectionHeader(line)) return line

            lyricCounter++

            return lyricCounter === changedIndex
              ? rewrittenLyricLines[changedIndex]
              : line
          })
          .join('\n')
      })()
    : safeRewrittenSection

  if (!safeRewrittenSection.trim()) {
    throw new Error('Failed to isolate rewritten section')
  }

  const rewrittenLineCount = finalSectionForReplacement
    .split('\n')
    .filter((line) => line.trim().length > 0 && !isSectionHeader(line))
    .length

  if (rewriteConstraint === 'keep-lines' && rewrittenLineCount !== originalLineCount) {
    throw new Error(
      `Rewrite changed the line count (${originalLineCount} → ${rewrittenLineCount}). Try again.`
    )
  }

  console.log('HOOK MODE:', isHookMode)
console.log('rewriteSectionName:', rewriteSectionName)
console.log('sourceText:', sourceText)
console.log('finalSectionForReplacement:', finalSectionForReplacement)
console.log('fullSourceText before replace:', fullSourceText)



  finalText = replaceSectionText(
    fullSourceText,
    rewriteSectionName,
    finalSectionForReplacement
  )
}

console.log('finalText after:', finalText)

if (rewriteTarget === 'left') {
  setCompareLeftText(finalText)
  setFlashLeftPanel(true)
  setTimeout(() => setFlashLeftPanel(false), 600)
} else if (rewriteTarget === 'right') {
  setCompareRightText(finalText)
  setFlashRightPanel(true)
  setTimeout(() => setFlashRightPanel(false), 600)
} else {
  setPerformanceSheet(finalText)
}

if (
  rewriteConstraint === 'keep-lines' &&
  normaliseSectionName(rewriteSectionName).includes('chorus') &&
  lastLineCount !== originalLineCount
) {
  setRewriteMessage(
    `Rewrite complete — chorus polished with flexible structure (${originalLineCount} → ${lastLineCount} lines)`
  )
} else if (rewriteConstraint === 'keep-lines') {
  setRewriteMessage(`Rewrite complete — ${originalLineCount} lines preserved`)
} else {
  setRewriteMessage('Rewrite complete')
}
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

    <div className="flex h-screen bg-gray-900 text-white">
      <div
        className={`${
         sidebarCollapsed ? 'w-14' : 'w-44'
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

        <div ref={performanceScrollRef} className="flex-1 overflow-auto p-6">



          {mode === 'write' && (
            <div>
              <h1 className="text-xl mb-4">Write</h1>
              <p className="text-gray-400 mb-4">Lyrics, ideas, and structure go here.</p>
              <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
  <h2 className="text-lg font-semibold mb-3">Song / Lyrics</h2>

  <textarea
  value={chordsText}
  onChange={(e) => {
    const text = e.target.value
    setChordsText(text)

    try {
      const parsed = JSON.parse(text)
      setChords(parsed)
    } catch {
      // allow invalid JSON while typing
    }
  }}
  placeholder='Paste chord JSON here'
  className="w-full min-h-[220px] px-3 py-2 rounded bg-gray-700 text-white font-mono text-sm"
/>

</div>
   
{songVersions.length > 0 && (
  <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
    <h3 className="text-sm text-gray-400 mb-2">Saved Versions</h3>

    <select
      value={activeSongVersionId || ''}
      onChange={(e) => {
        const id = e.target.value
        setActiveSongVersionId(id)

        const selected = songVersions.find(v => v.id === id)
        if (selected?.result?.lyrics_full) {
          setPerformanceSheet(selected.result.lyrics_full)
        }
      }}
      className="w-full px-3 py-2 rounded bg-gray-700 text-white"
    >
      {songVersions.map((v, i) => (
        <option key={v.id} value={v.id}>
          {v.title || `Version ${songVersions.length - i}`} {v.created_at ? `(${formatUkDateTime(v.created_at)})` : ''}
        </option>
      ))}
    </select>
  </div>
)}

<input
  value={songVersionTitle}
  onChange={(e) => setSongVersionTitle(e.target.value)}
  placeholder="Version title, e.g. Chorus rewrite, Short radio edit"
  className="mt-3 w-full px-3 py-2 rounded bg-gray-700 text-white"
/>


<div className="flex gap-2 mt-3">
<button
  type="button"
  onClick={saveSong}
  disabled={savingSong || !activeProject || !performanceSheet.trim()}
  className={`px-4 py-2 rounded text-white transition ${
    savingSong
      ? 'bg-gray-600 scale-95'
      : justSavedSong
        ? 'bg-blue-600'
        : 'bg-green-600'
  } disabled:opacity-40`}
>
  {savingSong ? 'Saving song...' : justSavedSong ? 'Saved ✓' : 'Save Song'}
</button>

  {!activeProject && (
    <span className="text-sm text-yellow-400 self-center">
      Select a project first
    </span>
  )}

  
</div>


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
          writeScrollTopRef.current = performanceScrollRef.current?.scrollTop || 0
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
          writeScrollTopRef.current = performanceScrollRef.current?.scrollTop || 0
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

<div className="mt-4">
  <h4 className="text-sm text-gray-400 mb-2">Live Difference Preview</h4>

  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
    <div
      ref={previewLeftRef}
      onScroll={() => syncPreviewScroll('left')}
      className="bg-gray-900 rounded p-4 font-mono text-sm leading-7 text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto"
    >
      {editedDiffRows.map((row, i) => (
        <div
          key={i}
          onClick={() => {
            if (row.changed) scrollCompareEditorsToLine(i)
          }}
          title={row.changed ? 'Click to jump editors to this line' : undefined}
          className={
         `px-1 ${
          row.changed
            ? 'bg-yellow-900/40 cursor-pointer hover:bg-yellow-800/50'
            : ''
        } ${
          highlightedLines.includes(i)
            ? 'bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)] rounded'
            : ''
        }`
          }
        >
          {getWordDiffParts(row.left, row.right).leftParts.map((part, j) => (
            <span
              key={j}
              className={part.changed ? 'bg-yellow-700/60 rounded px-0.5' : ''}
            >
              {part.text}
            </span>
          ))}
        </div>
      ))}
    </div>

<div className="hidden md:block w-[112px]" />


    <div
      ref={previewRightRef}
      onScroll={() => syncPreviewScroll('right')}
      className="bg-gray-900 rounded p-4 font-mono text-sm leading-7 text-gray-100 min-h-[300px] max-h-[400px] overflow-y-auto"
    >
      {editedDiffRows.map((row, i) => (
        <div
          key={i}
          onClick={() => {
            if (row.changed) scrollCompareEditorsToLine(i)
          }}
          title={row.changed ? 'Click to jump editors to this line' : undefined}
          className={
            row.changed
              ? 'bg-yellow-900/40 px-1 rounded cursor-pointer hover:bg-yellow-800/50'
              : 'px-1'
          }
        >
          {getWordDiffParts(row.left, row.right).rightParts.map((part, j) => (
            <span
              key={j}
              className={part.changed ? 'bg-yellow-700/60 rounded px-0.5' : ''}
            >
              {part.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
</div>


<div className="mb-4 p-4 rounded bg-gray-800 max-w-6xl">
 <div className="flex items-center justify-between mb-1 leading-tight">
  <h3 className="text-lg font-semibold">Rewrite Lab</h3>

  <div className="text-xs text-gray-400 flex gap-4">
    <span>
      <strong>Project:</strong> {activeProject?.title || 'None'}
    </span>

    <span>
      <strong>Source:</strong>{' '}
      {rewriteTarget === 'left'
        ? 'Left'
        : rewriteTarget === 'right'
          ? 'Right'
          : 'Main'}
    </span>

    {rewriteInstruction.toLowerCase().includes('hook') && (
  <div className="text-xs text-yellow-300 mt-1">
    Hook strengthening works best on a selected chorus section.
  </div>
)}

    {rewriteSectionOnly && (
      <span>
       <strong>Section:</strong> {rewriteSectionName || '—'}
      </span>
    )}
  </div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
  <select
    value={rewritePreset}
    onChange={(e) => {
      setRewritePreset(e.target.value)
      setRewriteInstruction(e.target.value)
    }}
    className="px-3 py-2 rounded bg-gray-700 text-white"
  >
    <option value="">Choose preset</option>
    {rewritePresets.map((p) => (
      <option key={p} value={p}>
        {p}
      </option>
    ))}
  </select>

  <select
  title="Choose which panel or editor to rewrite"
  value={rewriteTarget}
  onChange={(e) =>
    setRewriteTarget(e.target.value as 'left' | 'right' | 'main')
  }
  className="px-3 py-2 rounded bg-gray-700 text-white"
>
  <option value="left">Rewrite left panel</option>
  <option value="right">Rewrite right panel</option>
  <option value="main">Rewrite main song</option>
</select>

  <input
    value={rewriteInstruction}
    onChange={(e) => setRewriteInstruction(e.target.value)}
    placeholder="Or type custom instruction..."
    className="md:col-span-2 px-3 py-2 rounded bg-gray-700 text-white"
  />


    <select
    value={rewriteConstraint}
    onChange={(e) => setRewriteConstraint(e.target.value)}
    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
  >
    <option value="default">Default</option>
   <option value="keep-lines" disabled={commercialPolishMode}>
  Keep structure {commercialPolishMode ? '(disabled in polish mode)' : ''}
</option>
    <option value="shorten">Shorten content</option>
    <option value="extend">Extend content</option>
    <option value="conversational">More conversational</option>
    <option value="poetic">More poetic</option>
    <option value="stronger">Stronger impact</option>
    <option value="simplify">Simplify lyrics</option>
  </select>


</div>
    <div className="flex flex-col md:flex-row gap-2 mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={commercialPolishMode}
            onChange={(e) => setCommercialPolishMode(e.target.checked)}
          />
          Commercial polish mode
        </label>
        
      
        <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={rewriteSectionOnly}
          disabled={detectedSections.length === 0}
          onChange={(e) => setRewriteSectionOnly(e.target.checked)}
        />
        Rewrite section only
      </label>

         <select
          value={rewriteSectionName}
          onChange={(e) => setRewriteSectionName(e.target.value)}
          disabled={!rewriteSectionOnly || detectedSections.length === 0}
          className="flex-1 px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-40"
            >
              <option value="">Select section</option>

              {detectedSections.map((section, i) => (
                  <option key={`${section}-${i}`} value={section}>
                    {section}
                  </option>
                ))}
         </select>
    
     {detectedSections.length === 0 && (
      <div className="text-xs text-yellow-400 mt-1">
        No sections detected — full rewrite only
      </div>
    )}

    </div>

        {!rewriteSectionOnly && hasChordLinesInRewriteSource && (
          <div className="mb-3 p-3 rounded bg-yellow-900/30 text-yellow-200 text-sm">
            <div>
              Chords detected. Rewrite is available only after removing chord lines.
            </div>

            <div className="mt-2 flex gap-2">

   


              <button
                type="button"
                onClick={removeChordsFromRewriteSource}
                className={`px-3 py-1 rounded text-white text-xs transition ${
                  extractingLyricsOnly ? 'bg-green-600 scale-95' : 'bg-yellow-600'
                }`}
              >
                {extractingLyricsOnly ? 'Removed ✓' : 'Remove chords'}
              </button>

              <button
                type="button"
                onClick={() => setRewriteMessage('Rewrite cancelled.')}
                className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
              >
                No
              </button>
            </div>
          </div>
        )}
        {!rewriteInstruction.trim() && (
          <p className="text-xs text-yellow-400 mb-2">
            Choose a rewrite preset or type an instruction.
          </p>
        )}

        <button
          type="button"
          onClick={runRewriteLab}
          disabled={
              rewriteLoading ||
              !rewriteInstruction.trim() ||
              (!rewriteSectionOnly && hasChordLinesInRewriteSource)
            }
          className={`px-4 py-2 rounded text-white transition ${
            rewriteLoading
              ? 'bg-gray-600 scale-95'
              : rewriteDone
                ? 'bg-green-600'
                : 'bg-blue-600'
          } disabled:opacity-40`}
        >
          {rewriteLoading ? 'Rewriting...' : rewriteDone ? 'Rewritten ✓' : 'Run Rewrite'}
        </button>

          {rewriteMessage && (
            <p className="text-sm text-gray-400 mt-2">{rewriteMessage}</p>
          )}
</div>

    <input
      value={chordVersionTitle}
      onChange={(e) => setChordVersionTitle(e.target.value)}
      placeholder="Chord version title (e.g. Capo 3, Fingerstyle, Simplified)"
      className="mt-3 w-full px-3 py-2 rounded bg-gray-700 text-white"
    />


             
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


    <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
      <h3 className="text-lg font-semibold mb-3">Chord Data</h3>

      <textarea
        value={JSON.stringify(chords || {}, null, 2)}
        onChange={(e) => {
          try {
            setChords(JSON.parse(e.target.value))
          } catch {
            // Ignore invalid JSON while typing
          }
        }}
        placeholder='Paste chord JSON here, e.g. {"key":"G","verse":"G | D | Em | C"}'
        className="w-full min-h-[220px] px-3 py-2 rounded bg-gray-700 text-white font-mono text-sm"
      />
    </div>


    <p className="text-xs text-gray-400 mb-2">
      activeProject: {activeProject ? 'yes' : 'no'} | chords:{' '}
      {chords ? 'yes' : 'no'} | chordVersions: {chordVersions.length}
    </p>



    <div className="flex gap-2 mb-4">
      <button
        type="button"
        onClick={saveChords}
        disabled={!activeProject}
        className="px-4 py-2 rounded bg-yellow-600 text-white disabled:opacity-40"
      >
        Save Chords
      </button>
    </div>



    {chordVersions.length > 0 && (
        <div className="mb-4 p-4 rounded bg-gray-800 max-w-3xl">
             <h3 className="text-sm text-gray-400 mb-2">Chord Versions</h3>

                <select
                  value={activeChordVersionId || ''}
                  onChange={(e) => {
                    const id = e.target.value
                    setActiveChordVersionId(id)

                    const selected = chordVersions.find(v => v.id === id)
                    if (selected?.chord_data) {
                      setChords(selected.chord_data)
                    }
                  }}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                >
                  {chordVersions.map((v, i) => (
                    <option key={v.id} value={v.id}>
                      {v.title || `Version ${chordVersions.length - i}`} {v.created_at ? `(${formatUkDateTime(v.created_at)})` : ''}
                    </option>
                  ))}
                </select>
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