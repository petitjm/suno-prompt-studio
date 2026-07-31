export type ClickTrackCueSheetSection = {
  order: number;
  section: string;
  estimatedBars: number;
  estimatedSeconds: number;
  startSeconds: number;
  endSeconds: number;
};

export type ClickTrackChordMarker = {
  section: string;
  chord?: string;
  timeSeconds: number;
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
  chordMarkers?: ClickTrackChordMarker[];
  includeCountIn?: boolean;
  includeBeatClicks?: boolean;
  includeSectionMarkers?: boolean;
  includeChordMarkers?: boolean;
  includeChordToneGuide?: boolean;
  mixProfile?: "click-track" | "musical-guide";
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
  chordMarkerCount: number;
  chordMarkerTimesSeconds: number[];
  chordMarkerSummaries: {
    section: string;
    chord: string;
    root: string;
    timeSeconds: number;
  }[];
  chordToneGuideSegmentCount: number;
  chordToneGuideStatus: "available" | "not-available";
  chordArpeggioGuideStatus: "available" | "not-available";
  chordArpeggioGuideNoteCount: number;
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
  const sectionStartTimesSeconds =
    input.includeSectionMarkers === false
      ? []
      : getSectionStartTimesSeconds(input).map((startSeconds) =>
          Number((startSeconds + countInDurationSeconds).toFixed(3)),
        );
  const chordMarkerTimesSeconds =
    input.includeChordMarkers === false
      ? []
      : getChordMarkerTimesSeconds(input)
          .map((timeSeconds) =>
            Number((timeSeconds + countInDurationSeconds).toFixed(3)),
          )
          .slice(0, 24);
  const chordMarkerSummaries =
    input.includeChordMarkers === false
      ? []
      : getChordMarkerSummaries(input)
          .map((marker) => ({
            ...marker,
            timeSeconds: Number(
              (marker.timeSeconds + countInDurationSeconds).toFixed(3),
            ),
          }))
          .slice(0, 24);
  const chordToneGuideSegments = getChordToneGuideSegments({
    input,
    countInDurationSeconds,
    totalDurationSeconds,
  });
  const chordArpeggioGuideNoteCount = getChordArpeggioGuideNoteCount({
    segments: chordToneGuideSegments,
    tempoBpm: input.tempoBpm,
  });
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
    chordMarkerCount: getChordMarkerTimesSeconds(input).length,
    chordMarkerTimesSeconds,
    chordMarkerSummaries,
    chordToneGuideSegmentCount: chordToneGuideSegments.length,
    chordToneGuideStatus:
      chordToneGuideSegments.length > 0 ? "available" : "not-available",
    sectionSummaries,
    chordArpeggioGuideStatus:
      chordArpeggioGuideNoteCount > 0 ? "available" : "not-available",
    chordArpeggioGuideNoteCount,
    primitiveSelfCheck: createClickTrackWavPrimitiveSelfCheck(input),
    implementationStatus: "wav-primitives-ready-render-still-blocked",
  };
}

