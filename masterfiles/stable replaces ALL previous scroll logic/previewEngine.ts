// /lib/previewEngine.ts

import type React from 'react'
import * as Tone from 'tone'
import { displayRoot, normalizeRoot } from '@/lib/parseSong'
import { PreviewBarMeta, PreviewFeel, PreviewInstrument, PreviewPattern } from '@/types/song'

const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export type PreviewEngineRefs = {
  previewEventIdsRef: React.MutableRefObject<number[]>
  previewChordInstrumentRef: React.MutableRefObject<Tone.PolySynth | null>
  previewBassSynthRef: React.MutableRefObject<Tone.MonoSynth | null>
  previewClickSynthRef: React.MutableRefObject<Tone.MembraneSynth | null>
  lastFollowedSectionIdRef: React.MutableRefObject<string | null>
}

type SchedulePlaybackFollowParams = {
  transport: ReturnType<typeof Tone.getTransport>
  barMeta: PreviewBarMeta
  index: number
  followPlayback: boolean
  performanceMode: boolean
  lastFollowedSectionIdRef: React.MutableRefObject<string | null>
  setActivePerformanceSectionId: React.Dispatch<React.SetStateAction<string | null>>
  jumpToPerformanceSection: (sectionId: string) => void
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type ScheduleBassParams = {
  transport: ReturnType<typeof Tone.getTransport>
  index: number
  bassNote: string
  pattern: PreviewPattern
  previewIncludeBass: boolean
  previewBassSynthRef: React.MutableRefObject<Tone.MonoSynth | null>
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type ScheduleClickParams = {
  transport: ReturnType<typeof Tone.getTransport>
  index: number
  previewIncludeClick: boolean
  previewClickSynthRef: React.MutableRefObject<Tone.MembraneSynth | null>
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type ScheduleBalladStrumParams = {
  transport: ReturnType<typeof Tone.getTransport>
  chordSynth: Tone.PolySynth
  chordNotes: string[]
  index: number
  previewFeel: PreviewFeel
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type ScheduleCountryTrainParams = {
  transport: ReturnType<typeof Tone.getTransport>
  chordSynth: Tone.PolySynth
  chordNotes: string[]
  bassNote: string
  index: number
  previewBassSynthRef: React.MutableRefObject<Tone.MonoSynth | null>
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type ScheduleFingerpickParams = {
  transport: ReturnType<typeof Tone.getTransport>
  chordSynth: Tone.PolySynth
  chordNotes: string[]
  bassNote: string
  index: number
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type SchedulePianoBlockParams = {
  transport: ReturnType<typeof Tone.getTransport>
  chordSynth: Tone.PolySynth
  chordNotes: string[]
  index: number
  previewEventIdsRef: React.MutableRefObject<number[]>
}

type StopPreviewPlaybackParams = {
  previewEventIdsRef: React.MutableRefObject<number[]>
  previewChordInstrumentRef: React.MutableRefObject<Tone.PolySynth | null>
  lastFollowedSectionIdRef: React.MutableRefObject<string | null>
  setPreviewPlaying: React.Dispatch<React.SetStateAction<boolean>>
}

type EnsurePreviewInstrumentsParams = {
  previewInstrument: PreviewInstrument
  previewChordInstrumentRef: React.MutableRefObject<Tone.PolySynth | null>
  previewBassSynthRef: React.MutableRefObject<Tone.MonoSynth | null>
  previewClickSynthRef: React.MutableRefObject<Tone.MembraneSynth | null>
}

export function rootToNote(root: string, octave: number) {
  return `${normalizeRoot(root)}${octave}`
}

export function chordSymbolToNotes(symbol: string, octave = 4) {
  const cleaned = symbol.replace(/[–—]/g, '-').trim()
  const match = cleaned.match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/)

  if (!match) return ['C4', 'E4', 'G4']

  const root = normalizeRoot(match[1])
  const quality = (match[2] || '').toLowerCase()
  const rootIndex = CHROMATIC_SHARPS.indexOf(root)
  if (rootIndex === -1) return ['C4', 'E4', 'G4']

  let intervals = [0, 4, 7]

  if (quality.startsWith('m') && !quality.startsWith('maj')) intervals = [0, 3, 7]
  if (quality.includes('dim')) intervals = [0, 3, 6]
  if (quality.includes('aug')) intervals = [0, 4, 8]
  if (quality.includes('sus2')) intervals = [0, 2, 7]
  else if (quality.includes('sus4') || quality.includes('sus')) intervals = [0, 5, 7]

  if (quality.includes('maj7')) intervals = [...intervals, 11]
  else if (quality.includes('7')) intervals = [...intervals, 10]
  else if (quality.includes('6')) intervals = [...intervals, 9]

  if (quality.includes('add9') || quality.includes('9')) intervals = [...intervals, 14]

  const notes = intervals.map((interval) => {
    const chromaticIndex = (rootIndex + interval) % 12
    const octaveOffset = Math.floor((rootIndex + interval) / 12)
    return `${displayRoot(CHROMATIC_SHARPS[chromaticIndex])}${octave + octaveOffset}`
  })

  return Array.from(new Set(notes))
}

export function chordSymbolToBassNote(symbol: string, octave = 2) {
  const cleaned = symbol.replace(/[–—]/g, '-').trim()
  const match = cleaned.match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/)
  if (!match) return 'C2'
  const bass = match[3] || match[1]
  return rootToNote(bass, octave)
}

export function rotateNotesForFingerpick(notes: string[]) {
  if (notes.length <= 1) return notes
  const sorted = [...notes]
  return [sorted[0], sorted[sorted.length - 1], ...sorted.slice(1, -1)]
}

export function clearPreviewSchedules(previewEventIdsRef: React.MutableRefObject<number[]>) {
  const transport = Tone.getTransport()
  previewEventIdsRef.current.forEach((id) => transport.clear(id))
  previewEventIdsRef.current = []
}

export function ensurePreviewInstruments({
  previewInstrument,
  previewChordInstrumentRef,
  previewBassSynthRef,
  previewClickSynthRef,
}: EnsurePreviewInstrumentsParams) {
  previewChordInstrumentRef.current?.dispose()

  if (previewInstrument === 'piano') {
    previewChordInstrumentRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.35, release: 1.0 },
      volume: -8,
    }).toDestination()
  } else {
    previewChordInstrumentRef.current = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.6,
      envelope: { attack: 0.005, decay: 0.18, sustain: 0.2, release: 0.8 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.08, release: 0.35 },
      volume: -9,
    }).toDestination()
  }

  if (previewChordInstrumentRef.current) {
    previewChordInstrumentRef.current.maxPolyphony = 12
  }

  if (!previewBassSynthRef.current) {
    previewBassSynthRef.current = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.2,
        release: 0.8,
        baseFrequency: 90,
        octaves: 2.5,
      },
    }).toDestination()
  }

  if (!previewClickSynthRef.current) {
    previewClickSynthRef.current = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination()
  }
}

