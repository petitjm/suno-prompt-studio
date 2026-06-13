'use client'

import React, { useEffect, useMemo, useState } from 'react'

type SunoPromptBuilderProps = {
  performanceSheet: string
  structuredChordJson: string
}

const defaultStylePrompt =
  'Acoustic singer-songwriter, heartfelt modern folk-pop, warm low male vocal, emotional storytelling, natural live performance feel, tasteful guitar arrangement, radio-friendly chorus.'

const defaultVocalDirection =
  'Natural British male vocal, low baritone tone, sincere and intimate delivery, emotionally controlled verses, stronger lift in the chorus, avoid over-singing.'

const defaultArrangementNotes =
  'Start with simple acoustic guitar. Build gradually with subtle bass, light percussion, warm backing harmonies, and a fuller final chorus. Keep the arrangement human and song-focused.'

const defaultIntroSoloOutro =
  'Add a short melodic guitar intro that hints at the chorus melody. Include a tasteful instrumental break after the second chorus. End with a warm, natural final chord ring-out.'

const defaultNegativePrompt =
  'Avoid EDM, trap drums, excessive autotune, robotic vocals, spoken word sections, comedy tone, metal guitars, overproduced pop effects, and cluttered instrumentation.'

function getLyricSummary(performanceSheet: string) {
      const lines = performanceSheet
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length === 0) {
        return 'No lyrics loaded yet.'
      }

      const sections: string[] = []
      let currentSection = 'Opening'
      let currentLines: string[] = []

      const flushSection = () => {
        if (currentLines.length === 0) {
          return
        }

        sections.push(`${currentSection}: ${currentLines.slice(0, 3).join(' / ')}`)
        currentLines = []
      }

      lines.forEach((line) => {
        if (/^\[.+\]$/.test(line)) {
          flushSection()
          currentSection = line.replace(/^\[/, '').replace(/\]$/, '')
          return
        }

        currentLines.push(line)
      })

      flushSection()

      if (sections.length === 0) {
        return lines.slice(0, 8).join(' / ')
      }

      return sections.slice(0, 8).join('\n')
    }

function getSongStructureGuide(performanceSheet: string) {
      const sectionNames = performanceSheet
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^\[.+\]$/.test(line))
        .map((line) => line.replace(/^\[/, '').replace(/\]$/, '').trim())
        .filter(Boolean)

      if (sectionNames.length === 0) {
        return 'Structure guide: No section headings detected. Use a natural verse / chorus song shape if appropriate.'
      }

      const uniqueFlow = sectionNames.join(', ')

      return `Structure guide: ${uniqueFlow}. Keep section contrast clear, with intimate verses, stronger choruses, and a natural emotional build.`
    }

    function getSectionArrangementGuide(performanceSheet: string) {
          const sectionNames = performanceSheet
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => /^\[.+\]$/.test(line))
            .map((line) => line.replace(/^\[/, '').replace(/\]$/, '').trim())
            .filter(Boolean)

          if (sectionNames.length === 0) {
            return 'Section arrangement guide: No section headings detected. Keep the arrangement natural, song-led, and emotionally progressive.'
          }

          const guidance = sectionNames.map((sectionName) => {
            const normalized = sectionName.toLowerCase()

            if (normalized.includes('intro')) {
              return `${sectionName}: establish the mood with a simple, memorable opening.`
            }

            if (normalized.includes('verse')) {
              return `${sectionName}: keep intimate, vocal-led, and uncluttered.`
            }

            if (normalized.includes('pre')) {
              return `${sectionName}: gently build tension toward the chorus.`
            }

            if (normalized.includes('chorus')) {
              return `${sectionName}: lift emotionally with stronger rhythm, fuller harmony, and clearer hook focus.`
            }

            if (normalized.includes('bridge')) {
              return `${sectionName}: create contrast and act as the emotional turn.`
            }

            if (normalized.includes('solo')) {
              return `${sectionName}: keep melodic and supportive, not overplayed.`
            }

            if (normalized.includes('outro')) {
      return `${sectionName}: resolve naturally and leave emotional space.`
    }

    return `${sectionName}: support the lyric meaning and maintain the song’s emotional flow.`
  })

  return `Section arrangement guide: ${guidance.join(' ')}`
}

function getSunoHookFocus(performanceSheet: string) {
      const lines = performanceSheet
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^\[.+\]$/.test(line))
        .filter((line) => !/^[A-G](?:#|b)?/.test(line))

      if (lines.length === 0) {
        return 'Hook focus: No lyric lines detected. Keep the main melodic phrase clear, memorable, and emotionally direct.'
      }

      const chorusIndex = performanceSheet
        .split('\n')
        .findIndex((line) => line.trim().toLowerCase().includes('[chorus]'))

      if (chorusIndex >= 0) {
        const chorusLines = performanceSheet
          .split('\n')
          .slice(chorusIndex + 1)
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => !/^\[.+\]$/.test(line))
          .slice(0, 4)

        if (chorusLines.length > 0) {
          const hookLine = chorusLines[chorusLines.length - 1]
          return `Hook focus: Emphasise the emotional payoff around “${hookLine}”. Keep the vocal clear, sincere, and memorable when this idea returns.`
        }
      }

      const repeatedLine = lines.find((line, index) => lines.indexOf(line) !== index)

      if (repeatedLine) {
        return `Hook focus: Emphasise the repeated line “${repeatedLine}” as the main memorable hook. Keep it clear, singable, and emotionally direct.`
      }

      const likelyHook = lines[Math.min(lines.length - 1, 3)]

      return `Hook focus: Treat “${likelyHook}” as a likely emotional anchor. Keep the delivery natural, memorable, and song-focused.`
    }

    function getSunoEmotionalArc(performanceSheet: string) {
          const sectionNames = performanceSheet
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => /^\[.+\]$/.test(line))
            .map((line) => line.replace(/^\[/, '').replace(/\]$/, '').trim())
            .filter(Boolean)

          if (sectionNames.length === 0) {
            return 'Emotional arc: Start natural and intimate, then allow the performance to build gradually toward a clear emotional payoff.'
          }

          const hasIntro = sectionNames.some((section) =>
            section.toLowerCase().includes('intro')
          )
          const hasPreChorus = sectionNames.some((section) =>
            section.toLowerCase().includes('pre')
          )
          const hasChorus = sectionNames.some((section) =>
            section.toLowerCase().includes('chorus')
          )
          const hasBridge = sectionNames.some((section) =>
            section.toLowerCase().includes('bridge')
          )
          const hasFinalChorus = sectionNames.some((section) =>
            section.toLowerCase().includes('final chorus')
          )
          const hasOutro = sectionNames.some((section) =>
            section.toLowerCase().includes('outro')
          )

          const arcParts: string[] = []

          if (hasIntro) {
            arcParts.push('open with a clear mood-setting intro')
          }

          arcParts.push('start the verses intimate, restrained, and lyric-led')

          if (hasPreChorus) {
            arcParts.push('let the pre-chorus build anticipation')
          }

          if (hasChorus) {
            arcParts.push('lift the chorus with stronger emotional release and hook focus')
          }

          if (hasBridge) {
            arcParts.push('use the bridge as a contrasting emotional turn')
          }

          if (hasFinalChorus) {
            arcParts.push('make the final chorus wider, more confident, and resolved')
          } else if (hasChorus) {
            arcParts.push('let the later chorus feel more open and resolved')
          }

          if (hasOutro) {
            arcParts.push('close with space, warmth, and a natural emotional landing')
          }

          return `Emotional arc: ${arcParts.join(', ')}.`
        }

        function getSunoPerformanceNotes(performanceSheet: string) {
          const lowerText = performanceSheet.toLowerCase()

          const hasChorus = lowerText.includes('[chorus]')
          const hasBridge = lowerText.includes('[bridge]')
          const hasFinalChorus = lowerText.includes('[final chorus]')
          const hasDuet =
            lowerText.includes('female harmony') ||
            lowerText.includes('harmony') ||
            lowerText.includes('duet')

          const notes = [
            'Use a natural British low baritone male vocal',
            'keep diction clear and emotionally sincere',
            'avoid theatrical over-singing',
            'keep the performance human, intimate, and believable',
          ]

          if (hasChorus) {
            notes.push('let choruses lift with stronger projection and clearer hook emphasis')
          }

          if (hasBridge) {
            notes.push('use the bridge for a subtle emotional shift rather than a dramatic reset')
          }

          if (hasFinalChorus) {
            notes.push('make the final chorus feel wider, warmer, and more resolved')
          }

          if (hasDuet) {
            notes.push('use female harmony as support, not as a replacement for the lead vocal')
          }

          return `Performance notes: ${notes.join(', ')}.`
        }

