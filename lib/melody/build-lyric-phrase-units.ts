import type { MelodyPhrase } from "@/types/song";

export type LyricPhraseUnit = {
  text: string;
  startSeconds: number;
  endSeconds: number;
  wordCount: number;
};

export type LyricPhraseUnitGroup = {
  phrase: MelodyPhrase;
  units: LyricPhraseUnit[];
};

function splitLyricIntoUnits(lyric: string): string[] {
  const trimmedLyric = lyric.trim();

  if (!trimmedLyric) {
    return [];
  }

  const protectedLyric = trimmedLyric.replace(
    /\b([A-Za-z']+),\s+\1\b/gi,
    "$1<<<REPEAT_COMMA>>>$1",
  );

  const punctuationUnits = protectedLyric
    .split(/\s*(?:,|;|:|—|–)\s*/)
    .map((unit) => unit.replace(/<<<REPEAT_COMMA>>>/g, ", ").trim())
    .filter(Boolean);

  return punctuationUnits.length > 0 ? punctuationUnits : [trimmedLyric];
}

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function buildLyricPhraseUnits(
  phrases: MelodyPhrase[],
): LyricPhraseUnitGroup[] {
  return phrases.map((phrase) => {
    const unitTexts = splitLyricIntoUnits(phrase.sourceLyric);

    if (unitTexts.length === 0) {
      return {
        phrase,
        units: [],
      };
    }

    const unitWordCounts = unitTexts.map((text) =>
      Math.max(1, getWordCount(text)),
    );

    const totalWordCount = unitWordCounts.reduce(
      (total, wordCount) => total + wordCount,
      0,
    );

    const phraseDurationSeconds = Math.max(
      0,
      phrase.endSeconds - phrase.startSeconds,
    );

    let elapsedSeconds = 0;

    const units = unitTexts.map((text, index) => {
      const wordCount = unitWordCounts[index];

      const durationSeconds =
        index === unitTexts.length - 1
          ? phraseDurationSeconds - elapsedSeconds
          : phraseDurationSeconds * (wordCount / totalWordCount);

      const startSeconds = phrase.startSeconds + elapsedSeconds;
      const endSeconds =
        index === unitTexts.length - 1
          ? phrase.endSeconds
          : startSeconds + durationSeconds;

      elapsedSeconds += durationSeconds;

      return {
        text,
        startSeconds: Number(startSeconds.toFixed(3)),
        endSeconds: Number(endSeconds.toFixed(3)),
        wordCount,
      };
    });

    return {
      phrase,
      units,
    };
  });
}
