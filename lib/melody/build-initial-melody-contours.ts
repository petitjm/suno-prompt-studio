import {
  DEFAULT_MELODY_CHARACTER,
  type MelodyCharacter,
  type MelodyNote,
  type MelodyPhrase,
} from "@/types/song";
import type { LyricWordTimingGroup } from "@/lib/melody/build-lyric-word-timings";
import type { MelodyPitchFrameworkPhrase } from "@/lib/melody/build-melody-pitch-framework";

type ContourDirection = "up" | "down" | "level";
function applyMelodyLiftBias(
  direction: ContourDirection,
  lift: MelodyCharacter["lift"],
): ContourDirection {
  if (lift === "restrained") {
    if (direction === "up") {
      return "level";
    }

    return direction;
  }

  if (lift === "strong") {
    if (direction === "level") {
      return "up";
    }

    return direction;
  }

  return direction;
}

function shouldHoldForMelodyMovement(
  movement: MelodyCharacter["movement"],
  isGestureAnchor: boolean,
  phraseNoteIndex: number,
) {
  if (movement === "calm") {
    return !isGestureAnchor || phraseNoteIndex % 2 === 1;
  }

  if (movement === "active") {
    return !isGestureAnchor && phraseNoteIndex % 3 !== 0;
  }

  return !isGestureAnchor;
}

function getSectionContourDirection(
  section: string,
  unitIndex: number,
  lift: MelodyCharacter["lift"],
): ContourDirection {
  const normalised = section.toLowerCase();

  if (
    normalised.includes("chorus") ||
    normalised.includes("hook") ||
    normalised.includes("refrain")
  ) {
    return applyMelodyLiftBias(unitIndex % 2 === 0 ? "up" : "level", lift);
  }

  if (normalised.includes("bridge") || normalised.includes("middle")) {
    return applyMelodyLiftBias(unitIndex % 2 === 0 ? "up" : "down", lift);
  }

  return applyMelodyLiftBias(unitIndex % 2 === 0 ? "level" : "down", lift);
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

function getMelodyCharacterRange(character: MelodyCharacter) {
  if (character.register === "low") {
    return {
      minimumMidi: 40,
      maximumMidi: 57,
    };
  }

  if (character.register === "high") {
    return {
      minimumMidi: 46,
      maximumMidi: 63,
    };
  }

  return {
    minimumMidi: 43,
    maximumMidi: 60,
  };
}

function getActiveHarmonyEvent(
  frameworkPhrase: MelodyPitchFrameworkPhrase,
  timeSeconds: number,
) {
  return (
    frameworkPhrase.harmonyEvents.find(
      (event) =>
        timeSeconds >= event.startSeconds && timeSeconds < event.endSeconds,
    ) ??
    frameworkPhrase.harmonyEvents[frameworkPhrase.harmonyEvents.length - 1] ??
    null
  );
}

function getPhraseShapeDirection({
  section,
  noteIndex,
  noteCount,
  lift,
}: {
  section: string;
  noteIndex: number;
  noteCount: number;
  lift: MelodyCharacter["lift"];
}): ContourDirection {
  if (noteCount <= 1) {
    return "level";
  }

  const progress = noteIndex / Math.max(1, noteCount - 1);
  const normalisedSection = section.toLowerCase();

  const isChorus =
    normalisedSection.includes("chorus") ||
    normalisedSection.includes("hook") ||
    normalisedSection.includes("refrain");

  const isBridge =
    normalisedSection.includes("bridge") ||
    normalisedSection.includes("middle");

  if (isChorus) {
    if (progress < 0.45) {
      return applyMelodyLiftBias("up", lift);
    }

    if (progress < 0.7) {
      return applyMelodyLiftBias("level", lift);
    }

    return applyMelodyLiftBias("down", lift);
  }

  if (isBridge) {
    if (progress < 0.35) {
      return applyMelodyLiftBias("up", lift);
    }

    if (progress < 0.65) {
      return applyMelodyLiftBias("down", lift);
    }

    return applyMelodyLiftBias("level", lift);
  }

  if (progress < 0.3) {
    return applyMelodyLiftBias("level", lift);
  }

  if (progress < 0.6) {
    return applyMelodyLiftBias("up", lift);
  }

  return applyMelodyLiftBias("down", lift);
}

function shouldHoldPreviousMelodyPitch(word: string) {
  const cleaned = word
    .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "")
    .toLowerCase();

  if (!cleaned) {
    return false;
  }

  const lightWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "for",
    "in",
    "my",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);

  return lightWords.has(cleaned);
}

