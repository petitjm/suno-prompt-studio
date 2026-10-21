import {
  DEFAULT_MELODY_CHARACTER,
  type MelodyCharacter,
  type MelodyNote,
  type MelodyPhrase,
  type MelodySectionIntent,
} from "@/types/song";
import type { LyricWordTimingGroup } from "@/lib/melody/build-lyric-word-timings";
import type { MelodyPitchFrameworkPhrase } from "@/lib/melody/build-melody-pitch-framework";
import { classifyExtendedVocalWord } from "./classify-extended-vocal-word";
import { getExtendedVocalDuration } from "./get-extended-vocal-duration";
import { buildSyllabicMelodyNotes } from "./build-syllabic-melody-notes";
import { buildSyllableResolutionNotes } from "./build-syllable-resolution-notes";
import { selectSyllableHarmonyResolution } from "./select-syllable-harmony-resolution";
import { getSyllableDurationWeights } from "./get-syllable-duration-weights";
import type { LyricSyllableProsody } from "./lyric-syllable-prosody";
import { getLyricSyllableProsody } from "./get-lyric-syllable-prosody";

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
  const baseMultiplier = isFinalWordInPhrase ? 0.9 : 0.88;

  const weightAdjustment = Math.max(-0.06, Math.min(0.04, (weight - 1) * 0.04));

  return isFinalWordInPhrase
    ? Math.max(0.82, Math.min(0.96, baseMultiplier + weightAdjustment))
    : Math.max(0.78, Math.min(0.94, baseMultiplier + weightAdjustment));
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
  contourIntent,
}: {
  section: string;
  progress: number;
  lift: MelodyCharacter["lift"];
  sectionPhraseIndex: number;
  contourIntent?: MelodyPhrase["contourIntent"];
}): ContourDirection {
  const normalisedProgress = Math.min(1, Math.max(0, progress));
  if (contourIntent === "rise") {
    return normalisedProgress < 0.78 ? "up" : "level";
  }

  if (contourIntent === "fall") {
    return normalisedProgress < 0.78 ? "down" : "level";
  }

  if (contourIntent === "arch") {
    if (normalisedProgress < 0.45) {
      return "up";
    }

    if (normalisedProgress < 0.68) {
      return "level";
    }

    return "down";
  }

  if (contourIntent === "settle") {
    if (normalisedProgress < 0.55) {
      return "level";
    }

    return "down";
  }

  if (contourIntent === "suspend") {
    if (normalisedProgress < 0.55) {
      return "level";
    }

    return "up";
  }
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
  const sectionFamily = getMelodySectionFamily(phrase.section);

  const isGenericSongBlock = /^song block \d+$/.test(sectionFamily);

  if (isGenericSongBlock) {
    const normalisedLyric = (phrase.sourceLyric ?? "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    if (normalisedLyric) {
      return [
        "repeated-lyric",
        normalisedLyric,
        chordSequence,
      ].join("::");
    }
  }

  return [
    sectionFamily,
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

function developWordMelodyNotes({
  wordMelodyNote,
  word,
  vocalTreatment,
  frameworkPhrase,
  anchorPhrase,
  effectiveCharacter,
  sectionPhraseIndex,
  melodyRange,
  scalePitchClasses,
  syllableProsody,
}: {
  wordMelodyNote: MelodyNote;
  word: string;
  vocalTreatment: ReturnType<typeof classifyExtendedVocalWord>["treatment"];
  frameworkPhrase: MelodyPitchFrameworkPhrase;
  anchorPhrase: MelodyPhrase;
  effectiveCharacter: MelodyCharacter;
  sectionPhraseIndex: number;
  melodyRange: ReturnType<typeof getMelodyCharacterRange>;
  scalePitchClasses: string[];
  syllableProsody: LyricSyllableProsody[];
}): MelodyNote[] {
  const wordProsody = getLyricSyllableProsody({
    word,
    annotations: syllableProsody,
  });

  const hasExplicitProsody =
    wordProsody !== null && wordProsody.syllables.length >= 2;

  if (
    vocalTreatment !== "syllabic-development-candidate" &&
    !hasExplicitProsody
  ) {
    return [wordMelodyNote];
  }

  const syllables = (
    hasExplicitProsody ? wordProsody.syllables : word.split(/[-‐‑‒–—]/)
  )
    .map((part) => part.trim())
    .filter(Boolean);

  if (syllables.length < 2) {
    return [wordMelodyNote];
  }

  const normalizedSyllabicWord = word
    .trim()
    .toLowerCase()
    .replace(/[-‐‑‒–—]/g, "-");

  const stressedSyllableIndex = hasExplicitProsody
    ? wordProsody.stressedSyllableIndex
    : normalizedSyllabicWord === "a-lone" && syllables.length === 2
      ? 1
      : null;

  const durationWeights = getSyllableDurationWeights({
    syllableCount: syllables.length,
    stressedSyllableIndex,
  });

  const syllableTimingNotes = buildSyllabicMelodyNotes({
    note: wordMelodyNote,
    pitches: syllables.map(() => wordMelodyNote.pitchMidi),
    durationWeights,
    explicitSyllables: hasExplicitProsody ? syllables : undefined,
  });

  const syllablePitches = [wordMelodyNote.pitchMidi];

  for (let index = 1; index < syllables.length; index += 1) {
    const syllableTimingNote = syllableTimingNotes[index];

    const syllableMidpointSeconds = syllableTimingNote
      ? syllableTimingNote.startSeconds +
        syllableTimingNote.durationSeconds / 2
      : wordMelodyNote.startSeconds +
        ((index + 0.5) * wordMelodyNote.durationSeconds) /
          syllables.length;

    const syllableHarmony = getActiveHarmonyEvent(
      frameworkPhrase,
      syllableMidpointSeconds,
    );

    const syllablePitchClasses = Array.from(
      new Set([
        ...scalePitchClasses,
        ...(syllableHarmony?.pitchClasses ?? frameworkPhrase.pitchClasses),
      ]),
    );

    const syllableCandidates = getPitchCandidates(
      syllablePitchClasses,
      melodyRange.minimumMidi,
      melodyRange.maximumMidi,
    );

    const previousSyllablePitch =
      syllablePitches[syllablePitches.length - 1];

    const direction = getPhraseShapeDirection({
      section: anchorPhrase.section,
      progress:
        (syllableMidpointSeconds - anchorPhrase.startSeconds) /
        Math.max(
          0.001,
          anchorPhrase.endSeconds - anchorPhrase.startSeconds,
        ),
      lift: effectiveCharacter.lift,
      sectionPhraseIndex,
      contourIntent: anchorPhrase.contourIntent,
    });

    const movingCandidates = syllableCandidates.filter(
      (pitch) =>
        pitch !== previousSyllablePitch &&
        Math.abs(pitch - previousSyllablePitch) <= 4,
    );

    const nextPitch =
      movingCandidates.length > 0
        ? chooseNearbyPitch(
            movingCandidates,
            previousSyllablePitch,
            direction,
            false,
          )
        : previousSyllablePitch;

    syllablePitches.push(nextPitch);
  }

  const syllabicNotes = buildSyllabicMelodyNotes({
    note: wordMelodyNote,
    pitches: syllablePitches,
    durationWeights,
    explicitSyllables: hasExplicitProsody ? syllables : undefined,
  });

  const resolvedSyllabicNotes: MelodyNote[] = [];

  for (
    let syllableIndex = 0;
    syllableIndex < syllabicNotes.length;
    syllableIndex += 1
  ) {
    const syllableNote = syllabicNotes[syllableIndex];
    const isFinalSyllable =
      syllableIndex === syllabicNotes.length - 1;

    const resolution = isFinalSyllable
      ? selectSyllableHarmonyResolution({
          note: syllableNote,
          harmonyEvents: frameworkPhrase.harmonyEvents,
          candidatePitches: getPitchCandidates(
            scalePitchClasses,
            melodyRange.minimumMidi,
            melodyRange.maximumMidi,
          ),
        })
      : null;

    if (resolution) {
      resolvedSyllabicNotes.push(
        ...buildSyllableResolutionNotes({
          note: syllableNote,
          resolutionPitchMidi: resolution.resolutionPitchMidi,
          tensionDurationSeconds: resolution.tensionDurationSeconds,
        }),
      );
    } else {
      resolvedSyllabicNotes.push(syllableNote);
    }
  }

  return resolvedSyllabicNotes;
}

export function buildInitialMelodyContours({
  anchors,
  wordTimings,
  framework,
  scalePitchClasses,
  character = DEFAULT_MELODY_CHARACTER,
  sectionIntents = [],
  syllableProsody = [],
}: {
  anchors: MelodyPhrase[];
  wordTimings: LyricWordTimingGroup[];
  framework: MelodyPitchFrameworkPhrase[];
  scalePitchClasses: string[];
  character?: MelodyCharacter;
  sectionIntents?: MelodySectionIntent[];
  syllableProsody?: LyricSyllableProsody[];
}): MelodyPhrase[] {
  const establishedMotifs = new Map<
    string,
    {
      contourIntent: MelodyPhrase["contourIntent"];
      contourSequence: ContourDirection[];
      wordPitchSequence: number[];
    }
  >();

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
    const establishedMotif = establishedMotifs.get(motifKey);

    const establishedContourSequence =
      establishedMotif &&
      establishedMotif.contourIntent === anchorPhrase.contourIntent
        ? establishedMotif.contourSequence
        : undefined;

    if (establishedMotif) {
      console.log("[melody] motif reuse candidate", {
        phraseIndex,
        section: anchorPhrase.section,
        motifKey,
        currentContourIntent: anchorPhrase.contourIntent,
        establishedContourIntent: establishedMotif.contourIntent,
        reused: Boolean(establishedContourSequence),
      });
    }

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

          const nonChordMelodicCandidates = melodicCandidates.filter(
            (candidate) => !chordCandidates.includes(candidate),
          );

          const harmonyChanged =
            activeHarmonyEvent !== null &&
            activeHarmonyEvent.chord !== reusedPreviousHarmonyChord;

          const isFinalWordInUnit = wordIndex === unit.words.length - 1;
          const isFinalWordInPhrase = reusedNoteIndex === totalWordCount - 1;

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

          const basePreferWiderStep =
            isGesturePivot || entersAfterRhythmicSpace || harmonyChanged;

          const preferWiderStep =
            !isFinalWordInPhrase && anchorPhrase.emphasisIntent === "restrained"
              ? false
              : !isFinalWordInPhrase &&
                  anchorPhrase.emphasisIntent === "strong" &&
                  isGestureAnchor
                ? true
                : basePreferWiderStep;

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

          const preferChordTone =
            reusedNoteIndex === 0 || harmonyChanged || isFinalWordInUnit;

          const phraseEndingCandidates =
            isFinalWordInPhrase && anchorPhrase.resolutionIntent === "resolved"
              ? chordCandidates.length > 0
                ? chordCandidates
                : melodicCandidates
              : isFinalWordInPhrase && anchorPhrase.resolutionIntent === "open"
                ? nonChordMelodicCandidates.length > 0
                  ? nonChordMelodicCandidates
                  : melodicCandidates
                : isFinalWordInPhrase &&
                    anchorPhrase.resolutionIntent === "partial"
                  ? melodicCandidates
                  : null;

          const preferredCandidates =
            phraseEndingCandidates && phraseEndingCandidates.length > 0
              ? phraseEndingCandidates
              : preferChordTone && chordCandidates.length > 0
                ? chordCandidates
                : melodicCandidates.length > 0
                  ? melodicCandidates
                  : candidates;

          const motifContourDirection =
            establishedContourSequence[reusedNoteIndex] ?? "level";

          const establishedWordPitches =
            establishedMotif?.wordPitchSequence;

          const originalInterval =
            establishedWordPitches && reusedNoteIndex > 0
              ? establishedWordPitches[reusedNoteIndex] -
                establishedWordPitches[reusedNoteIndex - 1]
              : null;

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
           const originalStartPitch =
              establishedMotif?.wordPitchSequence[0];

            const phraseStartReferencePitch =
              originalStartPitch !== undefined &&
              preferredCandidates.includes(originalStartPitch)
                ? originalStartPitch
                : previousPhraseEndPitch !== null &&
                    anchorPhrase.sectionInstanceId ===
                      previousPhraseSectionInstanceId
                  ? previousPhraseEndPitch
                  : currentPitch;

            currentPitch = preferredCandidates.reduce((best, candidate) =>
              Math.abs(candidate - phraseStartReferencePitch) <
              Math.abs(best - phraseStartReferencePitch)
                ? candidate
                : best,
            );
          } else if (reusedNoteIndex > 0 && !holdPreviousPitch) {
            const targetPitch =
              originalInterval !== null
                ? currentPitch + originalInterval
                : null;

            const matchingIntervalPitch =
              targetPitch !== null &&
              preferredCandidates.includes(targetPitch)
                ? targetPitch
                : null;

            currentPitch =
              matchingIntervalPitch !== null
                ? matchingIntervalPitch
                : chooseNearbyPitch(
                    preferredCandidates,
                    currentPitch,
                    realisedContourDirection,
                    preferWiderStep,
                  );
          }

          const vocalAssessment = classifyExtendedVocalWord({
            word: word.word,
            durationSeconds: word.durationSeconds,
            isFinalWordInPhrase,
          });

          const renderedDurationSeconds =
            word.durationSeconds *
            getRenderedMelodyDurationMultiplier(
              word.weight,
              isFinalWordInPhrase,
            );

          const treatedDurationSeconds = getExtendedVocalDuration({
            assessment: vocalAssessment,
            originalDurationSeconds: word.durationSeconds,
            renderedDurationSeconds,
          });

          const wordMelodyNote: MelodyNote = {
            pitchMidi: currentPitch,
            startSeconds: word.startSeconds,
            durationSeconds: Number(
              Math.max(0.1, treatedDurationSeconds).toFixed(3),
            ),
            lyricText: word.word,
          };

          reusedNotes.push(
            ...developWordMelodyNotes({
              wordMelodyNote,
              word: word.word,
              vocalTreatment: vocalAssessment.treatment,
              frameworkPhrase,
              anchorPhrase,
              effectiveCharacter,
              sectionPhraseIndex,
              melodyRange,
              scalePitchClasses,
              syllableProsody,
            }),
          );

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

    const wordLevelMotifNotes: MelodyNote[] = [];

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

        const nonChordMelodicCandidates = melodicCandidates.filter(
          (candidate) => !chordCandidates.includes(candidate),
        );

        const harmonyChanged =
          activeHarmonyEvent !== null &&
          activeHarmonyEvent.chord !== previousHarmonyChord;

        const isFinalWordInUnit = wordIndex === unit.words.length - 1;
        const isFinalWordInPhrase = phraseNoteIndex === totalWordCount - 1;

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

        const isLyricalEmphasisWord =
          anchorPhrase.emphasisWordOffset !== undefined &&
          phraseNoteIndex === anchorPhrase.emphasisWordOffset;

        const isGestureAnchor =
          isLyricalEmphasisWord ||
          isGestureStart ||
          isGesturePivot ||
          entersAfterRhythmicSpace ||
          isRhythmicallyExtended ||
          harmonyChanged ||
          isFinalWordInUnit;

        const basePreferWiderStep =
          isGesturePivot || entersAfterRhythmicSpace || harmonyChanged;

        const preferWiderStep =
          !isFinalWordInPhrase && anchorPhrase.emphasisIntent === "restrained"
            ? false
            : !isFinalWordInPhrase &&
                anchorPhrase.emphasisIntent === "strong" &&
                isGestureAnchor
              ? true
              : basePreferWiderStep;

        const holdForMovement = shouldHoldForMelodyMovement(
          effectiveCharacter.movement,
          isGestureAnchor,
          phraseNoteIndex,
        );

        const holdPreviousPitch =
          phraseNoteIndex > 0 &&
          !isLyricalEmphasisWord &&
          (shouldHoldPreviousMelodyPitch(word.word) || holdForMovement) &&
          !harmonyChanged &&
          !isFinalWordInUnit;

        const preferChordTone =
          phraseNoteIndex === 0 || harmonyChanged || isFinalWordInUnit;

        const phraseEndingCandidates =
          isFinalWordInPhrase && anchorPhrase.resolutionIntent === "resolved"
            ? chordCandidates.length > 0
              ? chordCandidates
              : melodicCandidates
            : isFinalWordInPhrase && anchorPhrase.resolutionIntent === "open"
              ? nonChordMelodicCandidates.length > 0
                ? nonChordMelodicCandidates
                : melodicCandidates
              : isFinalWordInPhrase &&
                  anchorPhrase.resolutionIntent === "partial"
                ? melodicCandidates
                : null;

        const preferredCandidates =
          phraseEndingCandidates && phraseEndingCandidates.length > 0
            ? phraseEndingCandidates
            : preferChordTone && chordCandidates.length > 0
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
            contourIntent: anchorPhrase.contourIntent,
          });

          const phraseShapeDirection =
            entryAppliesToPhrase && !anchorPhrase.contourIntent
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

        const vocalAssessment = classifyExtendedVocalWord({
          word: word.word,
          durationSeconds: word.durationSeconds,
          isFinalWordInPhrase,
        });

        const renderedDurationSeconds =
          word.durationSeconds *
          getRenderedMelodyDurationMultiplier(word.weight, isFinalWordInPhrase);

        const treatedDurationSeconds = getExtendedVocalDuration({
          assessment: vocalAssessment,
          originalDurationSeconds: word.durationSeconds,
          renderedDurationSeconds,
        });

        const wordMelodyNote: MelodyNote = {
          pitchMidi: currentPitch,
          startSeconds: word.startSeconds,
          durationSeconds: Number(
            Math.max(0.1, treatedDurationSeconds).toFixed(3),
          ),
          lyricText: word.word,
        };

                // Store one principal note per timed word for motif reuse.
        // Syllabic development may create additional rendered notes.
        wordLevelMotifNotes.push(wordMelodyNote);

        notes.push(
          ...developWordMelodyNotes({
            wordMelodyNote,
            word: word.word,
            vocalTreatment: vocalAssessment.treatment,
            frameworkPhrase,
            anchorPhrase,
            effectiveCharacter,
            sectionPhraseIndex,
            melodyRange,
            scalePitchClasses,
            syllableProsody,
          }),
        );

        currentPitch = notes[notes.length - 1]?.pitchMidi ?? currentPitch;

        phraseNoteIndex += 1;
      });
    });

    if (!establishedMotif) {
      establishedMotifs.set(motifKey, {
        contourIntent: anchorPhrase.contourIntent,
        contourSequence: getMelodyContourSequence(wordLevelMotifNotes),
        wordPitchSequence: wordLevelMotifNotes.map(
          (note) => note.pitchMidi,
        ),
      });
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
