import type { LyricPhraseUnitGroup } from "@/lib/melody/build-lyric-phrase-units";
import type { MelodySectionIntent } from "@/types/song";

export type LyricWordTiming = {
  word: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  weight: number;
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

type GuideBarTimingLike = {
  bar?: unknown;
  beatsPerBar?: unknown;
  quarterNotesPerBeat?: unknown;
  quarterNotesPerBar?: unknown;
};

type GuideSectionLike = {
  section?: unknown;
  sectionInstanceId?: unknown;
  sourceLineIndexes?: unknown;
  startSeconds?: unknown;
  endSeconds?: unknown;
  barTiming?: unknown;
};

type WordRhythmEntryLike = {
  phraseIndex?: unknown;
  wordIndex?: unknown;
  word?: unknown;
  section?: unknown;
  startBar?: unknown;
  startBeat?: unknown;
  endBar?: unknown;
  endBeat?: unknown;
};

type WordRhythmPlanLike = {
  words?: unknown;
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

function getFinalWordWeightMultiplier(section: string) {
  const normalised = section.trim().toLowerCase();

  if (
    normalised.includes("chorus") ||
    normalised.includes("hook") ||
    normalised.includes("refrain")
  ) {
    return 1.95;
  }

  if (normalised.includes("bridge") || normalised.includes("middle")) {
    return 1.45;
  }

  if (normalised.includes("verse")) {
    return 1.6;
  }

  return 1.75;
}

function getFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value)
    ? value
    : null;
}

function getBarTiming(section: GuideSectionLike) {
  if (!Array.isArray(section.barTiming)) {
    return [];
  }

  return section.barTiming.flatMap(
    (
      rawBar,
    ): Array<{
      bar: number;
      beatsPerBar: number;
      quarterNotesPerBeat: number;
      quarterNotesPerBar: number;
    }> => {
      if (!rawBar || typeof rawBar !== "object" || Array.isArray(rawBar)) {
        return [];
      }

      const barRecord = rawBar as GuideBarTimingLike;

      const bar = getInteger(barRecord.bar);
      const beatsPerBar = getFiniteNumber(barRecord.beatsPerBar);
      const quarterNotesPerBeat = getFiniteNumber(
        barRecord.quarterNotesPerBeat,
      );
      const quarterNotesPerBar = getFiniteNumber(barRecord.quarterNotesPerBar);

      if (
        bar === null ||
        bar < 1 ||
        beatsPerBar === null ||
        beatsPerBar <= 0 ||
        quarterNotesPerBeat === null ||
        quarterNotesPerBeat <= 0 ||
        quarterNotesPerBar === null ||
        quarterNotesPerBar <= 0
      ) {
        return [];
      }

      return [
        {
          bar,
          beatsPerBar,
          quarterNotesPerBeat,
          quarterNotesPerBar,
        },
      ];
    },
  );
}

function musicalPositionToSeconds({
  section,
  bar,
  beat,
  tempoBpm,
}: {
  section: GuideSectionLike;
  bar: number;
  beat: number;
  tempoBpm: number;
}) {
  const sectionStartSeconds = getFiniteNumber(section.startSeconds);
  const sectionEndSeconds = getFiniteNumber(section.endSeconds);
  const barTiming = getBarTiming(section);

  if (
    sectionStartSeconds === null ||
    sectionEndSeconds === null ||
    sectionEndSeconds <= sectionStartSeconds ||
    barTiming.length === 0 ||
    tempoBpm <= 0
  ) {
    return null;
  }

  const finalBar = barTiming[barTiming.length - 1]?.bar ?? 0;

  if (bar === finalBar + 1 && beat === 1) {
    return Number(sectionEndSeconds.toFixed(3));
  }

  const activeBar = barTiming.find((entry) => entry.bar === bar);

  if (!activeBar || beat < 1 || beat > activeBar.beatsPerBar) {
    return null;
  }

  const quarterNotesBeforeBar = barTiming
    .filter((entry) => entry.bar < bar)
    .reduce((total, entry) => total + entry.quarterNotesPerBar, 0);

  const quarterNotesIntoBar = (beat - 1) * activeBar.quarterNotesPerBeat;

  return Number(
    (
      sectionStartSeconds +
      ((quarterNotesBeforeBar + quarterNotesIntoBar) / tempoBpm) * 60
    ).toFixed(3),
  );
}