export default function SunoPromptBuilder({
  performanceSheet,
  structuredChordJson,
}: SunoPromptBuilderProps) {
function getChordGuidanceSummary(structuredChordJson: string) {
  const text = structuredChordJson.trim()

      if (!text || text === '{}') {
        return ''
      }

      try {
        const parsed = JSON.parse(text) as Record<string, unknown>

        const rawText = Object.values(parsed)
          .map((value) => {
            if (typeof value === 'string') {
              return value
            }

            if (Array.isArray(value)) {
              return value.join(' ')
            }

            if (value && typeof value === 'object') {
              return Object.values(value as Record<string, unknown>).join(' ')
            }

            return ''
          })
          .join(' ')

        const chordMatches =
          rawText.match(
            /[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\([^)]+\))?(?:\/[A-G](?:#|b)?)?/g
          ) || []

        const chordPalette = Array.from(
          new Set(
            chordMatches
              .map((chord) => chord.trim())
              .filter(Boolean)
          )
        ).slice(0, 10)

        if (chordPalette.length === 0) {
          return ''
        }

        const likelyKey =
          chordPalette.includes('Em') || chordPalette.some((chord) => chord.startsWith('Em'))
            ? 'E minor / G major'
            : 'the song’s main key'

        return `${likelyKey} harmonic feel, using ${chordPalette.join(', ')} as the main chord palette`
      } catch {
        return ''
      }
    }

  const lyricSummary = useMemo(
    () => getLyricSummary(performanceSheet),
    [performanceSheet]
  )

  const sunoHookFocus = useMemo(
      () => getSunoHookFocus(performanceSheet),
      [performanceSheet]
    )

  const sectionArrangementGuide = useMemo(
      () => getSectionArrangementGuide(performanceSheet),
      [performanceSheet]
    )

  const songStructureGuide = useMemo(
      () => getSongStructureGuide(performanceSheet),
      [performanceSheet]
    )

  const sunoEmotionalArc = useMemo(
      () => getSunoEmotionalArc(performanceSheet),
      [performanceSheet]
    )

  const sunoPerformanceNotes = useMemo(
      () => getSunoPerformanceNotes(performanceSheet),
      [performanceSheet]
    )

  const [sunoVoice, setSunoVoice] = useState(
      'MPJ Voice / Persona - natural British low baritone'
    )
  const [sunoGender, setSunoGender] = useState('Male')
  const [lyricsMode, setLyricsMode] = useState('Manual')
  const [keepFromLastVersion, setKeepFromLastVersion] = useState('')
  const [changeInNextVersion, setChangeInNextVersion] = useState('')
  const [useCreationNotesAsMainDriver, setUseCreationNotesAsMainDriver] = useState(false)
  const [revisionFocus, setRevisionFocus] = useState('Balanced revision')
  const [revisionSummary, setRevisionSummary] = useState('')
  const [lastRevisionContext, setLastRevisionContext] = useState('')
  const [creationNotes, setCreationNotes] = useState('')
  const [sunoResultRating, setSunoResultRating] = useState('Good but needs changes')
  const [justUsedGeneratedStyle, setJustUsedGeneratedStyle] = useState(false)
  const [previousSunoStyleField, setPreviousSunoStyleField] = useState('')
  const [justCopiedRevisedStyle, setJustCopiedRevisedStyle] = useState(false)
  const [justCopiedFullCommaPack, setJustCopiedFullCommaPack] = useState(false)
  const [justCopiedFullSunoPack, setJustCopiedFullSunoPack] = useState(false)
  const [justCopiedStructureGuide, setJustCopiedStructureGuide] = useState(false)
  const [justCopiedSectionArrangement, setJustCopiedSectionArrangement] = useState(false)
  const [justCopiedHookFocus, setJustCopiedHookFocus] = useState(false)
  const [justCopiedEmotionalArc, setJustCopiedEmotionalArc] = useState(false)
  const [justCopiedPerformanceNotes, setJustCopiedPerformanceNotes] = useState(false)
  const [justCopiedCreativeGuidePack, setJustCopiedCreativeGuidePack] = useState(false) 
  const [justCopiedQuickPack, setJustCopiedQuickPack] = useState(false)
  const [justCopiedQuickCommaPack, setJustCopiedQuickCommaPack] = useState(false)
  const [justCopiedRevisionInputPack, setJustCopiedRevisionInputPack] = useState(false)
  const [justCopiedChordGuidance, setJustCopiedChordGuidance] = useState(false)
  const [justCopiedLyricsAndStyle, setJustCopiedLyricsAndStyle] = useState(false)
  const [justCopiedNegativeCommaList, setJustCopiedNegativeCommaList] = useState(false)
  const [justCopiedStyleAndVoice, setJustCopiedStyleAndVoice] = useState(false)
  const [activeVoicePresetFeedback, setActiveVoicePresetFeedback] = useState('')
  const [justCopiedSunoSettings, setJustCopiedSunoSettings] = useState(false)
  const [justCopiedStyleCommaList, setJustCopiedStyleCommaList] = useState(false)
  const [justCopiedSunoLyrics, setJustCopiedSunoLyrics] = useState(false)
  const [justCopiedSunoStyle, setJustCopiedSunoStyle] = useState(false)
  const [justCopiedSunoVoice, setJustCopiedSunoVoice] = useState(false)
  const [justUsedGeneratedVoice, setJustUsedGeneratedVoice] = useState(false)
  const [justCopiedRevisionBrief, setJustCopiedRevisionBrief] = useState(false)
  const [justCopiedProductionNotes, setJustCopiedProductionNotes] = useState(false)
  const [justCopiedRevisedFullPack, setJustCopiedRevisedFullPack] = useState(false)
  const [justCopiedStatusSummary, setJustCopiedStatusSummary] = useState(false)
  const [justCopiedSunoHandoff, setJustCopiedSunoHandoff] = useState(false)
  const [activePresetFeedback, setActivePresetFeedback] = useState('')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')
  const [justCopiedCombined, setJustCopiedCombined] = useState(false)
  const [justCopiedNegative, setJustCopiedNegative] = useState(false)
  const [justResetDefaults, setJustResetDefaults] = useState(false)
  const [sunoStyleField, setSunoStyleField] = useState(defaultStylePrompt)
  const [previousGeneratedAt, setPreviousGeneratedAt] = useState('')
  const [lastGeneratedAt, setLastGeneratedAt] = useState('')
  const [hasChangedSinceGeneration, setHasChangedSinceGeneration] = useState(false)
  const [generatedFromSummary, setGeneratedFromSummary] = useState('')
  const [sunoPromptLength, setSunoPromptLength] = useState('Medium')
  const [justGeneratedPrompt, setJustGeneratedPrompt] = useState(false)
  const [justUsedGeneratedArrangement, setJustUsedGeneratedArrangement] = useState(false)
  const [chordGuidanceMode, setChordGuidanceMode] = useState('Lyrics only')
  const [stylePrompt, setStylePrompt] = useState(defaultStylePrompt)
  const [vocalDirection, setVocalDirection] = useState(defaultVocalDirection)
  const [arrangementNotes, setArrangementNotes] = useState(defaultArrangementNotes)
  const [introSoloOutro, setIntroSoloOutro] = useState(defaultIntroSoloOutro)
  const [negativePrompt, setNegativePrompt] = useState(defaultNegativePrompt)
  const [productionTarget, setProductionTarget] = useState('Radio-ready')


  useEffect(() => {
      setPromptMessage('')
      setGeneratedFromSummary('')
      setPreviousSunoStyleField('')
      setRevisionSummary('')
      setLastRevisionContext('')
      setLastGeneratedAt('')

      setCreationNotes('')
      setRevisionFocus('Balanced revision')
      setUseCreationNotesAsMainDriver(false)

      setStylePrompt(defaultStylePrompt)
      setSunoStyleField(defaultStylePrompt)
      setVocalDirection(defaultVocalDirection)
      setArrangementNotes(defaultArrangementNotes)
      setIntroSoloOutro(defaultIntroSoloOutro)
      setNegativePrompt(defaultNegativePrompt)
      setChordGuidanceMode('Lyrics only')
      setProductionTarget('Radio-ready')
    }, [performanceSheet])

  const combinedPrompt = useMemo(() => {
    return [
      stylePrompt,
      vocalDirection,
      arrangementNotes,
      introSoloOutro,
      `Lyric direction: ${lyricSummary}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  }, [
    stylePrompt,
    vocalDirection,
    arrangementNotes,
    introSoloOutro,
    lyricSummary,
  ])

  const resetToDefaults = () => {
  setCreationNotes('')
  setKeepFromLastVersion('')
  setChangeInNextVersion('')
  setSunoResultRating('Good but needs changes')
  setUseCreationNotesAsMainDriver(false)
  setRevisionFocus('Balanced revision')
  setRevisionSummary('')
  setLastRevisionContext('')
  setPreviousSunoStyleField('')
  setStylePrompt(defaultStylePrompt)
  setSunoStyleField(defaultStylePrompt)
  setGeneratedFromSummary('')
  setPreviousGeneratedAt('')
  setLastGeneratedAt('')
  setHasChangedSinceGeneration(false)
  setVocalDirection(defaultVocalDirection)
  setArrangementNotes(defaultArrangementNotes)
  setIntroSoloOutro(defaultIntroSoloOutro)
  setNegativePrompt(defaultNegativePrompt)
  showButtonFeedback(setJustResetDefaults)
  setChordGuidanceMode('Lyrics only')
  setProductionTarget('Radio-ready')
}

  const generateSunoPrompt = async () => {
  if (!performanceSheet.trim()) {
    setPromptMessage('Add lyrics to the Song Sheet before generating Suno prompts.')
    return
  }

    setGeneratingPrompt(true)
    setPromptMessage('')

    

  try {
    const response = await fetch('/api/suno-prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          lyrics: performanceSheet,
          currentStylePrompt: stylePrompt,
          currentVocalDirection: vocalDirection,
          currentArrangementNotes: arrangementNotes,
          currentIntroSoloOutro: introSoloOutro,
          currentNegativePrompt: negativePrompt,
          creationNotes,
          revisionFocus,
          useCreationNotesAsMainDriver,
          sunoResultRating,
          keepFromLastVersion,
          changeInNextVersion,
          chordGuidanceMode,
          chordGuidanceForStyle,
          productionTarget,
          sunoPromptLength,
          songStructureGuide,
          sectionArrangementGuide,
          sunoHookFocus,
          sunoEmotionalArc,
        }),
    })

    const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.raw ||
              `Could not generate Suno prompts. Status: ${response.status}`
          )
        }

    const styleBeforeGeneration = sunoStyleField

    

    const nextStylePrompt = data.stylePrompt?.trim() || ''
        const nextSunoStyleField =
          data.sunoStyleField?.trim() || data.stylePrompt?.trim() || ''
        const nextVocalDirection = data.vocalDirection?.trim() || ''
        const nextArrangementNotes = data.arrangementNotes?.trim() || ''
        const nextIntroSoloOutro = data.introSoloOutro?.trim() || ''
        const nextNegativePrompt = data.negativePrompt?.trim() || ''


        const hasCompletePromptResponse =
          nextStylePrompt &&
          nextSunoStyleField &&
          nextVocalDirection &&
          nextArrangementNotes &&
          nextIntroSoloOutro &&
          nextNegativePrompt

        if (!hasCompletePromptResponse) {
          throw new Error(
          `Suno prompt generation returned an incomplete response. Missing fields: ${[
            !nextStylePrompt ? 'stylePrompt' : '',
            !nextSunoStyleField ? 'sunoStyleField' : '',
            !nextVocalDirection ? 'vocalDirection' : '',
            !nextArrangementNotes ? 'arrangementNotes' : '',
            !nextIntroSoloOutro ? 'introSoloOutro' : '',
            !nextNegativePrompt ? 'negativePrompt' : '',
          ]
            .filter(Boolean)
            .join(', ')}`
        )
        }

        setPreviousSunoStyleField(styleBeforeGeneration)
        setStylePrompt(nextStylePrompt)
        setSunoStyleField(
          nextSunoStyleField.charAt(0).toUpperCase() + nextSunoStyleField.slice(1)
        )
        setVocalDirection(nextVocalDirection)
        setArrangementNotes(nextArrangementNotes)
        setIntroSoloOutro(nextIntroSoloOutro)
        setNegativePrompt(nextNegativePrompt)
        setLastRevisionContext(
          [
            `Revision focus: ${revisionFocus}`,
            `Last Suno result: ${sunoResultRating}`,
            `Creation notes as main driver: ${
              useCreationNotesAsMainDriver ? 'Yes' : 'No'
            }`,
            `Keep: ${keepFromLastVersion || 'None'}`,
            `Change: ${changeInNextVersion || 'None'}`,
            `Notes: ${creationNotes || 'None'}`,
          ].join('\n')
        )
        setRevisionSummary(data.revisionSummary || '')
        setGeneratedFromSummary(lyricSummary)

    setPromptMessage('Suno prompts generated from the current song sheet.')
    setLastGeneratedAt(new Date().toLocaleString('en-GB'))
    setHasChangedSinceGeneration(false)
    setPreviousGeneratedAt('')
    showButtonFeedback(setJustGeneratedPrompt)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not generate Suno prompts. Please try again.'

    setPromptMessage(message)
  } finally {
    setGeneratingPrompt(false)
  }
}


         const showVoicePresetFeedback = (label: string) => {
          setActiveVoicePresetFeedback(label)

          window.setTimeout(() => {
            setActiveVoicePresetFeedback('')
          }, 1500)
        }

         const showPresetFeedback = (label: string) => {
          setActivePresetFeedback(label)

          window.setTimeout(() => {
            setActivePresetFeedback('')
          }, 1500)
        }

        const copySunoHandoff = () => {
          navigator.clipboard.writeText(sunoHandoffPack)
          showButtonFeedback(setJustCopiedSunoHandoff)
        }

    const showButtonFeedback = (
          setFeedback: React.Dispatch<React.SetStateAction<boolean>>
        ) => {
          setFeedback(true)

          window.setTimeout(() => {
            setFeedback(false)
          }, 1500)
        }

        const applyPreset = (
          preset:
            | 'mpj-acoustic'
            | 'modern-country'
            | 'indie-folk'
            | 'piano-ballad'
        ) => {
          if (preset === 'mpj-acoustic') {
            setSunoStyleField(
              'Acoustic singer-songwriter, heartfelt modern folk-pop, warm British low male vocal, emotional storytelling, tasteful guitar arrangement, intimate radio-friendly production.'
            )
            setStylePrompt(
              'Acoustic singer-songwriter, heartfelt modern folk-pop, warm low male vocal, emotional storytelling, tasteful guitar arrangement, intimate but radio-friendly production.'
            )
            setVocalDirection(
              'Natural British male vocal, low baritone tone, sincere and intimate delivery, gentle verses, emotionally lifted chorus, avoid theatrical over-singing.'
            )
            setArrangementNotes(
              'Acoustic guitar-led arrangement with subtle bass, light percussion, warm backing harmonies, and a gradual build toward the final chorus.'
            )
            setIntroSoloOutro(
              'Add a short melodic acoustic guitar intro, a tasteful instrumental break after the second chorus, and a natural final chord ring-out.'
            )
            setNegativePrompt(
              'Avoid EDM, trap drums, robotic vocals, excessive autotune, comedy tone, metal guitars, overproduced pop effects, and cluttered instrumentation.'
            )
          }

          if (preset === 'modern-country') {
            setSunoStyleField(
              'Modern country ballad, cinematic storytelling, warm acoustic guitars, subtle pedal steel, steady mid-tempo groove, heartfelt low male vocal, emotional chorus lift.'
            )
            setStylePrompt(
              'Modern country ballad, cinematic storytelling, warm acoustic guitars, subtle pedal steel, steady mid-tempo groove, heartfelt low male vocal, emotional chorus lift.'
            )
            setVocalDirection(
              'Low male baritone vocal, sincere country storytelling delivery, restrained verses, stronger emotional chorus, natural phrasing and clear lyric focus.'
            )
            setArrangementNotes(
              'Start with acoustic guitar and soft country rhythm section. Add bass, light drums, pedal steel textures, and wider backing vocals in the final chorus.'
            )
            setIntroSoloOutro(
              'Use a short country guitar intro, a melodic pedal-steel or electric guitar solo, and a reflective outro that fades or resolves naturally.'
            )
            setNegativePrompt(
              'Avoid bro-country clichés, heavy rock guitars, EDM drums, excessive autotune, novelty vocals, rap sections, and overly glossy pop production.'
            )
          }

          if (preset === 'indie-folk') {
            setSunoStyleField(
              'Indie folk singer-songwriter, organic acoustic textures, intimate low male vocal, emotional lyric focus, warm room sound, subtle atmospheric production.'
            )
            setStylePrompt(
              'Indie folk singer-songwriter, organic acoustic textures, intimate vocal, emotional lyric focus, warm room sound, subtle atmospheric production.'
            )
            setVocalDirection(
              'Natural imperfect human vocal, close-mic intimacy, low male tone, vulnerable delivery, conversational phrasing, avoid polished pop vocal effects.'
            )
            setArrangementNotes(
              'Fingerpicked acoustic guitar foundation with gentle bass, soft brushed percussion, ambient textures, and understated harmonies.'
            )
            setIntroSoloOutro(
              'Begin with a delicate fingerpicked intro. Add a short instrumental breath before the final chorus. End quietly and naturally.'
            )
            setNegativePrompt(
              'Avoid stadium rock, EDM, trap, glossy pop production, robotic timing, excessive vocal tuning, and overly busy arrangements.'
            )
          }

          if (preset === 'piano-ballad') {
            setSunoStyleField(
              'Emotional piano ballad, heartfelt singer-songwriter style, cinematic build, warm low male vocal, intimate verses, powerful but controlled chorus.'
            )
            setStylePrompt(
              'Emotional piano ballad, heartfelt singer-songwriter style, cinematic build, warm low male vocal, intimate verses, powerful but controlled chorus.'
            )
            setVocalDirection(
              'Low male baritone vocal, tender and sincere, breathy intimate verses, emotionally stronger chorus, natural British phrasing.'
            )
            setArrangementNotes(
              'Start with solo piano. Gradually add soft strings, bass, light percussion, and subtle backing harmonies for a cinematic final chorus.'
            )
            setIntroSoloOutro(
              'Use a simple piano motif as the intro. Add a short emotional instrumental bridge. End with a gentle piano resolve.'
            )
            setNegativePrompt(
              'Avoid EDM beats, trap drums, rock guitars, robotic vocals, excessive autotune, choir overload, and melodramatic theatrical delivery.'
            )
            clearGenerationState()
          }

          setGeneratedFromSummary('')

        const presetLabels = {
          'mpj-acoustic': 'MPJ Acoustic applied ✓',
          'modern-country': 'Modern Country applied ✓',
          'indie-folk': 'Indie Folk applied ✓',
          'piano-ballad': 'Piano Ballad applied ✓',
        }

        showPresetFeedback(presetLabels[preset])
        }

        const sunoLyricsInput = performanceSheet.trim()

        const compactSunoStyleInput = sunoStyleField.trim()

        const sunoWorkflowHint = !performanceSheet.trim()
          ? 'Add or load lyrics in the Song Sheet to begin building Suno prompts.'
          : hasChangedSinceGeneration
            ? 'The Suno handoff has changed since the last generation. Generate again before copying if you want the latest edits reflected.'
            : !generatedFromSummary
              ? 'Generate Suno prompts, then copy the Suno handoff into Suno 5.5 Advanced mode.'
              : 'Prompts have been generated. Copy the Suno handoff into Suno, or open Revision Controls after listening to a Suno result.'

        const detailedSunoStyleInput = [
          stylePrompt,
          vocalDirection,
          arrangementNotes,
          introSoloOutro,
        ]
          .filter(Boolean)
          .join('\n\n')

        const sunoVoiceInput = [
          sunoVoice,
          vocalDirection,
        ].filter(Boolean).join('. ')


        const applyVoicePreset = (
          preset:
            | 'mpj-baritone'
            | 'intimate-acoustic'
            | 'country-storyteller'
            | 'duet-guide'
        ) => {
          if (preset === 'mpj-baritone') {
            setSunoVoice('MPJ Voice / Persona - natural British low baritone')
            setVocalDirection(
              'Natural British male low baritone, sincere and warm, intimate verses, emotionally lifted choruses, clear diction, human phrasing, avoid over-singing.'
            )
            setSunoGender('Male')
          }

          if (preset === 'intimate-acoustic') {
            setSunoVoice('Intimate acoustic male voice - close, warm, vulnerable')
            setVocalDirection(
              'Close-mic intimate male vocal, soft breathy verses, warm emotional tone, natural imperfections, gentle chorus lift, understated and human.'
            )
            setSunoGender('Male')
          }

          if (preset === 'country-storyteller') {
            setSunoVoice('Country storyteller male voice - warm baritone')
            setVocalDirection(
              'Warm male country baritone, honest storytelling delivery, relaxed verses, stronger emotional chorus, natural phrasing, clear lyric focus.'
            )
            setSunoGender('Male')
          }

          if (preset === 'duet-guide') {
            setSunoVoice('Male lead vocal with subtle female harmony support')
            setVocalDirection(
              'Male lead vocal with warm female harmony in choruses. Keep the lead intimate and clear. Harmonies should support emotion without overpowering the song.'
            )
            setSunoGender('Duet')
          }

          setGeneratedFromSummary('')

            const voicePresetLabels = {
              'mpj-baritone': 'MPJ Baritone applied ✓',
              'intimate-acoustic': 'Intimate Acoustic applied ✓',
              'country-storyteller': 'Country Storyteller applied ✓',
              'duet-guide': 'Duet Guide applied ✓',
            }

            showVoicePresetFeedback(voicePresetLabels[preset])
        }

        const chordGuidanceSummary = getChordGuidanceSummary(structuredChordJson)

        const sunoSettingsSummary = [
          `Voice: ${sunoVoice}`,
          `Gender: ${sunoGender}`,
          `Lyrics mode: ${lyricsMode}`,
          `Production target: ${productionTarget}`,
          `Prompt length: ${sunoPromptLength}`,
          `Chord guidance mode: ${chordGuidanceMode}`,
          'Model: Suno 5.5',
          'Mode: Advanced',
        ].join('\n')

        const chordGuidanceForStyle =
          chordGuidanceMode === 'Add chords to Style'
            ? chordGuidanceSummary
              ? `Harmonic guidance only: ${chordGuidanceSummary}. Treat these chords as a loose musical direction rather than a strict chart.`
              : 'Use the song’s chord progression as harmonic guidance only. Treat chord names as a loose musical direction rather than a strict arrangement.'
            : ''

         const sunoStyleCopyInput = [
          compactSunoStyleInput,
          chordGuidanceForStyle,
        ]
          .filter(Boolean)
          .join('\n\n')

          const sunoLyricsAndStylePack = [
              'SUNO 5.5 ADVANCED INPUTS',
              '',
              'LYRICS:',
              sunoLyricsInput || 'No lyrics provided.',
              '',
              'STYLE:',
              sunoStyleCopyInput || 'No style prompt provided.',
            ].join('\n')

            const sunoStyleAndVoicePack = [
              'STYLE:',
              sunoStyleCopyInput || 'No style prompt provided.',
              '',
              'VOICE:',
              sunoVoiceInput || 'No voice prompt provided.',
            ].join('\n')

        const creativeGuidePack = [
          'CREATIVE GUIDE PACK',
          '',
          'STRUCTURE GUIDE:',
          songStructureGuide,
          '',
          'SECTION ARRANGEMENT GUIDE:',
          sectionArrangementGuide,
          '',
          'HOOK FOCUS:',
          sunoHookFocus,
          '',
          'EMOTIONAL ARC:',
          sunoEmotionalArc,
          '',
          'PERFORMANCE NOTES:',
          sunoPerformanceNotes,
        ].join('\n')   
        
        
        const sunoStatusSummary = [
          `Prepared for ${lyricsMode} Suno 5.5 handoff`,
          `using ${sunoGender} vocal`,
          `${productionTarget} target`,
          `${sunoPromptLength} prompt length.`,
          `Revision notes are ${creationNotes.trim() ? 'Ready' : 'Empty'}.`,
          generatedFromSummary && lastGeneratedAt
          ? `Generation status is Generated at ${lastGeneratedAt}.`
          : hasChangedSinceGeneration && previousGeneratedAt
            ? `Generation status is Draft changed since last generation at ${previousGeneratedAt}.`
            : hasChangedSinceGeneration
              ? 'Generation status is Draft changed since last generation.'
              : 'Generation status is Not generated.',
        ].join(' ')


        const sunoHandoffPackTitle = hasChangedSinceGeneration
          ? 'SUNO EDITED HANDOFF PACK'
          : 'SUNO HANDOFF PACK'

        const sunoHandoffPackDisplayTitle = hasChangedSinceGeneration
          ? 'Suno edited handoff pack'
          : 'Suno handoff pack'


        const sunoHandoffCopyTitle = hasChangedSinceGeneration
          ? 'Copies the current edited Suno handoff fields.'
          : 'Copies the current generated Suno handoff pack.'




        const sunoQuickPack = [
          'SUNO QUICK PACK',
          '',
          'SUNO STATUS SUMMARY:',
          sunoStatusSummary,
          '',
          'LYRICS:',
          sunoLyricsInput || 'No lyrics provided.',
          '',
          'STYLE:',
          sunoStyleCopyInput || 'No style prompt provided.',
          '',
          'VOICE:',
          sunoVoiceInput || 'No voice prompt provided.',
          '',
          'SETTINGS:',
          sunoSettingsSummary,
          '',
          'NEGATIVE PROMPT:',
          negativePrompt || 'No negative prompt provided.',
        ].join('\n')

        


        const sunoRevisionInputPack = [
          'SUNO REVISION INPUT PACK',
          '',
        'SUNO STATUS SUMMARY:',
            sunoStatusSummary,
            '',
          'LAST RESULT RATING:',
          sunoResultRating || 'Not provided',
          '',
          'REVISION FOCUS:',
          revisionFocus || 'Balanced revision',
          '',
          'USE CREATION NOTES AS MAIN DRIVER:',
          useCreationNotesAsMainDriver ? 'Yes' : 'No',
          '',
          'CREATION NOTES:',
          creationNotes.trim() || 'No creation notes provided.',
          '',
          'KEEP FROM LAST VERSION:',
          keepFromLastVersion.trim() || 'Nothing specified.',
          '',
          'CHANGE IN NEXT VERSION:',
          changeInNextVersion.trim() || 'Nothing specified.',
          '',
          'CURRENT SUNO STYLE:',
          sunoStyleCopyInput || 'No style prompt provided.',
          '',
          'CURRENT VOICE:',
          sunoVoiceInput || 'No voice prompt provided.',
          '',
          'CURRENT NEGATIVE PROMPT:',
          negativePrompt || 'No negative prompt provided.',
          '',
          creativeGuidePack,
        ].join('\n')

        const fullSunoPack = [
          'SUNO 5.5 ADVANCED INPUTS',
          '',
          'SUNO STATUS SUMMARY:',
          sunoStatusSummary,
          '',
          'LYRICS:',
          sunoLyricsInput || 'No lyrics provided.',
          '',
          'STRUCTURE GUIDE:',
            songStructureGuide,
            '',
          'SECTION ARRANGEMENT GUIDE:',
            sectionArrangementGuide,
            '',
        'HOOK FOCUS:',
            sunoHookFocus,
            '',
        'EMOTIONAL ARC:',
            sunoEmotionalArc,
            '',
        'PERFORMANCE NOTES:',
            sunoPerformanceNotes,
            '',
          'STYLE:',
            sunoStyleCopyInput || 'No style prompt provided.',
            '',
          ...(chordGuidanceForStyle
              ? ['CHORD GUIDANCE FOR STYLE:', chordGuidanceForStyle, '']
              : []),
            'DETAILED PRODUCTION NOTES:',
            detailedSunoStyleInput || 'No detailed production notes provided.',
                      '',
          'VOICE:',
          sunoVoiceInput || 'No voice prompt provided.',
          '',
          'SETTINGS:',
          sunoSettingsSummary,
          '',
          'NEGATIVE / AVOID:',
          negativePrompt || 'No negative prompt provided.',
        ].join('\n')

        const sunoRevisionBrief = [
          'SUNO REVISION NOTES',
          '',
          'Suno status summary:',
          sunoStatusSummary,
          '',
          'Current song direction:',
          lyricSummary,
          '',
          'Revision focus:',
            revisionFocus,
            '',
          'Last Suno result:',
            sunoResultRating,
            '','Keep from last version:',
                keepFromLastVersion || 'No keep guidance added.',
                '',
                'Change in next version:',
                changeInNextVersion || 'No change guidance added.',
                '',
           
          'Creation notes as main driver:',
            useCreationNotesAsMainDriver ? 'Yes' : 'No',
            '',
          'Creation notes:',
            creationNotes || 'No Suno creation notes added yet.',
          '',
          'Revision summary:',
            revisionSummary || 'No revision summary available yet.',
            '',
          'Revision context used:',
            lastRevisionContext || 'No revision context captured yet.',
            '',
          'Suggested next action:',
          'Use these notes to refine the Style, Voice, Arrangement, or Intro / Solo / Outro prompt before creating another Suno version.',
        ].join('\n')

        const clearSunoSession = () => {
          setPromptMessage('')
          setGeneratedFromSummary('')
          setPreviousSunoStyleField('')
          setRevisionSummary('')
          setLastRevisionContext('')
          setSunoResultRating('Good but needs changes')
          setKeepFromLastVersion('')
          setChangeInNextVersion('')
          setCreationNotes('')
          setRevisionFocus('Balanced revision')
          setUseCreationNotesAsMainDriver(false)
          setPreviousGeneratedAt('')
          setLastGeneratedAt('')

          showButtonFeedback(setJustResetDefaults)
          setChordGuidanceMode('Lyrics only')
          setProductionTarget('Radio-ready')
        }

        const getSunoStyleCommaList = () => {
          return sunoStyleCopyInput
            .replace(/\n+/g, ', ')
            .replace(/\.\s+/g, ', ')
            .replace(/:\s*/g, ', ')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .filter((part, index, array) => array.indexOf(part) === index)
            .join(', ')
        }

        const sunoStyleCommaList = getSunoStyleCommaList()



        const getNegativePromptCommaList = () => {
          return negativePrompt
            .replace(/^Exclude\s+/i, '')
            .replace(/^Avoid\s+/i, '')
            .replace(/\bExclude\s+/gi, '')
            .replace(/\bAvoid\s+/gi, '')
            .replace(/\bNo\s+/gi, '')
            .replace(/\bPrevent\s+/gi, '')
            .replace(/\bDo not include\s+/gi, '')
            .replace(/\bMaintain a natural, organic, human, and emotionally sincere sound\.?/gi, 'unnatural sound, artificial sound, emotionally insincere sound')
            .replace(/\bMaintain natural, organic, human, and emotionally sincere sound\.?/gi, 'unnatural sound, artificial sound, emotionally insincere sound')
            .replace(/\bsynthetic or dance production\b/gi, 'synthetic production, dance production')
            .replace(/\brobotic or artificial vocal effects\b/gi, 'robotic vocal effects, artificial vocal effects')
            .replace(/\bnovelty or comedic vocal styles\b/gi, 'novelty vocals, comedic vocal styles')
            .replace(/\boverly commercial pop gloss\b/gi, 'commercial pop gloss')
            .replace(/\n+/g, ', ')
            .replace(/\.\s+/g, ', ')
            .replace(/:\s*/g, ', ')
            .replace(/\band\b/gi, ',')
            .replace(/\bor\b/gi, ',')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part.replace(/[.;:]$/, '').trim())
            .filter((part, index, array) => array.indexOf(part) === index)
            .join(', ')
        }

        const negativePromptCommaList = getNegativePromptCommaList()

        const sunoQuickCommaPack = [
          'SUNO QUICK COMMA PACK',
          '',
          'SUNO STATUS SUMMARY:',
          sunoStatusSummary,
          '',
          'LYRICS:',
          sunoLyricsInput || 'No lyrics provided.',
          '',
          'STYLE COMMA LIST:',
          sunoStyleCommaList || 'No style comma list provided.',
          '',
          'VOICE:',
          sunoVoiceInput || 'No voice prompt provided.',
          '',
          'SETTINGS:',
          sunoSettingsSummary,
          '',
          'NEGATIVE COMMA LIST:',
          negativePromptCommaList || 'No negative comma list provided.',
        ].join('\n')

        const fullSunoCommaPack = [
          'SUNO 5.5 ADVANCED INPUTS - COMMA STYLE',
          '',
          'SUNO STATUS SUMMARY:',
          sunoStatusSummary,
          '',
          'LYRICS:',
          sunoLyricsInput || 'No lyrics provided.',
          '',
          'STRUCTURE GUIDE:',
            songStructureGuide,
            '',
          'SECTION ARRANGEMENT GUIDE:',
            sectionArrangementGuide,
            '',
           'HOOK FOCUS:',
                sunoHookFocus,
                '',
        'EMOTIONAL ARC:',
            sunoEmotionalArc,
            '',
        'PERFORMANCE NOTES:',
            sunoPerformanceNotes,
            '',
          'STYLE COMMA LIST:',
          sunoStyleCommaList || 'No style comma list provided.',
          '',
          'VOICE:',
          sunoVoiceInput || 'No voice prompt provided.',
          '',
          'SETTINGS:',
          sunoSettingsSummary,
          '',
          'NEGATIVE COMMA LIST:',
          negativePromptCommaList || 'No negative comma list provided.',
        ].join('\n')

        const coreFieldStatus = [
          stylePrompt.trim() ? 'Style ✓' : 'Style missing',
          vocalDirection.trim() ? 'Vocal ✓' : 'Vocal missing',
          arrangementNotes.trim() ? 'Arrangement ✓' : 'Arrangement missing',
          introSoloOutro.trim() ? 'Intro/Solo/Outro ✓' : 'Intro/Solo/Outro missing',
          negativePrompt.trim() ? 'Negative ✓' : 'Negative missing',
        ].join(' · ')

        const currentPresetDirection = [
          stylePrompt.trim() ? `Style: ${stylePrompt.trim().split('\n')[0]}` : 'Style: not set',
          sunoVoiceInput.trim() ? `Voice: ${sunoVoiceInput.trim().split('\n')[0]}` : 'Voice: not set',
        ].join(' · ')


        const sunoHandoffPack = [
          sunoHandoffPackTitle,
          '',
          sunoQuickPack,
          '',
          'CORE PROMPT FIELDS:',
          '',
          'SUNO STYLE PROMPT:',
          stylePrompt.trim() || 'No style prompt provided.',
          '',
          'VOCAL DIRECTION:',
          vocalDirection.trim() || 'No vocal direction provided.',
          '',
          'ARRANGEMENT NOTES:',
          arrangementNotes.trim() || 'No arrangement notes provided.',
          '',
          'INTRO / SOLO / OUTRO PROMPT:',
          introSoloOutro.trim() || 'No intro / solo / outro prompt provided.',
        ].join('\n')


        const clearGenerationState = () => {
          if (generatedFromSummary || lastGeneratedAt) {
            setHasChangedSinceGeneration(true)
            setPreviousGeneratedAt(lastGeneratedAt)
          }

          setGeneratedFromSummary('')
          setLastGeneratedAt('')
          setPreviousSunoStyleField('')
          setRevisionSummary('')
          setLastRevisionContext('')
        }









  return (
    <section className="mt-6 p-4 rounded bg-gray-900 border border-gray-700 max-w-5xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">
          Suno Prompt Builder
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Build copy-ready Suno prompts from the current song sheet.
        </p>
      </div>

      <details className="mb-4 rounded bg-gray-800 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-300">
            Song snapshot
            <span className="text-gray-500 text-sm font-normal">
              {' '}click to expand/collapse
            </span>
          </summary>

          <p className="mt-2 mb-2 text-xs text-gray-500">
            Quick read of the current song sheet used for prompt generation.
          </p>

          <p className="whitespace-pre-wrap text-sm text-gray-400">
            {lyricSummary}
          </p>
        </details>
      

        


      <div className="mb-5 rounded border border-gray-700 bg-gray-900/40 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Quick style presets
          </h3>
          <p className="mb-3 text-xs text-gray-400">
              Choose a starting production style before generating or refining Suno prompts.
            </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('mpj-acoustic')}
              className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              {activePresetFeedback === 'MPJ Acoustic applied ✓'
                  ? 'Applied ✓'
                  : 'MPJ Acoustic'}
            </button>

            <button
              type="button"
              onClick={() => applyPreset('modern-country')}
              className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              {activePresetFeedback === 'Modern Country applied ✓'
                  ? 'Applied ✓'
                  : 'Modern Country'}
            </button>

            <button
              type="button"
              onClick={() => applyPreset('indie-folk')}
              className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              {activePresetFeedback === 'Indie Folk applied ✓'
                  ? 'Applied ✓'
                  : 'Indie Folk'}
            </button>

            <button
              type="button"
              onClick={() => applyPreset('piano-ballad')}
              className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              {activePresetFeedback === 'Piano Ballad applied ✓'
                  ? 'Applied ✓'
                  : 'Piano Ballad'}
            </button>
          </div>
          {activePresetFeedback && (
              <p className="mt-2 text-xs text-green-300">
                {activePresetFeedback}
              </p>
            )}
        </div>
     
        
             <div className="mb-5 rounded border border-gray-700 bg-gray-900/40 p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Voice presets
              </h4>
              <p className="mb-3 text-xs text-gray-400">
                  Choose the vocal/persona direction and gender setting for the Suno handoff.
                  Use Reset MPJ preset to return to the default acoustic MPJ starting point.
                </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyVoicePreset('mpj-baritone')}
                  className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                  {activeVoicePresetFeedback === 'MPJ Baritone applied ✓'
                      ? 'Applied ✓'
                      : 'MPJ Baritone'}
                </button>

                <button
                  type="button"
                  onClick={() => applyVoicePreset('intimate-acoustic')}
                  className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                  {activeVoicePresetFeedback === 'Intimate Acoustic applied ✓'
                      ? 'Applied ✓'
                      : 'Intimate Acoustic'}
                </button>

                <button
                  type="button"
                  onClick={() => applyVoicePreset('country-storyteller')}
                  className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                  {activeVoicePresetFeedback === 'Country Storyteller applied ✓'
                      ? 'Applied ✓'
                      : 'Country Storyteller'}
                </button>

                <button
                  type="button"
                  onClick={() => applyVoicePreset('duet-guide')}
                  className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                  {activeVoicePresetFeedback === 'Duet Guide applied ✓'
                      ? 'Applied ✓'
                      : 'Duet Guide'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    applyPreset('mpj-acoustic')
                    applyVoicePreset('mpj-baritone')
                  }}
                  className="px-3 py-2 rounded bg-blue-700 text-white hover:bg-blue-600"
                >
                  Reset MPJ preset
                </button>
                
           </div>


              {activeVoicePresetFeedback && (
                  <p className="mt-2 text-xs text-green-300">
                    {activeVoicePresetFeedback}
                  </p>
                )}

                <div className="mt-3 rounded border border-gray-700 bg-gray-950/50 p-3">
                  <p className="text-xs text-gray-400">
                    Current preset direction
                  </p>
                  <p className="mt-1 text-sm text-gray-200">
                    {currentPresetDirection}
                  </p>
                </div>



            



            <div className="mb-5 rounded border border-gray-700 bg-gray-900/60 p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-300">
            Suno status
          </h3>
          <p className="mb-3 text-xs text-gray-400">
              {sunoStatusSummary}
            </p>


          <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Setup
            </p>

            <div className="grid gap-2 text-xs text-gray-300 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="text-gray-500">Voice:</span>{' '}
              <span className="text-gray-100">{sunoVoiceInput || 'Not set'}</span>
            </div>

            <div>
              <span className="text-gray-500">Gender:</span>{' '}
              <span className="text-gray-100">{sunoGender}</span>
            </div>

            <div>
              <span className="text-gray-500">Lyrics mode:</span>{' '}
              <span className="text-gray-100">{lyricsMode}</span>
            </div>

            <div>
              <span className="text-gray-500">Target:</span>{' '}
              <span className="text-gray-100">{productionTarget}</span>
            </div>

            <div>
              <span className="text-gray-500">Prompt length:</span>{' '}
              <span className="text-gray-100">{sunoPromptLength}</span>
            </div>

            <div>
              <span className="text-gray-500">Chord mode:</span>{' '}
              <span className="text-gray-100">{chordGuidanceMode}</span>
            </div>

            </div>

          </div>
        <div>

        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Revision
            </p>

            <div className="grid gap-2 text-xs text-gray-300 sm:grid-cols-2 xl:grid-cols-3">

            <div>
              <span className="text-gray-500">Revision notes:</span>{' '}
              <span className="text-gray-100">
                {creationNotes.trim() ? 'Ready' : 'Empty'}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Revision mode:</span>{' '}
              <span className="text-gray-100">
                {useCreationNotesAsMainDriver ? 'Notes-led' : 'Balanced'}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Result rating:</span>{' '}
              <span className="text-gray-100">
                {sunoResultRating}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Revision focus:</span>{' '}
              <span className="text-gray-100">
                {revisionFocus}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Keep/change:</span>{' '}
              <span className="text-gray-100">
                {keepFromLastVersion.trim() || changeInNextVersion.trim()
                  ? 'Ready'
                  : 'Empty'}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Generation:</span>{' '}
              <span className="text-gray-100">
                  {generatedFromSummary
                    ? 'Generated'
                    : hasChangedSinceGeneration
                      ? 'Draft changed'
                      : 'Not generated'}
                </span>
            </div>
            <div>
              <span className="text-gray-500">
                {hasChangedSinceGeneration ? 'Last generated at:' : 'Generated at:'}
              </span>{' '}
              <span className="text-gray-100">
                {generatedFromSummary && lastGeneratedAt
                  ? lastGeneratedAt
                  : hasChangedSinceGeneration && previousGeneratedAt
                    ? previousGeneratedAt
                    : 'Not generated'}
              </span>
            </div>

        </div>
    </div>
    </div>
          </div>
        </div>




      <div className="mb-3">
          <h3 className="text-lg font-semibold text-white">
            Core Prompt Fields
          </h3>
          <p className="text-sm text-gray-400">
            Main editable prompt fields used to generate and refine your Suno handoff.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {coreFieldStatus}
          </p>
        </div>


         <div className="grid gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Suno Style Prompt
              </span>
              <textarea
                value={stylePrompt}
                onChange={(e) => {
                  setStylePrompt(e.target.value)
                  clearGenerationState()
                }}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                  Main musical identity: genre, mood, vocal character, instrumentation, and production feel.
                </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Vocal Direction
              </span>
              <textarea
                value={vocalDirection}
                onChange={(e) => {setVocalDirection(e.target.value)
                clearGenerationState()
                }}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                  Describes the lead vocal tone, delivery, accent, emotion, and chorus lift.
                </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Arrangement Notes
              </span>
              <textarea
                value={arrangementNotes}
                onChange={(e) => {setArrangementNotes(e.target.value)
                clearGenerationState()
                }}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                  Controls the song build, instrumentation, dynamics, and production approach.
                </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Intro / Solo / Outro Prompt
              </span>
              <textarea
                value={introSoloOutro}
                onChange={(e) => {setIntroSoloOutro(e.target.value)
                clearGenerationState()
                }}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                  Optional guidance for openings, instrumental breaks, solos, endings, and transitions.
                </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Negative Prompt / Avoid
              </span>
              <textarea
                value={negativePrompt}
                onChange={(e) => {setNegativePrompt(e.target.value)
                clearGenerationState()
                }}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                  Describes unwanted sounds, styles, vocal effects, instruments, or production choices.
                </p>
            </label>
          </div>

                  <div className="space-y-4">
          <div className="rounded border border-gray-700 bg-gray-900/50 p-4">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
          Primary actions
            </h4>

            <p className="mb-3 text-xs text-gray-400">
              Generate creates new Suno prompts. Copy Suno handoff copies the main paste-ready pack, including lyrics, style, voice, settings, negative prompt, arrangement notes, and intro / solo / outro guidance. Reset restores the Suno prompt fields to their defaults without changing the song sheet or saved versions. Clear session removes revision notes, revision history, and generation messages without changing the song sheet.
            </p>
            <details className="mb-3 rounded border border-yellow-800 bg-yellow-950/20 p-3">
              <summary className="cursor-pointer text-xs font-medium text-yellow-200">
                Safety note — copy, reset, and clear session
              </summary>

              <p className="mt-2 text-xs text-yellow-100">
                Copy Suno handoff only copies the current paste-ready pack to your clipboard. It does not send anything to Suno, save a version, or change the song sheet. Reset affects the visible Suno prompt fields only. It does not delete projects, saved song versions, saved chord versions, or the song sheet. Clear session removes revision notes, revision history, and generation messages without changing the song sheet.
              </p>
            </details>
            <div className="flex flex-wrap gap-3">
      
      <button
          type="button"
          onClick={generateSunoPrompt}
          disabled={generatingPrompt || !performanceSheet.trim()}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingPrompt
          ? 'Generating...'
          : justGeneratedPrompt
            ? 'Generated ✓'
            : !performanceSheet.trim()
              ? 'Add lyrics to generate'
              : 'Generate Suno prompts'}
        </button>

        <button
          type="button"
          onClick={copySunoHandoff}
          disabled={!performanceSheet.trim()}
          title={sunoHandoffCopyTitle}
          className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {justCopiedSunoHandoff
          ? 'Suno handoff copied ✓'
          : hasChangedSinceGeneration
            ? 'Copy edited handoff'
            : 'Copy Suno handoff'}
        </button>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoStatusSummary)
            showButtonFeedback(setJustCopiedStatusSummary)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedStatusSummary ? 'Status copied ✓' : 'Copy status summary'}
        </button>

        <button
          type="button"
          onClick={resetToDefaults}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justResetDefaults ? 'Restored ✓' : 'Reset prompt defaults'}
        </button>
        <button
          type="button"
          onClick={clearSunoSession}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justResetDefaults ? 'Cleared ✓' : 'Clear Suno session'}
        </button>
      
    </div>
  </div>


  <div className="mt-3 rounded border border-blue-800 bg-blue-950/30 p-3">
      <h3 className="mb-1 text-sm font-medium text-blue-200">
        Suggested next step
      </h3>
      <p className="text-sm text-blue-100">
        {sunoWorkflowHint}
      </p>
    </div>

    {hasChangedSinceGeneration && (
  <div className="mt-3 rounded border border-yellow-800 bg-yellow-950/30 p-3">
    <h4 className="mb-1 text-sm font-medium text-yellow-200">
      Draft changed since last generation
    </h4>

    <p className="text-xs text-yellow-100">
      The current Suno handoff has been edited since the last generated prompt.
      Generate again if you want AI-refreshed guidance, or copy the edited handoff if you intentionally changed the fields yourself.
    </p>

    {previousGeneratedAt && (
      <p className="mt-1 text-xs text-yellow-200">
        Last generated at: {previousGeneratedAt}
      </p>
    )}
  </div>
)}
  
      {generatedFromSummary && (
          <div className="mt-3 rounded border border-green-800 bg-green-950/30 p-3">
            <p className="text-xs text-green-200">
              Generated from: {generatedFromSummary}
            </p>

            <p className="mt-1 text-xs text-green-300">
              Generated at: {lastGeneratedAt || 'Unknown time'}
            </p>
          </div>
        )}

        {generatedFromSummary && (
          <div className="mt-3 rounded border border-gray-700 bg-gray-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-gray-300">
              Post-generation checklist
            </h4>

            <ul className="list-disc space-y-1 pl-5 text-xs text-gray-400">
              <li>Copy the Suno quick pack for the first test.</li>
              <li>Use individual copy buttons only if you want to paste fields separately.</li>
              <li>After listening in Suno, open Revision Controls and note what worked or failed.</li>
            </ul>
          </div>
        )}

        {generatedFromSummary && !creationNotes.trim() && (
          <div className="mt-3 rounded border border-yellow-800 bg-yellow-950/30 p-3">
            <h4 className="mb-1 text-sm font-medium text-yellow-200">
              Revision reminder
            </h4>
            <p className="text-xs text-yellow-100">
              After listening to the Suno result, open Revision Controls and add short notes such as: vocal too soft, guitar needs more presence, intro too long, chorus worked well.
            </p>
          </div>
        )}


        {generatedFromSummary && creationNotes.trim() && (
          <div className="mt-3 rounded border border-green-800 bg-green-950/30 p-3">
            <h4 className="mb-1 text-sm font-medium text-green-200">
              Revision notes ready
            </h4>
            <p className="text-xs text-green-100">
              Your creation notes are ready to guide the next Suno prompt generation. Use Revision Controls to adjust focus, rating, keep, and change instructions.
            </p>
          </div>
        )}


        {generatedFromSummary && (
              <div className="mt-3 rounded border border-gray-700 bg-gray-950/50 p-3">
                <h4 className="mb-1 text-sm font-medium text-gray-300">
                  Generated prompt actions
                </h4>

                <p className="mb-3 text-xs text-gray-400">
                  Use the generated style, voice, or arrangement guidance as the new working direction.
                </p>

                <div className="flex flex-wrap gap-3">


                {generatedFromSummary && sunoStyleField.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setStylePrompt(sunoStyleField)
                      showButtonFeedback(setJustUsedGeneratedStyle)
                    }}
                    className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                  >
                    {justUsedGeneratedStyle
                      ? 'Generated style applied ✓'
                      : 'Use generated Suno style as main style'}
                  </button>
                )}

                {generatedFromSummary && vocalDirection.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setSunoVoice(vocalDirection)
                      showButtonFeedback(setJustUsedGeneratedVoice)
                    }}
                    className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                  >
                    {justUsedGeneratedVoice
                      ? 'Generated voice applied ✓'
                      : 'Use generated vocal direction as voice'}
                  </button>
                )}

                {generatedFromSummary && arrangementNotes.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      showButtonFeedback(setJustUsedGeneratedArrangement)
                    }}
                    className="px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                  >
                    {justUsedGeneratedArrangement
                      ? 'Arrangement confirmed ✓'
                      : 'Confirm generated arrangement'}
                  </button>
                )}

             </div>
            </div>
            )}


         </div>





  <div className="mt-5 rounded border border-gray-700 bg-gray-900/50 p-4">
    <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
          Quick copy
        </h4>

        <p className="mb-3 text-xs text-gray-400">
          Use these when you want to paste individual Suno fields separately instead of using the main Suno handoff button above.
        </p>
    <div className="flex flex-wrap gap-3">

    
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoQuickPack)
            showButtonFeedback(setJustCopiedQuickPack)
          }}
          className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600"
        >
          {justCopiedQuickPack ? 'Quick pack copied ✓' : 'Copy quick pack'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoQuickCommaPack)
            showButtonFeedback(setJustCopiedQuickCommaPack)
          }}
          className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600"
        >
          {justCopiedQuickCommaPack
            ? 'Quick comma pack copied ✓'
            : 'Copy quick comma pack'}
        </button>
      
      <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoLyricsInput)
            showButtonFeedback(setJustCopiedSunoLyrics)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedSunoLyrics ? 'Lyrics copied ✓' : 'Copy Suno lyrics'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoStyleCopyInput)
            showButtonFeedback(setJustCopiedSunoStyle)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          {justCopiedSunoStyle ? 'Style copied ✓' : 'Copy Suno style'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoStyleCommaList)
            showButtonFeedback(setJustCopiedStyleCommaList)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          {justCopiedStyleCommaList
            ? 'Comma style copied ✓'
            : 'Copy style comma list'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoVoiceInput)
            showButtonFeedback(setJustCopiedSunoVoice)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedSunoVoice ? 'Voice copied ✓' : 'Copy Suno voice'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(negativePrompt)
            showButtonFeedback(setJustCopiedNegative)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedNegative ? 'Copied ✓' : 'Copy negative prompt'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(negativePromptCommaList)
            showButtonFeedback(setJustCopiedNegativeCommaList)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedNegativeCommaList
            ? 'Negative list copied ✓'
            : 'Copy negative comma list'}
        </button>
        
        <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(detailedSunoStyleInput)
                showButtonFeedback(setJustCopiedProductionNotes)
              }}
              className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              {justCopiedProductionNotes
                ? 'Production notes copied ✓'
                : 'Copy production notes'}
            </button>

            <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoLyricsAndStylePack)
            showButtonFeedback(setJustCopiedLyricsAndStyle)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          {justCopiedLyricsAndStyle
            ? 'Lyrics + style copied ✓'
            : 'Copy lyrics + style'}
        </button>

        
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoStyleAndVoicePack)
            showButtonFeedback(setJustCopiedStyleAndVoice)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          {justCopiedStyleAndVoice
            ? 'Style + voice copied ✓'
            : 'Copy style + voice'}
        </button>


      
    </div>
  </div>

  <details className="rounded border border-gray-700 bg-gray-900/50 p-4">
    <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-gray-300">
      Detailed copy
      <span className="text-gray-500 text-sm font-normal">
      {' '}click to expand/collapse
    </span>
    </summary>
    <p className="mt-3 text-xs text-gray-400">
          Secondary copy options for revision notes, full packs, creative guides, and detailed reference material.
        </p>
    <div className="mt-4 flex flex-wrap gap-3">
     
    <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(songStructureGuide)
            showButtonFeedback(setJustCopiedStructureGuide)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedStructureGuide
            ? 'Structure copied ✓'
            : 'Copy structure guide'}
        </button>
    <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sectionArrangementGuide)
            showButtonFeedback(setJustCopiedSectionArrangement)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedSectionArrangement
            ? 'Arrangement guide copied ✓'
            : 'Copy section arrangement'}
        </button>  

    <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoHookFocus)
            showButtonFeedback(setJustCopiedHookFocus)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedHookFocus ? 'Hook focus copied ✓' : 'Copy hook focus'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoEmotionalArc)
            showButtonFeedback(setJustCopiedEmotionalArc)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedEmotionalArc
            ? 'Emotional arc copied ✓'
            : 'Copy emotional arc'}
        </button>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoPerformanceNotes)
            showButtonFeedback(setJustCopiedPerformanceNotes)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedPerformanceNotes
            ? 'Performance notes copied ✓'
            : 'Copy performance notes'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(creativeGuidePack)
            showButtonFeedback(setJustCopiedCreativeGuidePack)
          }}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500"
        >
          {justCopiedCreativeGuidePack
            ? 'Creative guide copied ✓'
            : 'Copy creative guide pack'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoRevisionInputPack)
            showButtonFeedback(setJustCopiedRevisionInputPack)
          }}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500"
        >
          {justCopiedRevisionInputPack
            ? 'Revision input copied ✓'
            : 'Copy revision input pack'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(fullSunoPack)
            showButtonFeedback(setJustCopiedFullSunoPack)
          }}
          className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500"
        >
          {justCopiedFullSunoPack ? 'Full pack copied ✓' : 'Copy full Suno pack'}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(fullSunoCommaPack)
            showButtonFeedback(setJustCopiedFullCommaPack)
          }}
          className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500"
        >
          {justCopiedFullCommaPack
            ? 'Comma pack copied ✓'
            : 'Copy full comma pack'}
        </button>



      
    </div>
  </details>
      
      <details className="mt-5 rounded border border-gray-700 bg-gray-900/60 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-gray-100">
            Suno Handoff Fields — lyrics, style, voice, settings
            <span className="text-gray-500 text-sm font-normal">
          {' '}click to expand/collapse
        </span>
          </summary>

          <p className="mt-2 mb-4 text-sm text-gray-400">
            Copy-ready fields for pasting into Suno 5.5 Advanced mode, including lyrics,
style, voice, settings, chord guidance, and negative prompt options.
          </p>

          <div className="space-y-4">

          <div className="grid gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Lyrics field
              </span>
              <textarea
                value={sunoLyricsInput}
                readOnly
                rows={8}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
            </label>
        </div>
            
        <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Style field
              </span>
              <textarea
                value={sunoStyleCopyInput}
                readOnly
                rows={5}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                  Paste this into Suno&apos;s Style field. Prompt length and chord guidance are applied here.
                </p>
          </label>

          <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Style comma list
                  </span>
                  <textarea
                    value={sunoStyleCommaList}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Compact comma-separated version for quick Suno Style tests.
                  </p>
           </label>  

           <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Voice field
              </span>
              <textarea
                value={sunoVoiceInput}
                onChange={(e) => {
                  setSunoVoice(e.target.value)
                  clearGenerationState()
                }}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
           </label>
                        <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Gender
                </span>
                <select
                  value={sunoGender}
                  onChange={(e) => {
                      setSunoGender(e.target.value)
                      clearGenerationState()
                    }}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Duet">Duet</option>
                  <option value="Unspecified">Unspecified</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Lyrics mode
                </span>
                <select
                  value={lyricsMode}
                  onChange={(e) => {
                      setLyricsMode(e.target.value)
                      clearGenerationState()
                    }}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                >
                  <option value="Manual">Manual</option>
                  <option value="Auto">Auto</option>
                </select>
              </label>
              <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Production target
                  </span>
                  <select
                    value={productionTarget}
                    onChange={(e) => {
                      setProductionTarget(e.target.value)
                      clearGenerationState()
                    }}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                  >
                    <option value="Natural demo">Natural demo</option>
                    <option value="Radio-ready">Radio-ready</option>
                    <option value="Live acoustic">Live acoustic</option>
                    <option value="Cinematic">Cinematic</option>
                    <option value="Minimal arrangement">Minimal arrangement</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Prompt length
                  </span>
                  <select
                    value={sunoPromptLength}
                    onChange={(e) => {
                      setSunoPromptLength(e.target.value)
                      clearGenerationState()
                    }}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                  >
                    <option value="Short">Short</option>
                    <option value="Medium">Medium</option>
                    <option value="Detailed">Detailed</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Chord guidance mode
                  </span>
                  <select
                    value={chordGuidanceMode}
                    onChange={(e) => {
                      setChordGuidanceMode(e.target.value)
                      clearGenerationState()
                    }}
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                  >
                    <option value="Lyrics only">Lyrics only</option>
                    <option value="Add chords to Style">Add chords to Style</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    Suno treats chord text as guidance, not a guaranteed chord chart.
                  </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Suno settings summary
              </span>
              <textarea
                value={sunoSettingsSummary}
                readOnly
                rows={5}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
            </label>

            <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Negative prompt comma list
                  </span>
                  <textarea
                    value={negativePromptCommaList}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Compact avoid-list version for quick copying.
                  </p>
             </label>

              {chordGuidanceForStyle && (
              <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Chord guidance for Style
                </span>
                <textarea
                  value={chordGuidanceForStyle}
                  readOnly
                  rows={3}
                  className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                />
              </label>
            )}
            <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Detailed production notes
                  </span>
                  <textarea
                    value={detailedSunoStyleInput}
                    readOnly
                    rows={7}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                      Use these as reference notes; they are usually too detailed for Suno&apos;s Style field.
                    </p>
            </label>


            

            <div className="grid gap-4 md:grid-cols-4">
 
            </div>


      </div>
    </details>


        <details className="mt-5 rounded border border-gray-700 bg-gray-900/60 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-gray-100">
            Creative Guides — structure, hook, arc, performance
            <span className="text-gray-500 text-sm font-normal">
              {' '}click to expand/collapse
            </span>
          </summary>

          <p className="mt-2 mb-4 text-sm text-gray-400">
            Structure, arrangement, hook, emotional arc, and performance guidance generated from the current song sheet.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Structure / section guide
              </span>
              <textarea
                value={songStructureGuide}
                readOnly
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                Use this as optional structure guidance for Suno or for prompt revision.
              </p>
            </label>
              <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Section arrangement guide
                  </span>
                  <textarea
                    value={sectionArrangementGuide}
                    readOnly
                    rows={4}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Local arrangement guidance based on detected section headings.
                  </p>
                </label>
                  <label className="block">
                      <span className="block text-sm font-medium text-gray-300 mb-1">
                        Hook focus
                      </span>
                      <textarea
                        value={sunoHookFocus}
                        readOnly
                        rows={3}
                        className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Optional hook guidance based on chorus or repeated lyric lines.
                      </p>
                    </label>
                  <label className="block">
                      <span className="block text-sm font-medium text-gray-300 mb-1">
                        Emotional arc
                      </span>
                      <textarea
                        value={sunoEmotionalArc}
                        readOnly
                        rows={3}
                        className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Optional performance arc guidance for Suno.
                      </p>
                    </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Performance notes
                  </span>
                  <textarea
                    value={sunoPerformanceNotes}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Vocal and performance guidance for Suno.
                  </p>
                </label>
                
              <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Creative guide pack
                  </span>
                  <textarea
                    value={creativeGuidePack}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Combined structure, arrangement, hook, emotional arc, and performance guidance.
                  </p>
                </label>
           </div>
        </details>   
        
        <details className="mt-5 rounded border border-gray-700 bg-gray-900/60 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-gray-100">
            Copy Packs — quick, comma, revision
            <span className="text-gray-500 text-sm font-normal">
              {' '}click to expand/collapse
            </span>
          </summary>

          <p className="mt-2 mb-4 text-sm text-gray-400">
          </p>
          <p className="mt-2 text-sm text-gray-400">
              Preview the ready-made copy blocks used for Suno handoff, quick testing, comma-style prompts, and revision workflows. These previews always reflect the current visible fields, including any manual edits made after generation.
            </p>
          <div className="mt-2 rounded border border-gray-700 bg-gray-950 p-2 text-xs text-gray-300">
              Pack preview status:{' '}
              <span className={hasChangedSinceGeneration ? 'text-yellow-300' : 'text-green-300'}>
                {hasChangedSinceGeneration
                  ? 'Showing current edited fields'
                  : generatedFromSummary
                    ? 'Showing last generated handoff'
                    : 'Ready for current fields'}
              </span>
            </div>
          <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                  {sunoHandoffPackTitle
                  .toLowerCase()
                  .replace('suno ', 'Suno ')
                  .replace('handoff', 'handoff')
                  .replace('pack', 'pack')}
                </span>
              <textarea
                value={sunoHandoffPack}
                readOnly
                rows={10}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
              <button
                  type="button"
                  onClick={copySunoHandoff}
                  title={sunoHandoffCopyTitle}
                  className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-600"
                >
                  {justCopiedSunoHandoff
                    ? 'Suno handoff copied ✓'
                    : 'Copy handoff preview'}
                </button>
              <p className="mt-1 text-xs text-gray-400">
                Preview of the main pack copied by the Primary actions “Copy Suno handoff” button.
              </p>
            </label>
          <div className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Quick pack
                  </span>
                  <textarea
                    value={sunoQuickPack}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Compact everyday pack with lyrics, style, voice, settings, and negative prompt only.
                  </p>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Quick comma pack
                  </span>
                  <textarea
                    value={sunoQuickCommaPack}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Compact everyday pack using comma-list versions of the style and negative prompt fields.
                  </p>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Revision input pack
                  </span>
                  <textarea
                    value={sunoRevisionInputPack}
                    readOnly
                    rows={10}
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Combined revision notes, current prompts, and creative guidance for refining a Suno result.
                  </p>
                  </label>
        
                </div>
            </details>

            

           
            
         
        <details className="mt-5 rounded border border-gray-700 bg-gray-900/60 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-gray-100">
            Revision Controls — notes, keep/change, result rating
            <span className="text-gray-500 text-sm font-normal">
              {' '}click to expand/collapse
            </span>
          </summary>

          <p className="mt-2 mb-4 text-sm text-gray-400">
            Use these when refining a previous Suno result. Add what worked,
            what failed, and what should change next.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded bg-gray-800 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Suno Creation Notes
              </h3>

              <p className="text-xs text-gray-400 mb-2">
                Paste notes from your Suno generations here so you can refine
                the next prompt.
              </p>

              <textarea
                value={creationNotes}
                onChange={(e) => {
                  setCreationNotes(e.target.value)
                  clearGenerationState()
                }}
                rows={5}
                placeholder="Example: Version 1 had a strong chorus but the vocal was too polished. Version 2 had a better voice but the intro was too long."
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />

              <label className="block mt-4 mb-3">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Revision focus
                </span>
                <select
                  value={revisionFocus}
                  onChange={(e) => {
                      setRevisionFocus(e.target.value)
                      clearGenerationState()
                    }}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                >
                  <option value="Balanced revision">Balanced revision</option>
                  <option value="Fix vocal">Fix vocal</option>
                  <option value="Fix arrangement">Fix arrangement</option>
                  <option value="Fix intro/solo/outro">
                    Fix intro/solo/outro
                  </option>
                  <option value="Make more acoustic">
                    Make more acoustic
                  </option>
                  <option value="Make more commercial">
                    Make more commercial
                  </option>
                </select>
              </label>

              <label className="flex items-start gap-2 mb-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={useCreationNotesAsMainDriver}
                  onChange={(e) => {
                      setUseCreationNotesAsMainDriver(e.target.checked)
                      clearGenerationState()
                    }}
                  className="mt-1"
                />
                <span>
                  Use creation notes as main driver
                  <span className="block text-xs text-gray-400">
                    Prioritise your listening notes over the existing prompt
                    direction when generating the next version.
                  </span>
                </span>
              </label>

              <label className="block mb-3">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Last Suno result
                </span>
                <select
                  value={sunoResultRating}
                  onChange={(e) => {
                      setSunoResultRating(e.target.value)
                      clearGenerationState()
                    }}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                >
                  <option value="Great">Great</option>
                  <option value="Good but needs changes">
                    Good but needs changes
                  </option>
                  <option value="Poor">Poor</option>
                  <option value="Unusable">Unusable</option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2 mb-3">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Keep from last version
                  </span>
                  <textarea
                    value={keepFromLastVersion}
                    onChange={(e) => {
                      setKeepFromLastVersion(e.target.value)
                      clearGenerationState()
                    }}
                    rows={3}
                    placeholder="Example: Keep the chorus lift, acoustic mood, and female harmony."
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-gray-300 mb-1">
                    Change in next version
                  </span>
                  <textarea
                    value={changeInNextVersion}
                    onChange={(e) => {
                      setChangeInNextVersion(e.target.value)
                      clearGenerationState()
                    }}
                    rows={3}
                    placeholder="Example: Make the vocal stronger and the guitar more prominent."
                    className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                  />
                </label>
              </div>

              {previousSunoStyleField &&
                sunoStyleField &&
                previousSunoStyleField !== sunoStyleField && (
                  <div className="mt-4 p-3 rounded bg-gray-900 border border-gray-700">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Last Suno style revision
                    </h4>

                    <div className="grid gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Before</p>
                        <p className="text-sm text-gray-300">
                          {previousSunoStyleField}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">After</p>
                        <p className="text-sm text-green-300">
                          {sunoStyleField}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(sunoStyleField)
                        showButtonFeedback(setJustCopiedRevisedStyle)
                      }}
                      className="mt-3 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
                    >
                      {justCopiedRevisedStyle
                        ? 'Revised style copied ✓'
                        : 'Copy revised style'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(fullSunoPack)
                        showButtonFeedback(setJustCopiedRevisedFullPack)
                      }}
                      className="mt-3 ml-0 md:ml-3 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500"
                    >
                      {justCopiedRevisedFullPack
                        ? 'Revised full pack copied ✓'
                        : 'Copy revised full pack'}
                    </button>
                  </div>
                )}

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sunoRevisionBrief)
                    showButtonFeedback(setJustCopiedRevisionBrief)
                  }}
                  className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                >
                  {justCopiedRevisionBrief
                    ? 'Revision brief copied ✓'
                    : 'Copy revision brief'}
                </button>
              </div>
            </div>

            {lastRevisionContext && (
              <div className="p-3 rounded bg-gray-900 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Revision context used
                </h4>

                <pre className="whitespace-pre-wrap text-xs text-gray-400 font-sans">
                  {lastRevisionContext}
                </pre>
              </div>
            )}
          </div>
        </details>


      <details className="mt-5 rounded border border-gray-700 bg-gray-900/60 p-4">
          <summary className="cursor-pointer text-lg font-semibold text-gray-100">
            Combined Suno Prompt — full generated prompt
         <span className="text-gray-500 text-sm font-normal">
          {' '}click to expand/collapse
        </span>
          </summary>

          <p className="mt-2 mb-4 text-sm text-gray-400">
            Full combined prompt assembled from the current style, vocal, arrangement,
            intro / solo / outro, and negative prompt fields.
          </p>

          <textarea
            value={combinedPrompt}
            readOnly
            rows={8}
            className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
          />
        </details>





  

  
</div>



      <div className="mt-4 flex flex-wrap gap-3">
        
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(combinedPrompt)
            showButtonFeedback(setJustCopiedCombined)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          {justCopiedCombined ? 'Copied ✓' : 'Copy combined prompt'}
        </button>
        
        

        
        
        
        
        

        


        {chordGuidanceForStyle && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(chordGuidanceForStyle)
              showButtonFeedback(setJustCopiedChordGuidance)
            }}
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
          >
            {justCopiedChordGuidance
              ? 'Chord guidance copied ✓'
              : 'Copy chord guidance'}
          </button>
        )}

        
        
        

        
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(sunoSettingsSummary)
            showButtonFeedback(setJustCopiedSunoSettings)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedSunoSettings ? 'Settings copied ✓' : 'Copy Suno settings'}
        </button>

        

        
        
        
        

        {promptMessage && (
          <p className="mt-3 text-sm text-gray-400">
            {promptMessage}
          </p>
        )}
      </div>
    </section>
  )
}