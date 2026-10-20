import type { LyricSyllableProsody } from "./lyric-syllable-prosody";

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z']/g, "");
}

export function getLyricSyllableProsody({
  word,
  annotations,
}: {
  word: string;
  annotations: LyricSyllableProsody[];
}): LyricSyllableProsody | null {
  const normalizedWord = normalizeWord(word);

  if (!normalizedWord) {
    return null;
  }

  const annotation = annotations.find(
    (candidate) =>
      normalizeWord(candidate.word) === normalizedWord,
  );

  if (!annotation || annotation.syllables.length === 0) {
    return null;
  }

  const reconstructedWord = normalizeWord(
    annotation.syllables.join(""),
  );

  if (reconstructedWord !== normalizedWord) {
    return null;
  }

  const stressIndex = annotation.stressedSyllableIndex;

  if (
    stressIndex !== null &&
    (!Number.isInteger(stressIndex) ||
      stressIndex < 0 ||
      stressIndex >= annotation.syllables.length)
  ) {
    return null;
  }

  return annotation;
}