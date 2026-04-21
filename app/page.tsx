'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'

import { parseSongSheet } from '@/lib/parseSong'
import { buildPreviewBarsFromSections } from '@/lib/buildPreviewBars'

export default function Page() {
  // ===============================
  // STATE
  // ===============================

  const [performanceSheet, setPerformanceSheet] = useState('')
  const [performanceMode, setPerformanceMode] = useState(true)
  const [followPlayback, setFollowPlayback] = useState(true)

  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [currentPreviewBarIndex, setCurrentPreviewBarIndex] = useState(0)

  const [activePerformanceSectionId, setActivePerformanceSectionId] =
    useState<string | null>(null)

  // ===============================
  // REFS
  // ===============================

  const transportRef = useRef<ReturnType<typeof Tone.getTransport> | null>(null)
  const intervalRef = useRef<number | null>(null)

  const performanceScrollRef = useRef<HTMLDivElement | null>(null)
  const performanceSectionRefs = useRef<Record<string, HTMLDivElement | null>>(
    {}
  )

  const lastFollowedSectionIdRef = useRef<string | null>(null)

  // ===============================
  // PARSE + BUILD BARS
  // ===============================

  const sections = useMemo(() => {
    return parseSongSheet(performanceSheet)
  }, [performanceSheet])

  const previewBars = useMemo(() => {
    return buildPreviewBarsFromSections(sections)
  }, [sections])

  // ===============================
  // AUDIO ENGINE (simple click synth)
  // ===============================

  const startAudio = async () => {
    await Tone.start()

    const synth = new Tone.MembraneSynth().toDestination()

    Tone.Transport.cancel()
    Tone.Transport.position = 0

    Tone.Transport.scheduleRepeat((time) => {
      synth.triggerAttackRelease('C2', '8n', time)
    }, '1m')

    Tone.Transport.start()

    transportRef.current = Tone.getTransport()
  }

  const stopAudio = () => {
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }

  // ===============================
  // PLAYBACK CONTROL
  // ===============================

  const startPreviewPlaybackFromBar = async (startIndex = 0) => {
    if (previewBars.length === 0) return

    await startAudio()

    const safeIndex = Math.max(0, Math.min(startIndex, previewBars.length - 1))

    setCurrentPreviewBarIndex(safeIndex)
    setPreviewPlaying(true)

    // reset follow tracking
    lastFollowedSectionIdRef.current = null

    const startBar = previewBars[safeIndex]
    const startSectionId = startBar?.sectionId || null

    if (startSectionId) {
      setActivePerformanceSectionId(startSectionId)

      requestAnimationFrame(() => {
        scrollPerformanceToBarIndex(safeIndex, 'auto')
      })
    }

    // BAR TIMER (simple simulation)
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = window.setInterval(() => {
      setCurrentPreviewBarIndex((prev) => {
        if (prev >= previewBars.length - 1) {
          stopPreviewPlayback()
          return prev
        }
        return prev + 1
      })
    }, 1000) // adjust tempo here
  }

  const stopPreviewPlayback = () => {
    setPreviewPlaying(false)
    stopAudio()

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // ===============================
  // FOLLOW SCROLL
  // ===============================

  const scrollPerformanceToBarIndex = (
    barIndex: number,
    behavior: ScrollBehavior = 'smooth'
  ) => {
    const bar = previewBars[barIndex]
    if (!bar) return

    const sectionEl = performanceSectionRefs.current[bar.sectionId]
    const container = performanceScrollRef.current

    if (!sectionEl || !container) return

    const offset = container.clientHeight * 0.25

    const targetTop = Math.max(0, sectionEl.offsetTop - offset)

    container.scrollTo({
      top: targetTop,
      behavior,
    })
  }

  useEffect(() => {
    if (!performanceMode || !followPlayback || !previewPlaying) return
    if (previewBars.length === 0) return

    const currentBar = previewBars[currentPreviewBarIndex]
    if (!currentBar) return

    const sectionId = currentBar.sectionId

    if (sectionId !== lastFollowedSectionIdRef.current) {
      lastFollowedSectionIdRef.current = sectionId
      setActivePerformanceSectionId(sectionId)
    }

    scrollPerformanceToBarIndex(currentPreviewBarIndex, 'smooth')
  }, [
    currentPreviewBarIndex,
    previewBars,
    performanceMode,
    followPlayback,
    previewPlaying,
  ])

  // ===============================
  // RESET SECTION REFS
  // ===============================

  useEffect(() => {
    performanceSectionRefs.current = {}
  }, [performanceSheet])

  // ===============================
  // UI
  // ===============================

  return (
    <div style={{ padding: 20 }}>
      <h1>Suno Prompt Studio</h1>

      <textarea
        value={performanceSheet}
        onChange={(e) => setPerformanceSheet(e.target.value)}
        rows={12}
        style={{ width: '100%' }}
        placeholder={`Verse 1:
Lyrics...

Pre-Chorus:
Lyrics...

Chorus:
Lyrics...

Outro:
Lyrics...`}
      />

      <div style={{ marginTop: 10 }}>
        <button onClick={() => startPreviewPlaybackFromBar(0)}>
          ▶ Play
        </button>

        <button onClick={stopPreviewPlayback}>⏹ Stop</button>
      </div>

      <div
        ref={performanceScrollRef}
        style={{
          marginTop: 20,
          height: 400,
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: 10,
        }}
      >
        {sections.map((section) => (
          <div
            key={section.id}
            ref={(el) => {
              performanceSectionRefs.current[section.id] = el
            }}
            style={{
              marginBottom: 24,
              padding: 10,
              background:
                activePerformanceSectionId === section.id
                  ? '#ffeaa7'
                  : 'transparent',
              transition: 'background 0.2s ease',
            }}
          >
            <strong>{section.title}</strong>

            <div>
              {section.content.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}