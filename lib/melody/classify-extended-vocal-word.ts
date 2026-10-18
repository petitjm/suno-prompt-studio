export type ExtendedVocalTreatment =
  | "ordinary"
  | "review-weak-word"
  | "sustain-candidate"
  | "syllabic-development-candidate";

export type ExtendedVocalWordAssessment = {
  treatment: ExtendedVocalTreatment;
  allocatedDurationSeconds: number;
  syllableCount: number;
  isWeakFunctionWord: boolean;
  isExtended: boolean;
};

const WEAK_FUNCTION_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "was",
  "were",
]);

function countExplicitSyllables(word: string): number {
  const parts = word
    .trim()
    .split(/[-‐‑–]+/)
    .filter(Boolean);

  return Math.max(1, parts.length);
}

export function classifyExtendedVocalWord({
  word,
  durationSeconds,
  isFinalWordInPhrase,
}: {
  word: string;
  durationSeconds: number;
  isFinalWordInPhrase: boolean;
}): ExtendedVocalWordAssessment {
  const normalizedWord = word
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, "");

  const syllableCount = countExplicitSyllables(word);
  const isWeakFunctionWord = WEAK_FUNCTION_WORDS.has(normalizedWord);

  const allocatedDurationSeconds =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : 0;

  const isExtended = allocatedDurationSeconds >= 2;

  let treatment: ExtendedVocalTreatment = "ordinary";

  if (isExtended) {
    if (isWeakFunctionWord && allocatedDurationSeconds >= 2.5) {
      treatment = "review-weak-word";
    } else if (syllableCount > 1) {
      treatment = "syllabic-development-candidate";
    } else if (
      isFinalWordInPhrase ||
      allocatedDurationSeconds >= 3
    ) {
      treatment = "sustain-candidate";
    }
  }

  return {
    treatment,
    allocatedDurationSeconds,
    syllableCount,
    isWeakFunctionWord,
    isExtended,
  };
}