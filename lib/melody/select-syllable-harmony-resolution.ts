
import type { MelodyNote } from "@/types/song";
import type { MelodyHarmonyEvent } from "./build-melody-pitch-framework";
import { assessSustainedNoteHarmony } from "./assess-sustained-note-harmony";

export type SyllableHarmonyResolution = {
  resolutionPitchMidi: number;
  tensionDurationSeconds: number;
};

export function selectSyllableHarmonyResolution({
  note,
  harmonyEvents,
  candidatePitches,
}: {
  note: MelodyNote;
  harmonyEvents: MelodyHarmonyEvent[];
  candidatePitches: number[];
}): SyllableHarmonyResolution | null {
  if (
    !Number.isFinite(note.pitchMidi) ||
    !Number.isFinite(note.durationSeconds) ||
    note.durationSeconds < 2.5
  ) {
    return null;
  }

  const tensionDurationSeconds = Math.min(
    1,
    note.durationSeconds * 0.35,
  );

  const resolutionStartSeconds =
    note.startSeconds + tensionDurationSeconds;

  const resolutionDurationSeconds =
    note.durationSeconds - tensionDurationSeconds;

  const originalAssessment = assessSustainedNoteHarmony({
    note,
    harmonyEvents,
  });

  if (
    originalAssessment.totalChordOverlapSeconds <
      note.durationSeconds * 0.8 ||
    originalAssessment.nonChordToneExposureRatio < 0.75
  ) {
    return null;
  }

  const originalResolutionAssessment = assessSustainedNoteHarmony({
    note: {
      ...note,
      startSeconds: resolutionStartSeconds,
      durationSeconds: resolutionDurationSeconds,
    },
    harmonyEvents,
  });

  const alternatives = candidatePitches
    .filter(
      (pitch) =>
        Number.isFinite(pitch) &&
        Number.isInteger(pitch) &&
        pitch !== note.pitchMidi &&
        Math.abs(pitch - note.pitchMidi) <= 2,
    )
    .map((pitch) => {
      const assessment = assessSustainedNoteHarmony({
        note: {
          ...note,
          pitchMidi: pitch,
          startSeconds: resolutionStartSeconds,
          durationSeconds: resolutionDurationSeconds,
        },
        harmonyEvents,
      });

      return {
        pitch,
        exposureRatio: assessment.nonChordToneExposureRatio,
        coveredSeconds: assessment.totalChordOverlapSeconds,
      };
    })
    .filter(
      (candidate) =>
        candidate.coveredSeconds >= resolutionDurationSeconds * 0.8 &&
        candidate.exposureRatio <= 0.2 &&
        originalResolutionAssessment.nonChordToneExposureRatio -
          candidate.exposureRatio >= 0.6,
    )
    .sort(
      (a, b) =>
        a.exposureRatio - b.exposureRatio ||
        Math.abs(a.pitch - note.pitchMidi) -
          Math.abs(b.pitch - note.pitchMidi) ||
        a.pitch - b.pitch,
    );

  const best = alternatives[0];

  if (!best) {
    return null;
  }

  return {
    resolutionPitchMidi: best.pitch,
    tensionDurationSeconds,
  };
}
