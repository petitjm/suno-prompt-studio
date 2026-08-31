import { Mp3Encoder } from "@breezystack/lamejs";

const MP3_CHANNEL_COUNT = 1;
const MP3_SAMPLE_RATE_HZ = 44100;
const MP3_BITRATE_KBPS = 128;
const MP3_BLOCK_SIZE = 1152;

export function encodePcm16MonoMp3(
  samples: Int16Array,
  sampleRateHz: 44100 = MP3_SAMPLE_RATE_HZ,
  bitrateKbps = MP3_BITRATE_KBPS,
): Uint8Array {
  const encoder = new Mp3Encoder(MP3_CHANNEL_COUNT, sampleRateHz, bitrateKbps);

  const chunks: Uint8Array[] = [];

  for (let offset = 0; offset < samples.length; offset += MP3_BLOCK_SIZE) {
    const sampleBlock = samples.subarray(
      offset,
      Math.min(offset + MP3_BLOCK_SIZE, samples.length),
    );

    const encoded = encoder.encodeBuffer(sampleBlock);

    if (encoded.length > 0) {
      chunks.push(new Uint8Array(encoded));
    }
  }

  const flushed = encoder.flush();

  if (flushed.length > 0) {
    chunks.push(new Uint8Array(flushed));
  }

  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);

  const result = new Uint8Array(totalLength);

  let writeOffset = 0;

  for (const chunk of chunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return result;
}