export function stopPreviewPlayback({
  previewEventIdsRef,
  previewChordInstrumentRef,
  lastFollowedSectionIdRef,
  setPreviewPlaying,
}: StopPreviewPlaybackParams) {
  clearPreviewSchedules(previewEventIdsRef)
  const transport = Tone.getTransport()
  transport.stop()
  transport.cancel(0)
  transport.position = 0
  previewChordInstrumentRef.current?.releaseAll()
  lastFollowedSectionIdRef.current = null
  setPreviewPlaying(false)
}

export function schedulePlaybackFollowForBar({
  transport,
  barMeta,
  index,
  followPlayback,
  performanceMode,
  lastFollowedSectionIdRef,
  setActivePerformanceSectionId,
  jumpToPerformanceSection,
  previewEventIdsRef,
}: SchedulePlaybackFollowParams) {
  const id = transport.schedule(() => {
    if (!followPlayback || !performanceMode) return
    if (!barMeta.sectionId) return
    if (lastFollowedSectionIdRef.current === barMeta.sectionId) return

    lastFollowedSectionIdRef.current = barMeta.sectionId
    setActivePerformanceSectionId(barMeta.sectionId)

    window.requestAnimationFrame(() => {
      jumpToPerformanceSection(barMeta.sectionId as string)
    })
  }, `${index}m`)

  previewEventIdsRef.current.push(id)
}

export function scheduleBassForBar({
  transport,
  index,
  bassNote,
  pattern,
  previewIncludeBass,
  previewBassSynthRef,
  previewEventIdsRef,
}: ScheduleBassParams) {
  if (!previewIncludeBass) return

  const bass = previewBassSynthRef.current
  if (!bass) return

  if (pattern === 'country_train') {
    const id = transport.scheduleRepeat(
      (time) => {
        bass.triggerAttackRelease(bassNote, '8n', time, 0.75)
      },
      '4n',
      `${index}m`,
      '1m'
    )
    previewEventIdsRef.current.push(id)
    return
  }

  const id = transport.scheduleRepeat(
    (time) => {
      bass.triggerAttackRelease(bassNote, '8n', time, 0.7)
    },
    '2n',
    `${index}m`,
    '1m'
  )
  previewEventIdsRef.current.push(id)
}

