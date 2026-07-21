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

function validateDryRunHandoffBundle(bundle: {
  type?: unknown
  handoffStatus?: unknown
  audioStatus?: unknown
  renderJobId?: unknown
  includedArtifacts?: unknown
  validationSummary?: unknown
  nextActions?: unknown
  notes?: unknown
}) {
  const missing: string[] = []

  if (bundle.type !== 'audio-preview-dry-run-handoff-bundle') {
    missing.push('type')
  }

  if (bundle.handoffStatus !== 'dry-run-handoff-ready') {
    missing.push('handoffStatus')
  }

  if (bundle.audioStatus !== 'not-generated') {
    missing.push('audioStatus')
  }

  if (typeof bundle.renderJobId !== 'string' || !bundle.renderJobId.trim()) {
    missing.push('renderJobId')
  }

  if (!Array.isArray(bundle.includedArtifacts) || bundle.includedArtifacts.length === 0) {
    missing.push('includedArtifacts')
  }

  const validationSummary =
    bundle.validationSummary &&
    typeof bundle.validationSummary === 'object' &&
    !Array.isArray(bundle.validationSummary)
      ? (bundle.validationSummary as Record<string, unknown>)
      : null

  if (!validationSummary) {
    missing.push('validationSummary')
  } else {
    if (validationSummary.dryRunRenderPlanReady !== true) {
      missing.push('validationSummary.dryRunRenderPlanReady')
    }

    if (validationSummary.dryRunCueSheetReady !== true) {
      missing.push('validationSummary.dryRunCueSheetReady')
    }

    if (validationSummary.dryRunRenderManifestReady !== true) {
      missing.push('validationSummary.dryRunRenderManifestReady')
    }

    if (validationSummary.allValidationsPassed !== true) {
      missing.push('validationSummary.allValidationsPassed')
    }
  }

  if (!Array.isArray(bundle.nextActions) || bundle.nextActions.length === 0) {
    missing.push('nextActions')
  }

  if (!Array.isArray(bundle.notes) || bundle.notes.length === 0) {
    missing.push('notes')
  }

  return {
    ready: missing.length === 0,
    missing,
    detail:
      missing.length === 0
        ? 'Dry-run handoff bundle is validated and confirms no audio has been generated.'
        : `Dry-run handoff bundle needs review: ${missing.join(', ')}`,
  }
}

