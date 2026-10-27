import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const rendererPath = "lib/audio/render-click-track-wav.ts";

async function loadRenderer(source, directory, filename) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  // Compile the renderer's audio-stem dependency.
  const mixerSource = await fs.readFile(
    path.resolve("lib/audio/mix-audio-stems.ts"),
    "utf8",
  );

  const compiledMixer = ts.transpileModule(mixerSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  // Both compiled modules must live in the same temporary directory.
  const mixerPath = path.join(directory, "mix-audio-stems.mjs");
  const compiledPath = path.join(directory, filename);

  await fs.writeFile(mixerPath, compiledMixer);

  // Node requires an explicit file extension for local ES module imports.
  const compiledWithImports = compiled.replace(
    /(["'])\.\/mix-audio-stems\1/g,
    '"./mix-audio-stems.mjs"',
  );

  await fs.writeFile(compiledPath, compiledWithImports);

  const module = await import(pathToFileURL(compiledPath).href);

  return module.createClickTrackPcm16Samples;
}

function createFourFourInput() {
  const tempoBpm = 92;
  const secondsPerBeat = 60 / tempoBpm;
  const secondsPerBar = secondsPerBeat * 4;

  const createBarTiming = () =>
    Array.from({ length: 2 }, (_, index) => ({
      bar: index + 1,
      timeSignature: "4/4",
      beatsPerBar: 4,
      denominator: 4,
      quarterNotesPerBeat: 1,
      quarterNotesPerBar: 4,
    }));

  return {
    renderJobId: "four-four-regression",
    targetKey: "clickTrack",
    tempoBpm,
    sampleRateHz: 44100,
    outputFormat: "wav",
    storageProvider: "browser-download",
    countInBars: 0,
    includeCountIn: false,
    totalDurationSeconds: secondsPerBar * 4,
    totalBars: 4,
    mixProfile: "musical-guide",
    includeBeatClicks: false,
    includeSectionMarkers: false,
    includeChordMarkers: false,
    includeChordToneGuide: true,
    musicalGuideMixLevels: {
      click: 0,
      section: 0,
      chordMarker: 0,
      pad: 0,
      arpeggio: 1,
      bass: 0,
      melody: 0,
    },
    cueSheetSections: [
      {
        order: 1,
        section: "Verse 1",
        estimatedBars: 2,
        estimatedSeconds: secondsPerBar * 2,
        startSeconds: 0,
        endSeconds: secondsPerBar * 2,
        timeSignature: "4/4",
        guitarInstruction: "fingerpick",
        barTiming: createBarTiming(),
      },
      {
        order: 2,
        section: "Chorus",
        estimatedBars: 2,
        estimatedSeconds: secondsPerBar * 2,
        startSeconds: secondsPerBar * 2,
        endSeconds: secondsPerBar * 4,
        timeSignature: "4/4",
        guitarInstruction: "strum",
        barTiming: createBarTiming(),
      },
    ],
    chordMarkers: [
      { section: "Verse 1", chord: "Am", timeSeconds: 0 },
      {
        section: "Verse 1",
        chord: "F",
        timeSeconds: secondsPerBar,
      },
      {
        section: "Chorus",
        chord: "C",
        timeSeconds: secondsPerBar * 2,
      },
      {
        section: "Chorus",
        chord: "G",
        timeSeconds: secondsPerBar * 3,
      },
    ],
  };
}

test("4/4 Musical Guide PCM matches established baseline", async () => {
  const modifiedSource = await fs.readFile(rendererPath, "utf8");

  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "audio-guide-regression-"),
  );

  try {
    const renderModified = await loadRenderer(
      modifiedSource,
      temporaryDirectory,
      "modified-renderer.mjs",
    );

    const input = createFourFourInput();
    const modifiedSamples = renderModified(input);

    assert.ok(modifiedSamples instanceof Int16Array);

    assert.equal(
      modifiedSamples.length,
      566014,
      "4/4 PCM sample count differs from baseline",
    );

    const modifiedBytes = Buffer.from(
      modifiedSamples.buffer,
      modifiedSamples.byteOffset,
      modifiedSamples.byteLength,
    );

    const actualHash = createHash("sha256").update(modifiedBytes).digest("hex");

    const expectedHash =
      "15a41d525793ac253d1bf0fd7b0ff099de264f4bc9479342334f28f2f67a70b1";

    assert.equal(
      actualHash,
      expectedHash,
      "4/4 PCM output differs from the established baseline",
    );

    console.log(
      `4/4 baseline verified: ${modifiedSamples.length} PCM samples.`,
    );
  } finally {
    await fs.rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
});
