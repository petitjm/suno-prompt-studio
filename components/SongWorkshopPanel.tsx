'use client'

import { useEffect, useRef, useState } from 'react'

type SongWorkshopPanelProps = {
  lyrics: string
  songTitle: string
  songVersionTitle: string
  onUseDraft?: (draft: string) => void
  onSendDraftToCompare?: (draft: string, label?: string) => void
  onEditLyrics?: () => void
}

type AnalysisResult = {
    generatedAt?: string
  coreTheme?: string
  emotionalCentre?: string
  fragmentConnection?: string
  mainWeakness?: string
  controlNotes?: string[]
  modelPrompt?: string
  suggestedShape?: string[]
  nextStep?: string
}

type DraftResult = {
    generatedAt?: string
  title?: string
  versionTitle?: string
  lyric?: string
  whatWasKept?: string[]
  workshopControlNotes?: string[]
  whatChanged?: string[]
  nextStep?: string
  analysisContext?: AnalysisResult | null
  modelPrompt?: string
}



export default function SongWorkshopPanel({
  lyrics,
  songTitle,
  songVersionTitle,
  onUseDraft,
  onSendDraftToCompare,
  onEditLyrics,
}: SongWorkshopPanelProps) {
  const [showFullSourceLyrics, setShowFullSourceLyrics] = useState(false)
  const [workshopNotes, setWorkshopNotes] = useState('')

  const [developmentFocus, setDevelopmentFocus] = useState('connect-fragments')
  const [changeIntensity, setChangeIntensity] = useState(3)
  const [preserveOriginal, setPreserveOriginal] = useState(4)
  const [emotionalDirectness, setEmotionalDirectness] = useState(3)
  const [singability, setSingability] = useState(4)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [justCopiedAnalysis, setJustCopiedAnalysis] = useState(false)
  const [justCopiedAnalysisPrompt, setJustCopiedAnalysisPrompt] = useState(false)
  const [justCopiedDraftPrompt, setJustCopiedDraftPrompt] = useState(false)
  const [justCopiedWorkshopPacket, setJustCopiedWorkshopPacket] = useState(false)
  const [justCopiedDraftLyricOnly, setJustCopiedDraftLyricOnly] = useState(false)
  const [justCopiedStatusSummary, setJustCopiedStatusSummary] = useState(false)
  const [lastWorkshopAction, setLastWorkshopAction] = useState('')
  const [workshopActionHistory, setWorkshopActionHistory] = useState<string[]>([])

  const [runningFullWorkshop, setRunningFullWorkshop] = useState(false)

  const [drafting, setDrafting] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null)
  const [justCopiedDraft, setJustCopiedDraft] = useState(false)
  const [justCopiedPromptPack, setJustCopiedPromptPack] = useState(false)

  const skipNextLyricsClearRef = useRef(false)

  const hasLyrics = lyrics.trim().length > 0
  const trimmedLyrics = lyrics.trim()

  const sourceLyricsPreview =
    hasLyrics && !showFullSourceLyrics
      ? trimmedLyrics.slice(0, 700)
      : trimmedLyrics

  const sourceLyricsIsTruncated =
    hasLyrics && trimmedLyrics.length > sourceLyricsPreview.length

  const workshopControls = {
    developmentFocus,
    changeIntensity,
    preserveOriginal,
    emotionalDirectness,
    singability,
  }

  const clearWorkshopOutput = () => {
      setAnalysisMessage('')
      setAnalysisResult(null)
      setDraftMessage('')
      setDraftResult(null)
      setJustCopiedAnalysisPrompt(false)
      setJustCopiedDraftPrompt(false)
      setJustCopiedDraft(false)
      setJustCopiedAnalysis(false)
      setRunningFullWorkshop(false)
      setLastWorkshopAction('')
      setWorkshopActionHistory([])
    }


  useEffect(() => {
      setShowFullSourceLyrics(false)

      if (skipNextLyricsClearRef.current) {
        skipNextLyricsClearRef.current = false
        return
      }

      clearWorkshopOutput()
    }, [lyrics])

    useEffect(() => {
      clearWorkshopOutput()
    }, [
      workshopNotes,
      developmentFocus,
      changeIntensity,
      preserveOriginal,
      emotionalDirectness,
      singability,
      ])


  const renderWorkshopSlider = ({
    label,
    leftLabel,
    rightLabel,
    value,
    onChange,
  }: {
    label: string
    leftLabel: string
    rightLabel: string
    value: number
    onChange: (value: number) => void
  }) => (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="rounded border border-gray-700 bg-gray-950 px-2 py-0.5 text-xs text-gray-400">
          {value}/5
        </span>
      </div>

      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />

      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </label>
  )

  const recordWorkshopAction = (action: string) => {
      setLastWorkshopAction(action)

      setWorkshopActionHistory((current) => [
        action,
        ...current.filter((item) => item !== action),
      ].slice(0, 5))
    }

  const analyzeSongIdea = async () => {
    if (!hasLyrics) {
      setAnalysisMessage('Add lyrics or fragments before analysing the song idea.')
      return null
    }
    
    try {
        recordWorkshopAction('Analyze song idea')
      setAnalyzing(true)
      setAnalysisMessage('Analysing song idea...')
      setAnalysisResult(null)

      const response = await fetch('/api/song-workshop/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lyrics,
          songTitle,
          songVersionTitle,
          workshopNotes,
          workshopControls,
        }),
      })

      const responseText = await response.text()

      let data: {
        error?: string
        analysis?: AnalysisResult
      } = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        throw new Error(
          `Song Workshop API did not return JSON. Status: ${response.status}`,
        )
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyse song idea.')
      }

      setAnalysisResult(data.analysis || null)
      return data.analysis as AnalysisResult
      setAnalysisMessage('Song idea analysis complete.')
    } catch (error) {
      setAnalysisMessage(
        error instanceof Error
          ? error.message
          : 'Failed to analyse song idea.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const createCohesiveDraft = async (
      analysisOverride?: AnalysisResult | null,
      source: 'manual' | 'full-workshop' = 'manual',
    ) => {
    if (!hasLyrics) {
      setDraftMessage('Add lyrics or fragments before creating a cohesive draft.')
      return
    }

    try {
        if (source === 'full-workshop') {
              recordWorkshopAction('Analyze + draft')
            } else {
              recordWorkshopAction(
                analysisOverride
                  ? 'Create cohesive draft using fresh analysis'
                  : analysisResult
                    ? 'Create cohesive draft using existing analysis'
                    : 'Create cohesive draft without analysis',
              )
            }

      setDrafting(true)
      setDraftMessage('Creating cohesive draft...')
      setDraftResult(null)

      const response = await fetch('/api/song-workshop/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
       body: JSON.stringify({
          lyrics,
          songTitle,
          songVersionTitle,
          workshopNotes,
          workshopControls,
          analysisResult: analysisOverride ?? analysisResult,
        }),
      })

      const responseText = await response.text()

      let data: {
        error?: string
        draft?: DraftResult
      } = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        throw new Error(
          `Song Workshop draft API did not return JSON. Status: ${response.status}`,
        )
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create cohesive draft.')
      }

      setDraftResult(data.draft || null)
      setDraftMessage('Cohesive draft created.')
    } catch (error) {
      setDraftMessage(
        error instanceof Error
          ? error.message
          : 'Failed to create cohesive draft.',
      )
    } finally {
      setDrafting(false)
    }
  }

  const formatGeneratedAt = (value?: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString()
}