function buildDryRunArtifactPackage({
  renderJob,
  dryRunRenderPlan,
  dryRunRenderPlanValidation,
  dryRunCueSheetValidation,
  dryRunRenderManifest,
  dryRunRenderManifestValidation,
  dryRunHandoffBundle,
  dryRunHandoffBundleValidation,
}: {
  renderJob: Record<string, unknown>
  dryRunRenderPlan: Record<string, unknown>
  dryRunRenderPlanValidation: Record<string, unknown>
  dryRunCueSheetValidation: Record<string, unknown>
  dryRunRenderManifest: Record<string, unknown>
  dryRunRenderManifestValidation: Record<string, unknown>
  dryRunHandoffBundle: Record<string, unknown>
  dryRunHandoffBundleValidation: Record<string, unknown>
}) {
  return {
    type: 'audio-preview-dry-run-artifact-package',
    version: 1,
    packageStatus:
      dryRunHandoffBundleValidation.ready === true
        ? 'dry-run-package-ready'
        : 'dry-run-package-needs-review',
    audioStatus: 'not-generated',
    createdAt: new Date().toISOString(),
    packageContents: [
      'renderJob',
      'dryRunRenderPlan',
      'dryRunRenderPlanValidation',
      'dryRunCueSheetValidation',
      'dryRunRenderManifest',
      'dryRunRenderManifestValidation',
      'dryRunHandoffBundle',
      'dryRunHandoffBundleValidation',
    ],
    realRenderReadiness: {
      readyForRealRender: false,
      readinessStatus: 'blocked-until-renderer-connected',
      blockers: [
        'No real audio renderer is connected yet.',
        'Output audio format has not been selected.',
        'Generated audio file storage has not been configured.',
        'Cue sheet timings are still estimated and need final confirmation before real rendering.',
      ],
      requiredDecisions: [
        'Choose renderer implementation.',
        'Choose audio output format.',
        'Choose generated file storage location.',
        'Decide whether to render guide track, click track, chord reference track, vocal guide track, or all outputs.',
      ],
      safetyNotes: [
        'A validated dry-run artefact package is not the same as generated audio.',
        'Do not mark any expected output as generated until a real renderer writes and stores the file.',
      ],
    },
    renderTargets: {
  targetStatus: 'dry-run-targets-declared',
  selectedOutputs: [
    {
      key: 'guideTrackAudio',
      label: 'Guide track audio',
      priority: 1,
      selected: true,
      reason:
        'Primary rehearsal output combining placed songsheet, render plan, cue sheet, and performance guidance.',
    },
    {
      key: 'clickTrack',
      label: 'Click track',
      priority: 2,
      selected: true,
      reason:
        'Timing reference for checking section lengths, count-in, and cue sheet estimates.',
    },
    {
      key: 'chordReferenceTrack',
      label: 'Chord reference track',
      priority: 3,
      selected: true,
      reason:
        'Sparse harmony reference for checking chord changes and song structure.',
    },
    {
      key: 'vocalGuideTrack',
      label: 'Vocal guide track',
      priority: 4,
      selected: false,
      reason:
        'Optional future melody or vocal-reference output; left off by default until a vocal guide strategy is chosen.',
    },
  ],
  notes: [
    'Render targets are declared for future renderer integration only.',
    'Selected targets must remain not-generated until a real renderer creates and stores audio files.',
  ],
},
guideTrackRenderRecipe: {
  recipeStatus: 'dry-run-guide-track-recipe-declared',
  targetKey: 'guideTrackAudio',
  outputStatus: 'not-generated',
  rendererRequirement:
    'Future renderer must create an audible guide track from the validated preview spec, render plan, cue sheet, and chord-aware payload.',
  countIn: {
    enabled: true,
    bars: 1,
    description:
      'Add a one-bar count-in before the first musical section so the performer can enter confidently.',
  },
  timing: {
    tempoSource: 'audioPreviewSpec',
    sectionTimingSource: 'dryRunCueSheet',
    description:
      'Use the requested preview tempo and cue-sheet section order as the timing source of truth.',
  },
  musicalBed: {
    primaryInstrument: 'warm acoustic guitar',
    supportInstruments: [
      'soft bass reference',
      'light brushed percussion or click-supported pulse',
      'subtle pad only if needed for section continuity',
    ],
    description:
      'Create a simple, performance-focused guide bed that supports rehearsal without over-producing the song.',
  },
  chordHandling: {
    source: 'rendererPayload.chordSections',
    description:
      'Follow the chord section structure from the renderer payload. Chord changes should be clear enough for rehearsal and arrangement testing.',
  },
  vocalGuide: {
    status: 'placeholder-only',
    description:
      'No generated vocal audio is produced in dry run. Future renderer may add a simple melody guide only when a melody source exists.',
  },
  mixPriorities: [
    'Keep rhythm and chord changes clear.',
    'Keep the arrangement sparse enough for songwriting decisions.',
    'Avoid final-production polish at preview stage.',
    'Make the output useful for rehearsal, revision, and song-structure testing.',
  ],
  completionCriteria: [
    'Audio file exists.',
    'Audio duration matches the cue-sheet structure closely enough for rehearsal.',
    'Count-in is present when enabled.',
    'Chord changes are audible or clearly implied.',
    'Output file path or storage reference is recorded in the artefact package.',
  ],
},


  clickTrackRenderRecipe: {
    recipeStatus: 'dry-run-click-track-recipe-declared',
    targetKey: 'clickTrack',
    outputStatus: 'not-generated',
    rendererRequirement:
      'Future renderer must create a timing-only click track from the validated preview tempo, cue sheet, and render plan.',
    countIn: {
      enabled: true,
      bars: 1,
      description:
        'Use the same one-bar count-in as the guide track so all future preview outputs align.',
    },
    timing: {
      tempoSource: 'audioPreviewSpec',
      sectionTimingSource: 'dryRunCueSheet',
      description:
        'Use the requested preview tempo and cue-sheet section order as the timing source of truth.',
    },
    clickSound: {
      downbeatEmphasis: true,
      subdivision: 'quarter-note',
      description:
        'Use a clear downbeat accent and simple quarter-note pulse suitable for rehearsal and structure testing.',
    },
    sectionMarkers: {
      enabled: true,
      description:
        'Future renderer may add subtle section marker tones or metadata at section boundaries, but dry run only declares the requirement.',
    },
    mixPriorities: [
      'Keep timing clear and uncluttered.',
      'Make downbeats easy to identify.',
      'Avoid musical arrangement elements in the click-only output.',
      'Keep the click track aligned with the guide-track count-in and cue sheet.',
    ],
    completionCriteria: [
      'Audio file exists.',
      'Click starts after the declared count-in.',
      'Tempo matches the preview spec.',
      'Section length follows the cue-sheet structure.',
      'Output file path or storage reference is recorded in the artefact package.',
    ],
  },

  vocalGuideRenderRecipe: {
  recipeStatus: 'dry-run-vocal-guide-recipe-declared',
  targetKey: 'vocalGuideTrack',
  targetSelection: 'optional',
  outputStatus: 'not-generated',
  rendererRequirement:
    'Future renderer must create a vocal guide only after a melody source, vocal guide strategy, and performer-safe range have been confirmed.',
  activationRequirements: [
    'A melody source exists.',
    'A vocal guide strategy has been selected.',
    'The target vocal range is confirmed for the performer.',
    'Lyrics-to-section alignment has been reviewed.',
  ],
  countIn: {
    enabled: true,
    bars: 1,
    description:
      'Use the same one-bar count-in as the other preview outputs so all future tracks align.',
  },
  timing: {
    tempoSource: 'audioPreviewSpec',
    sectionTimingSource: 'dryRunCueSheet',
    description:
      'Use the requested preview tempo and cue-sheet section order as the timing source of truth.',
  },
  melodySource: {
    status: 'not-provided',
    acceptedSources: [
      'manual melody notes',
      'recorded scratch vocal',
      'MIDI melody line',
      'approved generated melody contour',
    ],
    description:
      'Dry run does not invent a vocal melody. A future renderer must wait for an explicit melody source before creating vocal guide audio.',
  },
  vocalStyle: {
    status: 'not-selected',
    defaultReference:
      'clear, simple guide vocal or guide synth suitable for rehearsal only',
    description:
      'The future vocal guide should support songwriting decisions, not imitate a final artist performance.',
  },
  mixPriorities: [
    'Keep the vocal guide clear and simple.',
    'Avoid final-production vocal styling.',
    'Do not generate a melody unless a melody source is supplied.',
    'Keep the vocal guide aligned with the count-in, cue sheet, and guide track.',
  ],
  completionCriteria: [
    'Audio file exists only after the optional target is enabled.',
    'Melody source is recorded in the artefact package.',
    'Vocal guide stays within the confirmed performer range.',
    'Lyrics align with the cue-sheet section structure.',
    'Output file path or storage reference is recorded in the artefact package.',
  ],
},

  chordReferenceRenderRecipe: {
  recipeStatus: 'dry-run-chord-reference-recipe-declared',
  targetKey: 'chordReferenceTrack',
  outputStatus: 'not-generated',
  rendererRequirement:
    'Future renderer must create a sparse chord-reference track from the renderer payload chord sections, cue sheet, and render plan.',
  countIn: {
    enabled: true,
    bars: 1,
    description:
      'Use the same one-bar count-in as the guide and click tracks so all future preview outputs align.',
  },
  timing: {
    tempoSource: 'audioPreviewSpec',
    sectionTimingSource: 'dryRunCueSheet',
    description:
      'Use the requested preview tempo and cue-sheet section order as the timing source of truth.',
  },
  chordSource: {
    source: 'rendererPayload.chordSections',
    description:
      'Use chord sections from the renderer payload as the source of truth for harmony changes.',
  },
  voicing: {
    primaryInstrument: 'clean acoustic guitar or simple piano',
    density: 'sparse',
    description:
      'Play clear chord changes with minimal rhythmic decoration so harmony can be checked quickly.',
  },
  sectionMarkers: {
    enabled: true,
    description:
      'Future renderer may add subtle section markers or metadata at section boundaries to help review song structure.',
  },
  mixPriorities: [
    'Make chord changes clear.',
    'Keep the harmonic reference sparse and uncluttered.',
    'Avoid final-production arrangement detail.',
    'Keep the chord reference aligned with the count-in, cue sheet, and click track.',
  ],
  completionCriteria: [
    'Audio file exists.',
    'Chord changes follow the renderer payload chord sections.',
    'Tempo matches the preview spec.',
    'Section length follows the cue-sheet structure.',
    'Output file path or storage reference is recorded in the artefact package.',
  ],
},
    renderJob,
    dryRunRenderPlan,
    dryRunRenderPlanValidation,
    dryRunCueSheetValidation,
    dryRunRenderManifest,
    dryRunRenderManifestValidation,
    dryRunHandoffBundle,
    dryRunHandoffBundleValidation,
    notes: [
      'This package is a machine-readable dry-run artefact bundle.',
      'No audio files have been generated.',
      'Future renderer integration should consume this package only after validation is ready.',
    ],
  }
}
  


