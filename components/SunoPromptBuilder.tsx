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


  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptMessage, setPromptMessage] = useState('')
  const [justCopiedCombined, setJustCopiedCombined] = useState(false)
  const [justCopiedNegative, setJustCopiedNegative] = useState(false)
  const [justResetDefaults, setJustResetDefaults] = useState(false)
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
  setVocalDirection(defaultVocalDirection)
  setArrangementNotes(defaultArrangementNotes)
  setIntroSoloOutro(defaultIntroSoloOutro)
  setNegativePrompt(defaultNegativePrompt)
  showButtonFeedback(setJustResetDefaults)
}

  const generateSunoPrompt = async () => {
      setGeneratingPrompt(true)
      setPromptMessage('')

      try {
        // API wiring comes in the next step.
        // For now this confirms the panel is ready for generated prompt results.
        setPromptMessage('Suno prompt generation will be connected to the API in the next step.')
        showButtonFeedback(setJustGeneratedPrompt)
      } catch {
        setPromptMessage('Could not generate Suno prompt. Please try again.')
      } finally {
        setGeneratingPrompt(false)
      }
    }

    const showButtonFeedback = (
          setFeedback: React.Dispatch<React.SetStateAction<boolean>>
        ) => {
          setFeedback(true)

          window.setTimeout(() => {
            setFeedback(false)
          }, 1500)
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

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateSunoPrompt}
          disabled={generatingPrompt}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingPrompt
          ? 'Generating...'
          : justGeneratedPrompt
            ? 'Generated ✓'
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