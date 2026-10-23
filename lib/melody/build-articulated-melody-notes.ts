import type { MelodyNote } from "@/types/song";

export function buildArticulatedMelodyNotes(
  notes: MelodyNote[],
): MelodyNote[] {
  const articulatedNotes = notes.flatMap((note) => {
    // Notes with explicit syllable assignments have already
    // been articulated by the melody generator.
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

  const sustainedNotes: MelodyNote[] = [];

  for (const note of articulatedNotes) {
    const previous = sustainedNotes[sustainedNotes.length - 1];

    const previousEndSeconds = previous
      ? previous.startSeconds + previous.durationSeconds
      : null;

    const sameWord =
      Boolean(previous?.lyricText) &&
      previous?.lyricText === note.lyricText;

    const samePitch =
      previous?.pitchMidi === note.pitchMidi;

    const contiguous =
      previousEndSeconds !== null &&
      Math.abs(previousEndSeconds - note.startSeconds) <= 0.002;

    const explicitlySyllabic =
      Boolean(previous?.syllableText) &&
      Boolean(note.syllableText);

    if (
      previous &&
      sameWord &&
      samePitch &&
      contiguous &&
      explicitlySyllabic
    ) {
      sustainedNotes[sustainedNotes.length - 1] = {
        ...previous,
        durationSeconds: Number(
          (
            note.startSeconds +
            note.durationSeconds -
            previous.startSeconds
          ).toFixed(3),
        ),
      };

      continue;
    }

    sustainedNotes.push(note);
  }

  return sustainedNotes;
}