function getCountInDurationSeconds(input: ClickTrackWavRenderInput): number {
  if (input.includeCountIn === false) {
    return 0;
  }

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

function getChordMarkerTimesSeconds(input: ClickTrackWavRenderInput): number[] {
  return Array.isArray(input.chordMarkers)
    ? input.chordMarkers
        .map((marker) => marker.timeSeconds)
        .filter(
          (timeSeconds) => Number.isFinite(timeSeconds) && timeSeconds >= 0,
        )
    : [];
}

function getChordMarkerSummaries(input: ClickTrackWavRenderInput) {
  return Array.isArray(input.chordMarkers)
    ? input.chordMarkers
        .filter((marker) => Number.isFinite(marker.timeSeconds))
        .map((marker) => ({
          section: marker.section,
          chord: marker.chord || "",
          root: getChordRoot(marker.chord || ""),
          timeSeconds: marker.timeSeconds,
        }))
    : [];
}

function getChordRoot(chord: string): string {
  const match = chord.trim().match(/^([A-G](?:#|b)?)/i);

  return match ? match[1].toUpperCase() : "";
}

function getChordRootFrequencyHz(chord: string): number {
  const root = getChordRoot(chord);

  switch (root) {
    case "C":
      return 261.63;
    case "C#":
    case "DB":
      return 277.18;
    case "D":
      return 293.66;
    case "D#":
    case "EB":
      return 311.13;
    case "E":
      return 329.63;
    case "F":
      return 349.23;
    case "F#":
    case "GB":
      return 369.99;
    case "G":
      return 392;
    case "G#":
    case "AB":
      return 415.3;
    case "A":
      return 440;
    case "A#":
    case "BB":
      return 466.16;
    case "B":
      return 493.88;
    default:
      return 392;
  }
}

function getChordRootBassFrequencyHz(chord: string): number {
  return getChordRootFrequencyHz(chord) / 2;
}

function getChordRootSemitone(chord: string): number | null {
  const root = getChordRoot(chord);

  switch (root) {
    case "C":
      return 0;
    case "C#":
    case "DB":
      return 1;
    case "D":
      return 2;
    case "D#":
    case "EB":
      return 3;
    case "E":
      return 4;
    case "F":
      return 5;
    case "F#":
    case "GB":
      return 6;
    case "G":
      return 7;
    case "G#":
    case "AB":
      return 8;
    case "A":
      return 9;
    case "A#":
    case "BB":
      return 10;
    case "B":
      return 11;
    default:
      return null;
  }
}

function getFrequencyFromMidiNote(midiNote: number): number {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

function getChordToneFrequenciesHz(chord: string): number[] {
  const rootSemitone = getChordRootSemitone(chord);

  if (rootSemitone === null) {
    return [getChordRootFrequencyHz(chord)];
  }

  const normalizedChord = chord.trim().toLowerCase();
  const isMinor =
    normalizedChord.includes("m") && !normalizedChord.includes("maj");
  const isDiminished = normalizedChord.includes("dim");
  const isSuspendedSecond = normalizedChord.includes("sus2");
  const isSuspendedFourth = normalizedChord.includes("sus4");

  const intervals = isDiminished
    ? [0, 3, 6]
    : isSuspendedSecond
      ? [0, 2, 7]
      : isSuspendedFourth
        ? [0, 5, 7]
        : isMinor
          ? [0, 3, 7]
          : [0, 4, 7];

  const rootMidiNote = 48 + rootSemitone;

  return intervals.map((interval) =>
    getFrequencyFromMidiNote(rootMidiNote + interval),
  );
}

type ChordToneGuideSegment = {
  startSeconds: number;
  endSeconds: number;
  frequenciesHz: number[];
  bassFrequencyHz: number;
};

function getChordToneGuideSegments({
  input,
  countInDurationSeconds,
  totalDurationSeconds,
}: {
  input: ClickTrackWavRenderInput;
  countInDurationSeconds: number;
  totalDurationSeconds: number;
}): ChordToneGuideSegment[] {
  if (
    input.includeChordToneGuide === false ||
    !Array.isArray(input.chordMarkers) ||
    input.chordMarkers.length === 0
  ) {
    return [];
  }

  const markers = input.chordMarkers
    .filter(
      (marker) =>
        typeof marker.chord === "string" &&
        marker.chord.trim() &&
        Number.isFinite(marker.timeSeconds) &&
        marker.timeSeconds >= 0,
    )
    .map((marker) => ({
      chord: marker.chord || "",
      startSeconds: marker.timeSeconds + countInDurationSeconds,
      frequenciesHz: getChordToneFrequenciesHz(marker.chord || ""),
      bassFrequencyHz: getChordRootBassFrequencyHz(marker.chord || ""),
    }))
    .sort((first, second) => first.startSeconds - second.startSeconds);

  if (markers.length === 0) {
    return [];
  }

  const songStartSeconds = countInDurationSeconds;
  const firstMarker = markers[0];

  const markersWithOpeningChord =
    firstMarker.startSeconds > songStartSeconds
      ? [
          {
            ...firstMarker,
            startSeconds: songStartSeconds,
          },
          ...markers,
        ]
      : markers;

  return markersWithOpeningChord
    .map((marker, index) => {
      const nextMarker = markersWithOpeningChord[index + 1];
      const endSeconds = nextMarker
        ? nextMarker.startSeconds
        : totalDurationSeconds;

      if (endSeconds <= marker.startSeconds) {
        return null;
      }

      return {
        startSeconds: marker.startSeconds,
        endSeconds,
        frequenciesHz: marker.frequenciesHz,
        bassFrequencyHz: marker.bassFrequencyHz,
      };
    })
    .filter((segment): segment is ChordToneGuideSegment => segment !== null);
}

function getChordArpeggioGuideNoteCount({
  segments,
  tempoBpm,
}: {
  segments: ChordToneGuideSegment[];
  tempoBpm: number;
}): number {
  if (tempoBpm <= 0 || !Number.isFinite(tempoBpm)) {
    return 0;
  }

  const secondsPerBeat = 60 / tempoBpm;
  const secondsPerArpeggioNote = secondsPerBeat / 2;

  return segments.reduce((total, segment) => {
    const durationSeconds = segment.endSeconds - segment.startSeconds;

    if (durationSeconds <= 0 || segment.frequenciesHz.length === 0) {
      return total;
    }

    return total + Math.floor(durationSeconds / secondsPerArpeggioNote);
  }, 0);
}

function addToneToSamples({
  samples,
  startSample,
  endSample,
  sampleRateHz,
  amplitude,
  frequencyHz,
}: {
  samples: Int16Array;
  startSample: number;
  endSample: number;
  sampleRateHz: number;
  amplitude: number;
  frequencyHz: number;
}) {
  const safeStartSample = Math.max(0, startSample);
  const safeEndSample = Math.min(samples.length, endSample);
  const lengthSamples = safeEndSample - safeStartSample;

  if (lengthSamples <= 0) {
    return;
  }

  const fadeInSamples = Math.max(1, Math.round(sampleRateHz * 0.04));
  const fadeOutSamples = Math.max(1, Math.round(sampleRateHz * 0.12));

  for (
    let sampleIndex = safeStartSample;
    sampleIndex < safeEndSample;
    sampleIndex += 1
  ) {
    const offset = sampleIndex - safeStartSample;
    const remaining = safeEndSample - sampleIndex;

    const fadeIn = Math.min(1, offset / fadeInSamples);
    const fadeOut = Math.min(1, remaining / fadeOutSamples);
    const envelope = Math.min(fadeIn, fadeOut);

    const phase = (2 * Math.PI * frequencyHz * sampleIndex) / sampleRateHz;
    const value = Math.round(Math.sin(phase) * amplitude * envelope);
    const mixed = samples[sampleIndex] + value;

    samples[sampleIndex] = Math.max(-32768, Math.min(32767, mixed));
  }
}

function addTonePulseToSamples({
  samples,
  startSample,
  durationSamples,
  sampleRateHz,
  amplitude,
  frequencyHz,
}: {
  samples: Int16Array;
  startSample: number;
  durationSamples: number;
  sampleRateHz: number;
  amplitude: number;
  frequencyHz: number;
}) {
  const safeStartSample = Math.max(0, startSample);
  const safeEndSample = Math.min(
    samples.length,
    safeStartSample + durationSamples,
  );
  const lengthSamples = safeEndSample - safeStartSample;

  if (lengthSamples <= 0) {
    return;
  }

  const fadeInSamples = Math.max(1, Math.round(sampleRateHz * 0.015));
  const fadeOutSamples = Math.max(1, Math.round(sampleRateHz * 0.08));

  for (
    let sampleIndex = safeStartSample;
    sampleIndex < safeEndSample;
    sampleIndex += 1
  ) {
    const offset = sampleIndex - safeStartSample;
    const remaining = safeEndSample - sampleIndex;

    const fadeIn = Math.min(1, offset / fadeInSamples);
    const fadeOut = Math.min(1, remaining / fadeOutSamples);
    const envelope = Math.min(fadeIn, fadeOut);

    const phase = (2 * Math.PI * frequencyHz * sampleIndex) / sampleRateHz;
    const value = Math.round(Math.sin(phase) * amplitude * envelope);
    const mixed = samples[sampleIndex] + value;

    samples[sampleIndex] = Math.max(-32768, Math.min(32767, mixed));
  }
}

function limitSamplesToPeak(samples: Int16Array, targetPeak: number) {
  let peak = 0;

  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }

  if (peak <= targetPeak || peak <= 0) {
    return;
  }

  const scale = targetPeak / peak;

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.round(samples[index] * scale);
  }
}

function addClickToSamples({
  samples,
  startSample,
  sampleRateHz,
  lengthSamples,
  amplitude,
  frequencyHz,
}: {
  samples: Int16Array;
  startSample: number;
  sampleRateHz: number;
  lengthSamples: number;
  amplitude: number;
  frequencyHz: number;
}) {
  for (let offset = 0; offset < lengthSamples; offset += 1) {
    const sampleIndex = startSample + offset;

    if (sampleIndex < 0 || sampleIndex >= samples.length) {
      break;
    }

    const fade = 1 - offset / lengthSamples;
    const phase = (2 * Math.PI * frequencyHz * sampleIndex) / sampleRateHz;
    const value = Math.round(Math.sin(phase) * amplitude * fade);
    const mixed = samples[sampleIndex] + value;

    samples[sampleIndex] = Math.max(-32768, Math.min(32767, mixed));
  }
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
  const chordToneGuideSegments = getChordToneGuideSegments({
    input,
    countInDurationSeconds,
    totalDurationSeconds,
  });
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
  const isMusicalGuideMix = input.mixProfile === "musical-guide";

  const accentAmplitude = isMusicalGuideMix ? 50 : 22000;
  const normalAmplitude = isMusicalGuideMix ? 100 : 14000;
  const sectionAmplitude = isMusicalGuideMix ? 80 : 28000;
  const chordMarkerAmplitude = isMusicalGuideMix ? 100 : 18000;

  const chordPadAmplitude = isMusicalGuideMix ? 3600 : 1200;
  const arpeggioAmplitude = isMusicalGuideMix ? 4600 : 1500;
  const bassAmplitude = isMusicalGuideMix ? 4200 : 1350;

  const clickFrequencyHz = 1800;
  const sectionClickFrequencyHz = 1200;

  const chordMarkerLengthSamples = Math.max(
    1,
    Math.round(input.sampleRateHz * 0.04),
  );
  const sectionStartSamples =
    input.includeSectionMarkers === false
      ? []
      : getSectionStartTimesSeconds(input).map((startSeconds) =>
          Math.round(
            (startSeconds + countInDurationSeconds) * input.sampleRateHz,
          ),
        );

  const chordMarkerOffsetSamples = Math.round(input.sampleRateHz * 0.055);
  const chordMarkerEvents =
    input.includeChordMarkers === false
      ? []
      : Array.isArray(input.chordMarkers)
        ? input.chordMarkers
            .filter((marker) => Number.isFinite(marker.timeSeconds))
            .map((marker) => ({
              startSample:
                Math.round(
                  (marker.timeSeconds + countInDurationSeconds) *
                    input.sampleRateHz,
                ) + chordMarkerOffsetSamples,
              frequencyHz: getChordRootFrequencyHz(marker.chord || ""),
            }))
        : [];
  const sectionStartToleranceSamples = Math.max(
    1,
    Math.round(input.sampleRateHz * 0.005),
  );

  const countInEndSample = Math.round(
    countInDurationSeconds * input.sampleRateHz,
  );

  for (
    let beatStartSample = 0, beatIndex = 0;
    beatStartSample < totalSamples;
    beatStartSample += samplesPerBeat, beatIndex += 1
  ) {
    const isCountIn = beatStartSample < countInEndSample;
    const isDownbeat = beatIndex % 4 === 0;
    const isSectionStart = isNearSectionStartSample(
      beatStartSample,
      sectionStartSamples,
      sectionStartToleranceSamples,
    );

    if (isSectionStart) {
      addClickToSamples({
        samples,
        startSample: beatStartSample,
        sampleRateHz: input.sampleRateHz,
        lengthSamples: sectionClickLengthSamples,
        amplitude: sectionAmplitude,
        frequencyHz: sectionClickFrequencyHz,
      });

      addClickToSamples({
        samples,
        startSample: beatStartSample + Math.round(input.sampleRateHz * 0.09),
        sampleRateHz: input.sampleRateHz,
        lengthSamples: sectionClickLengthSamples,
        amplitude: sectionAmplitude,
        frequencyHz: sectionClickFrequencyHz,
      });

      continue;
    }

    if (!isCountIn && input.includeBeatClicks === false) {
      continue;
    }

    addClickToSamples({
      samples,
      startSample: beatStartSample,
      sampleRateHz: input.sampleRateHz,
      lengthSamples: isCountIn ? sectionClickLengthSamples : clickLengthSamples,
      amplitude: isCountIn
        ? sectionAmplitude
        : isDownbeat
          ? accentAmplitude
          : normalAmplitude,
      frequencyHz: isCountIn
        ? sectionClickFrequencyHz
        : isDownbeat
          ? 1400
          : clickFrequencyHz,
    });
  }

  for (const chordMarkerEvent of chordMarkerEvents) {
    addClickToSamples({
      samples,
      startSample: chordMarkerEvent.startSample,
      sampleRateHz: input.sampleRateHz,
      lengthSamples: chordMarkerLengthSamples,
      amplitude: chordMarkerAmplitude,
      frequencyHz: chordMarkerEvent.frequencyHz,
    });
  }

  for (const segment of chordToneGuideSegments) {
    segment.frequenciesHz.forEach((frequencyHz) => {
      addToneToSamples({
        samples,
        startSample: Math.round(segment.startSeconds * input.sampleRateHz),
        endSample: Math.round(segment.endSeconds * input.sampleRateHz),
        sampleRateHz: input.sampleRateHz,
        amplitude: chordPadAmplitude,
        frequencyHz,
      });
    });
  }
  const secondsPerArpeggioNote =
    input.tempoBpm > 0 && Number.isFinite(input.tempoBpm)
      ? 60 / input.tempoBpm / 2
      : 0;
  const arpeggioNoteDurationSeconds = secondsPerArpeggioNote * 0.82;

  if (secondsPerArpeggioNote > 0) {
    for (const segment of chordToneGuideSegments) {
      if (segment.frequenciesHz.length === 0) {
        continue;
      }

      let noteIndex = 0;

      for (
        let noteStartSeconds = segment.startSeconds;
        noteStartSeconds < segment.endSeconds;
        noteStartSeconds += secondsPerArpeggioNote
      ) {
        const frequencyHz =
          segment.frequenciesHz[noteIndex % segment.frequenciesHz.length];

        addTonePulseToSamples({
          samples,
          startSample: Math.round(noteStartSeconds * input.sampleRateHz),
          durationSamples: Math.round(
            arpeggioNoteDurationSeconds * input.sampleRateHz,
          ),
          sampleRateHz: input.sampleRateHz,
          amplitude: arpeggioAmplitude,
          frequencyHz,
        });

        noteIndex += 1;
      }
    }
  }

  const secondsPerBassPulse =
    input.tempoBpm > 0 && Number.isFinite(input.tempoBpm)
      ? 60 / input.tempoBpm
      : 0;
  const bassPulseDurationSeconds = secondsPerBassPulse * 0.72;

  if (secondsPerBassPulse > 0) {
    for (const segment of chordToneGuideSegments) {
      for (
        let pulseStartSeconds = segment.startSeconds;
        pulseStartSeconds < segment.endSeconds;
        pulseStartSeconds += secondsPerBassPulse
      ) {
        addTonePulseToSamples({
          samples,
          startSample: Math.round(pulseStartSeconds * input.sampleRateHz),
          durationSamples: Math.round(
            bassPulseDurationSeconds * input.sampleRateHz,
          ),
          sampleRateHz: input.sampleRateHz,
          amplitude: 1350,
          frequencyHz: segment.bassFrequencyHz,
        });
      }
    }
  }

  if (isMusicalGuideMix) {
    limitSamplesToPeak(samples, 26000);
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
