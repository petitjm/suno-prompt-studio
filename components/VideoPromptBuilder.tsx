'use client'

import { useEffect, useState, useMemo, useRef } from 'react'

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


        const buildSocialTeaserPack = (
              result: VideoResult,
              songTitle: string,
              songVersionTitle: string,
              generatedAt: string
            ) =>
              [
                `OPENART SOCIAL TEASER PACK - ${result.dna_name}`,
                buildSongReference(songTitle, songVersionTitle, generatedAt),
                '',
                'FORMAT:',
                'Create a short-form vertical music video teaser suitable for YouTube Shorts, TikTok, Instagram Reels, or social media promotion.',
                '',
                'DURATION:',
                '10 to 20 seconds.',
                '',
                'HOOK MOMENT:',
                'Open with the strongest emotional or visual moment from the song. Make the first two seconds visually clear, intriguing, and memorable.',
                '',
                'VISUAL CONCEPT:',
                result.video_concept,
                '',
                'MAIN CHARACTER:',
                result.character_prompt,
                '',
                'VISUAL STYLE:',
                result.global_style,
                '',
                'EDITING DIRECTION:',
                'Use cinematic vertical framing, slow emotional movement, one clear focal image, subtle performance energy, and a strong final visual beat. Avoid over-cutting. Keep the character consistent.',
                '',
                'TEXT OVERLAY SUGGESTION:',
                songTitle.trim()
                  ? `"${songTitle.trim()}"`
                  : 'Use the song title as a short overlay.',
                '',
                'NEGATIVE PROMPT:',
                openArtNegativePrompt,
              ].join('\n')



        const buildStoryboardPack = (
          result: VideoResult,
          songTitle: string,
          songVersionTitle: string,
          generatedAt: string
        ) =>
          [
            `OPENART STORYBOARD - ${result.dna_name}`,
            buildSongReference(songTitle, songVersionTitle, generatedAt),
            '',
            'VIDEO CONCEPT:',
            result.video_concept,
            '',
            'VISUAL STYLE:',
            result.global_style,
            '',
            'MAIN CHARACTER:',
            result.character_prompt,
            '',
            'STORYBOARD BEATS:',
            ...result.scene_prompts.flatMap((scene, index) => [
              '',
              `${index + 1}. ${scene.section}`,
              `Visual beat: ${scene.prompt}`,
              'Camera direction: cinematic music video framing, natural motion, emotionally connected to the lyric section.',
              'Continuity note: keep the same character, colour grade, lighting mood, and visual world.',
            ]),
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


  function buildVideoPromptSessionSummary({
      songTitle,
      songVersionTitle,
      generatedAt,
      status,
      resultCount,
      hasSavedSongVersion,
    }: {
      songTitle: string
      songVersionTitle: string
      generatedAt: string
      status: string
      resultCount: number
      hasSavedSongVersion: boolean
    }) {
      return [
        'VIDEO PROMPT SESSION SUMMARY:',
        `Song title: ${songTitle || 'Untitled song'}`,
        `Song version: ${songVersionTitle || 'Untitled version'}`,
        `Generated at: ${generatedAt || 'Not generated yet'}`,
        `Saved song version linked: ${hasSavedSongVersion ? 'Yes' : 'No'}`,
        `Generated video prompt versions: ${resultCount}`,
        '',
        'Current status:',
        status || 'No current video prompt status message.',
        '',
        'Available OpenArt workflow packs:',
        [
          'Copy video pack',
          'Copy scene chain',
          'Copy storyboard',
          'Copy social teaser',
          'Copy global style',
          'Copy character prompt',
          'Copy cover image prompt',
          'Copy MPJ character consistency prompt',
          'Copy lyrics-to-visual beat sheet',
          'Copy OpenArt production checklist',
          'Copy OpenArt release promo pack',
          'Copy full OpenArt creative bundle',
        ].join('\n'),
        '',
        'Recommended next step:',
        resultCount > 0
          ? 'Choose the best generated version, copy the cover image prompt first, then use the character consistency prompt before creating scene images.'
          : 'Generate video prompts from a saved song version before copying OpenArt workflow packs.',
      ].join('\n')
    }

  function buildOpenArtProductionChecklistPack({
              songTitle,
              songVersionTitle,
              generatedAt,
              videoConcept,
              globalStyle,
            }: {
              songTitle: string
              songVersionTitle: string
              generatedAt: string
              videoConcept: string
              globalStyle: string
            }) {
              const displayTitle = songTitle || 'Untitled song'
              const displayVersion = songVersionTitle || 'Untitled version'

              return [
                'OPENART PRODUCTION CHECKLIST:',
                `Song title: ${displayTitle}`,
                `Song version: ${displayVersion}`,
                `Generated at: ${generatedAt}`,
                '',
                'Purpose:',
                'Use this checklist to move from generated video prompts into a finished OpenArt music-video workflow.',
                '',
                'Video concept:',
                videoConcept || 'Emotionally grounded cinematic music video concept with a strong singer-songwriter identity.',
                '',
                'Global visual style:',
                globalStyle || 'Cinematic acoustic singer-songwriter visuals, natural lighting, emotional realism, warm filmic tones, atmospheric depth.',
                '',
                'Step 1 — Cover image / hero frame:',
                [
                  'Use the cover image prompt first.',
                  'Generate a strong square 1:1 still image.',
                  'Choose the frame with the clearest emotional focus and most consistent MPJ character.',
                  'Avoid images with text, logos, distorted face, or artificial-looking hands.',
                ].join('\n'),
                '',
                'Step 2 — Character consistency:',
                [
                  'Use the MPJ character consistency prompt before generating scene images.',
                  'Keep the same face, age, build, clothing feel, and singer-songwriter identity.',
                  'Reject images where the performer looks like a different person.',
                ].join('\n'),
                '',
                'Step 3 — Scene chain:',
                [
                  'Use the scene chain pack to create the main visual sequence.',
                  'Generate each scene as a still image first.',
                  'Keep lighting, mood, clothing, and character identity consistent across scenes.',
                  'Save the best still frame for each scene before animating.',
                ].join('\n'),
                '',
                'Step 4 — Image-to-video:',
                [
                  'Use the image-to-video prompt on the selected still frames.',
                  'Use gentle cinematic camera movement.',
                  'Avoid excessive motion, face warping, or dramatic action that distracts from the song.',
                  'Check each clip for stable face, hands, guitar, and mouth shape.',
                ].join('\n'),
                '',
                'Step 5 — Lip-sync:',
                [
                  'Use the lip-sync prompt for direct vocal performance moments.',
                  'Keep the mouth movement natural and emotionally connected to the lyric.',
                  'Use close or medium shots where the face is stable and expressive.',
                  'Reject clips with exaggerated mouth movement or mismatched emotion.',
                ].join('\n'),
                '',
                'Step 6 — Storyboard / edit:',
                [
                  'Use the storyboard pack to plan the final order.',
                  'Let verses feel intimate and observational.',
                  'Let choruses feel wider and more emotionally open.',
                  'Use instrumental sections for atmosphere, memory, movement, or landscape.',
                ].join('\n'),
                '',
                'Step 7 — Social teaser:',
                [
                  'Use the social teaser pack for Shorts, Reels, TikTok, and Facebook preview clips.',
                  'Pick the most emotionally immediate visual moment.',
                  'Keep the teaser short, clear, and visually strong without text overlays if possible.',
                ].join('\n'),
                '',
                'Step 8 — Release promo:',
                [
                  'Use the OpenArt release promo pack after the final video is assembled.',
                  'Prepare YouTube description, social caption, teaser caption, hashtags, and thumbnail direction.',
                  'Keep all wording aligned with the MPJ identity: British singer-songwriter, acoustic, heartfelt, cinematic.',
                ].join('\n'),
              ].join('\n')
            }


  function splitLyricsIntoVisualSections(lyrics: string) {
      const sections = lyrics
        .split(/\n\s*\n/g)
        .map((section) => section.trim())
        .filter(Boolean)

      if (sections.length === 0) {
        return ['No lyric sections available.']
      }

      return sections.map((section, index) => {
        const lines = section
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)

        const headingMatch = lines[0]?.match(/^\[.*\]$/)
        const heading = headingMatch ? lines[0] : `Section ${index + 1}`
        const lyricLines = headingMatch ? lines.slice(1) : lines

        



        return [
          `${heading}:`,
          lyricLines.join('\n'),
          '',
          'Suggested visual beat:',
          'Create a cinematic visual moment that reflects the emotional meaning of this lyric section. Keep the MPJ performer visually consistent, use natural music-video pacing, and avoid literal overacting.',
        ].join('\n')
      })
    }


    function buildOpenArtReleasePromoPack({
          songTitle,
          songVersionTitle,
          generatedAt,
          videoConcept,
          globalStyle,
          characterPrompt,
          masterOpenArtPrompt,
          negativePrompt,
        }: {
          songTitle: string
          songVersionTitle: string
          generatedAt: string
          videoConcept: string
          globalStyle: string
          characterPrompt: string
          masterOpenArtPrompt: string
          negativePrompt: string
        }) {
          const displayTitle = songTitle || 'Untitled song'
          const displayVersion = songVersionTitle || 'Untitled version'

          return [
            'OPENART RELEASE PROMO PACK:',
            `Song title: ${displayTitle}`,
            `Song version: ${displayVersion}`,
            `Generated at: ${generatedAt}`,
            '',
            'Purpose:',
            'Use this pack to promote the finished song/video across YouTube, Shorts, Reels, TikTok, Facebook, Instagram, and release posts.',
            '',
            'YouTube description draft:',
            [
              `${displayTitle} is an original MPJ song brought to life with a cinematic OpenArt video treatment.`,
              '',
              'This version focuses on emotional storytelling, acoustic singer-songwriter performance, and a grounded British folk/country/cinematic visual identity.',
              '',
              `Video concept: ${videoConcept || 'A cinematic acoustic music video built around emotional realism and singer-songwriter performance.'}`,
              '',
              'Created as part of the MPJ music workflow using Suno for song production and OpenArt for visual storytelling.',
            ].join('\n'),
            '',
            'Short social caption:',
            `${displayTitle} — a cinematic acoustic MPJ song brought to life with OpenArt visuals. Honest, heartfelt, and built around the story in the lyric.`,
            '',
            'Teaser caption:',
            `A first look at the video world for ${displayTitle}.`,
            '',
            'Hashtags:',
            '#MPJ #OriginalSong #SingerSongwriter #AcousticMusic #FolkCountry #MusicVideo #OpenArt #AIMusicVideo #BritishSongwriter #NewMusic',
            '',
            'Thumbnail / cover-frame direction:',
            [
              'Create a strong cinematic thumbnail frame with the MPJ performer as the emotional focal point.',
              'The image should read clearly at small size, with strong lighting, natural realism, and no text.',
              'Use a square 1:1 version for cover art and a 16:9 version for YouTube thumbnail framing.',
            ].join('\n'),
            '',
            'MPJ character consistency:',
            characterPrompt || 'British male singer-songwriter, low baritone performer, acoustic folk/country/cinematic identity, emotionally grounded and natural.',
            '',
            'Global visual style:',
            globalStyle || 'Cinematic acoustic singer-songwriter visuals, natural lighting, emotional realism, warm filmic tones, atmospheric depth.',
            '',
            'Master OpenArt prompt reference:',
            masterOpenArtPrompt || 'Create a cinematic, emotionally expressive music-video still or scene with a grounded British singer-songwriter feel.',
            '',
            'Negative prompt:',
            negativePrompt || 'text, captions, typography, logos, watermark, distorted face, extra fingers, extra limbs, plastic skin, cartoonish, overprocessed, blurry, low quality',
          ].join('\n')
        }



    function buildLyricsVisualBeatPack({
      songTitle,
      songVersionTitle,
      generatedAt,
      lyrics,
      videoConcept,
      globalStyle,
    }: {
      songTitle: string
      songVersionTitle: string
      generatedAt: string
      lyrics: string
      videoConcept: string
      globalStyle: string
    }) {
      const visualSections = splitLyricsIntoVisualSections(lyrics)

      return [
        'OPENART LYRICS-TO-VISUAL BEAT SHEET:',
        `Song title: ${songTitle || 'Untitled song'}`,
        `Song version: ${songVersionTitle || 'Untitled version'}`,
        `Generated at: ${generatedAt}`,
        '',
        'Purpose:',
        'Use this as a scene-planning guide for turning the saved song lyrics into OpenArt video scenes, storyboard frames, image-to-video prompts, and lip-sync moments.',
        '',
        'Video concept:',
        videoConcept || 'Emotionally grounded cinematic music video concept with a strong singer-songwriter identity.',
        '',
        'Global visual style:',
        globalStyle || 'Cinematic acoustic singer-songwriter visuals, natural lighting, emotional realism, warm filmic tones, atmospheric depth.',
        '',
        'Visual pacing rules:',
        [
          'Each lyric section should become one clear visual beat or short scene.',
          'Keep the MPJ performer visually consistent across all sections.',
          'Use emotional symbolism, setting, lighting, and performance detail rather than literal illustration of every line.',
          'Let verses feel intimate and observational.',
          'Let choruses feel wider, stronger, and more emotionally open.',
          'Use gentle cinematic camera movement suitable for OpenArt image-to-video.',
          'Avoid text overlays, captions, logos, and typography.',
        ].join('\n'),
        '',
        'Lyrics-to-visual section map:',
        visualSections.join('\n\n---\n\n'),
      ].join('\n')
    }


   function buildCoverImagePromptPack({
      songTitle,
      songVersionTitle,
      generatedAt,
      videoConcept,
      globalStyle,
      characterPrompt,
      masterOpenArtPrompt,
      negativePrompt,
    }: {
      songTitle: string
      songVersionTitle: string
      generatedAt: string
      videoConcept: string
      globalStyle: string
      characterPrompt: string
      masterOpenArtPrompt: string
      negativePrompt: string
    }) {
      return [
        'OPENART COVER IMAGE PROMPT:',
        `Song title: ${songTitle || 'Untitled song'}`,
        `Song version: ${songVersionTitle || 'Untitled version'}`,
        `Generated at: ${generatedAt}`,
        '',
        'Purpose:',
        'Create a still cover image / hero frame for the music video before image-to-video animation.',
        '',
        'Cover image direction:',
        'A cinematic square cover-art image, suitable for a song release thumbnail, OpenArt image generation, and a first frame for image-to-video. The image should feel emotionally immediate, musical, atmospheric, and visually strong at small thumbnail size.',
        '',
        'Composition:',
        'Square 1:1 cover-art composition. Strong central subject. Clear emotional focal point. Cinematic lighting. Shallow depth of field. No text, no logos, no typography, no watermark.',
        '',
        'Optional portrait version:',
        'Also suitable as a 9:16 vertical hero frame for short-form teaser video, keeping the same subject, mood, lighting, clothing, and environment.',
        '',
        'MPJ character consistency:',
        characterPrompt || 'British male singer-songwriter, low baritone performer, acoustic folk/country/cinematic identity, emotionally grounded and natural.',
        '',
        'Video concept:',
        videoConcept || 'Emotionally grounded cinematic music video concept with a strong singer-songwriter identity.',
        '',
        'Global visual style:',
        globalStyle || 'Cinematic acoustic singer-songwriter visuals, natural lighting, emotional realism, warm filmic tones, atmospheric depth.',
        '',
        'Master OpenArt direction:',
        masterOpenArtPrompt || 'Create a cinematic, emotionally expressive music-video still image with a grounded British singer-songwriter feel.',
        '',
        'Image-generation prompt:',
        [
          characterPrompt || 'British male singer-songwriter performer',
          videoConcept || 'emotional cinematic music video atmosphere',
          globalStyle || 'warm cinematic acoustic folk-country visual style',
          'square album-cover composition',
          'hero frame for image-to-video',
          'natural expressive face',
          'cinematic lighting',
          'high-detail realistic image',
          'emotional storytelling',
          'no text',
          'no logos',
        ].join(', '),
        '',
        'Negative prompt:',
        negativePrompt || 'text, captions, typography, logos, watermark, distorted face, extra fingers, extra limbs, plastic skin, cartoonish, overprocessed, blurry, low quality',
      ].join('\n')
    }

    function buildCharacterConsistencyPromptPack({
            songTitle,
            songVersionTitle,
            generatedAt,
            characterPrompt,
            globalStyle,
            negativePrompt,
        }: {
            songTitle: string
            songVersionTitle: string
            generatedAt: string
            characterPrompt: string
            globalStyle: string
            negativePrompt: string
        }) {
            return [
            'OPENART MPJ CHARACTER CONSISTENCY PROMPT:',
            `Song title: ${songTitle || 'Untitled song'}`,
            `Song version: ${songVersionTitle || 'Untitled version'}`,
            `Generated at: ${generatedAt}`,
            '',
            'Purpose:',
            'Use this prompt to keep the main MPJ performer visually consistent across OpenArt images, video scenes, lip-sync clips, and image-to-video generations.',
            '',
            'Core character identity:',
            'MPJ is a British male singer-songwriter and acoustic performer with a natural, grounded presence. He has the emotional feel of a low baritone storyteller, combining folk, country, and cinematic acoustic influences. He should feel real, mature, expressive, and believable rather than glossy or artificial.',
            '',
            'Character prompt:',
            characterPrompt || 'British male singer-songwriter, low baritone performer, acoustic folk/country/cinematic identity, emotionally grounded and natural.',
            '',
            'Visual continuity rules:',
            [
                'Keep the same face, age, build, hair style, and general facial character across every scene.',
                'Keep clothing consistent unless a scene specifically requires a change.',
                'Use natural facial expressions with subtle emotional variation.',
                'Avoid making the performer look like a different person between shots.',
                'Avoid exaggerated fashion styling, celebrity glamour, or fantasy-costume changes.',
                'Preserve a believable UK singer-songwriter feel.',
            ].join('\n'),
            '',
            'Performance continuity:',
            [
                'The performer should look comfortable with an acoustic guitar and microphone.',
                'Body language should be intimate, heartfelt, and musically focused.',
                'For lip-sync scenes, keep mouth movement natural and emotionally connected to the lyric.',
                'For image-to-video scenes, use gentle cinematic movement rather than dramatic action.',
            ].join('\n'),
            '',
            'Global visual style:',
            globalStyle || 'Cinematic acoustic singer-songwriter visuals, natural lighting, emotional realism, warm filmic tones, atmospheric depth.',
            '',
            'Reusable character prompt for OpenArt:',
            [
                characterPrompt || 'British male singer-songwriter acoustic performer',
                'consistent face across all scenes',
                'natural realistic human features',
                'mature grounded emotional expression',
                'authentic UK singer-songwriter identity',
                'acoustic folk country cinematic style',
                'subtle performance presence',
                'realistic skin texture',
                'cinematic natural lighting',
                'no text',
                'no logos',
            ].join(', '),
            '',
            'Negative prompt:',
            negativePrompt || 'text, captions, typography, logos, watermark, distorted face, inconsistent face, different person, extra fingers, extra limbs, plastic skin, cartoonish, overprocessed, blurry, low quality',
            ].join('\n')
        }

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

  function buildFullOpenArtCreativeBundlePack({
      songTitle,
      songVersionTitle,
      generatedAt,
      lyrics,
      videoConcept,
      globalStyle,
      characterPrompt,
      masterOpenArtPrompt,
      negativePrompt,
    }: {
      songTitle: string
      songVersionTitle: string
      generatedAt: string
      lyrics: string
      videoConcept: string
      globalStyle: string
      characterPrompt: string
      masterOpenArtPrompt: string
      negativePrompt: string
    }) {
      return [
        'FULL OPENART CREATIVE BUNDLE:',
        `Song title: ${songTitle || 'Untitled song'}`,
        `Song version: ${songVersionTitle || 'Untitled version'}`,
        `Generated at: ${generatedAt}`,
        '',
        'This bundle combines the main OpenArt creative workflow outputs for cover art, character consistency, lyric-to-visual mapping, production planning, and release promotion.',
        '',
        '============================================================',
        '',
        buildCoverImagePromptPack({
          songTitle,
          songVersionTitle,
          generatedAt,
          videoConcept,
          globalStyle,
          characterPrompt,
          masterOpenArtPrompt,
          negativePrompt,
        }),
        '',
        '============================================================',
        '',
        buildCharacterConsistencyPromptPack({
          songTitle,
          songVersionTitle,
          generatedAt,
          characterPrompt,
          globalStyle,
          negativePrompt,
        }),
        '',
        '============================================================',
        '',
        buildLyricsVisualBeatPack({
          songTitle,
          songVersionTitle,
          generatedAt,
          lyrics,
          videoConcept,
          globalStyle,
        }),
        '',
        '============================================================',
        '',
        buildOpenArtProductionChecklistPack({
          songTitle,
          songVersionTitle,
          generatedAt,
          videoConcept,
          globalStyle,
        }),
        '',
        '============================================================',
        '',
        buildOpenArtReleasePromoPack({
          songTitle,
          songVersionTitle,
          generatedAt,
          videoConcept,
          globalStyle,
          characterPrompt,
          masterOpenArtPrompt,
          negativePrompt,
        }),
      ].join('\n')
    }

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

  const [videoPromptStatus, setVideoPromptStatus] = useState('')


  const videoPromptStorageKey = songVersionId
    ? `video-prompts:${songVersionId}`
    : ''