function validateDryRunArtifactPackage(pkg: {
  type?: unknown
  packageStatus?: unknown
  audioStatus?: unknown
  packageContents?: unknown
  realRenderReadiness?: unknown
  renderTargets?: unknown
  guideTrackRenderRecipe?: unknown
  clickTrackRenderRecipe?: unknown
  chordReferenceRenderRecipe?: unknown
  vocalGuideRenderRecipe?: unknown
  renderJob?: unknown
  dryRunRenderPlan?: unknown
  dryRunRenderPlanValidation?: unknown
  dryRunCueSheetValidation?: unknown
  dryRunRenderManifest?: unknown
  dryRunRenderManifestValidation?: unknown
  dryRunHandoffBundle?: unknown
  dryRunHandoffBundleValidation?: unknown
  notes?: unknown
}) {
  const missing: string[] = []

  if (pkg.type !== 'audio-preview-dry-run-artifact-package') {
    missing.push('type')
  }

  if (pkg.packageStatus !== 'dry-run-package-ready') {
    missing.push('packageStatus')
  }

  if (pkg.audioStatus !== 'not-generated') {
    missing.push('audioStatus')
  }

  if (!Array.isArray(pkg.packageContents) || pkg.packageContents.length === 0) {
    missing.push('packageContents')
  }

  const realRenderReadiness =
  pkg.realRenderReadiness &&
  typeof pkg.realRenderReadiness === 'object' &&
  !Array.isArray(pkg.realRenderReadiness)
    ? (pkg.realRenderReadiness as Record<string, unknown>)
    : null

if (!realRenderReadiness) {
  missing.push('realRenderReadiness')
} else {
  if (realRenderReadiness.readyForRealRender !== false) {
    missing.push('realRenderReadiness.readyForRealRender')
  }

  if (
    realRenderReadiness.readinessStatus !==
    'blocked-until-renderer-connected'
  ) {
    missing.push('realRenderReadiness.readinessStatus')
  }

  if (
    !Array.isArray(realRenderReadiness.blockers) ||
    realRenderReadiness.blockers.length === 0
  ) {
    missing.push('realRenderReadiness.blockers')
  }

  if (
    !Array.isArray(realRenderReadiness.requiredDecisions) ||
    realRenderReadiness.requiredDecisions.length === 0
  ) {
    missing.push('realRenderReadiness.requiredDecisions')
  }

  if (
    !Array.isArray(realRenderReadiness.safetyNotes) ||
    realRenderReadiness.safetyNotes.length === 0
  ) {
    missing.push('realRenderReadiness.safetyNotes')
  }
}

const renderTargets =
  pkg.renderTargets &&
  typeof pkg.renderTargets === 'object' &&
  !Array.isArray(pkg.renderTargets)
    ? (pkg.renderTargets as Record<string, unknown>)
    : null

if (!renderTargets) {
  missing.push('renderTargets')
} else {
  if (renderTargets.targetStatus !== 'dry-run-targets-declared') {
    missing.push('renderTargets.targetStatus')
  }

  const selectedOutputs = Array.isArray(renderTargets.selectedOutputs)
    ? renderTargets.selectedOutputs
    : []

  if (selectedOutputs.length === 0) {
    missing.push('renderTargets.selectedOutputs')
  } else {
    selectedOutputs.forEach((output, index) => {
      const target =
        output && typeof output === 'object' && !Array.isArray(output)
          ? (output as Record<string, unknown>)
          : null

      if (!target) {
        missing.push(`renderTargets.selectedOutputs.${index}`)
        return
      }

      if (typeof target.key !== 'string' || !target.key.trim()) {
        missing.push(`renderTargets.selectedOutputs.${index}.key`)
      }

      if (typeof target.label !== 'string' || !target.label.trim()) {
        missing.push(`renderTargets.selectedOutputs.${index}.label`)
      }

      if (typeof target.priority !== 'number') {
        missing.push(`renderTargets.selectedOutputs.${index}.priority`)
      }

      if (typeof target.selected !== 'boolean') {
        missing.push(`renderTargets.selectedOutputs.${index}.selected`)
      }

      if (typeof target.reason !== 'string' || !target.reason.trim()) {
        missing.push(`renderTargets.selectedOutputs.${index}.reason`)
      }
    })
  }

  if (!Array.isArray(renderTargets.notes) || renderTargets.notes.length === 0) {
    missing.push('renderTargets.notes')
  }
}

const guideTrackRenderRecipe =
  pkg.guideTrackRenderRecipe &&
  typeof pkg.guideTrackRenderRecipe === 'object' &&
  !Array.isArray(pkg.guideTrackRenderRecipe)
    ? (pkg.guideTrackRenderRecipe as Record<string, unknown>)
    : null

if (!guideTrackRenderRecipe) {
  missing.push('guideTrackRenderRecipe')
} else {
  if (
    guideTrackRenderRecipe.recipeStatus !==
    'dry-run-guide-track-recipe-declared'
  ) {
    missing.push('guideTrackRenderRecipe.recipeStatus')
  }

  if (guideTrackRenderRecipe.targetKey !== 'guideTrackAudio') {
    missing.push('guideTrackRenderRecipe.targetKey')
  }

  if (guideTrackRenderRecipe.outputStatus !== 'not-generated') {
    missing.push('guideTrackRenderRecipe.outputStatus')
  }

  if (
    typeof guideTrackRenderRecipe.rendererRequirement !== 'string' ||
    !guideTrackRenderRecipe.rendererRequirement.trim()
  ) {
    missing.push('guideTrackRenderRecipe.rendererRequirement')
  }

  const countIn =
    guideTrackRenderRecipe.countIn &&
    typeof guideTrackRenderRecipe.countIn === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.countIn)
      ? (guideTrackRenderRecipe.countIn as Record<string, unknown>)
      : null

  if (!countIn) {
    missing.push('guideTrackRenderRecipe.countIn')
  } else {
    if (countIn.enabled !== true) {
      missing.push('guideTrackRenderRecipe.countIn.enabled')
    }

    if (typeof countIn.bars !== 'number' || countIn.bars <= 0) {
      missing.push('guideTrackRenderRecipe.countIn.bars')
    }

    if (
      typeof countIn.description !== 'string' ||
      !countIn.description.trim()
    ) {
      missing.push('guideTrackRenderRecipe.countIn.description')
    }
  }



  const timing =
    guideTrackRenderRecipe.timing &&
    typeof guideTrackRenderRecipe.timing === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.timing)
      ? (guideTrackRenderRecipe.timing as Record<string, unknown>)
      : null

  if (!timing) {
    missing.push('guideTrackRenderRecipe.timing')
  } else {
    if (timing.tempoSource !== 'audioPreviewSpec') {
      missing.push('guideTrackRenderRecipe.timing.tempoSource')
    }

    if (timing.sectionTimingSource !== 'dryRunCueSheet') {
      missing.push('guideTrackRenderRecipe.timing.sectionTimingSource')
    }

    if (
      typeof timing.description !== 'string' ||
      !timing.description.trim()
    ) {
      missing.push('guideTrackRenderRecipe.timing.description')
    }
  }

  const musicalBed =
    guideTrackRenderRecipe.musicalBed &&
    typeof guideTrackRenderRecipe.musicalBed === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.musicalBed)
      ? (guideTrackRenderRecipe.musicalBed as Record<string, unknown>)
      : null

  if (!musicalBed) {
    missing.push('guideTrackRenderRecipe.musicalBed')
  } else {
    if (musicalBed.primaryInstrument !== 'warm acoustic guitar') {
      missing.push('guideTrackRenderRecipe.musicalBed.primaryInstrument')
    }

    if (
      !Array.isArray(musicalBed.supportInstruments) ||
      musicalBed.supportInstruments.length === 0
    ) {
      missing.push('guideTrackRenderRecipe.musicalBed.supportInstruments')
    }

    if (
      typeof musicalBed.description !== 'string' ||
      !musicalBed.description.trim()
    ) {
      missing.push('guideTrackRenderRecipe.musicalBed.description')
    }
  }

  const chordHandling =
    guideTrackRenderRecipe.chordHandling &&
    typeof guideTrackRenderRecipe.chordHandling === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.chordHandling)
      ? (guideTrackRenderRecipe.chordHandling as Record<string, unknown>)
      : null

  if (!chordHandling) {
    missing.push('guideTrackRenderRecipe.chordHandling')
  } else {
    if (chordHandling.source !== 'rendererPayload.chordSections') {
      missing.push('guideTrackRenderRecipe.chordHandling.source')
    }

    if (
      typeof chordHandling.description !== 'string' ||
      !chordHandling.description.trim()
    ) {
      missing.push('guideTrackRenderRecipe.chordHandling.description')
    }
  }

  const vocalGuide =
    guideTrackRenderRecipe.vocalGuide &&
    typeof guideTrackRenderRecipe.vocalGuide === 'object' &&
    !Array.isArray(guideTrackRenderRecipe.vocalGuide)
      ? (guideTrackRenderRecipe.vocalGuide as Record<string, unknown>)
      : null

  if (!vocalGuide) {
    missing.push('guideTrackRenderRecipe.vocalGuide')
  } else {
    if (vocalGuide.status !== 'placeholder-only') {
      missing.push('guideTrackRenderRecipe.vocalGuide.status')
    }

    if (
      typeof vocalGuide.description !== 'string' ||
      !vocalGuide.description.trim()
    ) {
      missing.push('guideTrackRenderRecipe.vocalGuide.description')
    }
  }

  if (
    !Array.isArray(guideTrackRenderRecipe.mixPriorities) ||
    guideTrackRenderRecipe.mixPriorities.length === 0
  ) {
    missing.push('guideTrackRenderRecipe.mixPriorities')
  }

  if (
    !Array.isArray(guideTrackRenderRecipe.completionCriteria) ||
    guideTrackRenderRecipe.completionCriteria.length === 0
  ) {
    missing.push('guideTrackRenderRecipe.completionCriteria')
  }
}