const getDraftAnalysisStatus = (draft: DraftResult) => {
  if (!draft.analysisContext) {
    return 'Draft created without a prior analysis pass.'
  }

  const generatedAt = formatGeneratedAt(draft.analysisContext.generatedAt)

  if (!generatedAt) {
    return 'Draft created using the current Song Workshop analysis.'
  }

  return `Draft created using analysis generated at: ${generatedAt}`
}


const getDraftSourceBadge = (draft: DraftResult) => {
  const action = getWorkshopActionCopyLabel()

  if (action === 'Analyze + draft') {
    return 'Analyze + draft'
  }

  if (!draft.analysisContext) {
    return 'No analysis'
  }

  return 'Used analysis'
}


const clearWorkshopResultsManually = () => {
  clearWorkshopOutput()
  setShowFullSourceLyrics(false)
}




const getWorkshopStatusSummary = () => {
  const analysisStatus = analyzing
    ? 'Analysis is running...'
    : analysisResult?.generatedAt
      ? `Analysis generated at ${formatGeneratedAt(analysisResult.generatedAt)}`
      : 'No analysis generated'

  const draftStatus = drafting
    ? 'Draft is running...'
    : draftResult?.generatedAt
      ? `Draft generated at ${formatGeneratedAt(draftResult.generatedAt)}`
      : 'No draft generated'

  const draftSourceStatus = runningFullWorkshop
    ? 'Running full workshop pass: analysis first, then draft.'
    : draftResult
      ? getDraftAnalysisStatus(draftResult)
      : 'No draft source yet'

  return {
    analysisStatus,
    draftStatus,
    draftSourceStatus,
  }
}

const getCurrentWorkshopPassType = () => {
  if (analysisResult && draftResult) {
    return 'Analysis + draft'
  }

  if (analysisResult) {
    return 'Analysis only'
  }

  if (draftResult) {
    return 'Draft only'
  }

  return 'Empty'
}

const getCurrentWorkshopPassDescription = () => {
  if (analysisResult && draftResult) {
    return draftResult.analysisContext
      ? 'This pass contains an analysis and a draft created from analysis context.'
      : 'This pass contains an analysis and a draft, but the draft was not created from analysis context.'
  }

  if (analysisResult) {
    return 'This pass contains analysis only. Create a draft to complete the workshop pass.'
  }

  if (draftResult) {
    return draftResult.analysisContext
      ? 'This pass contains a draft created from analysis context.'
      : 'This pass contains a draft created without a prior analysis pass.'
  }

  return 'No workshop results yet.'
}



