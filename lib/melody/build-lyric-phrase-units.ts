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

function splitLyricIntoGestureUnits(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const units: string[] = [];
  let currentWords: string[] = [];

  words.forEach((word) => {
    currentWords.push(word);

    const endsGesture =
      /[,;:!?]$/.test(word) ||
      /[—–]$/.test(word) ||
      word === "—" ||
      word === "–";

    if (endsGesture && currentWords.length > 0) {
      units.push(currentWords.join(" "));
      currentWords = [];
    }
  });

  if (currentWords.length > 0) {
    units.push(currentWords.join(" "));
  }

  return units;
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

    const gestureTexts = splitLyricIntoGestureUnits(text);

    return {
      phrase,
      units: gestureTexts.map((gestureText) => ({
        text: gestureText,
        startSeconds: phrase.startSeconds,
        endSeconds: phrase.endSeconds,
        wordCount: Math.max(1, getWordCount(gestureText)),
      })),
    };
  });
}
