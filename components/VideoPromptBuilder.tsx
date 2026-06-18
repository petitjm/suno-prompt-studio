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
      songTitle: string
      songVersionTitle: string
      songVersionId: string | null
    }

const splitMoods = (value: string) =>
  value
    .split(',')
    .map((mood) => mood.trim())
    .filter(Boolean)

    const openArtNegativePrompt = [
      'low quality',
      'blurry',
      'distorted face',
      'deformed hands',
      'extra fingers',
      'bad anatomy',
      'warped body',
      'flickering',
      'inconsistent character',
      'changing face',
      'changing clothing',
      'text artifacts',
      'watermark',
      'logo',
      'overexposed',
      'underexposed',
      'jittery camera',
      'unnatural mouth movement',
      'poor lip sync',
    ].join(', ')

const buildMasterPrompt = (result: VideoResult) =>
  [
    result.global_style,
    result.character_prompt,
    result.video_concept,
    'Create a cinematic music video sequence with consistent character, emotional continuity, natural camera movement, realistic lighting, and scene-to-scene visual coherence.',
  ].join(' ')

const buildShortPrompt = (result: VideoResult) =>
  [
    result.global_style,
    result.character_prompt,
    result.video_concept,
  ]
    .join(' ')
    .slice(0, 700)

    const buildLipSyncPrompt = (result: VideoResult) =>
      [
        'CHARACTER:',
        result.character_prompt,
        '',
        'LIP-SYNC PERFORMANCE:',
        'Music video lip-sync performance shot. The main character is singing directly to camera with natural mouth movement, believable emotion, and clear vocal phrasing.',
        '',
        'VOCAL / PERFORMANCE FEEL:',
        'British male singer-songwriter energy, low baritone performance feel, intimate but cinematic delivery.',
        '',
        'CONTINUITY:',
        'Keep the same face, wardrobe, lighting, colour grade, and visual style as the main video. Subtle acoustic performance body language, expressive eyes, natural head movement, realistic timing, no exaggerated acting.',
        '',
        'VISUAL STYLE:',
        result.global_style,
      ].join('\n')

      const buildImageToVideoPrompt = (result: VideoResult) =>
          [
            'IMAGE-TO-VIDEO DIRECTION:',
            'Animate the supplied image as a cinematic music video shot. Preserve the original character identity, composition, wardrobe, lighting, and colour grade.',
            '',
            'MOTION:',
            'Use slow natural camera movement, subtle parallax, gentle environmental motion, realistic facial expression, and emotionally restrained performance energy.',
            '',
            'CONTINUITY:',
            'Keep the same face, clothing, visual style, and emotional tone as the full video. Avoid sudden changes in character, background, lighting, or camera angle.',
            '',
            'VIDEO CONCEPT:',
            result.video_concept,
            '',
            'CHARACTER:',
            result.character_prompt,
            '',
            'VISUAL STYLE:',
            result.global_style,
          ].join('\n')


     const buildSceneChainPack = (
      result: VideoResult,
      songTitle: string,
      songVersionTitle: string,
      generatedAt: string
    ) =>
      [
        `OPENART SCENE CHAIN PACK - ${result.dna_name}`,
        buildSongReference(songTitle, songVersionTitle, generatedAt),
        '',
        'GLOBAL STYLE TO KEEP CONSISTENT ACROSS ALL SCENES:',
        result.global_style,
        '',
        'CHARACTER CONSISTENCY PROMPT:',
        result.character_prompt,
        '',
        'SCENE CHAINING INSTRUCTION:',
        'Keep the same main character, clothing style, emotional tone, lighting style, and cinematic visual language across every scene. Each scene should feel like part of the same continuous music video.',
        '',
        'SCENES:',
        ...result.scene_prompts.flatMap((scene, index) => [
          '',
          `${index + 1}. ${scene.section}`,
          scene.prompt,
        ]),
      ].join('\n')


const buildSongReference = (
  songTitle: string,
  songVersionTitle: string,
  generatedAt = ''
) =>
  [
    songTitle.trim()
      ? `Song title: ${songTitle.trim()}`
      : 'Song title: Not selected',
    songVersionTitle.trim()
      ? `Song version: ${songVersionTitle.trim()}`
      : 'Song version: Untitled saved version',
    generatedAt
      ? `Generated at: ${generatedAt}`
      : 'Generated at: Not generated in this session',
  ].join('\n')

    const buildVideoPack = (
      result: VideoResult,
      songTitle: string,
      songVersionTitle: string,
      generatedAt: string
    ) =>
      [
    `VIDEO PROMPT PACK - ${result.dna_name}`,
    buildSongReference(songTitle, songVersionTitle, generatedAt),
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
    'MASTER OPENART PROMPT:',
    buildMasterPrompt(result),
    '',
   'SHORT OPENART PROMPT:',
    buildShortPrompt(result),
    '',
   'OPENART LIP-SYNC PROMPT:',
    buildLipSyncPrompt(result),
    '',
    'OPENART IMAGE-TO-VIDEO PROMPT:',
    buildImageToVideoPrompt(result),
    '',
    'OPENART NEGATIVE PROMPT:',
    openArtNegativePrompt,
    '',
    'SCENE PROMPTS:',
    ...result.scene_prompts.flatMap((scene, index) => [
      '',
      `${index + 1}. ${scene.section}`,
      scene.prompt,
    ]),
  ].join('\n')

