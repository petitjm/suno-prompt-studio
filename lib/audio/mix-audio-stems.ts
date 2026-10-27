export const AUDIO_STEM_KEYS = [
  "click",
  "section",
  "chordMarker",
  "pad",
  "arpeggio",
  "bass",
  "melody",
] as const;

export type AudioStemKey = (typeof AUDIO_STEM_KEYS)[number];

export type AudioStemLevels = Record<AudioStemKey, number>;

export type AudioStemBuffers = Partial<Record<AudioStemKey, Float32Array>>;

export type AudioStemMixSettings = {
  levels: AudioStemLevels;
  muted?: AudioStemKey[];
  solo?: AudioStemKey[];
  masterLevel?: number;
};

export type AudioStemMixResult = {
  samples: Float32Array;
  peakBeforeProtection: number;
  peakAfterProtection: number;
  clippedSampleCount: number;
};

export const DEFAULT_AUDIO_STEM_LEVELS: AudioStemLevels = {
  click: 0.3,
  section: 0.45,
  chordMarker: 0.45,
  pad: 0.28,
  arpeggio: 0.7,
  bass: 0.42,
  melody: 1.6,
};

function boundedLevel(value: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(maximum, value));
}

export function mixAudioStems(
  stems: AudioStemBuffers,
  settings: AudioStemMixSettings,
): AudioStemMixResult {
  const available = AUDIO_STEM_KEYS.filter(
    (key) => stems[key] instanceof Float32Array,
  );

  const lengths = available.map((key) => stems[key]!.length);

  const frameCount = lengths[0] ?? 0;

  if (lengths.some((length) => length !== frameCount)) {
    throw new Error("Audio stems must have identical sample lengths.");
  }

  const samples = new Float32Array(frameCount);

  const muted = new Set(settings.muted ?? []);
  const solo = new Set(settings.solo ?? []);

  const masterLevel = boundedLevel(settings.masterLevel ?? 1, 2);

  for (const key of available) {
    if (muted.has(key)) {
      continue;
    }

    if (solo.size > 0 && !solo.has(key)) {
      continue;
    }

    const stem = stems[key]!;

    const level = boundedLevel(settings.levels[key], 2);

    if (level === 0) {
      continue;
    }

    for (let index = 0; index < frameCount; index += 1) {
      const sample = stem[index];

      if (!Number.isFinite(sample)) {
        throw new Error(`Audio stem ${key} contains an invalid sample.`);
      }

      samples[index] += sample * level * masterLevel;
    }
  }

  let peakBeforeProtection = 0;
  let clippedSampleCount = 0;

  for (const sample of samples) {
    const absolute = Math.abs(sample);

    peakBeforeProtection = Math.max(peakBeforeProtection, absolute);

    if (absolute > 1) {
      clippedSampleCount += 1;
    }
  }

  // Protective uniform gain for offline output.
  // Preserve relative stem levels without hard clipping.
  const protectionGain =
    peakBeforeProtection > 0.98 ? 0.98 / peakBeforeProtection : 1;

  if (protectionGain < 1) {
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] *= protectionGain;
    }
  }

  return {
    samples,
    peakBeforeProtection,
    peakAfterProtection: peakBeforeProtection * protectionGain,
    clippedSampleCount,
  };
}
