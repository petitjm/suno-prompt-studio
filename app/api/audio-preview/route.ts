import { NextResponse } from 'next/server'

type AudioPreviewSpec = {
  type?: string
  version?: number
  project?: string
  songVersion?: string
  chordVersion?: string
  key?: string
  transposeSemitones?: number
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

export async function POST(req: Request) {
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
  message:
    'Audio preview spec received. Audio generation is not connected yet.',
  previewPlan: {
    project: body.project || 'Untitled project',
    songVersion: body.songVersion || 'Untitled song version',
    chordVersion: body.chordVersion || 'Untitled chord version',
    key: body.key || '',
    transposeSemitones: body.transposeSemitones ?? 0,
    tempo,
    groove,
    instrumentation,
    countIn,
    readiness: body.readiness || null,
    renderMode: 'guide-track-plan-only',
    renderStatus: 'not-connected',
    songsheetLineCount: body.songsheetLines.length,
    sectionPlanCount: sectionPlan.length,
  },
  renderPrompt,
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