const chordReferenceRenderRecipe =
  pkg.chordReferenceRenderRecipe &&
  typeof pkg.chordReferenceRenderRecipe === 'object' &&
  !Array.isArray(pkg.chordReferenceRenderRecipe)
    ? (pkg.chordReferenceRenderRecipe as Record<string, unknown>)
    : null

if (!chordReferenceRenderRecipe) {
  missing.push('chordReferenceRenderRecipe')
} else {
  if (
    chordReferenceRenderRecipe.recipeStatus !==
    'dry-run-chord-reference-recipe-declared'
  ) {
    missing.push('chordReferenceRenderRecipe.recipeStatus')
  }

  if (chordReferenceRenderRecipe.targetKey !== 'chordReferenceTrack') {
    missing.push('chordReferenceRenderRecipe.targetKey')
  }

  if (chordReferenceRenderRecipe.outputStatus !== 'not-generated') {
    missing.push('chordReferenceRenderRecipe.outputStatus')
  }

  if (
    typeof chordReferenceRenderRecipe.rendererRequirement !== 'string' ||
    !chordReferenceRenderRecipe.rendererRequirement.trim()
  ) {
    missing.push('chordReferenceRenderRecipe.rendererRequirement')
  }

  const countIn =
    chordReferenceRenderRecipe.countIn &&
    typeof chordReferenceRenderRecipe.countIn === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.countIn)
      ? (chordReferenceRenderRecipe.countIn as Record<string, unknown>)
      : null

  if (!countIn) {
    missing.push('chordReferenceRenderRecipe.countIn')
  } else {
    if (countIn.enabled !== true) {
      missing.push('chordReferenceRenderRecipe.countIn.enabled')
    }

    if (typeof countIn.bars !== 'number' || countIn.bars <= 0) {
      missing.push('chordReferenceRenderRecipe.countIn.bars')
    }

    if (
      typeof countIn.description !== 'string' ||
      !countIn.description.trim()
    ) {
      missing.push('chordReferenceRenderRecipe.countIn.description')
    }
  }

  const timing =
    chordReferenceRenderRecipe.timing &&
    typeof chordReferenceRenderRecipe.timing === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.timing)
      ? (chordReferenceRenderRecipe.timing as Record<string, unknown>)
      : null

  if (!timing) {
    missing.push('chordReferenceRenderRecipe.timing')
  } else {
    if (timing.tempoSource !== 'audioPreviewSpec') {
      missing.push('chordReferenceRenderRecipe.timing.tempoSource')
    }

    if (timing.sectionTimingSource !== 'dryRunCueSheet') {
      missing.push('chordReferenceRenderRecipe.timing.sectionTimingSource')
    }

    if (
      typeof timing.description !== 'string' ||
      !timing.description.trim()
    ) {
      missing.push('chordReferenceRenderRecipe.timing.description')
    }
  }

  const chordSource =
    chordReferenceRenderRecipe.chordSource &&
    typeof chordReferenceRenderRecipe.chordSource === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.chordSource)
      ? (chordReferenceRenderRecipe.chordSource as Record<string, unknown>)
      : null

  if (!chordSource) {
    missing.push('chordReferenceRenderRecipe.chordSource')
  } else {
    if (chordSource.source !== 'rendererPayload.chordSections') {
      missing.push('chordReferenceRenderRecipe.chordSource.source')
    }

    if (
      typeof chordSource.description !== 'string' ||
      !chordSource.description.trim()
    ) {
      missing.push('chordReferenceRenderRecipe.chordSource.description')
    }
  }

  const voicing =
    chordReferenceRenderRecipe.voicing &&
    typeof chordReferenceRenderRecipe.voicing === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.voicing)
      ? (chordReferenceRenderRecipe.voicing as Record<string, unknown>)
      : null

  if (!voicing) {
    missing.push('chordReferenceRenderRecipe.voicing')
  } else {
    if (voicing.primaryInstrument !== 'clean acoustic guitar or simple piano') {
      missing.push('chordReferenceRenderRecipe.voicing.primaryInstrument')
    }

    if (voicing.density !== 'sparse') {
      missing.push('chordReferenceRenderRecipe.voicing.density')
    }

    if (
      typeof voicing.description !== 'string' ||
      !voicing.description.trim()
    ) {
      missing.push('chordReferenceRenderRecipe.voicing.description')
    }
  }

  const sectionMarkers =
    chordReferenceRenderRecipe.sectionMarkers &&
    typeof chordReferenceRenderRecipe.sectionMarkers === 'object' &&
    !Array.isArray(chordReferenceRenderRecipe.sectionMarkers)
      ? (chordReferenceRenderRecipe.sectionMarkers as Record<string, unknown>)
      : null

  if (!sectionMarkers) {
    missing.push('chordReferenceRenderRecipe.sectionMarkers')
  } else {
    if (sectionMarkers.enabled !== true) {
      missing.push('chordReferenceRenderRecipe.sectionMarkers.enabled')
    }

    if (
      typeof sectionMarkers.description !== 'string' ||
      !sectionMarkers.description.trim()
    ) {
      missing.push('chordReferenceRenderRecipe.sectionMarkers.description')
    }
  }

  if (
    !Array.isArray(chordReferenceRenderRecipe.mixPriorities) ||
    chordReferenceRenderRecipe.mixPriorities.length === 0
  ) {
    missing.push('chordReferenceRenderRecipe.mixPriorities')
  }

  if (
    !Array.isArray(chordReferenceRenderRecipe.completionCriteria) ||
    chordReferenceRenderRecipe.completionCriteria.length === 0
  ) {
    missing.push('chordReferenceRenderRecipe.completionCriteria')
  }
}

