
import type { MelodyNote } from "@/types/song";
import type { MelodyHarmonyEvent } from "@/lib/melody/build-melody-pitch-framework";

const PITCH_CLASS_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

const PITCH_CLASS_NUMBERS: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

export type SustainedNoteHarmonyOverlap = {
  chord: string;
  startSeconds: number;
  endSeconds: number;
  overlapSeconds: number;
  isChordTone: boolean;
};

export type SustainedNoteHarmonyAssessment = {
  lyric: string;
  pitchMidi: number;
  pitchClass: string;
  startSeconds: number;
  durationSeconds: number;
  overlaps: SustainedNoteHarmonyOverlap[];
  totalChordOverlapSeconds: number;
  nonChordToneSeconds: number;
  nonChordToneExposureRatio: number;
  harmonyChangeCount: number;
  returnsToChordTone: boolean;
  nextNotePitchMidi: number | null;
  nextNoteIntervalSemitones: number | null;
  nextNoteGapSeconds: number | null;
  nextNoteIsChordTone: boolean | null;
  nextNoteResolvesTension: boolean;
};

export function assessSustainedNoteHarmony({
  note,
  nextNote,
  harmonyEvents,
  nextNoteHarmonyEvents,
}: {
  note: MelodyNote;
  nextNote?: MelodyNote | null;
  harmonyEvents: MelodyHarmonyEvent[];
  nextNoteHarmonyEvents?: MelodyHarmonyEvent[];
}): SustainedNoteHarmonyAssessment {
  const noteStart = note.startSeconds;
  const noteEnd = note.startSeconds + note.durationSeconds;

  const notePitchClassNumber =
    ((note.pitchMidi % 12) + 12) % 12;

  const pitchClass = PITCH_CLASS_NAMES[notePitchClassNumber];

  const overlaps = harmonyEvents
    .map((event) => {
      const startSeconds = Math.max(
        noteStart,
        event.startSeconds,
      );

      const endSeconds = Math.min(
        noteEnd,
        event.endSeconds,
      );

      const overlapSeconds = Math.max(
        0,
        endSeconds - startSeconds,
      );

      if (overlapSeconds <= 0) {
        return null;
      }

      const slashBass = event.chord.includes("/")
  ? event.chord.split("/").pop()?.trim() ?? ""
  : "";

const slashBassPitchClass =
  PITCH_CLASS_NUMBERS[slashBass];

const isChordTone =
  event.pitchClasses.some(
    (value) =>
      PITCH_CLASS_NUMBERS[value] === notePitchClassNumber,
  ) ||
  slashBassPitchClass === notePitchClassNumber;

      return {
        chord: event.chord,
        startSeconds,
        endSeconds,
        overlapSeconds,
        isChordTone,
      };
    })
    .filter(
      (overlap): overlap is SustainedNoteHarmonyOverlap =>
        overlap !== null,
    )
    .sort(
      (a, b) => a.startSeconds - b.startSeconds,
    );

  const totalChordOverlapSeconds = overlaps.reduce(
    (sum, overlap) => sum + overlap.overlapSeconds,
    0,
  );

  const nonChordToneSeconds = overlaps
    .filter((overlap) => !overlap.isChordTone)
    .reduce(
      (sum, overlap) => sum + overlap.overlapSeconds,
      0,
    );

  const nonChordToneExposureRatio =
    totalChordOverlapSeconds > 0
      ? nonChordToneSeconds / totalChordOverlapSeconds
      : 0;

  // A return to a chord tone is not necessarily
  // a conventional melodic suspension resolution.
  const returnsToChordTone = overlaps.some(
    (overlap, index) =>
      overlap.isChordTone &&
      overlaps
        .slice(0, index)
        .some((previous) => !previous.isChordTone),
  );

  const harmonyChangeCount = overlaps.reduce(
    (count, overlap, index) =>
      index > 0 && overlap.chord !== overlaps[index - 1].chord
        ? count + 1
        : count,
    0,
  );

  const nextNotePitchMidi = nextNote?.pitchMidi ?? null;

  const nextNoteIntervalSemitones =
    nextNotePitchMidi !== null
      ? nextNotePitchMidi - note.pitchMidi
      : null;

  const nextNoteGapSeconds = nextNote
    ? Number(
        (
          nextNote.startSeconds -
          (note.startSeconds + note.durationSeconds)
        ).toFixed(3),
      )
    : null;

  const nextNotePitchClassNumber =
    nextNotePitchMidi !== null
      ? ((nextNotePitchMidi % 12) + 12) % 12
      : null;

  const nextNoteHarmonyEvent =
    nextNotePitchClassNumber !== null && nextNote
      ? (nextNoteHarmonyEvents ?? harmonyEvents).find(
          (event) =>
            nextNote.startSeconds >= event.startSeconds &&
            nextNote.startSeconds < event.endSeconds,
        )
      : undefined;

  const nextNoteIsChordTone =
    nextNotePitchClassNumber !== null && nextNoteHarmonyEvent
      ? nextNoteHarmonyEvent.pitchClasses.some(
          (value) =>
            PITCH_CLASS_NUMBERS[value] === nextNotePitchClassNumber,
        ) ||
        (
          nextNoteHarmonyEvent.chord.includes("/") &&
          PITCH_CLASS_NUMBERS[
            nextNoteHarmonyEvent.chord.split("/").pop()?.trim() ?? ""
          ] === nextNotePitchClassNumber
        )
      : null;

  const endsOnNonChordTone =
    overlaps.length > 0 &&
    !overlaps[overlaps.length - 1].isChordTone;

  const nextNoteResolvesTension =
    endsOnNonChordTone &&
    nextNoteIsChordTone === true &&
    nextNoteIntervalSemitones !== null &&
    Math.abs(nextNoteIntervalSemitones) >= 1 &&
    Math.abs(nextNoteIntervalSemitones) <= 2 &&
    nextNoteGapSeconds !== null &&
    nextNoteGapSeconds >= -0.15 &&
    nextNoteGapSeconds <= 0.75;


  return {
    lyric: note.lyricText || "",
    pitchMidi: note.pitchMidi,
    pitchClass,
    startSeconds: note.startSeconds,
    durationSeconds: note.durationSeconds,
    overlaps,
    totalChordOverlapSeconds,
    nonChordToneSeconds,
    nonChordToneExposureRatio,
        harmonyChangeCount,
    returnsToChordTone,
    nextNotePitchMidi,
    nextNoteIntervalSemitones,
    nextNoteGapSeconds,
    nextNoteIsChordTone,
    nextNoteResolvesTension,
  };
}
