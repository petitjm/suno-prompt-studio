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

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function buildLyricPhraseUnits(
  phrases: MelodyPhrase[],
): LyricPhraseUnitGroup[] {
  return phrases.map((phrase) => {
    const text = phrase.sourceLyric.trim();

    if (!text) {
      return {
        phrase,
        units: [],
      };
    }

    return {
      phrase,
      units: [
        {
          text,
          startSeconds: phrase.startSeconds,
          endSeconds: phrase.endSeconds,
          wordCount: Math.max(1, getWordCount(text)),
        },
      ],
    };
  });
}
