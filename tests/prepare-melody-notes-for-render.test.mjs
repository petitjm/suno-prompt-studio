import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file, dependencies = {}) {
  const source = fs.readFileSync(file, "utf8");

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => {
      if (!(name in dependencies)) {
        throw new Error(`Unexpected dependency: ${name}`);
      }
      return dependencies[name];
    },
  });

  return module.exports;
}

const articulation = loadModule(
  "lib/melody/build-articulated-melody-notes.ts",
);

const phraseEndings = loadModule(
  "lib/melody/build-rendered-phrase-ending-notes.ts",
);

const { prepareMelodyNotesForRender } = loadModule(
  "lib/melody/prepare-melody-notes-for-render.ts",
  {
    "./build-articulated-melody-notes": articulation,
    "./build-rendered-phrase-ending-notes": phraseEndings,
  },
);

function makePhrase() {
  return {
    resolutionIntent: "resolved",
    notes: [
      {
        lyricText: "forever",
        syllableText: "for",
        pitchMidi: 60,
        startSeconds: 0,
        durationSeconds: 0.25,
      },
      {
        lyricText: "forever",
        syllableText: "ev",
        pitchMidi: 60,
        startSeconds: 0.25,
        durationSeconds: 0.25,
      },
      {
        lyricText: "forever",
        syllableText: "er",
        pitchMidi: 62,
        startSeconds: 0.5,
        durationSeconds: 0.5,
      },
    ],
  };
}

test("preserves syllables and pitches during render preparation", () => {
  const result = prepareMelodyNotesForRender([makePhrase()]);

  assert.deepEqual(
    Array.from(result, (note) => note.syllableText),
    ["for", "ev", "er"],
  );

  assert.deepEqual(
    Array.from(result, (note) => note.pitchMidi),
    [60, 60, 62],
  );
});

test("current and saved phrase data produce identical render notes", () => {
  const currentPhrases = [makePhrase()];

  const savedPhrases = JSON.parse(
    JSON.stringify(currentPhrases),
  );

  const current = prepareMelodyNotesForRender(currentPhrases);
  const saved = prepareMelodyNotesForRender(savedPhrases);

  assert.equal(
    JSON.stringify(current),
    JSON.stringify(saved),
  );
});

test("render preparation does not mutate the source phrases", () => {
  const phrases = [makePhrase()];
  const before = JSON.stringify(phrases);

  prepareMelodyNotesForRender(phrases);

  assert.equal(JSON.stringify(phrases), before);
});