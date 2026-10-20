
import type { MelodyNote } from "@/types/song";

export function buildSyllableResolutionNotes({
  note,
  resolutionPitchMidi,
  tensionDurationSeconds,
}: {
  note: MelodyNote;
  resolutionPitchMidi: number;
  tensionDurationSeconds: number;
}): MelodyNote[] {
  if (
    !Number.isFinite(note.startSeconds) ||
    !Number.isFinite(note.durationSeconds) ||
    !Number.isFinite(note.pitchMidi) ||
    !Number.isFinite(resolutionPitchMidi) ||
    !Number.isFinite(tensionDurationSeconds) ||
    note.durationSeconds <= 0 ||
    tensionDurationSeconds <= 0 ||
    tensionDurationSeconds >= note.durationSeconds ||
    resolutionPitchMidi === note.pitchMidi
  ) {
    return [note];
  }

  const totalDurationMs = Math.round(note.durationSeconds * 1000);
  const tensionDurationMs = Math.round(tensionDurationSeconds * 1000);

  if (
    tensionDurationMs < 100 ||
    totalDurationMs - tensionDurationMs < 100
  ) {
    return [note];
  }

  const startMs = Math.round(note.startSeconds * 1000);

  return [
    {
      ...note,
      startSeconds: startMs / 1000,
      durationSeconds: tensionDurationMs / 1000,
    },
    {
      ...note,
      pitchMidi: resolutionPitchMidi,
      startSeconds: (startMs + tensionDurationMs) / 1000,
      durationSeconds:
        (totalDurationMs - tensionDurationMs) / 1000,
    },
  ];
}
