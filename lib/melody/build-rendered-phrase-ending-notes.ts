import type { MelodyNote, MelodyPhrase } from "@/types/song";

export function buildRenderedPhraseEndingNotes(
  phrases: MelodyPhrase[],
): MelodyNote[] {
  return phrases.flatMap((phrase) => {
    const notes = phrase.notes;

    if (
      phrase.resolutionIntent !== "resolved" ||
      notes.length < 2
    ) {
      return notes;
    }

    const previous = notes[notes.length - 2];
    const final = notes[notes.length - 1];

    const sameWord =
      Boolean(previous.lyricText) &&
      previous.lyricText === final.lyricText;

    const sameSyllable =
      Boolean(previous.syllableText?.trim()) &&
      Boolean(final.syllableText?.trim()) &&
      previous.syllableText === final.syllableText;

    const samePitch = previous.pitchMidi === final.pitchMidi;

    const validTiming =
      Number.isFinite(previous.startSeconds) &&
      Number.isFinite(previous.durationSeconds) &&
      Number.isFinite(final.startSeconds) &&
      Number.isFinite(final.durationSeconds) &&
      previous.durationSeconds > 0 &&
      final.durationSeconds > 0;

    const contiguous =
      validTiming &&
      Math.abs(
        previous.startSeconds +
          previous.durationSeconds -
          final.startSeconds,
      ) <= 0.002;

    if (
      !sameWord ||
      !sameSyllable ||
      !samePitch ||
      !contiguous
    ) {
      return notes;
    }

    const mergedNote: MelodyNote = {
      ...previous,
      durationSeconds: Number(
        (
          final.startSeconds +
          final.durationSeconds -
          previous.startSeconds
        ).toFixed(3),
      ),
    };

    return [...notes.slice(0, -2), mergedNote];
  });
}