const vocalGuideRenderRecipe =
  pkg.vocalGuideRenderRecipe &&
  typeof pkg.vocalGuideRenderRecipe === 'object' &&
  !Array.isArray(pkg.vocalGuideRenderRecipe)
    ? (pkg.vocalGuideRenderRecipe as Record<string, unknown>)
    : null

if (!vocalGuideRenderRecipe) {
  missing.push('vocalGuideRenderRecipe')
} else {
  if (
    vocalGuideRenderRecipe.recipeStatus !==
    'dry-run-vocal-guide-recipe-declared'
  ) {
    missing.push('vocalGuideRenderRecipe.recipeStatus')
  }

  if (vocalGuideRenderRecipe.targetKey !== 'vocalGuideTrack') {
    missing.push('vocalGuideRenderRecipe.targetKey')
  }

  if (vocalGuideRenderRecipe.targetSelection !== 'optional') {
    missing.push('vocalGuideRenderRecipe.targetSelection')
  }

  if (vocalGuideRenderRecipe.outputStatus !== 'not-generated') {
    missing.push('vocalGuideRenderRecipe.outputStatus')
  }

  if (
    typeof vocalGuideRenderRecipe.rendererRequirement !== 'string' ||
    !vocalGuideRenderRecipe.rendererRequirement.trim()
  ) {
    missing.push('vocalGuideRenderRecipe.rendererRequirement')
  }

  if (
    !Array.isArray(vocalGuideRenderRecipe.activationRequirements) ||
    vocalGuideRenderRecipe.activationRequirements.length === 0
  ) {
    missing.push('vocalGuideRenderRecipe.activationRequirements')
  }

  const countIn =
    vocalGuideRenderRecipe.countIn &&
    typeof vocalGuideRenderRecipe.countIn === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.countIn)
      ? (vocalGuideRenderRecipe.countIn as Record<string, unknown>)
      : null

  if (!countIn) {
    missing.push('vocalGuideRenderRecipe.countIn')
  } else {
    if (countIn.enabled !== true) {
      missing.push('vocalGuideRenderRecipe.countIn.enabled')
    }

    if (typeof countIn.bars !== 'number' || countIn.bars <= 0) {
      missing.push('vocalGuideRenderRecipe.countIn.bars')
    }

    if (
      typeof countIn.description !== 'string' ||
      !countIn.description.trim()
    ) {
      missing.push('vocalGuideRenderRecipe.countIn.description')
    }
  }

  const timing =
    vocalGuideRenderRecipe.timing &&
    typeof vocalGuideRenderRecipe.timing === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.timing)
      ? (vocalGuideRenderRecipe.timing as Record<string, unknown>)
      : null

  if (!timing) {
    missing.push('vocalGuideRenderRecipe.timing')
  } else {
    if (timing.tempoSource !== 'audioPreviewSpec') {
      missing.push('vocalGuideRenderRecipe.timing.tempoSource')
    }

    if (timing.sectionTimingSource !== 'dryRunCueSheet') {
      missing.push('vocalGuideRenderRecipe.timing.sectionTimingSource')
    }

    if (
      typeof timing.description !== 'string' ||
      !timing.description.trim()
    ) {
      missing.push('vocalGuideRenderRecipe.timing.description')
    }
  }

  const melodySource =
    vocalGuideRenderRecipe.melodySource &&
    typeof vocalGuideRenderRecipe.melodySource === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.melodySource)
      ? (vocalGuideRenderRecipe.melodySource as Record<string, unknown>)
      : null

  if (!melodySource) {
    missing.push('vocalGuideRenderRecipe.melodySource')
  } else {
    if (melodySource.status !== 'not-provided') {
      missing.push('vocalGuideRenderRecipe.melodySource.status')
    }

    if (
      !Array.isArray(melodySource.acceptedSources) ||
      melodySource.acceptedSources.length === 0
    ) {
      missing.push('vocalGuideRenderRecipe.melodySource.acceptedSources')
    }

    if (
      typeof melodySource.description !== 'string' ||
      !melodySource.description.trim()
    ) {
      missing.push('vocalGuideRenderRecipe.melodySource.description')
    }
  }

  const vocalStyle =
    vocalGuideRenderRecipe.vocalStyle &&
    typeof vocalGuideRenderRecipe.vocalStyle === 'object' &&
    !Array.isArray(vocalGuideRenderRecipe.vocalStyle)
      ? (vocalGuideRenderRecipe.vocalStyle as Record<string, unknown>)
      : null

  if (!vocalStyle) {
    missing.push('vocalGuideRenderRecipe.vocalStyle')
  } else {
    if (vocalStyle.status !== 'not-selected') {
      missing.push('vocalGuideRenderRecipe.vocalStyle.status')
    }

    if (
      typeof vocalStyle.defaultReference !== 'string' ||
      !vocalStyle.defaultReference.trim()
    ) {
      missing.push('vocalGuideRenderRecipe.vocalStyle.defaultReference')
    }

    if (
      typeof vocalStyle.description !== 'string' ||
      !vocalStyle.description.trim()
    ) {
      missing.push('vocalGuideRenderRecipe.vocalStyle.description')
    }
  }

  if (
    !Array.isArray(vocalGuideRenderRecipe.mixPriorities) ||
    vocalGuideRenderRecipe.mixPriorities.length === 0
  ) {
    missing.push('vocalGuideRenderRecipe.mixPriorities')
  }

  if (
    !Array.isArray(vocalGuideRenderRecipe.completionCriteria) ||
    vocalGuideRenderRecipe.completionCriteria.length === 0
  ) {
    missing.push('vocalGuideRenderRecipe.completionCriteria')
  }
}


  const requiredObjects: Array<[string, unknown]> = [
    ['renderJob', pkg.renderJob],
    ['dryRunRenderPlan', pkg.dryRunRenderPlan],
    ['dryRunRenderPlanValidation', pkg.dryRunRenderPlanValidation],
    ['dryRunCueSheetValidation', pkg.dryRunCueSheetValidation],
    ['dryRunRenderManifest', pkg.dryRunRenderManifest],
    ['dryRunRenderManifestValidation', pkg.dryRunRenderManifestValidation],
    ['dryRunHandoffBundle', pkg.dryRunHandoffBundle],
    ['dryRunHandoffBundleValidation', pkg.dryRunHandoffBundleValidation],
  ]

  const clickTrackRenderRecipe =
  pkg.clickTrackRenderRecipe &&
  typeof pkg.clickTrackRenderRecipe === 'object' &&
  !Array.isArray(pkg.clickTrackRenderRecipe)
    ? (pkg.clickTrackRenderRecipe as Record<string, unknown>)
    : null

