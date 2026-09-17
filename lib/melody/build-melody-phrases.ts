import type { MelodyPhrase } from "@/types/song";

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

type LyricTimingPhraseLike = {
  section?: unknown;
  startSourceLineIndex?: unknown;
  startCharIndex?: unknown;
  endSourceLineIndex?: unknown;
  endCharIndex?: unknown;
  startBar?: unknown;
  startBeat?: unknown;
  endBar?: unknown;
  endBeat?: unknown;
};

type LyricTimingPlanLike = {
  phrases?: unknown;
};

function getInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value)
    ? value
    : null;
}

function getFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getSourceLineIndexes(
  section: GuideSectionLike,
  sourceLineCount: number,
) {
  return Array.isArray(section.sourceLineIndexes)
    ? section.sourceLineIndexes.filter(
        (value): value is number =>
          typeof value === "number" &&
          Number.isInteger(value) &&
          value >= 0 &&
          value < sourceLineCount,
      )
    : [];
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

function buildPhraseText({
  sourceLines,
  startSourceLineIndex,
  startCharIndex,
  endSourceLineIndex,
  endCharIndex,
}: {
  sourceLines: string[];
  startSourceLineIndex: number;
  startCharIndex: number;
  endSourceLineIndex: number;
  endCharIndex: number;
}) {
  if (
    startSourceLineIndex < 0 ||
    endSourceLineIndex < startSourceLineIndex ||
    endSourceLineIndex >= sourceLines.length
  ) {
    return "";
  }

  if (startSourceLineIndex === endSourceLineIndex) {
    const line = sourceLines[startSourceLineIndex] ?? "";

    if (
      startCharIndex < 0 ||
      startCharIndex >= line.length ||
      endCharIndex <= startCharIndex ||
      endCharIndex > line.length
    ) {
      return "";
    }

    return line.slice(startCharIndex, endCharIndex).trim();
  }

  const pieces: string[] = [];

  for (
    let sourceLineIndex = startSourceLineIndex;
    sourceLineIndex <= endSourceLineIndex;
    sourceLineIndex += 1
  ) {
    const line = sourceLines[sourceLineIndex] ?? "";

    if (sourceLineIndex === startSourceLineIndex) {
      if (startCharIndex < 0 || startCharIndex >= line.length) {
        return "";
      }

      pieces.push(line.slice(startCharIndex));
      continue;
    }

    if (sourceLineIndex === endSourceLineIndex) {
      if (endCharIndex <= 0 || endCharIndex > line.length) {
        return "";
      }

      pieces.push(line.slice(0, endCharIndex));
      continue;
    }

    pieces.push(line);
  }

  return pieces
    .map((piece) => piece.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function buildMelodyPhraseScaffoldFromGuideSections({
  sections,
  sourceLines,
  lyricTimingPlan,
  tempoBpm,
}: {
  sections: unknown;
  sourceLines: string[];
  lyricTimingPlan: unknown;
  tempoBpm: number;
}): MelodyPhrase[] {
  if (
    !Array.isArray(sections) ||
    sourceLines.length === 0 ||
    !Number.isFinite(tempoBpm) ||
    tempoBpm <= 0 ||
    !lyricTimingPlan ||
    typeof lyricTimingPlan !== "object" ||
    Array.isArray(lyricTimingPlan)
  ) {
    return [];
  }

  const timingPlanRecord = lyricTimingPlan as LyricTimingPlanLike;

  if (!Array.isArray(timingPlanRecord.phrases)) {
    return [];
  }

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

  const phrases: MelodyPhrase[] = [];

  timingPlanRecord.phrases.forEach((rawPhrase) => {
    if (
      !rawPhrase ||
      typeof rawPhrase !== "object" ||
      Array.isArray(rawPhrase)
    ) {
      return;
    }

    const phrase = rawPhrase as LyricTimingPhraseLike;

    const section =
      typeof phrase.section === "string" && phrase.section.trim()
        ? phrase.section.trim()
        : "";

    const startSourceLineIndex = getInteger(phrase.startSourceLineIndex);
    const startCharIndex = getInteger(phrase.startCharIndex);
    const endSourceLineIndex = getInteger(phrase.endSourceLineIndex);
    const endCharIndex = getInteger(phrase.endCharIndex);

    const startBar = getInteger(phrase.startBar);
    const startBeat = getFiniteNumber(phrase.startBeat);
    const endBar = getInteger(phrase.endBar);
    const endBeat = getFiniteNumber(phrase.endBeat);

    if (
      !section ||
      startSourceLineIndex === null ||
      startCharIndex === null ||
      endSourceLineIndex === null ||
      endCharIndex === null ||
      startBar === null ||
      startBeat === null ||
      endBar === null ||
      endBeat === null
    ) {
      return;
    }

    const matchingSection = guideSections.find((candidate) => {
      const sourceLineIndexes = getSourceLineIndexes(
        candidate,
        sourceLines.length,
      );

      return (
        sourceLineIndexes.includes(startSourceLineIndex) &&
        sourceLineIndexes.includes(endSourceLineIndex)
      );
    });

    if (!matchingSection) {
      return;
    }

    const sourceLyric = buildPhraseText({
      sourceLines,
      startSourceLineIndex,
      startCharIndex,
      endSourceLineIndex,
      endCharIndex,
    });

    if (!sourceLyric) {
      return;
    }

    const startSeconds = musicalPositionToSeconds({
      section: matchingSection,
      bar: startBar,
      beat: startBeat,
      tempoBpm,
    });

    const endSeconds = musicalPositionToSeconds({
      section: matchingSection,
      bar: endBar,
      beat: endBeat,
      tempoBpm,
    });

    if (
      startSeconds === null ||
      endSeconds === null ||
      endSeconds <= startSeconds
    ) {
      return;
    }

    const sectionName =
      typeof matchingSection.section === "string" &&
      matchingSection.section.trim()
        ? matchingSection.section.trim()
        : section;

    const sectionInstanceId =
      typeof matchingSection.sectionInstanceId === "string" &&
      matchingSection.sectionInstanceId.trim()
        ? matchingSection.sectionInstanceId
        : null;

    phrases.push({
      section: sectionName,
      sectionInstanceId,
      sourceLineIndex: startSourceLineIndex,
      startSourceLineIndex,
      startCharIndex,
      endSourceLineIndex,
      endCharIndex,
      sourceLyric,
      startSeconds,
      endSeconds,
      notes: [],
    });
  });

  return phrases;
}
