
import type {
  ExtendedVocalWordAssessment,
} from "./classify-extended-vocal-word";

export function getExtendedVocalDuration({
  assessment,
  originalDurationSeconds,
  renderedDurationSeconds,
}: {
  assessment: ExtendedVocalWordAssessment;
  originalDurationSeconds: number;
  renderedDurationSeconds: number;
}): number {
  if (
    !Number.isFinite(originalDurationSeconds) ||
    !Number.isFinite(renderedDurationSeconds) ||
    originalDurationSeconds <= 0 ||
    renderedDurationSeconds <= 0
  ) {
    return renderedDurationSeconds;
  }

  if (assessment.treatment !== "review-weak-word") {
    return renderedDurationSeconds;
  }

  // Experimental treatment:
  // Reduce exceptionally long weak-word sustains while
  // retaining their existing start time and pitch.
  const maximumWeakWordSustainSeconds = 2;

  return Math.min(
    renderedDurationSeconds,
    maximumWeakWordSustainSeconds,
  );
}