const videoCopyButtonClass =
  'rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40'
 
  


  const workflowPackButtonClass = videoCopyButtonClass

  const [justCopiedField, setJustCopiedField] = useState('')
  const [justCopiedIndex, setJustCopiedIndex] = useState<number | null>(null)



  useEffect(() => {
      setJustCopiedField('')
      setJustCopiedIndex(null)
      setVideoPromptStatus('')
    }, [songVersionId])



  useEffect(() => {
      if (!videoPromptStorageKey) {
        setResults([])
        setVideoGeneratedAt('')
        return
      }

      const saved = window.sessionStorage.getItem(videoPromptStorageKey)

      if (!saved) {
        setResults([])
        setVideoGeneratedAt('')
        return
      }

      try {
        const parsed = JSON.parse(saved) as {
          results?: VideoResult[]
          videoGeneratedAt?: string
        }

        if (Array.isArray(parsed.results)) {
          setResults(parsed.results)

          if (parsed.results.length > 0) {
            setVideoPromptStatus('Restored generated video prompts from this browser session.')
          }
        } else {
          setResults([])
        }

        if (typeof parsed.videoGeneratedAt === 'string') {
          setVideoGeneratedAt(parsed.videoGeneratedAt)
        } else {
          setVideoGeneratedAt('')
        }
      } catch {
        window.sessionStorage.removeItem(videoPromptStorageKey)
        setResults([])
        setVideoGeneratedAt('')
      }
    }, [videoPromptStorageKey])



    useEffect(() => {
      if (!videoPromptStorageKey) {
        return
      }

      if (results.length === 0 && !videoGeneratedAt) {
        return
      }

      window.sessionStorage.setItem(
        videoPromptStorageKey,
        JSON.stringify({
          results,
          videoGeneratedAt,
        }),
      )
    }, [results, videoGeneratedAt, videoPromptStorageKey])




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

          const hadExistingResults = results.length > 0
      const generatedAt = new Date().toLocaleString()

      if (Array.isArray(data.versions)) {
        setResults(data.versions)
      } else {
        setResults([data])
      }

      setVideoGeneratedAt(generatedAt)
      setMessage(`Video prompts generated at ${generatedAt}.`)
      setVideoPromptStatus(
        hadExistingResults
          ? 'Regenerated video prompts and replaced the previous output.'
          : 'Generated new video prompts.',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate video prompts.')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateVideoPromptsClick = () => {
    if (results.length > 0) {
      const confirmed = window.confirm(
        'Regenerate video prompts? This will replace the current generated video prompt output.',
      )

      if (!confirmed) {
        return
      }
    }

    generateVideoPrompts()
  }


  const clearGeneratedVideoPrompts = () => {
      setResults([])
      setVideoGeneratedAt('')
      setJustCopiedField('')
      setJustCopiedIndex(null)

      if (videoPromptStorageKey) {
        window.sessionStorage.removeItem(videoPromptStorageKey)
      }

      setVideoPromptStatus('Cleared generated video prompts.')
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

        <div className="mt-3 rounded border border-gray-700 bg-gray-900/70 px-3 py-2 text-xs text-gray-300">
          {hasSavedSongVersion ? (
            <span>
              Video prompts are linked to this saved song version and will be restored during this browser session.
            </span>
          ) : (
            <span className="text-amber-300">
              Save or load a song version before generating video prompts. This keeps copied prompts tied to the correct song and version.
            </span>
          )}
        </div>

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
          onClick={handleGenerateVideoPromptsClick}
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
              : results.length > 0
                ? 'Regenerate video prompts'
                : 'Generate video prompts'}
                </button>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(
              buildVideoPromptSessionSummary({
                songTitle,
                songVersionTitle,
                generatedAt: videoGeneratedAt,
                status: videoPromptStatus,
                resultCount: results.length,
                hasSavedSongVersion,
              }),
            )
            setJustCopiedField('videoPromptSessionSummary')
            window.setTimeout(() => setJustCopiedField(''), 1500)
          }}
          className={workflowPackButtonClass}
        >
          {justCopiedField === 'videoPromptSessionSummary'
            ? 'Copied ✓'
            : 'Copy video prompt session summary'}
        </button>

        <button
          type="button"
          onClick={clearGeneratedVideoPrompts}
          disabled={results.length === 0 && !videoGeneratedAt}
          className={workflowPackButtonClass}
        >
          Clear generated video prompts
        </button>
        

      </div>

     {videoPromptStatus && (
          <p className="mt-2 text-xs text-slate-400">
            {videoPromptStatus}
          </p>
        )}

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

                <button
                  type="button"
                  onClick={() => {
                    const fieldKey = getVideoFieldKey(result, index, 'storyboard')

                    navigator.clipboard.writeText(
                      buildStoryboardPack(
                        result,
                        songTitle,
                        songVersionTitle,
                        videoGeneratedAt
                      )
                    )

                    setJustCopiedField(fieldKey)

                    window.setTimeout(() => {
                      setJustCopiedField('')
                    }, 1800)
                  }}
                  className="rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                >
                  {justCopiedField === getVideoFieldKey(result, index, 'storyboard')
                    ? 'Storyboard copied ✓'
                    : 'Copy storyboard'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fieldKey = getVideoFieldKey(result, index, 'social-teaser')

                    navigator.clipboard.writeText(
                      buildSocialTeaserPack(
                        result,
                        songTitle,
                        songVersionTitle,
                        videoGeneratedAt
                      )
                    )

                    setJustCopiedField(fieldKey)

                    window.setTimeout(() => {
                      setJustCopiedField('')
                    }, 1800)
                  }}
                  className="rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                >
                  {justCopiedField === getVideoFieldKey(result, index, 'social-teaser')
                    ? 'Social teaser copied ✓'
                    : 'Copy social teaser'}
                </button>


        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
            <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-100">
                OpenArt workflow packs
            </h4>
            <p className="mt-1 text-xs text-slate-400">
                Copy reusable packs for cover art, character consistency, visual planning, production, and release promotion.
            </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">


                <button
                  type="button"
                  className={workflowPackButtonClass}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      buildCoverImagePromptPack({
                          songTitle,
                          songVersionTitle,
                          generatedAt: videoGeneratedAt,
                          videoConcept: result.video_concept,
                          globalStyle: result.global_style,
                          characterPrompt: result.character_prompt,
                          masterOpenArtPrompt:  buildMasterPrompt(result),
                          negativePrompt: openArtNegativePrompt,
                        }),
                    )
                    setJustCopiedField('coverImagePrompt')
                        window.setTimeout(() => setJustCopiedField(''), 1500)
                     }}
                  disabled={!canGenerateVideoPrompts}
                >
                  {justCopiedField === 'coverImagePrompt' ? 'Copied ✓' : 'Copy cover image prompt'}
                </button>

                <button
                  type="button"
                  className={workflowPackButtonClass}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      buildCharacterConsistencyPromptPack({
                        songTitle,
                        songVersionTitle,
                        generatedAt: videoGeneratedAt,
                        characterPrompt: result.character_prompt,
                        globalStyle: result.global_style,
                        negativePrompt: openArtNegativePrompt,
                      }),
                    )
                    setJustCopiedField('characterConsistencyPrompt')
                    window.setTimeout(() => setJustCopiedField(''), 1500)
                  }}
                  disabled={!canGenerateVideoPrompts}
                >
                  {justCopiedField === 'characterConsistencyPrompt'
                    ? 'Copied ✓'
                    : 'Copy MPJ character consistency prompt'}
                </button>

                <button
                  type="button"
                  className={workflowPackButtonClass}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      buildLyricsVisualBeatPack({
                        songTitle,
                        songVersionTitle,
                        generatedAt: videoGeneratedAt,
                        lyrics,
                        videoConcept: result.video_concept,
                        globalStyle: result.global_style,
                      }),
                    )
                    setJustCopiedField('lyricsVisualBeatSheet')
                    window.setTimeout(() => setJustCopiedField(''), 1500)
                  }}
                  disabled={!canGenerateVideoPrompts}
                >
                  {justCopiedField === 'lyricsVisualBeatSheet'
                    ? 'Copied ✓'
                    : 'Copy lyrics-to-visual beat sheet'}
            </button>

            

            <button
              type="button"
              className={workflowPackButtonClass}
              onClick={() => {
                navigator.clipboard.writeText(
                  buildOpenArtReleasePromoPack({
                    songTitle,
                    songVersionTitle,
                    generatedAt: videoGeneratedAt,
                    videoConcept: result.video_concept,
                    globalStyle: result.global_style,
                    characterPrompt: result.character_prompt,
                    masterOpenArtPrompt: buildMasterPrompt(result),
                    negativePrompt: openArtNegativePrompt,
                  }),
                )
                setJustCopiedField('openArtReleasePromoPack')
                window.setTimeout(() => setJustCopiedField(''), 1500)
              }}
              disabled={!canGenerateVideoPrompts}
            >
              {justCopiedField === 'openArtReleasePromoPack'
                ? 'Copied ✓'
                : 'Copy OpenArt release promo pack'}
            </button>

            <button
              type="button"
              className={workflowPackButtonClass}
              onClick={() => {
                navigator.clipboard.writeText(
                  buildOpenArtProductionChecklistPack({
                    songTitle,
                    songVersionTitle,
                    generatedAt: videoGeneratedAt,
                    videoConcept: result.video_concept,
                    globalStyle: result.global_style,
                  }),
                )
                setJustCopiedField('openArtProductionChecklist')
                window.setTimeout(() => setJustCopiedField(''), 1500)
              }}
              disabled={!canGenerateVideoPrompts}
            >
              {justCopiedField === 'openArtProductionChecklist'
                ? 'Copied ✓'
                : 'Copy OpenArt production checklist'}
            </button>

            <button
              type="button"
              className={workflowPackButtonClass}
              onClick={() => {
                navigator.clipboard.writeText(
                  buildFullOpenArtCreativeBundlePack({
                    songTitle,
                    songVersionTitle,
                    generatedAt: videoGeneratedAt,
                    lyrics,
                    videoConcept: result.video_concept,
                    globalStyle: result.global_style,
                    characterPrompt: result.character_prompt,
                    masterOpenArtPrompt: buildMasterPrompt(result),
                    negativePrompt: openArtNegativePrompt,
                  }),
                )
                setJustCopiedField('fullOpenArtCreativeBundle')
                window.setTimeout(() => setJustCopiedField(''), 1500)
              }}
              disabled={!canGenerateVideoPrompts}
            >
              {justCopiedField === 'fullOpenArtCreativeBundle'
                ? 'Copied ✓'
                : 'Copy full OpenArt creative bundle'}
            </button>

              </div>
        </div>

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
                  <button
                    type="button"
                    onClick={() =>
                      copyVideoField(
                        'VIDEO CONCEPT:',
                        result.video_concept,
                        getVideoFieldKey(result, index, 'video-concept')
                      )
                    }
                    className="mt-2 rounded border border-purple-700 px-3 py-1.5 text-sm text-purple-200 hover:bg-purple-950/40"
                  >
                    {justCopiedField === getVideoFieldKey(result, index, 'video-concept')
                      ? 'Video concept copied ✓'
                      : 'Copy video concept'}
                  </button>
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