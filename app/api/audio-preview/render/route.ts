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

type SongSheetLine = {
  section?: string
  lyric?: string
  chords?: unknown[]
}

type TimelineSection = {
  order: number
  section: string
  lyricLineCount: number
  chordPlacementCount: number
  firstLyric: string
  lastLyric: string
  goal: string
  guitarInstruction: string
  vocalInstruction: string
  dynamicInstruction: string
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

function normalizeSongSheetLine(item: unknown, index: number): SongSheetLine {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      section: `Section ${index + 1}`,
      lyric: '',
      chords: [],
    }
  }

  const record = item as Record<string, unknown>

  return {
    section: getString(record.section) || `Section ${index + 1}`,
    lyric: getString(record.lyric),
    chords: Array.isArray(record.chords) ? record.chords : [],
  }
}

function buildDryRunTimeline(payload: RendererPayload): TimelineSection[] {
  const songSheetLines = Array.isArray(payload.songsheetLines)
    ? payload.songsheetLines.map((item, index) => normalizeSongSheetLine(item, index))
    : []

  const renderSteps = Array.isArray(payload.renderSteps)
    ? payload.renderSteps.map((item, index) => normalizeRenderStep(item, index))
    : []

  const sectionOrder: string[] = []
  const linesBySection = new Map<string, SongSheetLine[]>()

  songSheetLines.forEach((line) => {
    const section = line.section || 'Unknown section'

    if (!linesBySection.has(section)) {
      linesBySection.set(section, [])
      sectionOrder.push(section)
    }

    linesBySection.get(section)?.push(line)
  })

  return sectionOrder.map((section, index) => {
    const lines = linesBySection.get(section) || []
    const matchingStep =
      renderSteps.find((step) => step.section === section) || renderSteps[index]

    const chordPlacementCount = lines.reduce((total, line) => {
      return total + (Array.isArray(line.chords) ? line.chords.length : 0)
    }, 0)

    return {
      order: index + 1,
      section,
      lyricLineCount: lines.length,
      chordPlacementCount,
      firstLyric: lines[0]?.lyric || '',
      lastLyric: lines[lines.length - 1]?.lyric || '',
      goal:
        matchingStep?.goal ||
        'Preserve the section feel from the placed songsheet.',
      guitarInstruction:
        matchingStep?.guitarInstruction ||
        'Use sparse acoustic guitar as the main timing and harmony reference.',
      vocalInstruction:
        matchingStep?.vocalInstruction ||
        'Use understated guide vocal or melody reference only.',
      dynamicInstruction:
        matchingStep?.dynamicInstruction ||
        'Keep dynamics clear and rehearsal-focused.',
    }
  })
}


function getTempoBpm(value: unknown) {
  if (typeof value !== 'string') {
    return 80
  }

  const match = value.match(/(\d+(?:\.\d+)?)/)
  const bpm = match ? Number(match[1]) : 80

  return Number.isFinite(bpm) && bpm > 0 ? bpm : 80
}

function getBeatsPerBar(payload: RendererPayload) {
  const text = [
    payload.groove || '',
    payload.countIn || '',
    payload.renderPrompt || '',
  ]
    .join(' ')
    .toLowerCase()

  if (text.includes('6/8')) {
    return 6
  }

  if (text.includes('3/4')) {
    return 3
  }

  return 4
}