export default function VideoPromptBuilder({
      lyrics,
      songTitle,
      songVersionTitle,
      songVersionId,
    }: VideoPromptBuilderProps) {

  const [genre, setGenre] = useState('')
  const [moodsText, setMoodsText] = useState('')
  const [theme, setTheme] = useState('')
  const [hook, setHook] = useState('')
  const [dnaId, setDnaId] = useState('mpj-master')
  const [multiVersion, setMultiVersion] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<VideoResult[]>([])

  const [videoGeneratedAt, setVideoGeneratedAt] = useState('')

  const [justCopiedField, setJustCopiedField] = useState('')
  const [justCopiedIndex, setJustCopiedIndex] = useState<number | null>(null)

  const hasLyrics = lyrics.trim().length > 0

  const hasSavedSongVersion = Boolean(songVersionId)
  const canGenerateVideoPrompts = hasLyrics && hasSavedSongVersion && !generating

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
    setVideoGeneratedAt('')

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

      const generatedAt = new Date().toLocaleString()

        if (Array.isArray(data.versions)) {
          setResults(data.versions)
        } else {
          setResults([data])
        }

        setVideoGeneratedAt(generatedAt)
        setMessage(`Video prompts generated at ${generatedAt}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate video prompts.')
    } finally {
      setGenerating(false)
    }
  }

  const copyVideoField = (title: string, value: string, fieldKey: string) => {
      navigator.clipboard.writeText(
        [title, buildSongReference(songTitle, songVersionTitle, videoGeneratedAt), '', value].join('\n')
      )

      setJustCopiedField(fieldKey)

      window.setTimeout(() => {
        setJustCopiedField('')
      }, 1800)
    }

    const getVideoFieldKey = (
  result: VideoResult,
  index: number,
  fieldName: string
) => `${result.dna_id}-${index}-${fieldName}`

const getVideoSceneFieldKey = (
  result: VideoResult,
  resultIndex: number,
  sceneIndex: number
) => `${result.dna_id}-${resultIndex}-scene-${sceneIndex}`


  const copyVideoPack = (result: VideoResult, index: number) => {
    navigator.clipboard.writeText(
      buildVideoPack(result, songTitle, songVersionTitle, videoGeneratedAt)
    )
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
        <div className="mt-3 rounded border border-gray-700 bg-gray-950 p-3 text-xs text-gray-300">
              <div>
                Song:{' '}
                <span className="text-gray-100">
                  {songTitle || 'Not selected'}
                </span>
              </div>
              <div className="mt-1">
                Version:{' '}
                <span className={hasSavedSongVersion ? 'text-green-300' : 'text-yellow-300'}>
                  {hasSavedSongVersion
                    ? songVersionTitle || 'Untitled saved version'
                    : 'Save the current song version before generating video prompts'}
                </span>
              </div>
            </div>

            {videoGeneratedAt && (
              <div className="mt-3 rounded border border-gray-700 bg-gray-950 p-3 text-xs text-gray-300">
                Generated at:{' '}
                <span className="text-green-300">
                  {videoGeneratedAt}
                </span>
              </div>
            )}

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
          disabled={!canGenerateVideoPrompts}
          className={
            !canGenerateVideoPrompts
              ? 'rounded border border-gray-600 bg-gray-700 px-4 py-2 text-gray-400 cursor-not-allowed'
              : 'rounded bg-purple-700 px-4 py-2 text-white hover:bg-purple-600'
          }
          title={
              !hasLyrics
                ? 'Add or load lyrics before generating video prompts.'
                : !hasSavedSongVersion
                  ? 'Save the current song version before generating video prompts, so the video output can identify the song and version.'
                  : 'Generate OpenArt-ready music video prompts from the saved song version.'
            }
        >
          {generating
          ? 'Generating video prompts...'
          : !hasLyrics
            ? 'Add lyrics to generate video'
            : !hasSavedSongVersion
              ? 'Save song version before video'
              : 'Generate video prompts'}
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


                <button
                  type="button"
                  onClick={() =>
                    copyVideoField(
                      'OPENART SCENE CHAIN PACK:',
                      buildSceneChainPack(result, songTitle, songVersionTitle, videoGeneratedAt),
                      getVideoFieldKey(result, index, 'scene-chain')
                    )
                  }
                  className="rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                >
                  {justCopiedField === getVideoFieldKey(result, index, 'scene-chain')
                    ? 'Scene chain copied ✓'
                    : 'Copy scene chain'}
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
                  <button
                    type="button"
                    onClick={() =>
                      copyVideoField(
                        'GLOBAL STYLE:',
                        result.global_style,
                        getVideoFieldKey(result, index, 'global-style')
                      )
                    }
                    className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                  >
                    {justCopiedField === getVideoFieldKey(result, index, 'global-style')
                      ? 'Global style copied ✓'
                      : 'Copy global style'}
                  </button>
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
                  <button
                    type="button"
                    onClick={() =>
                      copyVideoField(
                        'CHARACTER PROMPT:',
                        result.character_prompt,
                        getVideoFieldKey(result, index, 'character')
                      )
                    }
                    className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                  >
                    {justCopiedField === getVideoFieldKey(result, index, 'character')
                      ? 'Character prompt copied ✓'
                      : 'Copy character prompt'}
                  </button>
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

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    Master OpenArt prompt
                  </span>
                  <textarea
                    value={buildMasterPrompt(result)}
                    readOnly
                    rows={5}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                  <button
                      type="button"
                      onClick={() => copyVideoField(
                          'MASTER OPENART PROMPT:',
                          buildMasterPrompt(result),
                          getVideoFieldKey(result, index, 'master')
                        )}
                      className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                    >
                      {justCopiedField === getVideoFieldKey(result, index, 'master')
                        ? 'Master prompt copied ✓'
                        : 'Copy master prompt'}
                    </button>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    Short OpenArt prompt
                  </span>
                  <textarea
                    value={buildShortPrompt(result)}
                    readOnly
                    rows={4}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                  <button
                      type="button"
                      onClick={() =>
                        copyVideoField(
                          'SHORT OPENART PROMPT:',
                          buildShortPrompt(result),
                          getVideoFieldKey(result, index, 'short')
                        )
                      }
                      className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                    >
                      {justCopiedField === getVideoFieldKey(result, index, 'short')
                        ? 'Short prompt copied ✓'
                        : 'Copy short prompt'}
                    </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Shortened prompt for OpenArt fields with tighter character limits.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    OpenArt lip-sync prompt
                  </span>
                  <textarea
                    value={buildLipSyncPrompt(result)}
                    readOnly
                    rows={5}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyVideoField(
                        'OPENART LIP-SYNC PROMPT:',
                        buildLipSyncPrompt(result),
                        getVideoFieldKey(result, index, 'lip-sync')
                      )
                    }
                    className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                  >
                    {justCopiedField === getVideoFieldKey(result, index, 'lip-sync')
                      ? 'Lip-sync prompt copied ✓'
                      : 'Copy lip-sync prompt'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Use this for OpenArt shots where MPJ is singing directly to camera.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    OpenArt image-to-video prompt
                  </span>
                  <textarea
                    value={buildImageToVideoPrompt(result)}
                    readOnly
                    rows={6}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyVideoField(
                        'OPENART IMAGE-TO-VIDEO PROMPT:',
                        buildImageToVideoPrompt(result),
                        getVideoFieldKey(result, index, 'image-to-video')
                      )
                    }
                    className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                  >
                    {justCopiedField === getVideoFieldKey(result, index, 'image-to-video')
                      ? 'Image-to-video prompt copied ✓'
                      : 'Copy image-to-video prompt'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Use this when animating a cover image, still frame, or generated character image in OpenArt.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-300">
                    OpenArt negative prompt
                  </span>
                  <textarea
                    value={openArtNegativePrompt}
                    readOnly
                    rows={3}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                  />
                  <button
                      type="button"
                      onClick={() =>
                        copyVideoField(
                          'OPENART NEGATIVE PROMPT:',
                          openArtNegativePrompt,
                          getVideoFieldKey(result, index, 'negative')
                        )
                      }
                      className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                    >
                      {justCopiedField === getVideoFieldKey(result, index, 'negative')
                        ? 'Negative prompt copied ✓'
                        : 'Copy negative prompt'}
                    </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Use this to reduce video artifacts, inconsistent character details, and lip-sync issues.
                  </p>
                </label>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-300">
                    Scene prompts
                  </h4>

                  <div className="space-y-3">
                    {result.scene_prompts.map((scene, sceneIndex) => (
                      <div
  key={`${result.dna_id}-${scene.section}-${sceneIndex}`}
  className="block"
>
  <label className="block">
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

        <button
          type="button"
          onClick={() =>
            copyVideoField(
              `SCENE PROMPT - ${scene.section}:`,
              scene.prompt,
              getVideoSceneFieldKey(result, index, sceneIndex)
            )
          }
          className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
        >
          {justCopiedField === getVideoSceneFieldKey(result, index, sceneIndex)
            ? 'Scene prompt copied ✓'
            : 'Copy scene prompt'}
        </button>
    </div>
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