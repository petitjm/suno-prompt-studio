import type { MelodyNote } from "@/types/song";

export function buildArticulatedMelodyNotes(
  notes: MelodyNote[],
): MelodyNote[] {
  return notes.flatMap((note) => {
  // A melody note with an explicit syllable assignment
  // has already been articulated by the composer.
  // Do not split it again.
  if (
    typeof note.syllableText === "string" &&
    note.syllableText.trim().length > 0
  ) {
    return [note];
  }

  const lyricText = note.lyricText?.trim() || "";

    const syllables = lyricText
      .split(/[-‐‑‒–—]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (
      syllables.length < 2 ||
      !Number.isFinite(note.startSeconds) ||
      !Number.isFinite(note.durationSeconds) ||
      note.durationSeconds <= 0
    ) {
      return [note];
    }

    const syllableDurationSeconds =
      note.durationSeconds / syllables.length;

    return syllables.map((syllableText, index) => ({
      ...note,
      startSeconds:
        note.startSeconds + index * syllableDurationSeconds,
      durationSeconds: syllableDurationSeconds,
      syllableText,
    }));
  });
}