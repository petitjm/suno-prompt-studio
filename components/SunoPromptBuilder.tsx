'use client'

import React, { useMemo, useState } from 'react'

type SunoPromptBuilderProps = {
  performanceSheet: string
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
    .filter((line) => !line.startsWith('['))
    .slice(0, 6)

  if (lines.length === 0) {
    return 'No lyrics loaded yet.'
  }

  return lines.join(' / ')
}

export default function SunoPromptBuilder({
  performanceSheet,
}: SunoPromptBuilderProps) {
  const lyricSummary = useMemo(
    () => getLyricSummary(performanceSheet),
    [performanceSheet]
  )

  const [activePresetFeedback, setActivePresetFeedback] = useState('')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')
  const [justCopiedCombined, setJustCopiedCombined] = useState(false)
  const [justCopiedNegative, setJustCopiedNegative] = useState(false)
  const [justResetDefaults, setJustResetDefaults] = useState(false)
  const [generatedFromSummary, setGeneratedFromSummary] = useState('')
  const [justGeneratedPrompt, setJustGeneratedPrompt] = useState(false)
  const [stylePrompt, setStylePrompt] = useState(defaultStylePrompt)
  const [vocalDirection, setVocalDirection] = useState(defaultVocalDirection)
  const [arrangementNotes, setArrangementNotes] = useState(defaultArrangementNotes)
  const [introSoloOutro, setIntroSoloOutro] = useState(defaultIntroSoloOutro)
  const [negativePrompt, setNegativePrompt] = useState(defaultNegativePrompt)

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
  setStylePrompt(defaultStylePrompt)
  setGeneratedFromSummary('')
  setVocalDirection(defaultVocalDirection)
  setArrangementNotes(defaultArrangementNotes)
  setIntroSoloOutro(defaultIntroSoloOutro)
  setNegativePrompt(defaultNegativePrompt)
  showButtonFeedback(setJustResetDefaults)
}

  const generateSunoPrompt = async () => {
  if (!performanceSheet.trim()) {
    setPromptMessage('Add lyrics to the Song Sheet before generating Suno prompts.')
    return
  }

    setGeneratingPrompt(true)
    setPromptMessage('')

    setStylePrompt('')
    setVocalDirection('')
    setArrangementNotes('')
    setIntroSoloOutro('')
    setNegativePrompt('')

  try {
    const response = await fetch('/api/suno-prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lyrics: performanceSheet,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Could not generate Suno prompts.')
    }

    setStylePrompt(data.stylePrompt || '')
    setVocalDirection(data.vocalDirection || '')
    setArrangementNotes(data.arrangementNotes || '')
    setIntroSoloOutro(data.introSoloOutro || '')
    setNegativePrompt(data.negativePrompt || '')
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
        
        {promptMessage && (
          <p className="mt-3 text-sm text-gray-400">
            {promptMessage}
          </p>
        )}
      </div>
    </section>
  )
}