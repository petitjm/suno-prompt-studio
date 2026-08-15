import type { LyricPhraseUnitGroup } from "@/lib/melody/build-lyric-phrase-units";

export type LyricWordTiming = {
  word: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
};

export type LyricWordTimingUnit = {
  text: string;
  startSeconds: number;
  endSeconds: number;
  words: LyricWordTiming[];
};

export type LyricWordTimingGroup = {
  section: string;
  sourceLineIndex: number;
  sourceLyric: string;
  units: LyricWordTimingUnit[];
};

function getWordWeight(word: string) {
  const cleaned = word
    .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "")
    .toLowerCase();

  if (!cleaned) {
    return 1;
  }

  const lightWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "for",
    "in",
    "my",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);

  if (lightWords.has(cleaned)) {
    return 0.7;
  }

  if (cleaned.length >= 6) {
    return 1.25;
  }

  return 1;
}

export function buildLyricWordTimings(
  groups: LyricPhraseUnitGroup[],
): LyricWordTimingGroup[] {
  return groups.map((group) => ({
    section: group.phrase.section,
    sourceLineIndex: group.phrase.sourceLineIndex,
    sourceLyric: group.phrase.sourceLyric,

    units: group.units.map((unit) => {
      const words = unit.text.trim().split(/\s+/).filter(Boolean);

      if (words.length === 0) {
        return {
          text: unit.text,
          startSeconds: unit.startSeconds,
          endSeconds: unit.endSeconds,
          words: [],
        };
      }

      const weights = words.map((word, index) => {
        const baseWeight = getWordWeight(word);

        const isFinalWord = index === words.length - 1;

        return isFinalWord ? baseWeight * 1.2 : baseWeight;
      });

      const totalWeight = weights.reduce((total, weight) => total + weight, 0);

      const unitDurationSeconds = Math.max(
        0,
        unit.endSeconds - unit.startSeconds,
      );

      let elapsedSeconds = 0;

      const wordTimings = words.map((word, index) => {
        const durationSeconds =
          index === words.length - 1
            ? unitDurationSeconds - elapsedSeconds
            : unitDurationSeconds * (weights[index] / totalWeight);

        const startSeconds = unit.startSeconds + elapsedSeconds;

        const endSeconds =
          index === words.length - 1
            ? unit.endSeconds
            : startSeconds + durationSeconds;

        elapsedSeconds += durationSeconds;

        return {
          word,
          startSeconds: Number(startSeconds.toFixed(3)),
          endSeconds: Number(endSeconds.toFixed(3)),
          durationSeconds: Number(
            Math.max(0, endSeconds - startSeconds).toFixed(3),
          ),
        };
      });

      return {
        text: unit.text,
        startSeconds: unit.startSeconds,
        endSeconds: unit.endSeconds,
        words: wordTimings,
      };
    }),
  }));
}