const getWorkshopActionCopyLabel = () => {
  return lastWorkshopAction || 'None recorded'
}


const workshopStatusSummary = getWorkshopStatusSummary()


const buildWorkshopPromptPackCopyText = () => {
  const analysisPrompt = analysisResult?.modelPrompt || ''
  const draftPrompt = draftResult?.modelPrompt || ''

  if (!analysisPrompt && !draftPrompt) {
    return ''
  }

  return [
  'SONG WORKSHOP PROMPT PACK',
  '',
  `Project: ${songTitle || 'Untitled project'}`,
  `Song version: ${songVersionTitle || 'Unsaved or untitled version'}`,
  `Workshop action: ${getWorkshopActionCopyLabel()}`,
  '',
  'Use this pack by copying one prompt section at a time.',
  '',
  '============================================================',
  'START ANALYSIS MODEL PROMPT',
  '============================================================',
  '',
  analysisPrompt || 'No analysis model prompt available.',
  '',
  '============================================================',
  'END ANALYSIS MODEL PROMPT',
  '============================================================',
  '',
  '',
  '============================================================',
  'START DRAFT MODEL PROMPT',
  '============================================================',
  '',
  draftPrompt || 'No draft model prompt available.',
  '',
  '============================================================',
  'END DRAFT MODEL PROMPT',
  '============================================================',
].join('\n')
}


