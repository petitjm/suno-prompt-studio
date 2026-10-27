import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const source = await fs.readFile("lib/audio/mix-audio-stems.ts", "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "audio-stem-mixer-"));

const compiledPath = path.join(directory, "mix-audio-stems.mjs");

await fs.writeFile(compiledPath, compiled);

const { mixAudioStems, DEFAULT_AUDIO_STEM_LEVELS } = await import(
  pathToFileURL(compiledPath).href
);

const levels = {
  ...DEFAULT_AUDIO_STEM_LEVELS,
  pad: 1,
  melody: 1,
};

test("mixes synchronised audio stems", () => {
  const result = mixAudioStems(
    {
      melody: new Float32Array([0.2, 0.4, 0]),
      pad: new Float32Array([0.1, 0, 0.3]),
    },
    { levels },
  );

  assert.ok(Math.abs(result.samples[0] - 0.3) < 1e-6);
  assert.ok(Math.abs(result.samples[1] - 0.4) < 1e-6);
  assert.ok(Math.abs(result.samples[2] - 0.3) < 1e-6);
});

test("mute removes one stem from the mix", () => {
  const result = mixAudioStems(
    {
      melody: new Float32Array([0.3]),
      pad: new Float32Array([0.2]),
    },
    { levels, muted: ["pad"] },
  );

  assert.ok(Math.abs(result.samples[0] - 0.3) < 1e-6);
});

test("solo isolates the requested stem", () => {
  const result = mixAudioStems(
    {
      melody: new Float32Array([0.3]),
      pad: new Float32Array([0.2]),
    },
    { levels, solo: ["pad"] },
  );

  assert.ok(Math.abs(result.samples[0] - 0.2) < 1e-6);
});

test("protects the combined output from clipping", () => {
  const result = mixAudioStems(
    {
      melody: new Float32Array([0.8]),
      pad: new Float32Array([0.8]),
    },
    { levels },
  );

  assert.equal(result.clippedSampleCount, 1);
  assert.ok(result.peakAfterProtection <= 0.98 + 1e-6);
});

test("rejects unsynchronised stem lengths", () => {
  assert.throws(
    () =>
      mixAudioStems(
        {
          melody: new Float32Array(100),
          pad: new Float32Array(90),
        },
        { levels },
      ),
    /identical sample lengths/,
  );
});

test("does not mutate original stem samples", () => {
  const melody = new Float32Array([0.25, -0.25]);

  mixAudioStems({ melody }, { levels: { ...levels, melody: 2 } });

  assert.equal(melody[0], 0.25);
  assert.equal(melody[1], -0.25);
});

test.after(async () => {
  await fs.rm(directory, {
    recursive: true,
    force: true,
  });
});