function buildDryRunCueSheet(payload: RendererPayload, timeline: TimelineSection[]) {
  const tempoBpm = getTempoBpm(payload.tempo)
  const beatsPerBar = getBeatsPerBar(payload)

  let cumulativeSeconds = 0

  const sections = timeline.map((section) => {
    const estimatedBars = Math.max(2, section.lyricLineCount * 2)
    const estimatedSeconds = Number(
      (((estimatedBars * beatsPerBar) / tempoBpm) * 60).toFixed(1),
    )
    const startSeconds = Number(cumulativeSeconds.toFixed(1))
    const endSeconds = Number((cumulativeSeconds + estimatedSeconds).toFixed(1))

    cumulativeSeconds += estimatedSeconds

    return {
      order: section.order,
      section: section.section,
      estimatedBars,
      estimatedSeconds,
      startSeconds,
      endSeconds,
      lyricLineCount: section.lyricLineCount,
      chordPlacementCount: section.chordPlacementCount,
    }
  })

  return {
    type: 'audio-preview-dry-run-cue-sheet',
    version: 1,
    timingStatus: 'estimated',
    tempoBpm,
    beatsPerBar,
    totalEstimatedSeconds: Number(cumulativeSeconds.toFixed(1)),
    totalEstimatedBars: sections.reduce(
      (total, section) => total + section.estimatedBars,
      0,
    ),
    sections,
    notes: [
      'Timing is estimated from lyric line counts and detected tempo/groove.',
      'This is not final musical timing.',
      'Actual audio generation should revise these estimates from rendered audio or explicit bar counts.',
    ],
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

  const timeline = buildDryRunTimeline(payload)
  const cueSheet = buildDryRunCueSheet(payload, timeline)

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
    timelineSectionCount: timeline.length,
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
    timeline,
    cueSheet,
    rendererInstructions: [
      'This is a dry-run plan only. No audio file is generated.',
      'Use the count-in, tempo, groove, placed songsheet, and section instructions as the render source.',
      'Prioritize rehearsal usefulness, timing clarity, and chord/lyric alignment over production quality.',
    ],
  }
}

function validateDryRunRenderPlan(plan: {
  type?: string
  renderMode?: string
  audioStatus?: string
  sections?: unknown[]
  timeline?: unknown[]
  rendererInstructions?: unknown[]
  songsheetLineCount?: number
  renderStepCount?: number
  timelineSectionCount?: number
}) {
  const missing: string[] = []

  if (plan.type !== 'audio-preview-dry-run-render-plan') {
    missing.push('type')
  }

  if (plan.renderMode !== 'guide-track-preview') {
    missing.push('renderMode')
  }

  if (plan.audioStatus !== 'not-generated') {
    missing.push('audioStatus')
  }

  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    missing.push('sections')
  }

  if (!Array.isArray(plan.timeline) || plan.timeline.length === 0) {
    missing.push('timeline')
  }

  if (
    !Array.isArray(plan.rendererInstructions) ||
    plan.rendererInstructions.length === 0
  ) {
    missing.push('rendererInstructions')
  }

  if (
    typeof plan.songsheetLineCount !== 'number' ||
    !Number.isFinite(plan.songsheetLineCount) ||
    plan.songsheetLineCount <= 0
  ) {
    missing.push('songsheetLineCount')
  }

  if (
    typeof plan.renderStepCount !== 'number' ||
    !Number.isFinite(plan.renderStepCount) ||
    plan.renderStepCount <= 0
  ) {
    missing.push('renderStepCount')
  }

  if (
    typeof plan.timelineSectionCount !== 'number' ||
    !Number.isFinite(plan.timelineSectionCount) ||
    plan.timelineSectionCount <= 0
  ) {
    missing.push('timelineSectionCount')
  }

  return {
    ready: missing.length === 0,
    missing,
    detail:
      missing.length === 0
        ? 'Dry-run render plan contains render steps, timeline, renderer instructions, songsheet count, and section counts.'
        : `Dry-run render plan is missing or invalid: ${missing.join(', ')}.`,
  }
}