function getMelodySectionFamily(section: string) {
  const normalised = section.trim().toLowerCase();

  if (
    normalised.includes("chorus") ||
    normalised.includes("hook") ||
    normalised.includes("refrain")
  ) {
    return "chorus";
  }

  if (normalised.includes("bridge") || normalised.includes("middle")) {
    return "bridge";
  }

  if (
    normalised.includes("pre-chorus") ||
    normalised.includes("prechorus") ||
    normalised.includes("lift")
  ) {
    return "prechorus";
  }

  if (normalised.includes("verse")) {
    return "verse";
  }

  return normalised;
}

function getMelodyMotifKey(
  phrase: MelodyPhrase,
  frameworkPhrase: MelodyPitchFrameworkPhrase,
) {
  const normalisedLyric = phrase.sourceLyric
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]/gu, "")
    .replace(/\s+/g, " ");

  const chordSequence = frameworkPhrase.chords.join("|");

  return [
    getMelodySectionFamily(phrase.section),
    normalisedLyric,
    chordSequence,
  ].join("::");
}

function mergeAdjacentSamePitchMelodyNotes(
  notes: MelodyNote[],
  frameworkPhrase: MelodyPitchFrameworkPhrase,
) {
  const mergedNotes: MelodyNote[] = [];

  notes.forEach((note) => {
    const previousNote = mergedNotes[mergedNotes.length - 1];

    if (!previousNote) {
      mergedNotes.push({ ...note });
      return;
    }

    const previousMidpointSeconds =
      previousNote.startSeconds + previousNote.durationSeconds / 2;

    const noteMidpointSeconds = note.startSeconds + note.durationSeconds / 2;

    const previousHarmonyEvent = getActiveHarmonyEvent(
      frameworkPhrase,
      previousMidpointSeconds,
    );

    const currentHarmonyEvent = getActiveHarmonyEvent(
      frameworkPhrase,
      noteMidpointSeconds,
    );

    const sameHarmony =
      previousHarmonyEvent?.chord === currentHarmonyEvent?.chord;

    const previousEndSeconds =
      previousNote.startSeconds + previousNote.durationSeconds;

    const gapSeconds = Math.max(0, note.startSeconds - previousEndSeconds);

    const canMerge =
      previousNote.pitchMidi === note.pitchMidi &&
      sameHarmony &&
      gapSeconds <= 0.2;

    if (!canMerge) {
      mergedNotes.push({ ...note });
      return;
    }

    const noteEndSeconds = note.startSeconds + note.durationSeconds;

    previousNote.durationSeconds = Number(
      Math.max(0.1, noteEndSeconds - previousNote.startSeconds).toFixed(3),
    );

    const previousLyric = previousNote.lyricText?.trim() || "";
    const currentLyric = note.lyricText?.trim() || "";

    previousNote.lyricText = [previousLyric, currentLyric]
      .filter(Boolean)
      .join(" ");
  });

  return mergedNotes;
}