if (!clickTrackRenderRecipe) {
  missing.push('clickTrackRenderRecipe')
} else {
  if (
    clickTrackRenderRecipe.recipeStatus !==
    'dry-run-click-track-recipe-declared'
  ) {
    missing.push('clickTrackRenderRecipe.recipeStatus')
  }

  if (clickTrackRenderRecipe.targetKey !== 'clickTrack') {
    missing.push('clickTrackRenderRecipe.targetKey')
  }

  if (clickTrackRenderRecipe.outputStatus !== 'not-generated') {
    missing.push('clickTrackRenderRecipe.outputStatus')
  }

  if (
    typeof clickTrackRenderRecipe.rendererRequirement !== 'string' ||
    !clickTrackRenderRecipe.rendererRequirement.trim()
  ) {
    missing.push('clickTrackRenderRecipe.rendererRequirement')
  }

  const countIn =
    clickTrackRenderRecipe.countIn &&
    typeof clickTrackRenderRecipe.countIn === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.countIn)
      ? (clickTrackRenderRecipe.countIn as Record<string, unknown>)
      : null

  if (!countIn) {
    missing.push('clickTrackRenderRecipe.countIn')
  } else {
    if (countIn.enabled !== true) {
      missing.push('clickTrackRenderRecipe.countIn.enabled')
    }

    if (typeof countIn.bars !== 'number' || countIn.bars <= 0) {
      missing.push('clickTrackRenderRecipe.countIn.bars')
    }

    if (
      typeof countIn.description !== 'string' ||
      !countIn.description.trim()
    ) {
      missing.push('clickTrackRenderRecipe.countIn.description')
    }
  }

  const timing =
    clickTrackRenderRecipe.timing &&
    typeof clickTrackRenderRecipe.timing === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.timing)
      ? (clickTrackRenderRecipe.timing as Record<string, unknown>)
      : null

  if (!timing) {
    missing.push('clickTrackRenderRecipe.timing')
  } else {
    if (timing.tempoSource !== 'audioPreviewSpec') {
      missing.push('clickTrackRenderRecipe.timing.tempoSource')
    }

    if (timing.sectionTimingSource !== 'dryRunCueSheet') {
      missing.push('clickTrackRenderRecipe.timing.sectionTimingSource')
    }

    if (
      typeof timing.description !== 'string' ||
      !timing.description.trim()
    ) {
      missing.push('clickTrackRenderRecipe.timing.description')
    }
  }

  const clickSound =
    clickTrackRenderRecipe.clickSound &&
    typeof clickTrackRenderRecipe.clickSound === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.clickSound)
      ? (clickTrackRenderRecipe.clickSound as Record<string, unknown>)
      : null

  if (!clickSound) {
    missing.push('clickTrackRenderRecipe.clickSound')
  } else {
    if (clickSound.downbeatEmphasis !== true) {
      missing.push('clickTrackRenderRecipe.clickSound.downbeatEmphasis')
    }

    if (clickSound.subdivision !== 'quarter-note') {
      missing.push('clickTrackRenderRecipe.clickSound.subdivision')
    }

    if (
      typeof clickSound.description !== 'string' ||
      !clickSound.description.trim()
    ) {
      missing.push('clickTrackRenderRecipe.clickSound.description')
    }
  }

  const sectionMarkers =
    clickTrackRenderRecipe.sectionMarkers &&
    typeof clickTrackRenderRecipe.sectionMarkers === 'object' &&
    !Array.isArray(clickTrackRenderRecipe.sectionMarkers)
      ? (clickTrackRenderRecipe.sectionMarkers as Record<string, unknown>)
      : null

  if (!sectionMarkers) {
    missing.push('clickTrackRenderRecipe.sectionMarkers')
  } else {
    if (sectionMarkers.enabled !== true) {
      missing.push('clickTrackRenderRecipe.sectionMarkers.enabled')
    }

    if (
      typeof sectionMarkers.description !== 'string' ||
      !sectionMarkers.description.trim()
    ) {
      missing.push('clickTrackRenderRecipe.sectionMarkers.description')
    }
  }

  if (
    !Array.isArray(clickTrackRenderRecipe.mixPriorities) ||
    clickTrackRenderRecipe.mixPriorities.length === 0
  ) {
    missing.push('clickTrackRenderRecipe.mixPriorities')
  }

  if (
    !Array.isArray(clickTrackRenderRecipe.completionCriteria) ||
    clickTrackRenderRecipe.completionCriteria.length === 0
  ) {
    missing.push('clickTrackRenderRecipe.completionCriteria')
  }
}

  requiredObjects.forEach(([label, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      missing.push(label)
    }
  })

  if (!Array.isArray(pkg.notes) || pkg.notes.length === 0) {
    missing.push('notes')
  }

  return {
    ready: missing.length === 0,
    missing,
    detail:
      missing.length === 0
       ? 'Dry-run artefact package is validated, confirms no audio has been generated, lists real-render readiness blockers, declares future render targets, and includes guide-track, click-track, chord-reference, and optional vocal-guide render recipes.'
        : `Dry-run artefact package needs review: ${missing.join(', ')}`,
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

const dryRunHandoffBundleValidation =
  validateDryRunHandoffBundle(dryRunHandoffBundle)
const dryRunArtifactPackage = buildDryRunArtifactPackage({
  renderJob,
  dryRunRenderPlan,
  dryRunRenderPlanValidation,
  dryRunCueSheetValidation,
  dryRunRenderManifest,
  dryRunRenderManifestValidation,
  dryRunHandoffBundle,
  dryRunHandoffBundleValidation,
})

const dryRunArtifactPackageValidation =
  validateDryRunArtifactPackage(dryRunArtifactPackage)

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
      dryRunHandoffBundleValidation,
      dryRunArtifactPackage,
      dryRunArtifactPackageValidation,
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