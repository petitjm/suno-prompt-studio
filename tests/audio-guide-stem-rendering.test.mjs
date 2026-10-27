import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";

const STEM_KEYS = [
  "click",
  "section",
  "chordMarker",
  "pad",
  "arpeggio",
  "bass",
  "melody",
];

async function compileModule(sourcePath, outputPath) {
  const source = await fs.readFile(sourcePath, "utf8");

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  // Resolve the renderer's local stem-mixer dependency.
  const withImports = compiled.replace(
    /(["'])\.\/mix-audio-stems\1/g,
    '"./mix-audio-stems.mjs"',
  );

  await fs.writeFile(outputPath, withImports);
}

async function loadAudioModules(directory) {
  const mixerPath = path.join(directory, "mix-audio-stems.mjs");
  const rendererPath = path.join(directory, "render-click-track-wav.mjs");

  await compileModule("lib/audio/mix-audio-stems.ts", mixerPath);

  await compileModule("lib/audio/render-click-track-wav.ts", rendererPath);

  const mixer = await import(pathToFileURL(mixerPath).href);
  const renderer = await import(pathToFileURL(rendererPath).href);

  return { mixer, renderer };
}

function createTestInput() {
  const tempoBpm = 92;
  const secondsPerBeat = 60 / tempoBpm;
  const secondsPerBar = secondsPerBeat * 4;

  function bars() {
    return [1, 2].map((bar) => ({
      bar,
      timeSignature: "4/4",
      beatsPerBar: 4,
      denominator: 4,
      quarterNotesPerBeat: 1,
      quarterNotesPerBar: 4,
    }));
  }

  return {
    renderJobId: "stem-rendering-test",
    targetKey: "clickTrack",
    tempoBpm,
    sampleRateHz: 44100,
    outputFormat: "wav",
    storageProvider: "browser-download",

    countInBars: 1,
    openingBeatsPerBar: 4,
    openingQuarterNotesPerBeat: 1,
    openingQuarterNotesPerBar: 4,

    totalDurationSeconds: secondsPerBar * 4,
    totalBars: 4,

    mixProfile: "musical-guide",

    includeCountIn: true,
    includeBeatClicks: true,
    includeSectionMarkers: true,
    includeChordMarkers: true,
    includeChordToneGuide: true,

    cueSheetSections: [
      {
        order: 1,
        section: "Verse 1",
        estimatedBars: 2,
        estimatedSeconds: secondsPerBar * 2,
        startSeconds: 0,
        endSeconds: secondsPerBar * 2,
        timeSignature: "4/4",
        backbeat: "soft",
        guitarInstruction: "Light fingerpicking, steady eighths.",
        dynamicStart: "p",
        dynamicEnd: "mp",
        barTiming: bars(),
      },
      {
        order: 2,
        section: "Chorus 1",
        estimatedBars: 2,
        estimatedSeconds: secondsPerBar * 2,
        startSeconds: secondsPerBar * 2,
        endSeconds: secondsPerBar * 4,
        timeSignature: "4/4",
        backbeat: "clear",
        guitarInstruction: "Light down-up strum on eighths.",
        dynamicStart: "mp",
        dynamicEnd: "mf",
        barTiming: bars(),
      },
    ],

    chordMarkers: [
      {
        section: "Verse 1",
        chord: "Am",
        timeSeconds: 0,
      },
      {
        section: "Verse 1",
        chord: "F",
        timeSeconds: secondsPerBar,
      },
      {
        section: "Chorus 1",
        chord: "C",
        timeSeconds: secondsPerBar * 2,
      },
      {
        section: "Chorus 1",
        chord: "G",
        timeSeconds: secondsPerBar * 3,
      },
    ],

    melodyNotes: [
      {
        pitchMidi: 60,
        startSeconds: 0,
        durationSeconds: secondsPerBeat,
      },
      {
        pitchMidi: 64,
        startSeconds: secondsPerBeat,
        durationSeconds: secondsPerBeat,
      },
      {
        pitchMidi: 67,
        startSeconds: secondsPerBar * 2,
        durationSeconds: secondsPerBeat * 2,
      },
    ],
  };
}

function peak(samples) {
  let result = 0;

  for (const sample of samples) {
    result = Math.max(result, Math.abs(sample));
  }

  return result;
}

function checksum(samples) {
  return createHash("sha256")
    .update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
    .digest("hex");
}

test("Production renderer generates independent aligned stems", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "audio-stem-rendering-"),
  );

  try {
    const { mixer, renderer } = await loadAudioModules(directory);

    const input = createTestInput();

    const stems = renderer.createClickTrackAudioStems(input);

    // 1. Every expected stem must exist.
    for (const key of STEM_KEYS) {
      assert.ok(
        stems[key] instanceof Float32Array,
        `Missing Float32 audio stem: ${key}`,
      );
    }

    // 2. Every stem must share one sample timeline.
    const lengths = STEM_KEYS.map((key) => stems[key].length);

    assert.ok(lengths[0] > 0);

    assert.ok(
      lengths.every((length) => length === lengths[0]),
      "Audio stems have different sample lengths",
    );

    console.log("Stem length:", lengths[0], "samples");

    // 3. Verify the intended musical components contain audio.
    for (const key of STEM_KEYS) {
      const stemPeak = peak(stems[key]);

      console.log(`${key} peak:`, stemPeak.toFixed(6));

      assert.ok(stemPeak > 0, `Audio stem ${key} is unexpectedly silent`);

      assert.ok(
        Number.isFinite(stemPeak),
        `Audio stem ${key} has an invalid peak`,
      );
    }

    // 4. Set all levels to unity for a clear reconstruction test.
    const unityLevels = Object.fromEntries(STEM_KEYS.map((key) => [key, 1]));

    const combined = mixer.mixAudioStems(stems, {
      levels: unityLevels,
    });

    assert.equal(combined.samples.length, lengths[0]);
    assert.ok(peak(combined.samples) > 0);

    // 5. Solo melody and verify it is isolated.
    const melodyOnly = mixer.mixAudioStems(stems, {
      levels: unityLevels,
      solo: ["melody"],
    });

    assert.equal(melodyOnly.samples.length, stems.melody.length);

    assert.ok(peak(melodyOnly.samples) > 0);

    // 6. Muting melody must change the mix.
    const withoutMelody = mixer.mixAudioStems(stems, {
      levels: unityLevels,
      muted: ["melody"],
    });

    assert.notEqual(
      checksum(combined.samples),
      checksum(withoutMelody.samples),
      "Muting melody did not change the mix",
    );

    // 7. Changing a level must not modify the stored stems.
    const originalMelodyChecksum = checksum(stems.melody);

    mixer.mixAudioStems(stems, {
      levels: {
        ...unityLevels,
        melody: 0.25,
      },
    });

    assert.equal(
      checksum(stems.melody),
      originalMelodyChecksum,
      "Changing mix levels modified the melody stem",
    );

    // 8. Identical inputs must reproduce identical stems.
    const secondRender = renderer.createClickTrackAudioStems(input);

    for (const key of STEM_KEYS) {
      assert.equal(
        checksum(stems[key]),
        checksum(secondRender[key]),
        `Audio stem ${key} is not deterministic`,
      );
    }

    // 9. Legacy rendering must remain deterministic.
    const legacyFirst = renderer.createClickTrackPcm16Samples(input);

    const legacySecond = renderer.createClickTrackPcm16Samples(input);

    assert.equal(
      checksum(legacyFirst),
      checksum(legacySecond),
      "Legacy combined rendering is not deterministic",
    );

    console.log("Production stem rendering passed.");
    console.log("Combined peak:", combined.peakAfterProtection.toFixed(6));
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
