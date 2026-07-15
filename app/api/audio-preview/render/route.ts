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

type RenderStep = {
  step?: number
  section?: string
  goal?: string
  guitarInstruction?: string
  vocalInstruction?: string
  dynamicInstruction?: string
  notes?: string
}


function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRenderStep(item: unknown, index: number): RenderStep {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      step: index + 1,
      section: `Section ${index + 1}`,
    }
  }

  const record = item as Record<string, unknown>

  return {
    step:
      typeof record.step === 'number' && Number.isFinite(record.step)
        ? record.step
        : index + 1,
    section: getString(record.section) || `Section ${index + 1}`,
    goal: getString(record.goal),
    guitarInstruction: getString(record.guitarInstruction),
    vocalInstruction: getString(record.vocalInstruction),
    dynamicInstruction: getString(record.dynamicInstruction),
    notes: getString(record.notes),
  }
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

function buildDryRunRenderPlan(payload: RendererPayload) {
  const renderSteps = Array.isArray(payload.renderSteps)
    ? payload.renderSteps.map((item, index) => normalizeRenderStep(item, index))
    : []

  return {
    type: 'audio-preview-dry-run-render-plan',
    version: 1,
    renderMode: 'guide-track-preview',
    audioStatus: 'not-generated',
    project: payload.project || 'Untitled project',
    songVersion: payload.songVersion || 'Untitled song version',
    chordVersion: payload.chordVersion || 'Untitled chord version',
    key: payload.key || '',
    tempo: payload.tempo || '',
    groove: payload.groove || '',
    instrumentation: payload.instrumentation || '',
    countIn: payload.countIn || '',
    vocalGuideStyle: payload.vocalGuideStyle || '',
    songsheetLineCount: Array.isArray(payload.songsheetLines)
      ? payload.songsheetLines.length
      : 0,
    renderStepCount: renderSteps.length,
    sections: renderSteps.map((step, index) => ({
      order: index + 1,
      section: step.section || `Section ${index + 1}`,
      goal: step.goal || 'Preserve the section feel from the renderer payload.',
      guitarInstruction:
        step.guitarInstruction ||
        'Use sparse acoustic guitar as the main timing and harmony reference.',
      vocalInstruction:
        step.vocalInstruction ||
        'Use understated guide vocal or melody reference only.',
      dynamicInstruction:
        step.dynamicInstruction || 'Keep dynamics clear and rehearsal-focused.',
      notes: step.notes || '',
    })),
    rendererInstructions: [
      'This is a dry-run plan only. No audio file is generated.',
      'Use the count-in, tempo, groove, placed songsheet, and section instructions as the render source.',
      'Prioritize rehearsal usefulness, timing clarity, and chord/lyric alignment over production quality.',
    ],
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

    const dryRunRenderPlan = buildDryRunRenderPlan(body)

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
      dryRunRenderPlan,
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