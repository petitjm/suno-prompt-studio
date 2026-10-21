
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const sourcePath = path.resolve(
  "lib/melody/build-melody-phrases.ts",
);

const source = await fs.readFile(sourcePath, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const temporaryDirectory = await fs.mkdtemp(
  path.join(os.tmpdir(), "melody-scaffold-test-"),
);

try {
  const compiledPath = path.join(
    temporaryDirectory,
    "build-melody-phrases.mjs",
  );

  await fs.writeFile(compiledPath, compiled);

  const { buildMelodyPhraseScaffoldFromGuideSections } =
    await import(pathToFileURL(compiledPath).href);

  const sourceLines = [
    "And you know It won't be for-ever",
  ];

  const sections = [
    {
      section: "Verse 1",
      sectionInstanceId: "test-verse-1",
      sourceLineIndexes: [0],
      startSeconds: 0,
      endSeconds: 10.435,
      barTiming: [
        {
          bar: 1,
          beatsPerBar: 4,
          quarterNotesPerBeat: 1,
          quarterNotesPerBar: 4,
        },
        {
          bar: 2,
          beatsPerBar: 4,
          quarterNotesPerBeat: 1,
          quarterNotesPerBar: 4,
        },
        {
          bar: 3,
          beatsPerBar: 4,
          quarterNotesPerBeat: 1,
          quarterNotesPerBar: 4,
        },
        {
          bar: 4,
          beatsPerBar: 4,
          quarterNotesPerBeat: 1,
          quarterNotesPerBar: 4,
        },
      ],
    },
  ];

  const basePhrase = {
    section: "Verse 1",
    startSourceLineIndex: 0,
    startCharIndex: 0,
    endSourceLineIndex: 0,
    endCharIndex: sourceLines[0].length,
    startBar: 1,
    startBeat: 1,
    endBar: 2,
    endBeat: 3,
    contourIntent: "arch",
    emphasisIntent: "strong",
    resolutionIntent: "partial",
  };

  const build = (phrase) =>
    buildMelodyPhraseScaffoldFromGuideSections({
      sections,
      sourceLines,
      lyricTimingPlan: { phrases: [phrase] },
      tempoBpm: 92,
    });

  const withAnchor = build({
    ...basePhrase,
    emphasisWordOffset: 4,
  });

  assert.equal(withAnchor.length, 1);
  assert.equal(withAnchor[0].emphasisWordOffset, 4);
  assert.equal(withAnchor[0].sourceLyric, sourceLines[0]);

  const withoutAnchor = build(basePhrase);

  assert.equal(withoutAnchor.length, 1);
  assert.equal(
    withoutAnchor[0].emphasisWordOffset,
    undefined,
  );

  assert.equal(
    withAnchor[0].startSeconds,
    withoutAnchor[0].startSeconds,
  );

  assert.equal(
    withAnchor[0].endSeconds,
    withoutAnchor[0].endSeconds,
  );

  const invalidAnchor = build({
    ...basePhrase,
    emphasisWordOffset: -1,
  });

  const outOfRangeAnchor = build({
  ...basePhrase,
  emphasisWordOffset: 20,
});

assert.equal(outOfRangeAnchor.length, 1);

assert.equal(
  outOfRangeAnchor[0].emphasisWordOffset,
  undefined,
);

console.log(
  "PASS: out-of-range emphasis offset ignored",
);

  assert.equal(invalidAnchor.length, 1);
  assert.equal(
    invalidAnchor[0].emphasisWordOffset,
    undefined,
  );

  console.log(
    "PASS: valid emphasis anchor preserved",
  );
  console.log(
    "PASS: older phrase remains compatible",
  );
  console.log(
    "PASS: phrase timing unchanged",
  );
  console.log(
    "PASS: negative emphasis offset ignored",
  );
} finally {
  await fs.rm(temporaryDirectory, {
    recursive: true,
    force: true,
  });
}
