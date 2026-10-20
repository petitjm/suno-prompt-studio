
import type { MelodyNote } from "@/types/song";

const SYLLABLE_SEPARATOR = /[-‐‑‒–—]/;

export function buildSyllabicMelodyNotes({
  note,
  pitches,
  durationWeights,
  explicitSyllables,
}: {
  note: MelodyNote;
  pitches: number[];
  durationWeights?: number[];
  explicitSyllables?: string[];
}): MelodyNote[] {
  const syllables = (
    explicitSyllables ??
    (note.lyricText || "").split(SYLLABLE_SEPARATOR)
  )
    .map((part) => part.trim())
    .filter(Boolean);

  const normalizedWord = (value: string) =>
    value.toLowerCase().replace(/[^a-z']/g, "");

  if (
    explicitSyllables &&
    normalizedWord(explicitSyllables.join("")) !==
      normalizedWord(note.lyricText || "")
  ) {
    return [note];
  }

  if (
    syllables.length < 2 ||
    syllables.length !== pitches.length ||
    !Number.isFinite(note.startSeconds) ||
    !Number.isFinite(note.durationSeconds) ||
    note.durationSeconds <= 0 ||
    pitches.some((pitch) => !Number.isFinite(pitch))
  ) {
    return [note];
  }

  const validWeights =
    durationWeights &&
    durationWeights.length === syllables.length &&
    durationWeights.every(
      (weight) => Number.isFinite(weight) && weight > 0,
    )
      ? durationWeights
      : syllables.map(() => 1);

  const totalWeight = validWeights.reduce(
    (total, weight) => total + weight,
    0,
  );

  const startMilliseconds = Math.round(note.startSeconds * 1000);
  const durationMilliseconds = Math.round(note.durationSeconds * 1000);

  let cumulativeWeight = 0;

  return syllables.map((syllable, index) => {
    const startOffsetMilliseconds = Math.round(
      (cumulativeWeight / totalWeight) * durationMilliseconds,
    );

    cumulativeWeight += validWeights[index];

    const endOffsetMilliseconds =
      index === syllables.length - 1
        ? durationMilliseconds
        : Math.round(
            (cumulativeWeight / totalWeight) * durationMilliseconds,
          );

    return {
      ...note,
      pitchMidi: pitches[index],
      startSeconds:
        (startMilliseconds + startOffsetMilliseconds) / 1000,
      durationSeconds:
        (endOffsetMilliseconds - startOffsetMilliseconds) / 1000,
      syllableText: syllable,
    };
  });
}
