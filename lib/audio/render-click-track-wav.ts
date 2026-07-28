export type ClickTrackCueSheetSection = {
  order: number;
  section: string;
  estimatedBars: number;
  estimatedSeconds: number;
  startSeconds: number;
  endSeconds: number;
};

export type ClickTrackWavRenderInput = {
  renderJobId: string;
  targetKey: "clickTrack";
  tempoBpm: number;
  sampleRateHz: 44100;
  outputFormat: "wav";
  storageProvider: "browser-download";
  countInBars: number;
  totalDurationSeconds: number;
  totalBars?: number;
  totalEstimatedSeconds?: number;
  cueSheetSectionCount?: number;
  cueSheetSections?: ClickTrackCueSheetSection[];
};

export type ClickTrackWavDownloadArtifact = {
  status: "created-not-delivered";
  audioDelivered: false;
  filename: string;
  contentType: "audio/wav";
  byteLength: number;
  bytes: Uint8Array;
};

export type ClickTrackWavDownloadArtifactSummary = {
  status: "created-not-delivered";
  audioDelivered: false;
  filename: string;
  contentType: "audio/wav";
  byteLength: number;
  bytesIncludedInResponse: false;
};

export type ClickTrackWavRenderBlockedResult = {
  ok: false;
  status: "blocked";
  audioGenerated: false;
  reason: string;
  requiredBeforeEnablement: string[];
  preview: ClickTrackWavPreview;
  downloadArtifactSummary: ClickTrackWavDownloadArtifactSummary;
};

export type ClickTrackWavRenderSuccessResult = {
  ok: true;
  status: "ready-for-download";
  audioGenerated: true;
  audioDelivered: false;
  reason: string;
  preview: ClickTrackWavPreview;
  downloadArtifactSummary: ClickTrackWavDownloadArtifactSummary;
  downloadArtifact: ClickTrackWavDownloadArtifact;
};

export type ClickTrackWavPrimitiveSelfCheck = {
  status: "passed" | "failed";
  wavBytesCreated: boolean;
  audioDelivered: false;
  byteLength: number;
  riffHeader: string;
  waveHeader: string;
  dataHeader: string;
};

export type ClickTrackWavPreview = {
  renderJobId: string;
  targetKey: "clickTrack";
  tempoBpm: number;
  sampleRateHz: 44100;
  outputFormat: "wav";
  storageProvider: "browser-download";
  countInBars: number;
  totalDurationSeconds: number;
  songDurationSeconds: number;
  countInDurationSeconds: number;
  totalBars: number | null;
  channelCount: 1;
  bitsPerSample: 16;
  totalSamples: number;
  estimatedWavByteLength: number;
  firstBeatTimesSeconds: number[];
  primitiveSelfCheck: ClickTrackWavPrimitiveSelfCheck;
  implementationStatus: "wav-primitives-ready-render-still-blocked";
  cueSheetSectionCount: number;
  sectionStartTimesSeconds: number[];
  sectionSummaries: {
    order: number;
    section: string;
    estimatedBars: number;
    startSeconds: number;
    endSeconds: number;
  }[];
};

export type ClickTrackWavRenderResult =
  ClickTrackWavRenderBlockedResult | ClickTrackWavRenderSuccessResult;

const CHANNEL_COUNT = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
function getResolvedTotalDurationSeconds(
  input: ClickTrackWavRenderInput,
): number {
  const beatsPerBar = 4;
  const secondsPerBar =
    input.tempoBpm > 0 && Number.isFinite(input.tempoBpm)
      ? (60 / input.tempoBpm) * beatsPerBar
      : 0;

  if (
    typeof input.totalEstimatedSeconds === "number" &&
    Number.isFinite(input.totalEstimatedSeconds) &&
    input.totalEstimatedSeconds > 0
  ) {
    return input.totalEstimatedSeconds;
  }

  if (
    typeof input.totalBars === "number" &&
    Number.isFinite(input.totalBars) &&
    input.totalBars > 0 &&
    secondsPerBar > 0
  ) {
    return input.totalBars * secondsPerBar;
  }

  return input.totalDurationSeconds;
}