function validateDryRunCueSheet(cueSheet: {
  type?: string
  timingStatus?: string
  tempoBpm?: number
  beatsPerBar?: number
  totalEstimatedSeconds?: number
  totalEstimatedBars?: number
  sections?: unknown[]
}) {
  const missing: string[] = []

  if (cueSheet.type !== 'audio-preview-dry-run-cue-sheet') {
    missing.push('type')
  }

  if (cueSheet.timingStatus !== 'estimated') {
    missing.push('timingStatus')
  }

  if (
    typeof cueSheet.tempoBpm !== 'number' ||
    !Number.isFinite(cueSheet.tempoBpm) ||
    cueSheet.tempoBpm <= 0
  ) {
    missing.push('tempoBpm')
  }

  if (
    typeof cueSheet.beatsPerBar !== 'number' ||
    !Number.isFinite(cueSheet.beatsPerBar) ||
    cueSheet.beatsPerBar <= 0
  ) {
    missing.push('beatsPerBar')
  }

  if (
    typeof cueSheet.totalEstimatedSeconds !== 'number' ||
    !Number.isFinite(cueSheet.totalEstimatedSeconds) ||
    cueSheet.totalEstimatedSeconds <= 0
  ) {
    missing.push('totalEstimatedSeconds')
  }

  if (
    typeof cueSheet.totalEstimatedBars !== 'number' ||
    !Number.isFinite(cueSheet.totalEstimatedBars) ||
    cueSheet.totalEstimatedBars <= 0
  ) {
    missing.push('totalEstimatedBars')
  }

  if (!Array.isArray(cueSheet.sections) || cueSheet.sections.length === 0) {
    missing.push('sections')
  }

  const sectionTimingInvalid = Array.isArray(cueSheet.sections)
    ? cueSheet.sections.some((section) => {
        if (!section || typeof section !== 'object' || Array.isArray(section)) {
          return true
        }

        const record = section as Record<string, unknown>

        return (
          typeof record.section !== 'string' ||
          !record.section.trim() ||
          typeof record.estimatedBars !== 'number' ||
          record.estimatedBars <= 0 ||
          typeof record.estimatedSeconds !== 'number' ||
          record.estimatedSeconds <= 0 ||
          typeof record.startSeconds !== 'number' ||
          typeof record.endSeconds !== 'number' ||
          record.endSeconds <= record.startSeconds
        )
      })
    : true

  if (sectionTimingInvalid) {
    missing.push('sectionTiming')
  }

  return {
    ready: missing.length === 0,
    missing,
    detail:
      missing.length === 0
        ? 'Dry-run cue sheet contains estimated section timing, total bars, total seconds, tempo, and meter.'
        : `Dry-run cue sheet is missing or invalid: ${missing.join(', ')}.`,
  }
}


