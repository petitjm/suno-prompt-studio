import type { MelodyNote, MelodyPhrase } from "@/types/song";
import type { LyricPhraseUnitGroup } from "@/lib/melody/build-lyric-phrase-units";
import type { MelodyPitchFrameworkPhrase } from "@/lib/melody/build-melody-pitch-framework";

type ContourDirection = "up" | "down" | "level";

function getContourNoteCount(wordCount: number) {
  if (wordCount <= 2) {
    return 2;
  }

  if (wordCount <= 5) {
    return 3;
  }

  return 4;
}

function getSectionContourDirection(
  section: string,
  unitIndex: number,
): ContourDirection {
  const normalised = section.toLowerCase();

  if (
    normalised.includes("chorus") ||
    normalised.includes("hook") ||
    normalised.includes("refrain")
  ) {
    return unitIndex % 2 === 0 ? "up" : "level";
  }

  if (normalised.includes("bridge") || normalised.includes("middle")) {
    return unitIndex % 2 === 0 ? "up" : "down";
  }

  return unitIndex % 2 === 0 ? "level" : "down";
}

function chooseNearbyPitch(
  candidates: number[],
  currentPitch: number,
  direction: ContourDirection,
) {
  if (candidates.length === 0) {
    return currentPitch;
  }

  const nearbyCandidates = candidates.filter(
    (candidate) => Math.abs(candidate - currentPitch) <= 5,
  );

  const pool = nearbyCandidates.length > 0 ? nearbyCandidates : candidates;

  if (direction === "up") {
    const upward = pool
      .filter((candidate) => candidate > currentPitch)
      .sort((a, b) => a - b);

    return upward[0] ?? currentPitch;
  }

  if (direction === "down") {
    const downward = pool
      .filter((candidate) => candidate < currentPitch)
      .sort((a, b) => b - a);

    return downward[0] ?? currentPitch;
  }

  return pool.reduce((best, candidate) =>
    Math.abs(candidate - currentPitch) < Math.abs(best - currentPitch)
      ? candidate
      : best,
  );
}

function getPitchCandidates(
  pitchClasses: string[],
  minimumMidi = 43,
  maximumMidi = 60,
) {
  const pitchClassMap: Record<string, number> = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };

  const allowedPitchClasses = new Set(
    pitchClasses
      .map((pitchClass) => pitchClassMap[pitchClass])
      .filter((value): value is number => value !== undefined),
  );

  const candidates: number[] = [];

  for (let midi = minimumMidi; midi <= maximumMidi; midi += 1) {
    if (allowedPitchClasses.has(midi % 12)) {
      candidates.push(midi);
    }
  }

  return candidates;
}

export function buildInitialMelodyContours({
  anchors,
  lyricUnits,
  framework,
  scalePitchClasses,
}: {
  anchors: MelodyPhrase[];
  lyricUnits: LyricPhraseUnitGroup[];
  framework: MelodyPitchFrameworkPhrase[];
  scalePitchClasses: string[];
}): MelodyPhrase[] {
  return anchors.map((anchorPhrase, phraseIndex) => {
    const anchorNote = anchorPhrase.notes[0];
    const unitGroup = lyricUnits[phraseIndex];
    const frameworkPhrase = framework[phraseIndex];

    if (!anchorNote || !unitGroup || !frameworkPhrase) {
      return anchorPhrase;
    }

    const melodicPitchClasses = Array.from(
      new Set([...scalePitchClasses, ...frameworkPhrase.pitchClasses]),
    );

    const candidates = getPitchCandidates(melodicPitchClasses);

    if (candidates.length === 0) {
      return anchorPhrase;
    }

    let currentPitch = anchorNote.pitchMidi;
    const notes: MelodyNote[] = [];

    unitGroup.units.forEach((unit, unitIndex) => {
      const noteCount = getContourNoteCount(unit.wordCount);

      const unitDurationSeconds = Math.max(
        0,
        unit.endSeconds - unit.startSeconds,
      );

      const noteDurationSeconds =
        noteCount > 0 ? unitDurationSeconds / noteCount : 0;

      const direction = getSectionContourDirection(
        anchorPhrase.section,
        unitIndex,
      );

      for (let noteIndex = 0; noteIndex < noteCount; noteIndex += 1) {
        if (noteIndex > 0) {
          const noteDirection =
            direction === "level"
              ? noteIndex % 2 === 1
                ? "up"
                : "down"
              : direction;

          currentPitch = chooseNearbyPitch(
            candidates,
            currentPitch,
            noteDirection,
          );
        }

        notes.push({
          pitchMidi: currentPitch,
          startSeconds: Number(
            (unit.startSeconds + noteDurationSeconds * noteIndex).toFixed(3),
          ),
          durationSeconds: Number(
            Math.max(0.25, noteDurationSeconds * 0.88).toFixed(3),
          ),
          lyricText: unit.text,
        });
      }
    });

    return {
      ...anchorPhrase,
      notes,
    };
  });
}