const buildWorkshopStatusCopyText = () => {
      const status = getWorkshopStatusSummary()

      return [
        'SONG WORKSHOP STATUS',
        '',
        `Project: ${songTitle || 'Untitled project'}`,
        `Song version: ${songVersionTitle || 'Unsaved or untitled version'}`,
        `Last action: ${lastWorkshopAction || 'None yet'}`,
        `Current pass: ${getCurrentWorkshopPassType()}`,
        `Current pass detail: ${getCurrentWorkshopPassDescription()}`,
        '',
        status.analysisStatus,
        status.draftStatus,
        status.draftSourceStatus,
        '',
        'Recent actions:',
        ...(workshopActionHistory.length > 0
          ? workshopActionHistory.map((action) => `- ${action}`)
          : ['No recent actions recorded.']),
      ].join('\n')
    }



  const buildWorkshopPacketCopyText = () => {
      if (!analysisResult && !draftResult) {
        return ''
      }

        return [
          'SONG WORKSHOP PACKET',
          '',
          `Project: ${songTitle || 'Untitled project'}`,
            `Song version: ${songVersionTitle || 'Unsaved or untitled version'}`,
            `Workshop action: ${getWorkshopActionCopyLabel()}`,
            `Current pass: ${getCurrentWorkshopPassType()}`,
            `Current pass detail: ${getCurrentWorkshopPassDescription()}`,
        '',
        'Workshop controls:',
        `- Development focus: ${getDevelopmentFocusCopyLabel(developmentFocus)}`,
        `- Change intensity: ${changeIntensity}/5`,
        `- Preserve original phrases: ${preserveOriginal}/5`,
        `- Emotional directness: ${emotionalDirectness}/5`,
        `- Singability: ${singability}/5`,
        '',
        'Workshop notes:',
            workshopNotes || 'No workshop notes provided.',
            '',
            'SOURCE LYRICS / FRAGMENTS',
            '',
            lyrics || 'No source lyrics provided.',
            '',
            analysisResult
          ? [
              'ANALYSIS',
              '',
              analysisResult.generatedAt
              ? `Generated at: ${formatGeneratedAt(analysisResult.generatedAt)}`
              : '',
            '',
              'Core theme:',
              analysisResult.coreTheme || '',
              '',
              'Emotional centre:',
              analysisResult.emotionalCentre || '',
              '',
              'How the fragments connect:',
              analysisResult.fragmentConnection || '',
              '',
              'Main weakness:',
              analysisResult.mainWeakness || '',
              '',
              'Suggested song shape:',
              ...(analysisResult.suggestedShape || []).map((item) => `- ${item}`),
              '',
              'Analysis next step:',
              analysisResult.nextStep || '',
            ].join('\n')
          : 'ANALYSIS\n\nNo analysis created in this pass.',
        '',
        draftResult
          ? [
              'COHESIVE DRAFT',
              '',
              draftResult.generatedAt
                  ? `Generated at: ${formatGeneratedAt(draftResult.generatedAt)}`
                  : '',
                '',
                getDraftAnalysisStatus(draftResult),
                '',
              draftResult.lyric || '',
              '',
              'What was kept:',
              ...(draftResult.whatWasKept || []).map((item) => `- ${item}`),
              '',
              'Workshop control notes:',
              ...(draftResult.workshopControlNotes || []).map((item) => `- ${item}`),
              '',
              'What changed:',
              ...(draftResult.whatChanged || []).map((item) => `- ${item}`),
              '',
              'Draft next step:',
              draftResult.nextStep || '',
            ].join('\n')
          : 'COHESIVE DRAFT\n\nNo draft created in this pass.',
      ].join('\n')
    }

    const getDevelopmentFocusCopyLabel = (value: string) => {
      switch (value) {
        case 'connect-fragments':
          return 'Connect disconnected fragments into one coherent song'
        case 'strengthen-chorus':
          return 'Strengthen the chorus and central hook'
        case 'tighten-structure':
          return 'Tighten the song structure and section flow'
        case 'increase-emotion':
          return 'Increase emotional impact and directness'
        case 'improve-singability':
          return 'Improve singability, phrasing, and performance flow'
        default:
          return 'Connect disconnected fragments into one coherent song'
      }
    }


    const normaliseWorkshopControlNote = (note: string) => {
      if (!note.startsWith('Development focus:')) {
        return note
      }

      return `Development focus: ${getDevelopmentFocusCopyLabel(developmentFocus)}`
    }


  const buildAnalysisCopyText = () => {
    if (!analysisResult) {
      return ''
    }

    return [
      'SONG WORKSHOP ANALYSIS',
        '',
        `Project: ${songTitle || 'Untitled project'}`,
        `Song version: ${songVersionTitle || 'Unsaved or untitled version'}`,
        `Workshop action: ${getWorkshopActionCopyLabel()}`,
        analysisResult.generatedAt
          ? `Generated at: ${formatGeneratedAt(analysisResult.generatedAt)}`
          : '',
      '',
      'Workshop controls:',
      `- Development focus: ${getDevelopmentFocusCopyLabel(developmentFocus)}`,
      `- Change intensity: ${changeIntensity}/5`,
      `- Preserve original phrases: ${preserveOriginal}/5`,
      `- Emotional directness: ${emotionalDirectness}/5`,
      `- Singability: ${singability}/5`,
      '',
        'Workshop notes:',
        workshopNotes || 'No workshop notes provided.',
        '',
        'SOURCE LYRICS / FRAGMENTS',
        '',
        lyrics || 'No source lyrics provided.',
        '',
      'Core theme:',
      analysisResult.coreTheme || '',
      '',
      'Emotional centre:',
      analysisResult.emotionalCentre || '',
      '',
      'How the fragments connect:',
      analysisResult.fragmentConnection || '',
      '',
      'Main weakness:',
      analysisResult.mainWeakness || '',
      '',
      'Suggested song shape:',
      ...(analysisResult.suggestedShape || []).map((item) => `- ${item}`),
      '',
      'Recommended next step:',
      analysisResult.nextStep || '',
    ].join('\n')
  }

  const copyWorkshopStatusSummary = async () => {
      try {
        await navigator.clipboard.writeText(buildWorkshopStatusCopyText())
        setJustCopiedStatusSummary(true)
        setDraftMessage('Workshop status copied.')

        window.setTimeout(() => {
          setJustCopiedStatusSummary(false)
        }, 1500)
      } catch {
        setDraftMessage('Could not copy workshop status.')
      }
    }


    const copyWorkshopPromptPack = async () => {
      const copyText = buildWorkshopPromptPackCopyText()

      if (!copyText) {
        setDraftMessage('Create an analysis or draft before copying a prompt pack.')
        return
      }

      try {
        await navigator.clipboard.writeText(copyText)
        setJustCopiedPromptPack(true)
        setDraftMessage('Workshop prompt pack copied.')

        window.setTimeout(() => {
          setJustCopiedPromptPack(false)
        }, 1500)
      } catch {
        setDraftMessage('Could not copy workshop prompt pack.')
      }
    }


  const copyDraftLyricOnly = async () => {
      if (!draftResult?.lyric) {
        setDraftMessage('Create a cohesive draft before copying the lyric.')
        return
      }

      try {
        await navigator.clipboard.writeText(draftResult.lyric)
        setJustCopiedDraftLyricOnly(true)
        setDraftMessage('Draft lyric copied.')

        window.setTimeout(() => {
          setJustCopiedDraftLyricOnly(false)
        }, 1500)
      } catch {
        setDraftMessage('Could not copy draft lyric.')
      }
    }

    const runFullWorkshopPass = async () => {
      if (!lyrics.trim()) {
        setAnalysisMessage('Add lyrics or fragments before running the workshop pass.')
        return
      }

      setRunningFullWorkshop(true)
      recordWorkshopAction('Analyze + draft')
      setAnalysisMessage('Step 1 of 2: analyzing song idea...')
      setDraftMessage('Waiting for fresh analysis...')

      try {
        const freshAnalysis = await analyzeSongIdea()

        if (!freshAnalysis) {
          setDraftMessage('Draft not created because analysis did not complete.')
          return
        }

        setAnalysisMessage('Step 1 of 2 complete: song idea analyzed.')
        setDraftMessage('Step 2 of 2: creating cohesive draft...')

        recordWorkshopAction('Analyze + draft')
        await createCohesiveDraft(freshAnalysis, 'full-workshop')

        setDraftMessage('Full workshop pass complete: analysis and draft created.')
      } finally {
        setRunningFullWorkshop(false)
      }
    }


