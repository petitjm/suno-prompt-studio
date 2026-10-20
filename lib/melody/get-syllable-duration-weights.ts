
export function getSyllableDurationWeights({
  syllableCount,
  stressedSyllableIndex,
}: {
  syllableCount: number;
  stressedSyllableIndex?: number | null;
}): number[] {
  if (
    !Number.isInteger(syllableCount) ||
    syllableCount < 1
  ) {
    return [];
  }

  const weights = Array.from(
    { length: syllableCount },
    () => 1,
  );

  if (
    stressedSyllableIndex === null ||
    stressedSyllableIndex === undefined ||
    !Number.isInteger(stressedSyllableIndex) ||
    stressedSyllableIndex < 0 ||
    stressedSyllableIndex >= syllableCount
  ) {
    return weights;
  }

  weights[stressedSyllableIndex] = 2;

  return weights;
}
