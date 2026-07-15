import { NextResponse } from 'next/server'

type RendererPayload = {
  type?: string
  version?: number
  renderStatus?: string
  project?: string
  songVersion?: string
  chordVersion?: string
  key?: string
  transposeSemitones?: number
  songsheetStatus?: string
  songsheetReview?: string
  tempo?: string
  groove?: string
  instrumentation?: string
  countIn?: string
  vocalGuideStyle?: string
  songsheetLines?: unknown[]
  previewSongSheetText?: string
  sectionGuideText?: string
  renderSteps?: unknown[]
  renderPrompt?: string
  validation?: {
    ready?: boolean
    missing?: string[]
    detail?: string
  }
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateRendererPayload(payload: RendererPayload) {
  const missing: string[] = []

  if (payload.type !== 'audio-preview-renderer-payload') {
    missing.push('type')
  }

  if (!getString(payload.project)) {
    missing.push('project')
  }

  if (!getString(payload.songVersion)) {
    missing.push('songVersion')
  }

  if (!getString(payload.chordVersion)) {
    missing.push('chordVersion')
  }

  if (!getString(payload.renderPrompt)) {
    missing.push('renderPrompt')
  }

  if (!getString(payload.previewSongSheetText)) {
    missing.push('previewSongSheetText')
  }

  if (!getString(payload.sectionGuideText)) {
    missing.push('sectionGuideText')
  }

  if (!Array.isArray(payload.songsheetLines) || payload.songsheetLines.length === 0) {
    missing.push('songsheetLines')
  }

  if (!Array.isArray(payload.renderSteps) || payload.renderSteps.length === 0) {
    missing.push('renderSteps')
  }

  if (payload.validation?.ready !== true) {
    missing.push('validation.ready')
  }

  return {
    ready: missing.length === 0,
    missing,
    detail:
      missing.length === 0
        ? 'Renderer payload is ready for dry-run audio preview handoff.'
        : `Renderer payload cannot be handed off yet. Missing or invalid: ${missing.join(', ')}.`,
  }
}

function createRenderJobId() {
  return `audio-preview-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RendererPayload

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Renderer payload is required.' },
        { status: 400 },
      )
    }

    const validation = validateRendererPayload(body)

    if (!validation.ready) {
      return NextResponse.json(
        {
          status: 'rejected',
          renderStatus: 'not-started',
          validation,
        },
        { status: 400 },
      )
    }

    const renderJob = {
      id: createRenderJobId(),
      status: 'dry-run-ready',
      renderer: 'local-audio-preview-dry-run',
      createdAt: new Date().toISOString(),
      project: body.project || 'Untitled project',
      songVersion: body.songVersion || 'Untitled song version',
      chordVersion: body.chordVersion || 'Untitled chord version',
      renderMode: 'guide-track-preview',
      audioStatus: 'not-generated',
      nextStep:
        'Connect this dry-run handoff to an audio generation service or local guide-track renderer.',
      summary: {
        key: body.key || '',
        tempo: body.tempo || '',
        groove: body.groove || '',
        instrumentation: body.instrumentation || '',
        songsheetLineCount: Array.isArray(body.songsheetLines)
          ? body.songsheetLines.length
          : 0,
        renderStepCount: Array.isArray(body.renderSteps)
          ? body.renderSteps.length
          : 0,
      },
    }

    return NextResponse.json({
      status: 'accepted',
      renderStatus: 'dry-run-ready',
      validation,
      renderJob,
      message:
        'Renderer payload accepted. Dry-run render job created; no audio file generated yet.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not parse renderer payload.' },
      { status: 400 },
    )
  }
}