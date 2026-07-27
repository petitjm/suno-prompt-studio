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
  preview: ClickTrackWavPreview
}

export type ClickTrackWavPrimitiveSelfCheck = {
  status: 'passed' | 'failed'
  wavBytesCreated: boolean
  audioDelivered: false
  byteLength: number
  riffHeader: string
  waveHeader: string
  dataHeader: string
}

export type ClickTrackWavPreview = {
  renderJobId: string
  targetKey: 'clickTrack'
  tempoBpm: number
  sampleRateHz: 44100
  outputFormat: 'wav'
  storageProvider: 'browser-download'
  countInBars: number
  totalDurationSeconds: number
  channelCount: 1
  bitsPerSample: 16
  totalSamples: number
  estimatedWavByteLength: number
  firstBeatTimesSeconds: number[]
  primitiveSelfCheck: ClickTrackWavPrimitiveSelfCheck
  implementationStatus: 'wav-primitives-ready-render-still-blocked'
}

export type ClickTrackWavRenderResult = ClickTrackWavRenderBlockedResult

const CHANNEL_COUNT = 1
const BITS_PER_SAMPLE = 16
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8

export function createClickTrackWavPreview(
  input: ClickTrackWavRenderInput,
): ClickTrackWavPreview {
  const totalSamples = Math.max(
    0,
    Math.round(input.totalDurationSeconds * input.sampleRateHz),
  )

  return {
    renderJobId: input.renderJobId,
    targetKey: input.targetKey,
    tempoBpm: input.tempoBpm,
    sampleRateHz: input.sampleRateHz,
    outputFormat: input.outputFormat,
    storageProvider: input.storageProvider,
    countInBars: input.countInBars,
    totalDurationSeconds: input.totalDurationSeconds,
    channelCount: CHANNEL_COUNT,
    bitsPerSample: BITS_PER_SAMPLE,
    totalSamples,
    estimatedWavByteLength: 44 + totalSamples * BYTES_PER_SAMPLE,
    firstBeatTimesSeconds: getFirstBeatTimesSeconds(input.tempoBpm, 8),
    primitiveSelfCheck: createClickTrackWavPrimitiveSelfCheck(input),
    implementationStatus: 'wav-primitives-ready-render-still-blocked',
  }
}

export function createClickTrackPcm16Samples(
  input: ClickTrackWavRenderInput,
): Int16Array {
  const totalSamples = Math.max(
    0,
    Math.round(input.totalDurationSeconds * input.sampleRateHz),
  )
  const samples = new Int16Array(totalSamples)

  if (input.tempoBpm <= 0 || !Number.isFinite(input.tempoBpm)) {
    return samples
  }

  const secondsPerBeat = 60 / input.tempoBpm
  const samplesPerBeat = Math.max(
    1,
    Math.round(secondsPerBeat * input.sampleRateHz),
  )
  const clickLengthSamples = Math.max(1, Math.round(input.sampleRateHz * 0.025))
  const accentAmplitude = 22000
  const normalAmplitude = 14000
  const clickFrequencyHz = 1800

  for (
    let beatStartSample = 0, beatIndex = 0;
    beatStartSample < totalSamples;
    beatStartSample += samplesPerBeat, beatIndex += 1
  ) {
    const isDownbeat = beatIndex % 4 === 0
    const amplitude = isDownbeat ? accentAmplitude : normalAmplitude

    for (let offset = 0; offset < clickLengthSamples; offset += 1) {
      const sampleIndex = beatStartSample + offset

      if (sampleIndex >= totalSamples) {
        break
      }

      const fade = 1 - offset / clickLengthSamples
      const phase =
        (2 * Math.PI * clickFrequencyHz * sampleIndex) / input.sampleRateHz

      samples[sampleIndex] = Math.round(Math.sin(phase) * amplitude * fade)
    }
  }

  return samples
}

export function encodePcm16MonoWav(
  samples: Int16Array,
  sampleRateHz: 44100,
): Uint8Array {
  const dataSize = samples.length * BYTES_PER_SAMPLE
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')

  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, CHANNEL_COUNT, true)
  view.setUint32(24, sampleRateHz, true)
  view.setUint32(28, sampleRateHz * CHANNEL_COUNT * BYTES_PER_SAMPLE, true)
  view.setUint16(32, CHANNEL_COUNT * BYTES_PER_SAMPLE, true)
  view.setUint16(34, BITS_PER_SAMPLE, true)

  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let writeOffset = 44

  for (const sample of samples) {
    view.setInt16(writeOffset, sample, true)
    writeOffset += BYTES_PER_SAMPLE
  }

  return new Uint8Array(buffer)
}

export function createClickTrackWavBytes(
  input: ClickTrackWavRenderInput,
): Uint8Array {
  return encodePcm16MonoWav(
    createClickTrackPcm16Samples(input),
    input.sampleRateHz,
  )
}

export function renderClickTrackWav(
  input: ClickTrackWavRenderInput,
): ClickTrackWavRenderResult {
  const preview = createClickTrackWavPreview(input)

  const requiredBeforeEnablement = [
    'Connect createClickTrackWavBytes to the real-render route.',
    'Return the WAV bytes through a deliberate browser-download response.',
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
      preview,
    }
  }

  if (input.outputFormat !== 'wav') {
    return {
      ok: false,
      status: 'blocked',
      audioGenerated: false,
      reason: 'Only WAV output is allowed for the first renderer candidate.',
      requiredBeforeEnablement,
      preview,
    }
  }

  if (input.sampleRateHz !== 44100) {
    return {
      ok: false,
      status: 'blocked',
      audioGenerated: false,
      reason:
        'Only 44.1 kHz sample rate is allowed for the first renderer candidate.',
      requiredBeforeEnablement,
      preview,
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
      preview,
    }
  }

  return {
    ok: false,
    status: 'blocked',
    audioGenerated: false,
    reason:
      'Click-track WAV primitives are implemented, but the renderer remains intentionally blocked and is not connected to file output yet.',
    requiredBeforeEnablement,
    preview,
  }
}

function createClickTrackWavPrimitiveSelfCheck(
  input: ClickTrackWavRenderInput,
): ClickTrackWavPrimitiveSelfCheck {
  const wavBytes = createClickTrackWavBytes(input)
  const riffHeader = readAscii(wavBytes, 0, 4)
  const waveHeader = readAscii(wavBytes, 8, 4)
  const dataHeader = readAscii(wavBytes, 36, 4)

  const passed =
    wavBytes.length > 44 &&
    riffHeader === 'RIFF' &&
    waveHeader === 'WAVE' &&
    dataHeader === 'data'

  return {
    status: passed ? 'passed' : 'failed',
    wavBytesCreated: wavBytes.length > 44,
    audioDelivered: false,
    byteLength: wavBytes.length,
    riffHeader,
    waveHeader,
    dataHeader,
  }
}

function getFirstBeatTimesSeconds(
  tempoBpm: number,
  beatCount: number,
): number[] {
  if (tempoBpm <= 0 || !Number.isFinite(tempoBpm)) {
    return []
  }

  const secondsPerBeat = 60 / tempoBpm

  return Array.from({ length: beatCount }, (_, index) =>
    Number((index * secondsPerBeat).toFixed(3)),
  )
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  return Array.from(bytes.slice(offset, offset + length))
    .map((byte) => String.fromCharCode(byte))
    .join('')
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}