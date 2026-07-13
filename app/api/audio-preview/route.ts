import { NextResponse } from 'next/server'

type AudioPreviewSpec = {
  type?: string
  version?: number
  project?: string
  songVersion?: string
  chordVersion?: string
  key?: string
  transposeSemitones?: number
  songsheetStatus?: string
  songsheetReview?: string
  readiness?: {
    label?: string
    detail?: string
  }
  performanceIntent?: Record<string, string>
  guideTrackPlan?: {
    rows?: Record<string, string>
    sectionPlan?: unknown[]
  }
  songsheetLines?: unknown[]
}

type GuideTrackSectionPlanItem = {
  section?: string
  feel?: string
  guitarApproach?: string
  vocalApproach?: string
  dynamicShape?: string
  notes?: string
}

function normalizeSectionPlanItem(
  item: unknown,
  index: number,
): GuideTrackSectionPlanItem {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      section: `Section ${index + 1}`,
    }
  }

  const record = item as Record<string, unknown>

  return {
    section:
      typeof record.section === 'string' && record.section.trim()
        ? record.section.trim()
        : `Section ${index + 1}`,
    feel: typeof record.feel === 'string' ? record.feel.trim() : '',
    guitarApproach:
      typeof record.guitarApproach === 'string'
        ? record.guitarApproach.trim()
        : '',
    vocalApproach:
      typeof record.vocalApproach === 'string'
        ? record.vocalApproach.trim()
        : '',
    dynamicShape:
      typeof record.dynamicShape === 'string'
        ? record.dynamicShape.trim()
        : '',
    notes: typeof record.notes === 'string' ? record.notes.trim() : '',
  }
}

const AUDIO_PREVIEW_PLANNER = 'local-audio-preview-planner'

function getAudioPreviewMeta(startedAt: number) {
  const durationSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1))

  return {
    route: 'audio-preview',
    planner: AUDIO_PREVIEW_PLANNER,
    model: 'not-connected',
    durationSeconds,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    generatedAt: new Date().toISOString(),
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now()

  try {
    const body = (await req.json()) as AudioPreviewSpec

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Audio preview spec is required.' },
        { status: 400 },
      )
    }

    if (body.type !== 'audio-preview-spec') {
      return NextResponse.json(
        { error: 'Invalid audio preview spec type.' },
        { status: 400 },
      )
    }

    if (!Array.isArray(body.songsheetLines) || body.songsheetLines.length === 0) {
      return NextResponse.json(
        { error: 'Audio preview spec must include songsheetLines.' },
        { status: 400 },
      )
    }

    const performanceIntent = body.performanceIntent || {}
    const guideTrackPlan = body.guideTrackPlan || {}
    const guideRows = guideTrackPlan.rows || {}
    const sectionPlan = Array.isArray(guideTrackPlan.sectionPlan)
      ? guideTrackPlan.sectionPlan
      : []

    const normalizedSectionPlan = sectionPlan.map((item, index) =>
      normalizeSectionPlanItem(item, index),
    )

    const renderSteps = normalizedSectionPlan.map((item, index) => ({
      step: index + 1,
      section: item.section || `Section ${index + 1}`,
      goal: item.feel || 'Preserve the section feel from the songsheet.',
      guitarInstruction:
        item.guitarApproach ||
        'Use sparse acoustic guitar as the main timing and harmony reference.',
      vocalInstruction:
        item.vocalApproach ||
        'Use a simple guide melody or understated vocal reference only.',
      dynamicInstruction:
        item.dynamicShape || 'Keep dynamics clear and rehearsal-focused.',
      notes: item.notes || '',
    }))

    const tempo =
      performanceIntent.Tempo ||
      performanceIntent.tempo ||
      guideRows.Tempo ||
      guideRows.tempo ||
      ''

    const groove =
      performanceIntent.Groove ||
      performanceIntent.groove ||
      guideRows['Rhythm reference'] ||
      guideRows.rhythmReference ||
      ''

    const instrumentation =
      guideRows.Instrumentation ||
      guideRows.instrumentation ||
      'Sparse acoustic guitar guide'

    const countIn =
      guideRows['Count-in'] ||
      guideRows.countIn ||
      'Simple count-in before first section'

    const vocalGuideStyle =
      guideRows['Vocal guide style'] ||
      guideRows.vocalGuideStyle ||
      performanceIntent['Vocal delivery'] ||
      performanceIntent.vocalDelivery ||
      'Simple understated guide vocal or melody reference only'

    const renderPrompt = [
      'Create a simple audio guide preview, not a finished production.',
      '',
      `Project: ${body.project || 'Untitled project'}`,
      `Song version: ${body.songVersion || 'Untitled song version'}`,
      `Chord version: ${body.chordVersion || 'Untitled chord version'}`,
      body.key ? `Key: ${body.key}` : '',
      `Transpose: ${body.transposeSemitones ?? 0} semitones`,
      body.songsheetStatus ? `Songsheet status: ${body.songsheetStatus}` : '',
      body.songsheetReview ? `Songsheet review: ${body.songsheetReview}` : '',
      tempo ? `Tempo: ${tempo}` : '',
      groove ? `Groove: ${groove}` : '',
      `Instrumentation: ${instrumentation}`,
      `Count-in: ${countIn}`,
      `Vocal guide style: ${vocalGuideStyle}`,
      '',
      'Rendering priorities:',
      '- Preserve chord timing and section feel.',
      '- Keep the arrangement sparse and easy to follow.',
      '- Prioritize rehearsal usefulness over production quality.',
      '- Use acoustic guitar as the main timing and harmony reference.',
      '- Avoid full-band production unless explicitly requested later.',
      '',
      `Songsheet lines: ${body.songsheetLines.length}`,
      `Section plan items: ${sectionPlan.length}`,
    ]
      .filter(Boolean)
      .join('\n')

    const response = {
      status: 'ready',
      audioPreviewMeta: getAudioPreviewMeta(startedAt),
      message:
        'Audio preview spec received. Audio generation is not connected yet.',
      previewPlan: {
        project: body.project || 'Untitled project',
        songVersion: body.songVersion || 'Untitled song version',
        chordVersion: body.chordVersion || 'Untitled chord version',
        key: body.key || '',
        transposeSemitones: body.transposeSemitones ?? 0,
        songsheetStatus: body.songsheetStatus || '',
        songsheetReview: body.songsheetReview || '',
        tempo,
        groove,
        instrumentation,
        countIn,
        readiness: body.readiness || null,
        renderMode: 'guide-track-plan-only',
        renderStatus: 'not-connected',
        renderStepCount: renderSteps.length,
        songsheetLineCount: body.songsheetLines.length,
        sectionPlanCount: sectionPlan.length,
      },
      renderPrompt,
      renderSteps,
      renderNotes: [
        'This response confirms the spec can be converted into an audio-preview request.',
        'No audio file is generated yet.',
        'The next implementation step is connecting this plan to a guide-track renderer.',
      ],
      nextStep:
        'Connect this route to an audio generation service or local guide-track renderer.',
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json(
      { error: 'Could not parse audio preview request.' },
      { status: 400 },
    )
  }
}