export function createClickTrackWavPreview(
  input: ClickTrackWavRenderInput,
): ClickTrackWavPreview {
  const songDurationSeconds = getResolvedTotalDurationSeconds(input);
  const countInDurationSeconds = getCountInDurationSeconds(input);
  const totalDurationSeconds = songDurationSeconds + countInDurationSeconds;
  const totalSamples = Math.max(
    0,
    Math.round(totalDurationSeconds * input.sampleRateHz),
  );
  const sectionStartTimesSeconds = getSectionStartTimesSeconds(input).map(
    (startSeconds) =>
      Number((startSeconds + countInDurationSeconds).toFixed(3)),
  );
  const sectionSummaries = getSectionSummaries(input).map((section) => ({
    ...section,
    startSeconds: Number(
      (section.startSeconds + countInDurationSeconds).toFixed(3),
    ),
    endSeconds: Number(
      (section.endSeconds + countInDurationSeconds).toFixed(3),
    ),
  }));

  return {
    renderJobId: input.renderJobId,
    targetKey: input.targetKey,
    tempoBpm: input.tempoBpm,
    sampleRateHz: input.sampleRateHz,
    outputFormat: input.outputFormat,
    storageProvider: input.storageProvider,
    countInBars: input.countInBars,
    totalDurationSeconds,
    songDurationSeconds,
    countInDurationSeconds,
    totalBars:
      typeof input.totalBars === "number" && Number.isFinite(input.totalBars)
        ? input.totalBars
        : null,
    channelCount: CHANNEL_COUNT,
    bitsPerSample: BITS_PER_SAMPLE,
    totalSamples,
    estimatedWavByteLength: 44 + totalSamples * BYTES_PER_SAMPLE,
    firstBeatTimesSeconds: getFirstBeatTimesSeconds(input.tempoBpm, 8),
    cueSheetSectionCount: sectionStartTimesSeconds.length,
    sectionStartTimesSeconds,
    sectionSummaries,
    primitiveSelfCheck: createClickTrackWavPrimitiveSelfCheck(input),
    implementationStatus: "wav-primitives-ready-render-still-blocked",
  };
}

function getCountInDurationSeconds(input: ClickTrackWavRenderInput): number {
  const beatsPerBar = 4;

  if (
    typeof input.countInBars !== "number" ||
    !Number.isFinite(input.countInBars) ||
    input.countInBars <= 0 ||
    input.tempoBpm <= 0 ||
    !Number.isFinite(input.tempoBpm)
  ) {
    return 0;
  }

  return input.countInBars * beatsPerBar * (60 / input.tempoBpm);
}

function getSectionStartTimesSeconds(
  input: ClickTrackWavRenderInput,
): number[] {
  return Array.isArray(input.cueSheetSections)
    ? input.cueSheetSections
        .map((section) => section.startSeconds)
        .filter(
          (startSeconds) => Number.isFinite(startSeconds) && startSeconds >= 0,
        )
    : [];
}

function getSectionSummaries(input: ClickTrackWavRenderInput) {
  return Array.isArray(input.cueSheetSections)
    ? input.cueSheetSections.map((section) => ({
        order: section.order,
        section: section.section,
        estimatedBars: section.estimatedBars,
        startSeconds: section.startSeconds,
        endSeconds: section.endSeconds,
      }))
    : [];
}

function isNearSectionStartSample(
  sampleIndex: number,
  sectionStartSamples: number[],
  toleranceSamples: number,
): boolean {
  return sectionStartSamples.some(
    (sectionStartSample) =>
      Math.abs(sampleIndex - sectionStartSample) <= toleranceSamples,
  );
}

