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
    return 0.6;
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

    units: group.units.map((unit, unitIndex) => {
      const words = unit.text.trim().split(/\s+/).filter(Boolean);

      if (words.length === 0) {
        return {
          text: unit.text,
          startSeconds: unit.startSeconds,
          endSeconds: unit.endSeconds,
          words: [],
        };
      }

      const isFirstUnit = unitIndex === 0;
      const isFinalUnit = unitIndex === group.units.length - 1;

      const unitDurationSeconds = Math.max(
        0,
        unit.endSeconds - unit.startSeconds,
      );

      const phraseEntrySeconds = isFirstUnit
        ? Math.min(0.1, unitDurationSeconds * 0.04)
        : 0;

      const phraseBreakSeconds = isFinalUnit
        ? 0
        : Math.min(0.16, unitDurationSeconds * 0.08);

      const soundingUnitStartSeconds = Math.min(
        unit.endSeconds,
        unit.startSeconds + phraseEntrySeconds,
      );

      const soundingUnitEndSeconds = Math.max(
        soundingUnitStartSeconds,
        unit.endSeconds - phraseBreakSeconds,
      );

      const soundingUnitDurationSeconds = Math.max(
        0,
        soundingUnitEndSeconds - soundingUnitStartSeconds,
      );

      const weights = words.map((word, index) => {
        const baseWeight = getWordWeight(word);
        const isFinalWord = index === words.length - 1;

        if (!isFinalWord) {
          return baseWeight;
        }

        return isFinalUnit ? baseWeight * 1.75 : baseWeight * 1.3;
      });

      const totalWeight = weights.reduce((total, weight) => total + weight, 0);

      let elapsedSeconds = 0;

      const wordTimings = words.map((word, index) => {
        const durationSeconds =
          index === words.length - 1
            ? soundingUnitDurationSeconds - elapsedSeconds
            : soundingUnitDurationSeconds * (weights[index] / totalWeight);

        const startSeconds = soundingUnitStartSeconds + elapsedSeconds;

        const endSeconds =
          index === words.length - 1
            ? soundingUnitEndSeconds
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
