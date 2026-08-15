import type { MelodyNote, MelodyPhrase } from "@/types/song";
import type { LyricWordTimingGroup } from "@/lib/melody/build-lyric-word-timings";
import type { MelodyPitchFrameworkPhrase } from "@/lib/melody/build-melody-pitch-framework";

type ContourDirection = "up" | "down" | "level";

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
}: {
  section: string;
  noteIndex: number;
  noteCount: number;
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
      return "up";
    }

    if (progress < 0.7) {
      return "level";
    }

    return "down";
  }

  if (isBridge) {
    if (progress < 0.35) {
      return "up";
    }

    if (progress < 0.65) {
      return "down";
    }

    return "level";
  }

  if (progress < 0.3) {
    return "level";
  }

  if (progress < 0.6) {
    return "up";
  }

  return "down";
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
}: {
  anchors: MelodyPhrase[];
  wordTimings: LyricWordTimingGroup[];
  framework: MelodyPitchFrameworkPhrase[];
  scalePitchClasses: string[];
}): MelodyPhrase[] {
  const establishedMotifs = new Map<string, number[]>();

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

    const candidates = getPitchCandidates(melodicPitchClasses);

    if (candidates.length === 0) {
      return anchorPhrase;
    }

    let currentPitch = anchorNote.pitchMidi;
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

        const chordCandidates = getPitchCandidates(activeHarmonyPitchClasses);

        const melodicPitchClasses = Array.from(
          new Set([...scalePitchClasses, ...activeHarmonyPitchClasses]),
        );

        const melodicCandidates = getPitchCandidates(melodicPitchClasses);

        const harmonyChanged =
          activeHarmonyEvent !== null &&
          activeHarmonyEvent.chord !== previousHarmonyChord;

        const isFinalWordInUnit = wordIndex === unit.words.length - 1;

        const holdPreviousPitch =
          phraseNoteIndex > 0 &&
          shouldHoldPreviousMelodyPitch(word.word) &&
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