export function createClickTrackPcm16Samples(
  input: ClickTrackWavRenderInput,
): Int16Array {
  const songDurationSeconds = getResolvedTotalDurationSeconds(input);
  const countInDurationSeconds = getCountInDurationSeconds(input);
  const totalDurationSeconds = songDurationSeconds + countInDurationSeconds;
  const totalSamples = Math.max(
    0,
    Math.round(totalDurationSeconds * input.sampleRateHz),
  );
  const samples = new Int16Array(totalSamples);

  if (input.tempoBpm <= 0 || !Number.isFinite(input.tempoBpm)) {
    return samples;
  }

  const secondsPerBeat = 60 / input.tempoBpm;
  const samplesPerBeat = Math.max(
    1,
    Math.round(secondsPerBeat * input.sampleRateHz),
  );
  const clickLengthSamples = Math.max(
    1,
    Math.round(input.sampleRateHz * 0.025),
  );
  const sectionClickLengthSamples = Math.max(
    1,
    Math.round(input.sampleRateHz * 0.06),
  );
  const accentAmplitude = 22000;
  const normalAmplitude = 14000;
  const sectionAmplitude = 28000;
  const clickFrequencyHz = 1800;
  const sectionClickFrequencyHz = 1200;
  const sectionStartSamples = getSectionStartTimesSeconds(input).map(
    (startSeconds) =>
      Math.round((startSeconds + countInDurationSeconds) * input.sampleRateHz),
  );
  const sectionStartToleranceSamples = Math.max(
    1,
    Math.round(input.sampleRateHz * 0.005),
  );

  for (
    let beatStartSample = 0, beatIndex = 0;
    beatStartSample < totalSamples;
    beatStartSample += samplesPerBeat, beatIndex += 1
  ) {
    const isDownbeat = beatIndex % 4 === 0;
    const isSectionStart = isNearSectionStartSample(
      beatStartSample,
      sectionStartSamples,
      sectionStartToleranceSamples,
    );
    const amplitude = isSectionStart
      ? sectionAmplitude
      : isDownbeat
        ? accentAmplitude
        : normalAmplitude;
    const activeClickLengthSamples = isSectionStart
      ? sectionClickLengthSamples
      : clickLengthSamples;
    const activeClickFrequencyHz = isSectionStart
      ? sectionClickFrequencyHz
      : clickFrequencyHz;

    for (let offset = 0; offset < activeClickLengthSamples; offset += 1) {
      const sampleIndex = beatStartSample + offset;

      if (sampleIndex >= totalSamples) {
        break;
      }

      const fade = 1 - offset / activeClickLengthSamples;
      const phase =
        (2 * Math.PI * activeClickFrequencyHz * sampleIndex) /
        input.sampleRateHz;

      samples[sampleIndex] = Math.round(Math.sin(phase) * amplitude * fade);
    }
  }

  return samples;
}

export function encodePcm16MonoWav(
  samples: Int16Array,
  sampleRateHz: 44100,
): Uint8Array {
  const dataSize = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");

  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNEL_COUNT, true);
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, sampleRateHz * CHANNEL_COUNT * BYTES_PER_SAMPLE, true);
  view.setUint16(32, CHANNEL_COUNT * BYTES_PER_SAMPLE, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let writeOffset = 44;

  for (const sample of samples) {
    view.setInt16(writeOffset, sample, true);
    writeOffset += BYTES_PER_SAMPLE;
  }

  return new Uint8Array(buffer);
}

export function createClickTrackWavBytes(
  input: ClickTrackWavRenderInput,
): Uint8Array {
  return encodePcm16MonoWav(
    createClickTrackPcm16Samples(input),
    input.sampleRateHz,
  );
}

export function createClickTrackWavDownloadArtifact(
  input: ClickTrackWavRenderInput,
): ClickTrackWavDownloadArtifact {
  const bytes = createClickTrackWavBytes(input);

  return {
    status: "created-not-delivered",
    audioDelivered: false,
    filename: `${sanitizeFilename(input.renderJobId)}-${input.targetKey}-${sanitizeFilename(
      String(input.tempoBpm),
    )}bpm.wav`,
    contentType: "audio/wav",
    byteLength: bytes.length,
    bytes,
  };
}

export function createClickTrackWavDownloadArtifactSummary(
  input: ClickTrackWavRenderInput,
): ClickTrackWavDownloadArtifactSummary {
  const artifact = createClickTrackWavDownloadArtifact(input);

  return {
    status: artifact.status,
    audioDelivered: artifact.audioDelivered,
    filename: artifact.filename,
    contentType: artifact.contentType,
    byteLength: artifact.byteLength,
    bytesIncludedInResponse: false,
  };
}

