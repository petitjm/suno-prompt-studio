import {
  DEFAULT_MELODY_CHARACTER,
  type MelodyCharacter,
  type MelodyNote,
  type MelodyPhrase,
  type MelodySectionIntent,
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

function applySectionEntryBias(
  direction: ContourDirection,
  entry: NonNullable<MelodySectionIntent["entry"]>,
): ContourDirection {
  if (entry === "gentle") {
    return direction === "up" ? "level" : direction;
  }

  if (entry === "lifted") {
    return direction === "down" ? "level" : "up";
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

  return !isGestureAnchor && phraseNoteIndex % 2 === 1;
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
  preferWiderStep = false,
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

    return (
      (preferWiderStep ? upward[1] : undefined) ?? upward[0] ?? currentPitch
    );
  }

  if (direction === "down") {
    const downward = pool
      .filter((candidate) => candidate < currentPitch)
      .sort((a, b) => b - a);

    return (
      (preferWiderStep ? downward[1] : undefined) ?? downward[0] ?? currentPitch
    );
  }

  return pool.reduce((best, candidate) =>
    Math.abs(candidate - currentPitch) < Math.abs(best - currentPitch)
      ? candidate
      : best,
  );
}

function getRenderedMelodyDurationMultiplier(
  weight: number,
  isFinalWordInPhrase: boolean,
) {
  const baseMultiplier = isFinalWordInPhrase ? 0.94 : 0.88;

  const weightAdjustment = Math.max(-0.06, Math.min(0.04, (weight - 1) * 0.04));

  return Math.max(0.78, Math.min(0.98, baseMultiplier + weightAdjustment));
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

function getEffectiveMelodyCharacter({
  character,
  sectionIntent,
}: {
  character: MelodyCharacter;
  sectionIntent?: MelodySectionIntent;
}): MelodyCharacter {
  return {
    register: sectionIntent?.register ?? character.register,
    lift: sectionIntent?.lift ?? character.lift,
    movement: sectionIntent?.movement ?? character.movement,
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
  progress,
  lift,
  sectionPhraseIndex,
}: {
  section: string;
  progress: number;
  lift: MelodyCharacter["lift"];
  sectionPhraseIndex: number;
}): ContourDirection {
  const normalisedProgress = Math.min(1, Math.max(0, progress));
  const normalisedSection = section.toLowerCase();

  const isChorus =
    normalisedSection.includes("chorus") ||
    normalisedSection.includes("hook") ||
    normalisedSection.includes("refrain");

  const isBridge =
    normalisedSection.includes("bridge") ||
    normalisedSection.includes("middle");

  if (isChorus) {
    if (normalisedProgress < 0.45) {
      return applyMelodyLiftBias("up", lift);
    }

    if (normalisedProgress < 0.7) {
      return applyMelodyLiftBias("level", lift);
    }

    return applyMelodyLiftBias("down", lift);
  }

  if (isBridge) {
    if (normalisedProgress < 0.35) {
      return applyMelodyLiftBias("up", lift);
    }

    if (normalisedProgress < 0.65) {
      return applyMelodyLiftBias("down", lift);
    }

    return applyMelodyLiftBias("level", lift);
  }

  const phraseShapeVariant = sectionPhraseIndex % 3;

  if (phraseShapeVariant === 1) {
    if (normalisedProgress < 0.4) {
      return applyMelodyLiftBias("level", lift);
    }

    if (normalisedProgress < 0.75) {
      return applyMelodyLiftBias("up", lift);
    }

    return applyMelodyLiftBias("down", lift);
  }

  if (phraseShapeVariant === 2) {
    if (normalisedProgress < 0.35) {
      return applyMelodyLiftBias("down", lift);
    }

    if (normalisedProgress < 0.7) {
      return applyMelodyLiftBias("level", lift);
    }

    return applyMelodyLiftBias("up", lift);
  }

  if (normalisedProgress < 0.5) {
    return applyMelodyLiftBias("up", lift);
  }

  if (normalisedProgress < 0.75) {
    return applyMelodyLiftBias("level", lift);
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
  sectionPhraseIndex: number,
) {
  const chordSequence = frameworkPhrase.chords.join("|");

  return [
    getMelodySectionFamily(phrase.section),
    `phrase-${sectionPhraseIndex}`,
    chordSequence,
  ].join("::");
}

function getMelodyContourSequence(notes: MelodyNote[]): ContourDirection[] {
  return notes.map((note, noteIndex) => {
    if (noteIndex === 0) {
      return "level";
    }

    const previousPitch = notes[noteIndex - 1].pitchMidi;

    if (note.pitchMidi > previousPitch) {
      return "up";
    }

    if (note.pitchMidi < previousPitch) {
      return "down";
    }

    return "level";
  });
}

export function buildInitialMelodyContours({
  anchors,
  wordTimings,
  framework,
  scalePitchClasses,
  character = DEFAULT_MELODY_CHARACTER,
  sectionIntents = [],
}: {
  anchors: MelodyPhrase[];
  wordTimings: LyricWordTimingGroup[];
  framework: MelodyPitchFrameworkPhrase[];
  scalePitchClasses: string[];
  character?: MelodyCharacter;
  sectionIntents?: MelodySectionIntent[];
}): MelodyPhrase[] {
  const establishedMotifs = new Map<string, ContourDirection[]>();

  let previousPhraseEndPitch: number | null = null;
  let previousPhraseSectionInstanceId: string | null | undefined;

  return anchors.map((anchorPhrase, phraseIndex) => {
    const anchorNote = anchorPhrase.notes[0];
    const wordTimingGroup = wordTimings[phraseIndex];
    const frameworkPhrase = framework[phraseIndex];
    const sectionIntent = anchorPhrase.sectionInstanceId
      ? sectionIntents.find(
          (intent) =>
            intent.sectionInstanceId === anchorPhrase.sectionInstanceId,
        )
      : undefined;

    const effectiveCharacter = getEffectiveMelodyCharacter({
      character,
      sectionIntent,
    });

    const sectionPhraseIndex = anchorPhrase.sectionInstanceId
      ? anchors
          .slice(0, phraseIndex)
          .filter(
            (phrase) =>
              phrase.sectionInstanceId === anchorPhrase.sectionInstanceId,
          ).length
      : 0;

    const sectionEntry = sectionIntent?.entry ?? "natural";

    const entryAppliesToPhrase =
      sectionEntry !== "natural" && sectionPhraseIndex < 2;

    const effectiveEntryForPhrase = entryAppliesToPhrase
      ? sectionEntry
      : "natural";

    const melodyRange = getMelodyCharacterRange(effectiveCharacter);

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

    const motifKey = getMelodyMotifKey(
      anchorPhrase,
      frameworkPhrase,
      sectionPhraseIndex,
    );
    const establishedContourSequence = establishedMotifs.get(motifKey);

    if (
      establishedContourSequence &&
      establishedContourSequence.length === totalWordCount
    ) {
      let reusedNoteIndex = 0;
      let reusedPreviousHarmonyChord: string | null = null;

      const reusedNotes: MelodyNote[] = [];

      wordTimingGroup.units.forEach((unit) => {
        const averageWordDuration =
          unit.words.length > 0
            ? unit.words.reduce(
                (total, timedWord) => total + timedWord.durationSeconds,
                0,
              ) / unit.words.length
            : 0;

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
            activeHarmonyEvent.chord !== reusedPreviousHarmonyChord;

          const isFinalWordInUnit = wordIndex === unit.words.length - 1;

          const isGestureStart = wordIndex === 0;

          const gesturePivotIndex =
            unit.words.length >= 5
              ? Math.floor((unit.words.length - 1) / 2)
              : -1;

          const isGesturePivot = wordIndex === gesturePivotIndex;

          const previousWord = wordIndex > 0 ? unit.words[wordIndex - 1] : null;

          const gapBeforeWordSeconds =
            previousWord !== null
              ? Math.max(0, word.startSeconds - previousWord.endSeconds)
              : 0;

          const entersAfterRhythmicSpace =
            previousWord !== null &&
            gapBeforeWordSeconds >= Math.max(0.12, averageWordDuration * 0.35);

          const isRhythmicallyExtended =
            wordIndex > 0 &&
            !isFinalWordInUnit &&
            averageWordDuration > 0 &&
            word.durationSeconds >= averageWordDuration * 1.45;

          const isGestureAnchor =
            isGestureStart ||
            isGesturePivot ||
            entersAfterRhythmicSpace ||
            isRhythmicallyExtended ||
            harmonyChanged ||
            isFinalWordInUnit;

          const preferWiderStep =
            isGesturePivot || entersAfterRhythmicSpace || harmonyChanged;

          const holdForMovement = shouldHoldForMelodyMovement(
            effectiveCharacter.movement,
            isGestureAnchor,
            reusedNoteIndex,
          );

          const holdPreviousPitch =
            reusedNoteIndex > 0 &&
            (shouldHoldPreviousMelodyPitch(word.word) || holdForMovement) &&
            !harmonyChanged &&
            !isFinalWordInUnit;

          const isFinalWordInPhrase = reusedNoteIndex === totalWordCount - 1;

          const preferChordTone =
            reusedNoteIndex === 0 || harmonyChanged || isFinalWordInUnit;

          const preferredCandidates =
            preferChordTone && chordCandidates.length > 0
              ? chordCandidates
              : melodicCandidates.length > 0
                ? melodicCandidates
                : candidates;

          const motifContourDirection =
            establishedContourSequence[reusedNoteIndex] ?? "level";

          const liftedContourDirection = applyMelodyLiftBias(
            motifContourDirection,
            effectiveCharacter.lift,
          );

          const realisedContourDirection = entryAppliesToPhrase
            ? applySectionEntryBias(
                liftedContourDirection,
                effectiveEntryForPhrase,
              )
            : liftedContourDirection;

          if (reusedNoteIndex === 0 && preferChordTone) {
            const phraseStartReferencePitch =
              previousPhraseEndPitch !== null &&
              anchorPhrase.sectionInstanceId === previousPhraseSectionInstanceId
                ? previousPhraseEndPitch
                : currentPitch;

            currentPitch = preferredCandidates.reduce((best, candidate) =>
              Math.abs(candidate - phraseStartReferencePitch) <
              Math.abs(best - phraseStartReferencePitch)
                ? candidate
                : best,
            );
          } else if (reusedNoteIndex > 0 && !holdPreviousPitch) {
            currentPitch = chooseNearbyPitch(
              preferredCandidates,
              currentPitch,
              realisedContourDirection,
              preferWiderStep,
            );
          }

          const renderedDurationSeconds =
            word.durationSeconds *
            getRenderedMelodyDurationMultiplier(
              word.weight,
              isFinalWordInPhrase,
            );

          reusedNotes.push({
            pitchMidi: currentPitch,
            startSeconds: word.startSeconds,
            durationSeconds: Number(
              Math.max(0.1, renderedDurationSeconds).toFixed(3),
            ),
            lyricText: word.word,
          });

          reusedPreviousHarmonyChord =
            activeHarmonyEvent?.chord ?? reusedPreviousHarmonyChord;

          reusedNoteIndex += 1;
        });
      });

      if (reusedNotes.length > 0) {
        previousPhraseEndPitch = reusedNotes[reusedNotes.length - 1].pitchMidi;
        previousPhraseSectionInstanceId = anchorPhrase.sectionInstanceId;
      }

      return {
        ...anchorPhrase,
        notes: reusedNotes,
      };
    }

    wordTimingGroup.units.forEach((unit) => {
      const averageWordDuration =
        unit.words.length > 0
          ? unit.words.reduce(
              (total, timedWord) => total + timedWord.durationSeconds,
              0,
            ) / unit.words.length
          : 0;
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

        const previousWord = wordIndex > 0 ? unit.words[wordIndex - 1] : null;

        const gapBeforeWordSeconds =
          previousWord !== null
            ? Math.max(0, word.startSeconds - previousWord.endSeconds)
            : 0;

        const entersAfterRhythmicSpace =
          previousWord !== null &&
          gapBeforeWordSeconds >= Math.max(0.12, averageWordDuration * 0.35);

        const isRhythmicallyExtended =
          wordIndex > 0 &&
          !isFinalWordInUnit &&
          averageWordDuration > 0 &&
          word.durationSeconds >= averageWordDuration * 1.45;

        const isGestureAnchor =
          isGestureStart ||
          isGesturePivot ||
          entersAfterRhythmicSpace ||
          isRhythmicallyExtended ||
          harmonyChanged ||
          isFinalWordInUnit;

        const preferWiderStep =
          isGesturePivot || entersAfterRhythmicSpace || harmonyChanged;

        const holdForMovement = shouldHoldForMelodyMovement(
          effectiveCharacter.movement,
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
          const phraseStartReferencePitch =
            previousPhraseEndPitch !== null &&
            anchorPhrase.sectionInstanceId === previousPhraseSectionInstanceId
              ? previousPhraseEndPitch
              : currentPitch;

          currentPitch = preferredCandidates.reduce((best, candidate) =>
            Math.abs(candidate - phraseStartReferencePitch) <
            Math.abs(best - phraseStartReferencePitch)
              ? candidate
              : best,
          );
        } else if (phraseNoteIndex > 0 && !holdPreviousPitch) {
          const phraseDurationSeconds = Math.max(
            0.001,
            anchorPhrase.endSeconds - anchorPhrase.startSeconds,
          );

          const wordMidpointSeconds =
            word.startSeconds + word.durationSeconds / 2;

          const phraseProgress =
            (wordMidpointSeconds - anchorPhrase.startSeconds) /
            phraseDurationSeconds;

          const basePhraseShapeDirection = getPhraseShapeDirection({
            section: anchorPhrase.section,
            progress: phraseProgress,
            lift: effectiveCharacter.lift,
            sectionPhraseIndex,
          });

          const phraseShapeDirection = entryAppliesToPhrase
            ? applySectionEntryBias(
                basePhraseShapeDirection,
                effectiveEntryForPhrase,
              )
            : basePhraseShapeDirection;

          currentPitch = chooseNearbyPitch(
            preferredCandidates,
            currentPitch,
            phraseShapeDirection,
            preferWiderStep,
          );
        }

        previousHarmonyChord =
          activeHarmonyEvent?.chord ?? previousHarmonyChord;

        const isFinalWordInPhrase = phraseNoteIndex === totalWordCount - 1;

        const renderedDurationSeconds =
          word.durationSeconds *
          getRenderedMelodyDurationMultiplier(word.weight, isFinalWordInPhrase);

        notes.push({
          pitchMidi: currentPitch,
          startSeconds: word.startSeconds,
          durationSeconds: Number(
            Math.max(0.1, renderedDurationSeconds).toFixed(3),
          ),
          lyricText: word.word,
        });

        phraseNoteIndex += 1;
      });
    });

    if (!establishedContourSequence) {
      establishedMotifs.set(motifKey, getMelodyContourSequence(notes));
    }

    if (notes.length > 0) {
      previousPhraseEndPitch = notes[notes.length - 1].pitchMidi;
      previousPhraseSectionInstanceId = anchorPhrase.sectionInstanceId;
    }

    return {
      ...anchorPhrase,
      notes,
    };
  });
}