export function scheduleClickForBar({
  transport,
  index,
  previewIncludeClick,
  previewClickSynthRef,
  previewEventIdsRef,
}: ScheduleClickParams) {
  if (!previewIncludeClick) return

  const click = previewClickSynthRef.current
  if (!click) return

  const id = transport.scheduleRepeat(
    (time) => {
      click.triggerAttackRelease('C2', '32n', time, 0.22)
    },
    '4n',
    `${index}m`,
    '1m'
  )
  previewEventIdsRef.current.push(id)
}

export function scheduleBalladStrum({
  transport,
  chordSynth,
  chordNotes,
  index,
  previewFeel,
  previewEventIdsRef,
}: ScheduleBalladStrumParams) {
  const strumOffsets =
    previewFeel === 'swing'
      ? ['0:0:0', '0:1:0', '0:2:2', '0:3:0']
      : ['0:0:0', '0:1:0', '0:2:0', '0:3:0']

  strumOffsets.forEach((offset, strumIndex) => {
    const id = transport.schedule((time) => {
      chordNotes.forEach((note, noteIndex) => {
        const velocity = strumIndex === 0 ? 0.9 : 0.64
        chordSynth.triggerAttackRelease(note, '8n', time + noteIndex * 0.018, velocity)
      })
    }, `${index}m + ${offset}`)
    previewEventIdsRef.current.push(id)
  })
}

export function scheduleCountryTrain({
  transport,
  chordSynth,
  chordNotes,
  bassNote,
  index,
  previewBassSynthRef,
  previewEventIdsRef,
}: ScheduleCountryTrainParams) {
  const lowerChord = chordNotes.slice(0, Math.max(2, Math.ceil(chordNotes.length / 2)))
  const upperChord = chordNotes

  const bassHit = transport.schedule((time) => {
    previewBassSynthRef.current?.triggerAttackRelease(bassNote, '8n', time, 0.8)
  }, `${index}m + 0:0:0`)
  previewEventIdsRef.current.push(bassHit)

  const chop1 = transport.schedule((time) => {
    upperChord.forEach((note, noteIndex) => {
      chordSynth.triggerAttackRelease(note, '16n', time + noteIndex * 0.01, 0.62)
    })
  }, `${index}m + 0:1:0`)
  previewEventIdsRef.current.push(chop1)

  const bassHit2 = transport.schedule((time) => {
    previewBassSynthRef.current?.triggerAttackRelease(bassNote, '8n', time, 0.76)
  }, `${index}m + 0:2:0`)
  previewEventIdsRef.current.push(bassHit2)

  const chop2 = transport.schedule((time) => {
    lowerChord.forEach((note, noteIndex) => {
      chordSynth.triggerAttackRelease(note, '16n', time + noteIndex * 0.01, 0.58)
    })
  }, `${index}m + 0:3:0`)
  previewEventIdsRef.current.push(chop2)
}

export function scheduleFingerpick({
  transport,
  chordSynth,
  chordNotes,
  bassNote,
  index,
  previewEventIdsRef,
}: ScheduleFingerpickParams) {
  const ordered = rotateNotesForFingerpick(chordNotes)
  const patternNotes = [
    bassNote,
    ordered[0] || bassNote,
    ordered[1] || ordered[0] || bassNote,
    ordered[2] || ordered[1] || ordered[0] || bassNote,
    bassNote,
    ordered[1] || ordered[0] || bassNote,
    ordered[2] || ordered[1] || ordered[0] || bassNote,
    ordered[0] || bassNote,
  ]
  const offsets = ['0:0:0', '0:0:2', '0:1:0', '0:1:2', '0:2:0', '0:2:2', '0:3:0', '0:3:2']

  offsets.forEach((offset, noteIndex) => {
    const id = transport.schedule((time) => {
      chordSynth.triggerAttackRelease(patternNotes[noteIndex], '8n', time, noteIndex % 4 === 0 ? 0.86 : 0.6)
    }, `${index}m + ${offset}`)
    previewEventIdsRef.current.push(id)
  })
}

export function schedulePianoBlock({
  transport,
  chordSynth,
  chordNotes,
  index,
  previewEventIdsRef,
}: SchedulePianoBlockParams) {
  const id = transport.schedule((time) => {
    chordSynth.volume.value = -8
    chordSynth.triggerAttackRelease(chordNotes, '1m', time, 0.55)
  }, `${index}m`)
  previewEventIdsRef.current.push(id)
}