function buildDryRunRenderManifest({
  payload,
  renderJob,
  dryRunRenderPlan,
  dryRunRenderPlanValidation,
  dryRunCueSheetValidation,
}: {
  payload: RendererPayload
  renderJob: Record<string, unknown>
  dryRunRenderPlan: Record<string, unknown>
  dryRunRenderPlanValidation: Record<string, unknown>
  dryRunCueSheetValidation: Record<string, unknown>
}) {
  const cueSheet =
    dryRunRenderPlan.cueSheet &&
    typeof dryRunRenderPlan.cueSheet === 'object' &&
    !Array.isArray(dryRunRenderPlan.cueSheet)
      ? (dryRunRenderPlan.cueSheet as Record<string, unknown>)
      : null

  return {
    type: 'audio-preview-dry-run-render-manifest',
    version: 1,
    manifestStatus: 'dry-run-ready',
    audioStatus: 'not-generated',
    createdAt: new Date().toISOString(),
    project: payload.project || 'Untitled project',
    songVersion: payload.songVersion || 'Untitled song version',
    chordVersion: payload.chordVersion || 'Untitled chord version',
    renderJob,
    validation: {
      rendererPayloadReady: payload.validation?.ready === true,
      dryRunRenderPlanReady: dryRunRenderPlanValidation.ready === true,
      dryRunCueSheetReady: dryRunCueSheetValidation.ready === true,
    },
    sourceSummary: {
      key: payload.key || '',
      tempo: payload.tempo || '',
      groove: payload.groove || '',
      instrumentation: payload.instrumentation || '',
      countIn: payload.countIn || '',
      vocalGuideStyle: payload.vocalGuideStyle || '',
      songsheetLineCount: dryRunRenderPlan.songsheetLineCount || 0,
      renderStepCount: dryRunRenderPlan.renderStepCount || 0,
      timelineSectionCount: dryRunRenderPlan.timelineSectionCount || 0,
      cueSheetSectionCount:
        cueSheet && Array.isArray(cueSheet.sections)
          ? cueSheet.sections.length
          : 0,
      totalEstimatedSeconds:
        cueSheet && typeof cueSheet.totalEstimatedSeconds === 'number'
          ? cueSheet.totalEstimatedSeconds
          : 0,
      totalEstimatedBars:
        cueSheet && typeof cueSheet.totalEstimatedBars === 'number'
          ? cueSheet.totalEstimatedBars
          : 0,
    },
    rendererContract: {
  contractStatus: 'dry-run-contract-ready',
  rendererMode: 'guide-track-preview',
  consumes: [
    'rendererPayload',
    'dryRunRenderPlan',
    'dryRunCueSheet',
    'expectedOutputs',
  ],
  produces: [
    'guideTrackAudio',
    'clickTrack',
    'chordReferenceTrack',
    'vocalGuideTrack',
  ],
  requiredBeforeRealRender: [
    'Confirm cue sheet timings or replace estimates with final bar/time data.',
    'Choose actual output audio format.',
    'Connect an audio renderer capable of using the placed songsheet and section instructions.',
    'Persist generated audio URLs after render completion.',
  ],
  safetyNotes: [
    'Dry-run mode must not claim that audio has been generated.',
    'All expected output slots should remain not-generated until a real renderer writes files.',
  ],
},
    expectedOutputs: {
  guideTrackAudio: {
    status: 'not-generated',
    role: 'main-guide-track',
    description:
      'Combined rehearsal guide track using the placed songsheet, cue sheet, and render plan.',
    suggestedFileName: 'guide-track-preview.wav',
    format: 'unknown',
    url: null,
  },
  clickTrack: {
    status: 'not-generated',
    role: 'timing-reference',
    description:
      'Simple timing reference aligned to the cue sheet and section timing estimates.',
    suggestedFileName: 'click-track.wav',
    format: 'unknown',
    url: null,
  },
  chordReferenceTrack: {
    status: 'not-generated',
    role: 'chord-reference',
    description:
      'Sparse chord reference track for checking harmony and chord-change timing.',
    suggestedFileName: 'chord-reference-track.wav',
    format: 'unknown',
    url: null,
  },
  vocalGuideTrack: {
    status: 'not-generated',
    role: 'vocal-guide-reference',
    description:
      'Optional simple vocal guide or melody-reference track for rehearsal use.',
    suggestedFileName: 'vocal-guide-track.wav',
    format: 'unknown',
    url: null,
  },
},
    notes: [
      'This manifest describes a dry-run audio preview job only.',
      'No audio files have been generated.',
      'The expected output slots are placeholders for a future renderer.',
    ],
  }
}