export function buildInitialMelodyContours({
  anchors,
  wordTimings,
  framework,
  scalePitchClasses,
  character = DEFAULT_MELODY_CHARACTER,
}: {
  anchors: MelodyPhrase[];
  wordTimings: LyricWordTimingGroup[];
  framework: MelodyPitchFrameworkPhrase[];
  scalePitchClasses: string[];
  character?: MelodyCharacter;
}): MelodyPhrase[] {
  const establishedMotifs = new Map<string, number[]>();
  const melodyRange = getMelodyCharacterRange(character);

  return anchors.map((anchorPhrase, phraseIndex) => {
    const anchorNote = anchorPhrase.notes[0];
    const wordTimingGroup = wordTimings[phraseIndex];
    const frameworkPhrase = framework[phraseIndex];

    if (!anchorNote || !wordTimingGroup || !frameworkPhrase) {
      return anchorPhrase;
    }

    const melodicPitchClasses = Array.from(
      new Set([...scalePitchClasses, ...frameworkPhrase.pitchClasses]),
    );

    const candidates = getPitchCandidates(
      melodicPitchClasses,
      melodyRange.minimumMidi,
      melodyRange.maximumMidi,
    );

    if (candidates.length === 0) {
      return anchorPhrase;
    }

    let currentPitch = candidates.reduce((best, candidate) =>
      Math.abs(candidate - anchorNote.pitchMidi) <
      Math.abs(best - anchorNote.pitchMidi)
        ? candidate
        : best,
    );
    let phraseNoteIndex = 0;
    let previousHarmonyChord: string | null = null;

    const notes: MelodyNote[] = [];

    const totalWordCount = wordTimingGroup.units.reduce(
      (total, unit) => total + unit.words.length,
      0,
    );

    const motifKey = getMelodyMotifKey(anchorPhrase, frameworkPhrase);
    const establishedPitchSequence = establishedMotifs.get(motifKey);

    if (
      establishedPitchSequence &&
      establishedPitchSequence.length === totalWordCount
    ) {
      let reusedNoteIndex = 0;

      const reusedNotes: MelodyNote[] = [];

      wordTimingGroup.units.forEach((unit) => {
        unit.words.forEach((word) => {
          const pitchMidi =
            establishedPitchSequence[reusedNoteIndex] ?? anchorNote.pitchMidi;

          reusedNotes.push({
            pitchMidi,
            startSeconds: word.startSeconds,
            durationSeconds: Number(
              Math.max(0.1, word.durationSeconds * 0.88).toFixed(3),
            ),
            lyricText: word.word,
          });

          reusedNoteIndex += 1;
        });
      });

      return {
        ...anchorPhrase,
        notes: mergeAdjacentSamePitchMelodyNotes(reusedNotes, frameworkPhrase),
      };
    }

    wordTimingGroup.units.forEach((unit, unitIndex) => {
      const direction = getSectionContourDirection(
        anchorPhrase.section,
        unitIndex,
        character.lift,
      );

      unit.words.forEach((word, wordIndex) => {
        const noteMidpointSeconds =
          word.startSeconds + word.durationSeconds / 2;

        const activeHarmonyEvent = getActiveHarmonyEvent(
          frameworkPhrase,
          noteMidpointSeconds,
        );

        const activeHarmonyPitchClasses =
          activeHarmonyEvent?.pitchClasses ?? frameworkPhrase.pitchClasses;

        const chordCandidates = getPitchCandidates(
          activeHarmonyPitchClasses,
          melodyRange.minimumMidi,
          melodyRange.maximumMidi,
        );

        const melodicPitchClasses = Array.from(
          new Set([...scalePitchClasses, ...activeHarmonyPitchClasses]),
        );

        const melodicCandidates = getPitchCandidates(
          melodicPitchClasses,
          melodyRange.minimumMidi,
          melodyRange.maximumMidi,
        );

        const harmonyChanged =
          activeHarmonyEvent !== null &&
          activeHarmonyEvent.chord !== previousHarmonyChord;

        const isFinalWordInUnit = wordIndex === unit.words.length - 1;

        const isGestureStart = wordIndex === 0;

        const gesturePivotIndex =
          unit.words.length >= 5 ? Math.floor((unit.words.length - 1) / 2) : -1;

        const isGesturePivot = wordIndex === gesturePivotIndex;

        const isGestureAnchor =
          isGestureStart ||
          isGesturePivot ||
          harmonyChanged ||
          isFinalWordInUnit;

        const holdForMovement = shouldHoldForMelodyMovement(
          character.movement,
          isGestureAnchor,
          phraseNoteIndex,
        );

        const holdPreviousPitch =
          phraseNoteIndex > 0 &&
          (shouldHoldPreviousMelodyPitch(word.word) || holdForMovement) &&
          !harmonyChanged &&
          !isFinalWordInUnit;

        const preferChordTone =
          phraseNoteIndex === 0 || harmonyChanged || isFinalWordInUnit;

        const preferredCandidates =
          preferChordTone && chordCandidates.length > 0
            ? chordCandidates
            : melodicCandidates.length > 0
              ? melodicCandidates
              : candidates;

        if (phraseNoteIndex === 0 && preferChordTone) {
          currentPitch = preferredCandidates.reduce((best, candidate) =>
            Math.abs(candidate - currentPitch) < Math.abs(best - currentPitch)
              ? candidate
              : best,
          );
        } else if (phraseNoteIndex > 0 && !holdPreviousPitch) {
          const phraseShapeDirection = getPhraseShapeDirection({
            section: anchorPhrase.section,
            noteIndex: phraseNoteIndex,
            noteCount: totalWordCount,
            lift: character.lift,
          });

          const noteDirection =
            harmonyChanged || isFinalWordInUnit
              ? direction
              : phraseShapeDirection;

          currentPitch = chooseNearbyPitch(
            preferredCandidates,
            currentPitch,
            noteDirection,
          );
        }

        previousHarmonyChord =
          activeHarmonyEvent?.chord ?? previousHarmonyChord;

        notes.push({
          pitchMidi: currentPitch,
          startSeconds: word.startSeconds,
          durationSeconds: Number(
            Math.max(0.1, word.durationSeconds * 0.88).toFixed(3),
          ),
          lyricText: word.word,
        });

        phraseNoteIndex += 1;
      });
    });

    establishedMotifs.set(
      motifKey,
      notes.map((note) => note.pitchMidi),
    );

    return {
      ...anchorPhrase,
      notes: mergeAdjacentSamePitchMelodyNotes(notes, frameworkPhrase),
    };
  });
}