export function createReadyClickTrackWavDownload(
  input: ClickTrackWavRenderInput,
): ClickTrackWavRenderSuccessResult {
  const preview = createClickTrackWavPreview(input);
  const downloadArtifact = createClickTrackWavDownloadArtifact(input);
  const downloadArtifactSummary =
    createClickTrackWavDownloadArtifactSummary(input);

  return {
    ok: true,
    status: "ready-for-download",
    audioGenerated: true,
    audioDelivered: false,
    reason:
      "Click-track WAV bytes are ready for browser-download delivery, but the route has not delivered them yet.",
    preview,
    downloadArtifactSummary,
    downloadArtifact,
  };
}

export function renderClickTrackWav(
  input: ClickTrackWavRenderInput,
): ClickTrackWavRenderResult {
  const preview = createClickTrackWavPreview(input);

  const downloadArtifactSummary =
    createClickTrackWavDownloadArtifactSummary(input);

  const requiredBeforeEnablement = [
    "Connect createClickTrackWavBytes to the real-render route.",
    "Return the WAV bytes through a deliberate browser-download response.",
    "Confirm browser-download delivery contract.",
    "Add route-level safety checks so failed renders cannot be marked generated.",
    "Add an audible browser/manual test before enabling real output.",
  ];

  if (input.targetKey !== "clickTrack") {
    return {
      ok: false,
      status: "blocked",
      audioGenerated: false,
      reason: "Only the clickTrack target is allowed for the first renderer.",
      requiredBeforeEnablement,
      preview,
      downloadArtifactSummary,
    };
  }

  if (input.outputFormat !== "wav") {
    return {
      ok: false,
      status: "blocked",
      audioGenerated: false,
      reason: "Only WAV output is allowed for the first renderer candidate.",
      requiredBeforeEnablement,
      preview,
      downloadArtifactSummary,
    };
  }

  if (input.sampleRateHz !== 44100) {
    return {
      ok: false,
      status: "blocked",
      audioGenerated: false,
      reason:
        "Only 44.1 kHz sample rate is allowed for the first renderer candidate.",
      requiredBeforeEnablement,
      preview,
      downloadArtifactSummary,
    };
  }

  if (input.storageProvider !== "browser-download") {
    return {
      ok: false,
      status: "blocked",
      audioGenerated: false,
      reason:
        "Only browser-download delivery is allowed for the first renderer candidate.",
      requiredBeforeEnablement,
      preview,
      downloadArtifactSummary,
    };
  }

  return {
    ok: false,
    status: "blocked",
    audioGenerated: false,
    reason:
      "Click-track WAV primitives are implemented, but the renderer remains intentionally blocked and is not connected to file output yet.",
    requiredBeforeEnablement,
    preview,
    downloadArtifactSummary,
  };
}

function createClickTrackWavPrimitiveSelfCheck(
  input: ClickTrackWavRenderInput,
): ClickTrackWavPrimitiveSelfCheck {
  const wavBytes = createClickTrackWavBytes(input);
  const riffHeader = readAscii(wavBytes, 0, 4);
  const waveHeader = readAscii(wavBytes, 8, 4);
  const dataHeader = readAscii(wavBytes, 36, 4);

  const passed =
    wavBytes.length > 44 &&
    riffHeader === "RIFF" &&
    waveHeader === "WAVE" &&
    dataHeader === "data";

  return {
    status: passed ? "passed" : "failed",
    wavBytesCreated: wavBytes.length > 44,
    audioDelivered: false,
    byteLength: wavBytes.length,
    riffHeader,
    waveHeader,
    dataHeader,
  };
}

function sanitizeFilename(value: string) {
  const safeValue = value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safeValue || "click-track-render";
}

function getFirstBeatTimesSeconds(
  tempoBpm: number,
  beatCount: number,
): number[] {
  if (tempoBpm <= 0 || !Number.isFinite(tempoBpm)) {
    return [];
  }

  const secondsPerBeat = 60 / tempoBpm;

  return Array.from({ length: beatCount }, (_, index) =>
    Number((index * secondsPerBeat).toFixed(3)),
  );
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  return Array.from(bytes.slice(offset, offset + length))
    .map((byte) => String.fromCharCode(byte))
    .join("");
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