const buildDraftCopyText = () => {
  if (!draftResult) {
    return ''
  }

  return [
  'SONG WORKSHOP DRAFT',
  '',
  `Workshop action: ${getWorkshopActionCopyLabel()}`,
    draftResult.generatedAt
      ? `Generated at: ${formatGeneratedAt(draftResult.generatedAt)}`
      : '',
    '',
    getDraftAnalysisStatus(draftResult),
    '',
   `Project: ${songTitle || 'Untitled project'}`,
    `Song version: ${songVersionTitle || 'Unsaved or untitled version'}`,
    '',
    'SOURCE LYRICS / FRAGMENTS',
    '',
    lyrics || 'No source lyrics provided.',
    '',
    'Draft lyric:',
    draftResult.lyric || '',
    '',
    'What was kept:',
    ...(draftResult.whatWasKept || []).map((item) => `- ${item}`),
    '',
    'Workshop control notes:',
    ...(draftResult.workshopControlNotes || []).map((item) => `- ${item}`),
    '',
    'What changed:',
    ...(draftResult.whatChanged || []).map((item) => `- ${item}`),
    '',
    'Recommended next step:',
    draftResult.nextStep || '',
  ].join('\n')
}


  const copyWorkshopPacket = async () => {
      const copyText = buildWorkshopPacketCopyText()

      if (!copyText) {
        setDraftMessage('Create an analysis or draft before copying a workshop packet.')
        return
      }

      try {
        await navigator.clipboard.writeText(copyText)
        setJustCopiedWorkshopPacket(true)
        setDraftMessage('Workshop packet copied.')

        window.setTimeout(() => {
          setJustCopiedWorkshopPacket(false)
        }, 1500)
      } catch {
        setDraftMessage('Could not copy workshop packet.')
      }
    }



  const copyModelPrompt = async ({
      prompt,
      type,
    }: {
      prompt?: string
      type: 'analysis' | 'draft'
    }) => {
      if (!prompt) {
        if (type === 'analysis') {
          setAnalysisMessage('No analysis model prompt available to copy.')
        } else {
          setDraftMessage('No draft model prompt available to copy.')
        }

        return
      }

      try {
        await navigator.clipboard.writeText(prompt)

        if (type === 'analysis') {
          setJustCopiedAnalysisPrompt(true)
          setAnalysisMessage('Analysis model prompt copied.')

          window.setTimeout(() => {
            setJustCopiedAnalysisPrompt(false)
          }, 1500)
        } else {
          setJustCopiedDraftPrompt(true)
          setDraftMessage('Draft model prompt copied.')

          window.setTimeout(() => {
            setJustCopiedDraftPrompt(false)
          }, 1500)
        }
      } catch {
        if (type === 'analysis') {
          setAnalysisMessage('Could not copy analysis model prompt.')
        } else {
          setDraftMessage('Could not copy draft model prompt.')
        }
      }
    }


  const copySongAnalysis = async () => {
    const copyText = buildAnalysisCopyText()

    if (!copyText) {
      setAnalysisMessage('Analyze the song idea before copying.')
      return
    }

    try {
      await navigator.clipboard.writeText(copyText)
      setJustCopiedAnalysis(true)
      setAnalysisMessage('Song analysis copied.')

      window.setTimeout(() => {
        setJustCopiedAnalysis(false)
      }, 1500)
    } catch {
      setAnalysisMessage('Could not copy song analysis.')
    }
  }

  const copyDraft = async () => {
      const copyText = buildDraftCopyText()

      if (!copyText) {
        setDraftMessage('Create a cohesive draft before copying the draft.')
        return
      }

      try {
        await navigator.clipboard.writeText(copyText)
        setJustCopiedDraft(true)
        setDraftMessage('Full draft copied.')

        window.setTimeout(() => {
          setJustCopiedDraft(false)
        }, 1500)
      } catch {
        setDraftMessage('Could not copy draft.')
      }
    }

  const sendDraftToCompare = () => {
      if (!draftResult?.lyric) {
        setDraftMessage('Create a cohesive draft before sending it to compare.')
        return
      }

      if (!onSendDraftToCompare) {
        setDraftMessage('The compare panel is not available for this draft.')
        return
      }

      onSendDraftToCompare(draftResult.lyric)
      setDraftMessage('Cohesive draft sent to compare.')
    }


  const useDraftInEditor = () => {
    if (!draftResult?.lyric) {
      setDraftMessage('Create a cohesive draft before using it in the editor.')
      return
    }

    if (!onUseDraft) {
      setDraftMessage('The editor is not available for this draft.')
      return
    }

    skipNextLyricsClearRef.current = true
    onUseDraft(draftResult.lyric)
    setDraftMessage('Cohesive draft sent to editor.')
  }


 const getDraftCompareLabel = (draft: DraftResult) => {
  const generatedAt = formatGeneratedAt(draft.generatedAt)
  const action = getWorkshopActionCopyLabel()
  const passType = getCurrentWorkshopPassType()

  const labelParts = [
    'Song Workshop draft',
    passType !== 'Empty' ? passType : '',
    action && action !== 'None recorded' ? action : '',
    generatedAt,
  ].filter(Boolean)

  return labelParts.join(' — ')
}







  return (
    <section className="rounded border border-gray-800 bg-gray-950/70 p-4">
      <div className="mb-4">
        <h1 className="text-xl mb-2">Song Workshop</h1>
        <p className="text-sm text-gray-400">
          Develop rough ideas, disconnected verses, choruses, titles, and
          phrases into a clearer song direction before sending anything to
          Suno, Chords, Rehearse, Perform, or Video.
        </p>
      </div>

      <div className="mb-4 rounded border border-gray-800 bg-gray-900/70 p-4">
        <h2 className="text-sm font-semibold text-gray-200">
          Current song context
        </h2>

        <div className="mt-2 grid gap-1 text-sm text-gray-400">
          <div>
            <span className="text-gray-300">Project:</span>{' '}
            {songTitle || 'Untitled project'}
          </div>

          <div>
            <span className="text-gray-300">Song version:</span>{' '}
            {songVersionTitle || 'Unsaved or untitled version'}
          </div>

          <div>
            <span className="text-gray-300">Lyrics available:</span>{' '}
            {hasLyrics ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded border border-gray-800 bg-gray-950 p-3 text-xs text-gray-400">
          <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-gray-300">
                Workshop status
              </div>

              <button
                type="button"
                onClick={copyWorkshopStatusSummary}
                className="rounded border border-gray-700 px-2 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-800"
              >
                {justCopiedStatusSummary ? 'Copied ✓' : 'Copy status'}
              </button>
            </div>

          <div className="mt-1 text-[11px] uppercase tracking-wide text-purple-300">
              Last action: {lastWorkshopAction || 'None yet'}
            </div>

            <div className="mt-2 rounded border border-gray-800 bg-gray-900/60 p-2">
  <div className="text-[11px] uppercase tracking-wide text-gray-500">
    Current pass
  </div>

  <div className="mt-1 font-medium text-gray-300">
    {getCurrentWorkshopPassType()}
  </div>

  <div className="mt-1 text-gray-500">
        {getCurrentWorkshopPassDescription()}
      </div>
    </div>

            {workshopActionHistory.length > 0 && (
              <div className="mt-2 border-t border-gray-800 pt-2">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Recent actions
                </div>

                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {workshopActionHistory.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            )}


          <div className="mt-2 space-y-1">
            <div>{workshopStatusSummary.analysisStatus}</div>
            <div>{workshopStatusSummary.draftStatus}</div>
            <div>{workshopStatusSummary.draftSourceStatus}</div>
          </div>
        </div>

      <div className="mb-4 rounded border border-gray-800 bg-gray-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">
              Source lyrics from Write
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Song Workshop uses the current lyrics/fragments from the Write editor.
            </p>
          </div>

          <button
            type="button"
            onClick={onEditLyrics}
            disabled={!onEditLyrics}
            className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            Edit lyrics in Write
          </button>
        </div>

        {hasLyrics ? (
          <>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-gray-950 p-3 text-xs text-gray-400">
              {sourceLyricsPreview}
              {sourceLyricsIsTruncated ? '\n\n…' : ''}
            </pre>

            {trimmedLyrics.length > 700 && (
              <button
                type="button"
                onClick={() => setShowFullSourceLyrics((current) => !current)}
                className="mt-2 rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-900"
              >
                {showFullSourceLyrics ? 'Show less' : 'Show full source lyrics'}
              </button>
            )}
          </>
        ) : (
          <p className="mt-3 rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-500">
            No lyrics or fragments available yet. Add rough ideas in Write, then
            return to Develop.
          </p>
        )}
      </div>

      <div className="mb-4 rounded border border-gray-800 bg-gray-900/70 p-4">
        <label className="block">
          <span className="text-sm font-semibold text-gray-200">
            Workshop notes
          </span>
          <span className="mt-1 block text-sm text-gray-400">
            Optional creative direction for the song: theme, emotional intent,
            genre, voice, structure, what to preserve, or what feels wrong.
          </span>

          <textarea
            value={workshopNotes}
            onChange={(event) => setWorkshopNotes(event.target.value)}
            placeholder="Example: Connect the disconnected verses through chance and fortune. Keep the voice plain-spoken, emotional, and suitable for a British male acoustic singer-songwriter."
            className="mt-3 min-h-28 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
          />
        </label>
      </div>

      <div className="mb-4 rounded border border-gray-800 bg-gray-900/70 p-4">
        <h2 className="text-sm font-semibold text-gray-200">
          Creative controls
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Shape how strongly the Song Workshop should intervene. These controls
          are intended to protect your original song while still allowing useful
          creative development.
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-300">
            Development focus
          </span>

          <select
            value={developmentFocus}
            onChange={(event) => setDevelopmentFocus(event.target.value)}
            className="mt-2 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
          >
            <option value="diagnose">Diagnose the song idea</option>
            <option value="connect-fragments">Connect disconnected fragments</option>
            <option value="strengthen-chorus">Strengthen chorus and hook</option>
            <option value="cohesive-draft">Create a cohesive song draft</option>
            <option value="preserve-original">
              Preserve original phrases as much as possible
            </option>
            <option value="make-singable">
              Make it more singable and performance-ready
            </option>
          </select>
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {renderWorkshopSlider({
            label: 'Change intensity',
            leftLabel: 'Light touch',
            rightLabel: 'Rebuild freely',
            value: changeIntensity,
            onChange: setChangeIntensity,
          })}

          {renderWorkshopSlider({
            label: 'Preserve original phrases',
            leftLabel: 'Loose',
            rightLabel: 'Strong',
            value: preserveOriginal,
            onChange: setPreserveOriginal,
          })}

          {renderWorkshopSlider({
            label: 'Emotional directness',
            leftLabel: 'Subtle',
            rightLabel: 'Direct',
            value: emotionalDirectness,
            onChange: setEmotionalDirectness,
          })}

          {renderWorkshopSlider({
            label: 'Singability',
            leftLabel: 'Poetic',
            rightLabel: 'Performance-ready',
            value: singability,
            onChange: setSingability,
          })}
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-gray-900/70 p-4">
        <h2 className="text-sm font-semibold text-gray-200">
          Song development tools
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Analyse the current song, identify the core theme, suggest a
          structure, and create a cohesive draft while preserving your original
          intent.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Create
            </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={analyzeSongIdea}
            disabled={analyzing || runningFullWorkshop || !hasLyrics}
            className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
          >
            {analyzing ? 'Analysing song idea...' : 'Analyze song idea'}
          </button>

          
          <button
            type="button"
            onClick={() => createCohesiveDraft()}
            disabled={drafting || runningFullWorkshop || !hasLyrics}
            className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {drafting ? 'Creating cohesive draft...' : 'Create cohesive draft'}
          </button>

          <button
              type="button"
              onClick={runFullWorkshopPass}
              disabled={analyzing || drafting || runningFullWorkshop || !lyrics.trim()}
              className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {runningFullWorkshop ? 'Analyzing, then drafting...' : 'Analyze + draft'}
            </button>

           </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Copy
                </div>

                <div className="flex flex-wrap gap-2">

          <button
              type="button"
              onClick={copyWorkshopPacket}
              disabled={!analysisResult && !draftResult}
              className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedWorkshopPacket ? 'Copied ✓' : 'Copy workshop packet'}
            </button>

            <button
              type="button"
              onClick={copyWorkshopPromptPack}
              disabled={!analysisResult?.modelPrompt && !draftResult?.modelPrompt}
              className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedPromptPack ? 'Copied ✓' : 'Copy prompt pack'}
            </button>

            <button
              type="button"
              onClick={() =>
                copyModelPrompt({
                  prompt: analysisResult?.modelPrompt,
                  type: 'analysis',
                })
              }
              disabled={!analysisResult?.modelPrompt}
              className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedAnalysisPrompt ? 'Copied ✓' : 'Copy analysis prompt'}
            </button>

            <button
              type="button"
              onClick={() =>
                copyModelPrompt({
                  prompt: draftResult?.modelPrompt,
                  type: 'draft',
                })
              }
              disabled={!draftResult?.modelPrompt}
              className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              {justCopiedDraftPrompt ? 'Copied ✓' : 'Copy draft prompt'}
            </button>

               </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Utility
                    </div>

                    <div className="flex flex-wrap gap-2">


            <button
              type="button"
              onClick={clearWorkshopResultsManually}
              disabled={
                analyzing ||
                drafting ||
                runningFullWorkshop ||
                (!analysisResult &&
                  !draftResult &&
                  !analysisMessage &&
                  !draftMessage &&
                  !lastWorkshopAction &&
                  workshopActionHistory.length === 0)
              }
              className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              Clear results
            </button>

                </div>
                      </div>
                    </div>

       

        {analysisMessage && (
          <p className="mt-3 text-xs text-gray-400">{analysisMessage}</p>
        )}

        {analysisResult && (
           
          <div className="mt-4 rounded border border-gray-800 bg-gray-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-200">
                Song idea analysis
              </h2>

              <button
                type="button"
                onClick={copySongAnalysis}
                disabled={!analysisResult}
                className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:text-gray-500"
              >
                {justCopiedAnalysis ? 'Copied ✓' : 'Copy analysis'}
              </button>
            </div>

             {analysisResult.generatedAt && (
          <div className="text-xs text-gray-500">
            Generated at: {formatGeneratedAt(analysisResult.generatedAt)}
          </div>
        )}


            <div className="mt-3 grid gap-3 text-sm text-gray-400">
              <div>
                <span className="font-medium text-gray-300">Core theme:</span>{' '}
                {analysisResult.coreTheme}
              </div>

              <div>
                <span className="font-medium text-gray-300">
                  Emotional centre:
                </span>{' '}
                {analysisResult.emotionalCentre}
              </div>

              <div>
                <span className="font-medium text-gray-300">
                  How the fragments connect:
                </span>{' '}
                {analysisResult.fragmentConnection}
              </div>

              <div>
                <span className="font-medium text-gray-300">
                  Main weakness:
                </span>{' '}
                {analysisResult.mainWeakness}
              </div>


              {analysisResult.controlNotes && (
                  <div>
                    <div className="font-medium text-gray-300">
                      Workshop controls:
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {analysisResult.controlNotes.map((item) => (
                          <li key={item}>{normaliseWorkshopControlNote(item)}</li>
                        ))}
                    </ul>
                  </div>
                )}





        {analysisResult.modelPrompt && (
          <details className="mt-2 rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-400">
            <summary className="cursor-pointer font-medium text-gray-300">
              View analysis model prompt
            </summary>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  copyModelPrompt({
                    prompt: analysisResult.modelPrompt,
                    type: 'analysis',
                  })
                }
                className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
              >
                {justCopiedAnalysisPrompt ? 'Copied ✓' : 'Copy prompt'}
              </button>
            </div>

            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-400">
              {analysisResult.modelPrompt}
            </pre>
          </details>
        )}



              {analysisResult.suggestedShape && (
                <div>
                  <div className="font-medium text-gray-300">
                    Suggested song shape:
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {analysisResult.suggestedShape.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <span className="font-medium text-gray-300">
                  Recommended next step:
                </span>{' '}
                {analysisResult.nextStep}
              </div>
            </div>
          </div>
        )}

        {draftMessage && (
          <p className="mt-3 text-xs text-gray-400">{draftMessage}</p>
        )}

        {draftResult && (
          <div className="mt-4 rounded border border-gray-800 bg-gray-950 p-4">

          {draftResult.generatedAt && (
                  <div className="text-xs text-gray-500">
                    Generated at: {formatGeneratedAt(draftResult.generatedAt)}
                  </div>
                )}

        <div className="text-xs text-gray-500">
          {getDraftAnalysisStatus(draftResult)}
        </div>

        <div className="rounded border border-gray-800 bg-gray-900/60 p-2 text-xs text-gray-400">
          <div className="font-medium text-gray-300">
            Compare label
          </div>

          <div className="mt-1">
            {getDraftCompareLabel(draftResult)}
          </div>
        </div>
  

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-100">
                    Cohesive draft
                  </h3>

                  <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200">
                    {getDraftSourceBadge(draftResult)}
                  </span>
                </div>
              
              <div className="flex flex-wrap gap-2">

              <button
                  type="button"
                  onClick={() => {
                      if (draftResult.lyric) {
                        onSendDraftToCompare?.(
                          draftResult.lyric,
                          getDraftCompareLabel(draftResult),
                        )
                      }
                    }}
                  disabled={!draftResult.lyric || !onSendDraftToCompare}
                  className="rounded bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                >
                  Send draft to compare
                </button>

                <button
                  type="button"
                  onClick={useDraftInEditor}
                  disabled={!draftResult.lyric || !onUseDraft}
                  className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-gray-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
                >
                  Use draft in editor
                </button>

                <button
                  type="button"
                  onClick={copyDraftLyricOnly}
                  disabled={!draftResult?.lyric}
                  className="rounded border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  {justCopiedDraftLyricOnly ? 'Copied ✓' : 'Copy lyric only'}
                </button>


                <button
                  type="button"
                  onClick={copyDraft}
                  disabled={!draftResult.lyric}
                  className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  {justCopiedDraft ? 'Copied ✓' : 'Copy draft'}
                </button>
              </div>
            </div>

            <pre className="mt-3 whitespace-pre-wrap rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-300">
              {draftResult.lyric}
            </pre>

            {draftResult.whatWasKept && (
              <div className="mt-4 text-sm text-gray-400">
                <div className="font-medium text-gray-300">
                  What was kept:
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {draftResult.whatWasKept.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {draftResult.workshopControlNotes && (
              <div className="mt-4 text-sm text-gray-400">
                <div className="font-medium text-gray-300">
                  Workshop control notes:
                </div>
               <ul className="mt-2 list-disc space-y-1 pl-5">
                  {draftResult.workshopControlNotes.map((item) => (
                    <li key={item}>{normaliseWorkshopControlNote(item)}</li>
                  ))}
                </ul>
              </div>
            )}


        {draftResult.modelPrompt && (
          <details className="mt-4 rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-400">
            <summary className="cursor-pointer font-medium text-gray-300">
              View draft model prompt
            </summary>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  copyModelPrompt({
                    prompt: draftResult.modelPrompt,
                    type: 'draft',
                  })
                }
                className="rounded border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
              >
                {justCopiedDraftPrompt ? 'Copied ✓' : 'Copy prompt'}
              </button>
            </div>

            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-400">
              {draftResult.modelPrompt}
            </pre>
          </details>
        )}


            {draftResult.whatChanged && (
              <div className="mt-4 text-sm text-gray-400">
                <div className="font-medium text-gray-300">
                  What changed:
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {draftResult.whatChanged.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {draftResult.nextStep && (
              <div className="mt-4 text-sm text-gray-400">
                <span className="font-medium text-gray-300">
                  Recommended next step:
                </span>{' '}
                {draftResult.nextStep}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}