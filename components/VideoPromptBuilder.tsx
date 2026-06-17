'use client'

import { useMemo, useState } from 'react'

type VideoScenePrompt = {
  section: string
  prompt: string
}

type VideoResult = {
  dna_id: string
  dna_name: string
  global_style: string
  character_prompt: string
  video_concept: string
  scene_prompts: VideoScenePrompt[]
}

type VideoPromptBuilderProps = {
  lyrics: string
}

const splitMoods = (value: string) =>
  value
    .split(',')
    .map((mood) => mood.trim())
    .filter(Boolean)

const buildVideoPack = (result: VideoResult) =>
  [
    `VIDEO PROMPT PACK - ${result.dna_name}`,
    '',
    'GLOBAL STYLE:',
    result.global_style,
    '',
    'CHARACTER PROMPT:',
    result.character_prompt,
    '',
    'VIDEO CONCEPT:',
    result.video_concept,
    '',
    'SCENE PROMPTS:',
    ...result.scene_prompts.flatMap((scene, index) => [
      '',
      `${index + 1}. ${scene.section}`,
      scene.prompt,
    ]),
  ].join('\n')

export default function VideoPromptBuilder({ lyrics }: VideoPromptBuilderProps) {
  const [genre, setGenre] = useState('')
  const [moodsText, setMoodsText] = useState('')
  const [theme, setTheme] = useState('')
  const [hook, setHook] = useState('')
  const [dnaId, setDnaId] = useState('mpj-master')
  const [multiVersion, setMultiVersion] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<VideoResult[]>([])
  const [justCopiedIndex, setJustCopiedIndex] = useState<number | null>(null)

  const hasLyrics = lyrics.trim().length > 0

  const videoRequestSummary = useMemo(() => {
    return [
      genre.trim() ? `Genre: ${genre.trim()}` : 'Genre: not set',
      moodsText.trim() ? `Mood: ${moodsText.trim()}` : 'Mood: not set',
      theme.trim() ? `Theme: ${theme.trim()}` : 'Theme: not set',
      hook.trim() ? `Hook: ${hook.trim()}` : 'Hook: not set',
      `DNA: ${dnaId}`,
      multiVersion ? 'Mode: multi-version' : 'Mode: single version',
    ].join(' · ')
  }, [genre, moodsText, theme, hook, dnaId, multiVersion])

  const generateVideoPrompts = async () => {
    if (!hasLyrics) {
      setMessage('Add or load lyrics before generating video prompts.')
      return
    }

    setGenerating(true)
    setMessage('')
    setResults([])

    try {
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre,
          moods: splitMoods(moodsText),
          theme,
          hook,
          lyrics,
          dnaId,
          multiVersion,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video prompts.')
      }

      if (Array.isArray(data.versions)) {
        setResults(data.versions)
      } else {
        setResults([data])
      }

      setMessage('Video prompts generated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate video prompts.')
    } finally {
      setGenerating(false)
    }
  }

  const copyVideoPack = (result: VideoResult, index: number) => {
    navigator.clipboard.writeText(buildVideoPack(result))
    setJustCopiedIndex(index)

    window.setTimeout(() => {
      setJustCopiedIndex(null)
    }, 1800)
  }

  return (
    <section className="rounded border border-gray-700 bg-gray-900/60 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-100">
          Video Prompt Builder
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Generate OpenArt-ready music video prompts from the current song sheet.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-300">
            Genre
          </span>
          <input
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            placeholder="modern country, indie folk, acoustic pop..."
            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-300">
            Moods
          </span>
          <input
            value={moodsText}
            onChange={(event) => setMoodsText(event.target.value)}
            placeholder="cinematic, reflective, hopeful"
            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Separate moods with commas.
          </p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-300">
            Theme
          </span>
          <input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            placeholder="coming home, lost love, open road..."
            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-300">
            Hook / visual focus
          </span>
          <input
            value={hook}
            onChange={(event) => setHook(event.target.value)}
            placeholder="main emotional image or chorus idea"
            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-300">
            Creative DNA
          </span>
          <select
            value={dnaId}
            onChange={(event) => setDnaId(event.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-100"
          >
            <option value="mpj-master">MPJ Master</option>
            <option value="commercial-hit">Commercial Hit</option>
            <option value="raw-folk">Raw Folk</option>
          </select>
        </label>

        <label className="flex items-center gap-2 rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={multiVersion}
            onChange={(event) => setMultiVersion(event.target.checked)}
          />
          Generate three DNA versions
        </label>
      </div>

      <div className="mt-4 rounded border border-gray-700 bg-gray-950 p-3 text-xs text-gray-400">
        {videoRequestSummary}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateVideoPrompts}
          disabled={generating || !hasLyrics}
          className={
            generating || !hasLyrics
              ? 'rounded border border-gray-600 bg-gray-700 px-4 py-2 text-gray-400 cursor-not-allowed'
              : 'rounded bg-purple-700 px-4 py-2 text-white hover:bg-purple-600'
          }
          title={
            hasLyrics
              ? 'Generate OpenArt-ready music video prompts from the current song sheet.'
              : 'Add or load lyrics before generating video prompts.'
          }
        >
          {generating
            ? 'Generating video prompts...'
            : hasLyrics
              ? 'Generate video prompts'
              : 'Add lyrics to generate video'}
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded border border-gray-700 bg-gray-950 p-2 text-xs text-gray-300">
          {message}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-5 space-y-4">
          {results.map((result, index) => (
            <article
              key={`${result.dna_id}-${index}`}
              className="rounded border border-gray-700 bg-gray-950 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-100">
                  {result.dna_name}
                </h3>

                <button
                  type="button"
                  onClick={() => copyVideoPack(result, index)}
                  className="rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                >
                  {justCopiedIndex === index ? 'Video pack copied ✓' : 'Copy video pack'}
                </button>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    Global style
                  </span>
                  <textarea
                    value={result.global_style}
                    readOnly
                    rows={3}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    Character prompt
                  </span>
                  <textarea
                    value={result.character_prompt}
                    readOnly
                    rows={3}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    Video concept
                  </span>
                  <textarea
                    value={result.video_concept}
                    readOnly
                    rows={4}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                </label>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-300">
                    Scene prompts
                  </h4>

                  <div className="space-y-3">
                    {result.scene_prompts.map((scene, sceneIndex) => (
                      <label
                        key={`${result.dna_id}-${scene.section}-${sceneIndex}`}
                        className="block"
                      >
                        <span className="mb-1 block text-xs font-medium text-gray-400">
                          {scene.section}
                        </span>
                        <textarea
                          value={scene.prompt}
                          readOnly
                          rows={3}
                          className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}