import { AUDIO_STEM_KEYS, type AudioStemBuffers } from "./mix-audio-stems";

const MAGIC = "SPSTEM01";
const VERSION = 1;
const HEADER_BYTES = 24;
const BYTES_PER_SAMPLE = 4;

// Initial safety limit: 320 MiB of uncompressed stem data.
export const MAX_STEM_PACKAGE_BYTES = 320 * 1024 * 1024;

export type AudioStemPackage = {
  sampleRateHz: number;
  frameCount: number;
  stems: AudioStemBuffers;
};

function requireLittleEndian(): void {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setUint32(0, 0x01020304, true);

  if (new Uint8Array(buffer)[0] !== 4) {
    throw new Error("Little-endian audio transport is required.");
  }
}

function validateDimensions(sampleRateHz: number, frameCount: number): number {
  if (
    !Number.isInteger(sampleRateHz) ||
    sampleRateHz < 8000 ||
    sampleRateHz > 192000
  ) {
    throw new Error("Invalid audio stem sample rate.");
  }

  if (!Number.isSafeInteger(frameCount) || frameCount <= 0) {
    throw new Error("Invalid audio stem frame count.");
  }

  const byteLength =
    HEADER_BYTES + AUDIO_STEM_KEYS.length * frameCount * BYTES_PER_SAMPLE;

  if (
    !Number.isSafeInteger(byteLength) ||
    byteLength > MAX_STEM_PACKAGE_BYTES
  ) {
    throw new Error("Audio stem package exceeds the memory limit.");
  }

  return byteLength;
}

export function encodeAudioStemPackage({
  sampleRateHz,
  stems,
}: {
  sampleRateHz: number;
  stems: AudioStemBuffers;
}): ArrayBuffer {
  requireLittleEndian();

  const firstStem = stems[AUDIO_STEM_KEYS[0]];

  if (!(firstStem instanceof Float32Array)) {
    throw new Error("The click stem is missing.");
  }

  const frameCount = firstStem.length;
  const byteLength = validateDimensions(sampleRateHz, frameCount);

  for (const key of AUDIO_STEM_KEYS) {
    const stem = stems[key];

    if (!(stem instanceof Float32Array)) {
      throw new Error(`Missing audio stem: ${key}`);
    }

    if (stem.length !== frameCount) {
      throw new Error("Audio stems have mismatched lengths.");
    }

    for (const sample of stem) {
      if (!Number.isFinite(sample)) {
        throw new Error(`Audio stem ${key} contains invalid samples.`);
      }
    }
  }

  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < MAGIC.length; i += 1) {
    view.setUint8(i, MAGIC.charCodeAt(i));
  }

  view.setUint32(8, VERSION, true);
  view.setUint32(12, sampleRateHz, true);
  view.setUint32(16, frameCount, true);
  view.setUint32(20, AUDIO_STEM_KEYS.length, true);

  let offset = HEADER_BYTES;

  for (const key of AUDIO_STEM_KEYS) {
    const stem = stems[key]!;

    const stemBytes = new Uint8Array(
      stem.buffer,
      stem.byteOffset,
      stem.byteLength,
    );

    bytes.set(stemBytes, offset);
    offset += stem.byteLength;
  }

  return buffer;
}

export function decodeAudioStemPackage(buffer: ArrayBuffer): AudioStemPackage {
  requireLittleEndian();

  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error("Incomplete audio stem package.");
  }

  if (buffer.byteLength > MAX_STEM_PACKAGE_BYTES) {
    throw new Error("Audio stem package exceeds the memory limit.");
  }

  const view = new DataView(buffer);

  const magic = Array.from({ length: MAGIC.length }, (_, index) =>
    String.fromCharCode(view.getUint8(index)),
  ).join("");

  if (magic !== MAGIC) {
    throw new Error("Unrecognised audio stem package.");
  }

  const version = view.getUint32(8, true);

  if (version !== VERSION) {
    throw new Error(`Unsupported audio stem version: ${version}`);
  }

  const sampleRateHz = view.getUint32(12, true);
  const frameCount = view.getUint32(16, true);
  const stemCount = view.getUint32(20, true);

  if (stemCount !== AUDIO_STEM_KEYS.length) {
    throw new Error("Unexpected audio stem count.");
  }

  const expectedBytes = validateDimensions(sampleRateHz, frameCount);

  if (buffer.byteLength !== expectedBytes) {
    throw new Error("Audio stem package length does not match metadata.");
  }

  const stems: AudioStemBuffers = {};
  let offset = HEADER_BYTES;

  for (const key of AUDIO_STEM_KEYS) {
    // The format guarantees that offsets are 4-byte aligned.
    const samples = new Float32Array(buffer, offset, frameCount);

    for (const sample of samples) {
      if (!Number.isFinite(sample)) {
        throw new Error(`Decoded audio stem ${key} contains invalid samples.`);
      }
    }

    // Zero-copy view: retains the downloaded ArrayBuffer.
    stems[key] = samples;
    offset += frameCount * BYTES_PER_SAMPLE;
  }

  return {
    sampleRateHz,
    frameCount,
    stems,
  };
}
