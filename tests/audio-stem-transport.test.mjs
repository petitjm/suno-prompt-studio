import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const directory = await fs.mkdtemp(
  path.join(os.tmpdir(), "audio-stem-transport-"),
);

async function compile(sourceFile, outputFile) {
  const source = await fs.readFile(sourceFile, "utf8");

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const corrected = compiled.replace(
    /(["'])\.\/mix-audio-stems\1/g,
    '"./mix-audio-stems.mjs"',
  );

  await fs.writeFile(path.join(directory, outputFile), corrected);
}

try {
  await compile("lib/audio/mix-audio-stems.ts", "mix-audio-stems.mjs");

  await compile(
    "lib/audio/audio-stem-transport.ts",
    "audio-stem-transport.mjs",
  );

  const { encodeAudioStemPackage, decodeAudioStemPackage } = await import(
    pathToFileURL(path.join(directory, "audio-stem-transport.mjs")).href
  );

  const { AUDIO_STEM_KEYS } = await import(
    pathToFileURL(path.join(directory, "mix-audio-stems.mjs")).href
  );

  function fixture() {
    return Object.fromEntries(
      AUDIO_STEM_KEYS.map((key, index) => [
        key,
        new Float32Array([index / 20, -index / 30, 0.125, 0]),
      ]),
    );
  }

  test("round-trips all seven stems exactly", () => {
    const original = fixture();

    const bytes = encodeAudioStemPackage({
      sampleRateHz: 44100,
      stems: original,
    });

    const result = decodeAudioStemPackage(bytes);

    assert.equal(result.sampleRateHz, 44100);
    assert.equal(result.frameCount, 4);

    for (const key of AUDIO_STEM_KEYS) {
      assert.deepEqual(
        Array.from(result.stems[key]),
        Array.from(original[key]),
        `${key} did not survive transport`,
      );
    }
  });

  test("rejects malformed package headers", () => {
    const bytes = encodeAudioStemPackage({
      sampleRateHz: 44100,
      stems: fixture(),
    });

    new DataView(bytes).setUint8(0, 0);

    assert.throws(
      () => decodeAudioStemPackage(bytes),
      /Unrecognised audio stem package/,
    );
  });

  test("rejects unsupported transport versions", () => {
    const bytes = encodeAudioStemPackage({
      sampleRateHz: 44100,
      stems: fixture(),
    });

    new DataView(bytes).setUint32(8, 99, true);

    assert.throws(
      () => decodeAudioStemPackage(bytes),
      /Unsupported audio stem version/,
    );
  });

  test("rejects truncated audio payloads", () => {
    const bytes = encodeAudioStemPackage({
      sampleRateHz: 44100,
      stems: fixture(),
    });

    const truncated = bytes.slice(0, bytes.byteLength - 4);

    assert.throws(
      () => decodeAudioStemPackage(truncated),
      /length does not match metadata/,
    );
  });

  test("rejects inconsistent stem lengths", () => {
    const stems = fixture();
    stems.melody = new Float32Array(3);

    assert.throws(
      () =>
        encodeAudioStemPackage({
          sampleRateHz: 44100,
          stems,
        }),
      /mismatched lengths/,
    );
  });

  test("rejects invalid sample values", () => {
    const stems = fixture();
    stems.bass[0] = Number.NaN;

    assert.throws(
      () =>
        encodeAudioStemPackage({
          sampleRateHz: 44100,
          stems,
        }),
      /invalid samples/,
    );
  });

  test("rejects oversized payload metadata", () => {
    const bytes = encodeAudioStemPackage({
      sampleRateHz: 44100,
      stems: fixture(),
    });

    new DataView(bytes).setUint32(16, 20000000, true);

    assert.throws(
      () => decodeAudioStemPackage(bytes),
      /exceeds the memory limit/,
    );
  });
} finally {
  // The tests are registered synchronously above.
  // Cleanup must occur after the test runner finishes.
  process.on("exit", () => {
    // The temporary directory is disposable.
  });
}
