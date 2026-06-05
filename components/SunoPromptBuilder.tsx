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
  const [previousSunoStyleField, setPreviousSunoStyleField] = useState('')
  const [justCopiedRevisedStyle, setJustCopiedRevisedStyle] = useState(false)
  const [justCopiedFullSunoPack, setJustCopiedFullSunoPack] = useState(false)
  const [justCopiedChordGuidance, setJustCopiedChordGuidance] = useState(false)
  const [activeVoicePresetFeedback, setActiveVoicePresetFeedback] = useState('')
  const [justCopiedSunoSettings, setJustCopiedSunoSettings] = useState(false)
  const [justCopiedSunoLyrics, setJustCopiedSunoLyrics] = useState(false)
  const [justCopiedSunoStyle, setJustCopiedSunoStyle] = useState(false)
  const [justCopiedSunoVoice, setJustCopiedSunoVoice] = useState(false)
  const [justCopiedRevisionBrief, setJustCopiedRevisionBrief] = useState(false)
  const [justCopiedProductionNotes, setJustCopiedProductionNotes] = useState(false)
  const [justCopiedRevisedFullPack, setJustCopiedRevisedFullPack] = useState(false)
  const [activePresetFeedback, setActivePresetFeedback] = useState('')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')
  const [justCopiedCombined, setJustCopiedCombined] = useState(false)
  const [justCopiedNegative, setJustCopiedNegative] = useState(false)
  const [justResetDefaults, setJustResetDefaults] = useState(false)
  const [sunoStyleField, setSunoStyleField] = useState(defaultStylePrompt)
  const [generatedFromSummary, setGeneratedFromSummary] = useState('')
  const [justGeneratedPrompt, setJustGeneratedPrompt] = useState(false)
  const [chordGuidanceMode, setChordGuidanceMode] = useState('Lyrics only')
  const [stylePrompt, setStylePrompt] = useState(defaultStylePrompt)
  const [vocalDirection, setVocalDirection] = useState(defaultVocalDirection)
  const [arrangementNotes, setArrangementNotes] = useState(defaultArrangementNotes)
  const [introSoloOutro, setIntroSoloOutro] = useState(defaultIntroSoloOutro)
  const [negativePrompt, setNegativePrompt] = useState(defaultNegativePrompt)

  useEffect(() => {
      setPromptMessage('')
      setGeneratedFromSummary('')
      setPreviousSunoStyleField('')
      setRevisionSummary('')
      setLastRevisionContext('')

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
  setVocalDirection(defaultVocalDirection)
  setArrangementNotes(defaultArrangementNotes)
  setIntroSoloOutro(defaultIntroSoloOutro)
  setNegativePrompt(defaultNegativePrompt)
  showButtonFeedback(setJustResetDefaults)
  setChordGuidanceMode('Lyrics only')
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

        const fullSunoPack = [
          'SUNO 5.5 ADVANCED INPUTS',
          '',
          'LYRICS:',
          sunoLyricsInput || 'No lyrics provided.',
          '',
          'STYLE:',
            compactSunoStyleInput || 'No style prompt provided.',
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

          showButtonFeedback(setJustResetDefaults)
          setChordGuidanceMode('Lyrics only')
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

      <div className="mb-4 p-3 rounded bg-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-1">
          Current lyric direction
        </h3>
        <p className="text-sm text-gray-400">
          {lyricSummary}
        </p>
      </div>
      <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Quick style presets
          </h3>

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
      <div className="grid gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-300 mb-1">
            Suno Style Prompt
          </span>
          <textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-300 mb-1">
            Vocal Direction
          </span>
          <textarea
            value={vocalDirection}
            onChange={(e) => setVocalDirection(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-300 mb-1">
            Arrangement Notes
          </span>
          <textarea
            value={arrangementNotes}
            onChange={(e) => setArrangementNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-300 mb-1">
            Intro / Solo / Outro Prompt
          </span>
          <textarea
            value={introSoloOutro}
            onChange={(e) => setIntroSoloOutro(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-300 mb-1">
            Negative Prompt / Avoid
          </span>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </label>
      </div>
      <div className="mt-5 p-4 rounded bg-gray-800 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Suno Advanced Inputs
          </h3>

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
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Chord guidance mode
              </span>
              <select
                value={chordGuidanceMode}
                onChange={(e) => setChordGuidanceMode(e.target.value)}
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
                Style field
              </span>
              <textarea
                value={compactSunoStyleInput}
                readOnly
                rows={5}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
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
            </label>

            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Voice presets
              </h4>

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
                
              </div>
              {activeVoicePresetFeedback && (
                  <p className="mt-2 text-xs text-green-300">
                    {activeVoicePresetFeedback}
                  </p>
                )}
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Voice field
              </span>
              <textarea
                value={sunoVoiceInput}
                onChange={(e) => setSunoVoice(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Gender
                </span>
                <select
                  value={sunoGender}
                  onChange={(e) => setSunoGender(e.target.value)}
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
                  onChange={(e) => setLyricsMode(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white"
                >
                  <option value="Manual">Manual</option>
                  <option value="Auto">Auto</option>
                </select>
              </label>
            </div>
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
          </div>
        </div>
        <div className="mt-5 p-4 rounded bg-gray-800 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Suno Creation Notes
          </h3>

          <p className="text-xs text-gray-400 mb-2">
            Paste notes from your Suno generations here so you can refine the next prompt.
          </p>
          <label className="block mb-3">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Revision focus
              </span>
              <select
                value={revisionFocus}
                onChange={(e) => setRevisionFocus(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-700 text-white"
              >
                <option value="Balanced revision">Balanced revision</option>
                <option value="Fix vocal">Fix vocal</option>
                <option value="Fix arrangement">Fix arrangement</option>
                <option value="Fix intro/solo/outro">Fix intro/solo/outro</option>
                <option value="Make more acoustic">Make more acoustic</option>
                <option value="Make more commercial">Make more commercial</option>
              </select>

            </label>
            <label className="block mb-3">
              <span className="block text-sm font-medium text-gray-300 mb-1">
                Last Suno result
              </span>
              <select
                value={sunoResultRating}
                onChange={(e) => setSunoResultRating(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-700 text-white"
              >
                <option value="Great">Great</option>
                <option value="Good but needs changes">Good but needs changes</option>
                <option value="Poor">Poor</option>
                <option value="Unusable">Unusable</option>
              </select>
            </label>
            <label className="flex items-start gap-2 mb-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={useCreationNotesAsMainDriver}
                onChange={(e) => setUseCreationNotesAsMainDriver(e.target.checked)}
                className="mt-1"
              />
              <span>
                Use creation notes as main driver
                <span className="block text-xs text-gray-400">
                  Prioritise your listening notes over the existing prompt direction when generating the next version.
                </span>
              </span>
            </label>
            <div className="grid gap-4 md:grid-cols-2 mb-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-300 mb-1">
                  Keep from last version
                </span>
                <textarea
                  value={keepFromLastVersion}
                  onChange={(e) => setKeepFromLastVersion(e.target.value)}
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
                  onChange={(e) => setChangeInNextVersion(e.target.value)}
                  rows={3}
                  placeholder="Example: Make the vocal stronger and the guitar more prominent."
                  className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
                />
              </label>
            </div>
          <textarea
            value={creationNotes}
            onChange={(e) => setCreationNotes(e.target.value)}
            rows={5}
            placeholder="Example: Version 1 had a strong chorus but the vocal was too polished. Version 2 had a better voice but the intro was too long."
            className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
          />
          {previousSunoStyleField && sunoStyleField && previousSunoStyleField !== sunoStyleField && (
              <div className="mt-4 p-3 rounded bg-gray-900 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Last Suno style revision
                </h4>

                <div className="grid gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Before</p>
                    <p className="text-sm text-gray-300">{previousSunoStyleField}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">After</p>
                    <p className="text-sm text-green-300">{sunoStyleField}</p>
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
                  {justCopiedRevisedStyle ? 'Revised style copied ✓' : 'Copy revised style'}
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
              {justCopiedRevisionBrief ? 'Revision brief copied ✓' : 'Copy revision brief'}
            </button>
          </div>
        </div>
        {lastRevisionContext && (
          <div className="mt-4 p-3 rounded bg-gray-900 border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Revision context used
            </h4>

            <pre className="whitespace-pre-wrap text-xs text-gray-400 font-sans">
              {lastRevisionContext}
            </pre>
          </div>
        )}
      <div className="mt-5 p-3 rounded bg-gray-800 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          Combined Suno Prompt
        </h3>
        <textarea
          value={combinedPrompt}
          readOnly
          rows={8}
          className="w-full px-3 py-2 rounded bg-gray-950 text-gray-100 border border-gray-700"
        />
      </div>
      {generatedFromSummary && (
          <p className="mt-2 text-xs text-gray-400">
            Generated from: {generatedFromSummary}
          </p>
        )}
      <div className="mt-4 flex flex-wrap gap-3">
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
            navigator.clipboard.writeText(sunoLyricsInput)
            showButtonFeedback(setJustCopiedSunoLyrics)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedSunoLyrics ? 'Lyrics copied ✓' : 'Copy Suno lyrics'}
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
            navigator.clipboard.writeText(compactSunoStyleInput)
            showButtonFeedback(setJustCopiedSunoStyle)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          {justCopiedSunoStyle ? 'Style copied ✓' : 'Copy Suno style'}
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
            navigator.clipboard.writeText(sunoSettingsSummary)
            showButtonFeedback(setJustCopiedSunoSettings)
          }}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          {justCopiedSunoSettings ? 'Settings copied ✓' : 'Copy Suno settings'}
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
                navigator.clipboard.writeText(detailedSunoStyleInput)
                showButtonFeedback(setJustCopiedProductionNotes)
              }}
              className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            >
              {justCopiedProductionNotes
                ? 'Production notes copied ✓'
                : 'Copy production notes'}
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