function validateDryRunRenderManifest(manifest: {
  type?: string
  manifestStatus?: string
  audioStatus?: string
  renderJob?: unknown
  validation?: unknown
  sourceSummary?: unknown
  rendererContract?: unknown
  expectedOutputs?: unknown
}) {
  const missing: string[] = []

  if (manifest.type !== 'audio-preview-dry-run-render-manifest') {
    missing.push('type')
  }

  if (manifest.manifestStatus !== 'dry-run-ready') {
    missing.push('manifestStatus')
  }

  if (manifest.audioStatus !== 'not-generated') {
    missing.push('audioStatus')
  }

  if (
    !manifest.renderJob ||
    typeof manifest.renderJob !== 'object' ||
    Array.isArray(manifest.renderJob)
  ) {
    missing.push('renderJob')
  }

  const validation =
    manifest.validation &&
    typeof manifest.validation === 'object' &&
    !Array.isArray(manifest.validation)
      ? (manifest.validation as Record<string, unknown>)
      : null

  if (!validation) {
    missing.push('validation')
  } else {
    if (validation.rendererPayloadReady !== true) {
      missing.push('validation.rendererPayloadReady')
    }

    if (validation.dryRunRenderPlanReady !== true) {
      missing.push('validation.dryRunRenderPlanReady')
    }

    if (validation.dryRunCueSheetReady !== true) {
      missing.push('validation.dryRunCueSheetReady')
    }
  }

  const sourceSummary =
    manifest.sourceSummary &&
    typeof manifest.sourceSummary === 'object' &&
    !Array.isArray(manifest.sourceSummary)
      ? (manifest.sourceSummary as Record<string, unknown>)
      : null

  if (!sourceSummary) {
    missing.push('sourceSummary')
  } else {
    if (
      typeof sourceSummary.songsheetLineCount !== 'number' ||
      sourceSummary.songsheetLineCount <= 0
    ) {
      missing.push('sourceSummary.songsheetLineCount')
    }

    if (
      typeof sourceSummary.renderStepCount !== 'number' ||
      sourceSummary.renderStepCount <= 0
    ) {
      missing.push('sourceSummary.renderStepCount')
    }

    if (
      typeof sourceSummary.timelineSectionCount !== 'number' ||
      sourceSummary.timelineSectionCount <= 0
    ) {
      missing.push('sourceSummary.timelineSectionCount')
    }

    if (
      typeof sourceSummary.cueSheetSectionCount !== 'number' ||
      sourceSummary.cueSheetSectionCount <= 0
    ) {
      missing.push('sourceSummary.cueSheetSectionCount')
    }

    if (
      typeof sourceSummary.totalEstimatedSeconds !== 'number' ||
      sourceSummary.totalEstimatedSeconds <= 0
    ) {
      missing.push('sourceSummary.totalEstimatedSeconds')
    }

    if (
      typeof sourceSummary.totalEstimatedBars !== 'number' ||
      sourceSummary.totalEstimatedBars <= 0
    ) {
      missing.push('sourceSummary.totalEstimatedBars')
    }
  }

  const rendererContract =
  manifest.rendererContract &&
  typeof manifest.rendererContract === 'object' &&
  !Array.isArray(manifest.rendererContract)
    ? (manifest.rendererContract as Record<string, unknown>)
    : null

if (!rendererContract) {
  missing.push('rendererContract')
} else {
  if (rendererContract.contractStatus !== 'dry-run-contract-ready') {
    missing.push('rendererContract.contractStatus')
  }

  if (rendererContract.rendererMode !== 'guide-track-preview') {
    missing.push('rendererContract.rendererMode')
  }

  if (
    !Array.isArray(rendererContract.consumes) ||
    rendererContract.consumes.length === 0
  ) {
    missing.push('rendererContract.consumes')
  }

  if (
    !Array.isArray(rendererContract.produces) ||
    rendererContract.produces.length === 0
  ) {
    missing.push('rendererContract.produces')
  }

  if (
    !Array.isArray(rendererContract.requiredBeforeRealRender) ||
    rendererContract.requiredBeforeRealRender.length === 0
  ) {
    missing.push('rendererContract.requiredBeforeRealRender')
  }

  if (
    !Array.isArray(rendererContract.safetyNotes) ||
    rendererContract.safetyNotes.length === 0
  ) {
    missing.push('rendererContract.safetyNotes')
  }
}

  const expectedOutputs =
  manifest.expectedOutputs &&
  typeof manifest.expectedOutputs === 'object' &&
  !Array.isArray(manifest.expectedOutputs)
    ? (manifest.expectedOutputs as Record<string, unknown>)
    : null

if (!expectedOutputs) {
  missing.push('expectedOutputs')
} else {
  const outputSlots = Object.values(expectedOutputs).filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  )

  if (outputSlots.length === 0) {
    missing.push('expectedOutputs.slots')
  }

  const invalidOutputStatus = outputSlots.some(
    (slot) => slot.status !== 'not-generated',
  )

  if (invalidOutputStatus) {
    missing.push('expectedOutputs.status')
  }

  const missingOutputMetadata = outputSlots.some((slot) => {
    return (
      typeof slot.role !== 'string' ||
      !slot.role.trim() ||
      typeof slot.description !== 'string' ||
      !slot.description.trim() ||
      typeof slot.suggestedFileName !== 'string' ||
      !slot.suggestedFileName.trim()
    )
  })

  if (missingOutputMetadata) {
    missing.push('expectedOutputs.metadata')
  }
}

  return {
    ready: missing.length === 0,
    missing,
    detail:
      missing.length === 0
        ? 'Dry-run render manifest contains validated source summary, renderer contract, expected output placeholders, output metadata, and not-generated audio status.'
        : `Dry-run render manifest is missing or invalid: ${missing.join(', ')}.`,
      }
    }