export function buildLyricWordTimings(
  groups: LyricPhraseUnitGroup[],
  wordRhythmPlan: unknown,
  sections: unknown,
  tempoBpm: number,
  sectionIntents: MelodySectionIntent[] = [],
): LyricWordTimingGroup[] {
  if (
    !wordRhythmPlan ||
    typeof wordRhythmPlan !== "object" ||
    Array.isArray(wordRhythmPlan) ||
    !Array.isArray(sections) ||
    !Number.isFinite(tempoBpm) ||
    tempoBpm <= 0
  ) {
    return [];
  }

  const wordRhythmPlanRecord = wordRhythmPlan as WordRhythmPlanLike;

  if (!Array.isArray(wordRhythmPlanRecord.words)) {
    return [];
  }

  const rhythmEntries = wordRhythmPlanRecord.words.flatMap(
    (
      rawEntry,
    ): Array<{
      phraseIndex: number;
      wordIndex: number;
      word: string;
      section: string;
      startBar: number;
      startBeat: number;
      endBar: number;
      endBeat: number;
    }> => {
      if (
        !rawEntry ||
        typeof rawEntry !== "object" ||
        Array.isArray(rawEntry)
      ) {
        return [];
      }

      const entry = rawEntry as WordRhythmEntryLike;

      const phraseIndex = getInteger(entry.phraseIndex);
      const wordIndex = getInteger(entry.wordIndex);
      const startBar = getInteger(entry.startBar);
      const startBeat = getFiniteNumber(entry.startBeat);
      const endBar = getInteger(entry.endBar);
      const endBeat = getFiniteNumber(entry.endBeat);

      const word = typeof entry.word === "string" ? entry.word : "";
      const section = typeof entry.section === "string" ? entry.section : "";

      if (
        phraseIndex === null ||
        wordIndex === null ||
        startBar === null ||
        startBeat === null ||
        endBar === null ||
        endBeat === null ||
        !word ||
        !section
      ) {
        return [];
      }

      return [
        {
          phraseIndex,
          wordIndex,
          word,
          section,
          startBar,
          startBeat,
          endBar,
          endBeat,
        },
      ];
    },
  );

  const guideSections = sections.flatMap((rawSection): GuideSectionLike[] => {
    if (
      !rawSection ||
      typeof rawSection !== "object" ||
      Array.isArray(rawSection)
    ) {
      return [];
    }

    return [rawSection as GuideSectionLike];
  });

  return groups.map((group, groupIndex) => {
    const sectionIntent = group.phrase.sectionInstanceId
      ? sectionIntents.find(
          (intent) =>
            intent.sectionInstanceId === group.phrase.sectionInstanceId,
        )
      : undefined;

    const delivery = sectionIntent?.delivery ?? "natural";

    const matchingSection = guideSections.find((section) => {
      const sourceLineIndexes = Array.isArray(section.sourceLineIndexes)
        ? section.sourceLineIndexes.filter(
            (value): value is number =>
              typeof value === "number" && Number.isInteger(value),
          )
        : [];

      return (
        sourceLineIndexes.includes(group.phrase.startSourceLineIndex) &&
        sourceLineIndexes.includes(group.phrase.endSourceLineIndex)
      );
    });

    const phraseRhythmEntries = rhythmEntries
      .filter((entry) => entry.phraseIndex === groupIndex)
      .sort((a, b) => a.wordIndex - b.wordIndex);

    if (!matchingSection || phraseRhythmEntries.length === 0) {
      return {
        section: group.phrase.section,
        sourceLineIndex: group.phrase.sourceLineIndex,
        sourceLyric: group.phrase.sourceLyric,
        units: [],
      };
    }

    const wordTimings = phraseRhythmEntries.flatMap(
      (entry, wordPosition): LyricWordTiming[] => {
        const startSeconds = musicalPositionToSeconds({
          section: matchingSection,
          bar: entry.startBar,
          beat: entry.startBeat,
          tempoBpm,
        });

        const endSeconds = musicalPositionToSeconds({
          section: matchingSection,
          bar: entry.endBar,
          beat: entry.endBeat,
          tempoBpm,
        });

        if (
          startSeconds === null ||
          endSeconds === null ||
          endSeconds <= startSeconds
        ) {
          return [];
        }

        const baseWeight = getWordWeight(entry.word);
        const isFinalWord = wordPosition === phraseRhythmEntries.length - 1;

        const deliveryMultiplier =
          delivery === "deliberate" ? 1.18 : delivery === "spacious" ? 1.08 : 1;

        const weight = isFinalWord
          ? baseWeight *
            getFinalWordWeightMultiplier(group.phrase.section) *
            deliveryMultiplier
          : baseWeight;

        return [
          {
            word: entry.word,
            startSeconds,
            endSeconds,
            durationSeconds: Number(
              Math.max(0, endSeconds - startSeconds).toFixed(3),
            ),
            weight,
          },
        ];
      },
    );

    let wordOffset = 0;

    const timingUnits: LyricWordTimingUnit[] = group.units.flatMap((unit) => {
      const unitWords = wordTimings.slice(
        wordOffset,
        wordOffset + unit.wordCount,
      );

      wordOffset += unit.wordCount;

      if (unitWords.length === 0) {
        return [];
      }

      return [
        {
          text: unit.text,
          startSeconds: unitWords[0].startSeconds,
          endSeconds: unitWords[unitWords.length - 1].endSeconds,
          words: unitWords,
        },
      ];
    });

    return {
      section: group.phrase.section,
      sourceLineIndex: group.phrase.sourceLineIndex,
      sourceLyric: group.phrase.sourceLyric,
      units: timingUnits,
    };
  });
}
