import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  "lib/melody/build-articulated-melody-notes.ts",
  "utf8",
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const module = { exports: {} };

vm.runInNewContext(
  compiled,
  {
    module,
    exports: module.exports,
  },
);

const { buildArticulatedMelodyNotes } = module.exports;

const note = (syllableText, startSeconds, pitchMidi = 60) => ({
  lyricText: "forever",
  syllableText,
  startSeconds,
  durationSeconds: 0.25,
  pitchMidi,
});

test("preserves distinct syllables on the same pitch", () => {
  const result = buildArticulatedMelodyNotes([
    note("for", 0),
    note("ev", 0.25),
    note("er", 0.5),
  ]);

  assert.equal(result.length, 3);
  assert.deepEqual(
    Array.from(result, (item) => item.syllableText),
    ["for", "ev", "er"],
  );
});

test("can sustain contiguous notes on the same syllable", () => {
  const result = buildArticulatedMelodyNotes([
    note("for", 0),
    note("for", 0.25),
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].durationSeconds, 0.5);
});

test("preserves pitch changes between syllables", () => {
  const result = buildArticulatedMelodyNotes([
    note("for", 0, 60),
    note("ev", 0.25, 62),
  ]);

  assert.equal(result.length, 2);
  assert.deepEqual(
    Array.from(result, (item) => item.pitchMidi),
    [60, 62],
  );
});

test("preserves noncontiguous notes", () => {
  const result = buildArticulatedMelodyNotes([
    note("for", 0),
    note("for", 0.5),
  ]);

  assert.equal(result.length, 2);
});