function buildDryRunHandoffBundle({
  renderJob,
  dryRunRenderPlanValidation,
  dryRunCueSheetValidation,
  dryRunRenderManifestValidation,
}: {
  renderJob: Record<string, unknown>
  dryRunRenderPlanValidation: Record<string, unknown>
  dryRunCueSheetValidation: Record<string, unknown>
  dryRunRenderManifestValidation: Record<string, unknown>
}) {
  const allValidationsPassed =
    dryRunRenderPlanValidation.ready === true &&
    dryRunCueSheetValidation.ready === true &&
    dryRunRenderManifestValidation.ready === true

  return {
    type: 'audio-preview-dry-run-handoff-bundle',
    version: 1,
    handoffStatus: allValidationsPassed
      ? 'dry-run-handoff-ready'
      : 'dry-run-handoff-needs-review',
    audioStatus: 'not-generated',
    createdAt: new Date().toISOString(),
    renderJobId:
      typeof renderJob.id === 'string' ? renderJob.id : 'unknown-render-job',
    includedArtifacts: [
      'rendererPayload',
      'dryRunRenderPlan',
      'dryRunCueSheet',
      'dryRunRenderManifest',
      'rendererContract',
      'expectedOutputs',
      'validationResults',
    ],
    validationSummary: {
      dryRunRenderPlanReady: dryRunRenderPlanValidation.ready === true,
      dryRunCueSheetReady: dryRunCueSheetValidation.ready === true,
      dryRunRenderManifestReady:
        dryRunRenderManifestValidation.ready === true,
      allValidationsPassed,
    },
    nextActions: allValidationsPassed
      ? [
          'Review the dry-run cue sheet timing estimates.',
          'Choose real audio output formats.',
          'Connect a renderer that can consume the manifest contract.',
          'Keep all output slots not-generated until files are actually written.',
        ]
      : [
          'Review validation messages before connecting a renderer.',
          'Do not generate or claim audio until the handoff bundle is ready.',
        ],
    notes: [
      'This is a dry-run handoff bundle only.',
      'No audio files have been generated.',
      'This bundle summarises renderer-facing artefacts for future integration.',
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

const dryRunRenderPlanValidation =
  validateDryRunRenderPlan(dryRunRenderPlan)

const dryRunCueSheet =
  dryRunRenderPlan.cueSheet &&
  typeof dryRunRenderPlan.cueSheet === 'object' &&
  !Array.isArray(dryRunRenderPlan.cueSheet)
    ? dryRunRenderPlan.cueSheet
    : {}

const dryRunCueSheetValidation = validateDryRunCueSheet(dryRunCueSheet)

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

    const dryRunRenderManifest = buildDryRunRenderManifest({
      payload: body,
      renderJob,
      dryRunRenderPlan,
      dryRunRenderPlanValidation,
      dryRunCueSheetValidation,
    })

    const dryRunRenderManifestValidation =
        validateDryRunRenderManifest(dryRunRenderManifest)

    const dryRunHandoffBundle = buildDryRunHandoffBundle({
  renderJob,
  dryRunRenderPlanValidation,
  dryRunCueSheetValidation,
  dryRunRenderManifestValidation,
})

    return NextResponse.json({
      status: 'accepted',
      renderStatus: 'dry-run-ready',
      validation,
      renderJob,
      dryRunRenderPlan,
      dryRunRenderPlanValidation,
      dryRunCueSheetValidation,
      dryRunRenderManifest,
      dryRunRenderManifestValidation,
      dryRunHandoffBundle,
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