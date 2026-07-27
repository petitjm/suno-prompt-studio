export type ClickTrackWavRenderInput = {
  renderJobId: string
  targetKey: 'clickTrack'
  tempoBpm: number
  sampleRateHz: 44100
  outputFormat: 'wav'
  storageProvider: 'browser-download'
  countInBars: number
  totalDurationSeconds: number
}

export type ClickTrackWavRenderBlockedResult = {
  ok: false
  status: 'blocked'
  audioGenerated: false
  reason: string
  requiredBeforeEnablement: string[]
}

export type ClickTrackWavRenderResult = ClickTrackWavRenderBlockedResult

export function renderClickTrackWav(
  input: ClickTrackWavRenderInput,
): ClickTrackWavRenderResult {
  const requiredBeforeEnablement = [
    'Implement PCM sample generation for click accents.',
    'Implement WAV header writing.',
    'Confirm browser-download delivery contract.',
    'Add route-level safety checks so failed renders cannot be marked generated.',
    'Add an audible browser/manual test before enabling real output.',
  ]

  if (input.targetKey !== 'clickTrack') {
    return {
      ok: false,
      status: 'blocked',
      audioGenerated: false,
      reason: 'Only the clickTrack target is allowed for the first renderer.',
      requiredBeforeEnablement,
    }
  }

  if (input.outputFormat !== 'wav') {
    return {
      ok: false,
      status: 'blocked',
      audioGenerated: false,
      reason: 'Only WAV output is allowed for the first renderer candidate.',
      requiredBeforeEnablement,
    }
  }

  if (input.sampleRateHz !== 44100) {
    return {
      ok: false,
      status: 'blocked',
      audioGenerated: false,
      reason: 'Only 44.1 kHz sample rate is allowed for the first renderer candidate.',
      requiredBeforeEnablement,
    }
  }

  if (input.storageProvider !== 'browser-download') {
    return {
      ok: false,
      status: 'blocked',
      audioGenerated: false,
      reason:
        'Only browser-download delivery is allowed for the first renderer candidate.',
      requiredBeforeEnablement,
    }
  }

  return {
    ok: false,
    status: 'blocked',
    audioGenerated: false,
    reason:
      'Click-track WAV renderer helper is declared but intentionally not implemented or connected yet.',
    requiredBeforeEnablement,
  }
}