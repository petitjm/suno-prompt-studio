import type { MelodyPhrase } from "@/types/song";

type GuideSectionLike = {
  section?: unknown;
  sectionInstanceId?: unknown;
  sourceLineIndexes?: unknown;
  startSeconds?: unknown;
  endSeconds?: unknown;
};

export function buildMelodyPhraseScaffoldFromGuideSections({
  sections,
  sourceLines,
}: {
  sections: unknown;
  sourceLines: string[];
}): MelodyPhrase[] {
  if (!Array.isArray(sections) || sourceLines.length === 0) {
    return [];
  }

  const phrases: MelodyPhrase[] = [];

  sections.forEach((rawSection) => {
    if (
      typeof rawSection !== "object" ||
      rawSection === null ||
      Array.isArray(rawSection)
    ) {
      return;
    }

    const section = rawSection as GuideSectionLike;

    const sectionName =
      typeof section.section === "string" && section.section.trim()
        ? section.section.trim()
        : "Section";

    const sectionInstanceId =
      typeof section.sectionInstanceId === "string" &&
      section.sectionInstanceId.trim()
        ? section.sectionInstanceId
        : null;

    const sectionStartSeconds =
      typeof section.startSeconds === "number" &&
      Number.isFinite(section.startSeconds)
        ? section.startSeconds
        : null;

    const sectionEndSeconds =
      typeof section.endSeconds === "number" &&
      Number.isFinite(section.endSeconds)
        ? section.endSeconds
        : null;

    const sourceLineIndexes = Array.isArray(section.sourceLineIndexes)
      ? section.sourceLineIndexes.filter(
          (value): value is number =>
            typeof value === "number" &&
            Number.isInteger(value) &&
            value >= 0 &&
            value < sourceLines.length,
        )
      : [];

    if (
      sectionStartSeconds === null ||
      sectionEndSeconds === null ||
      sectionEndSeconds <= sectionStartSeconds ||
      sourceLineIndexes.length === 0
    ) {
      return;
    }

    const phraseDurationSeconds =
      (sectionEndSeconds - sectionStartSeconds) / sourceLineIndexes.length;

    sourceLineIndexes.forEach((sourceLineIndex, index) => {
      const startSeconds = sectionStartSeconds + phraseDurationSeconds * index;

      const endSeconds =
        index === sourceLineIndexes.length - 1
          ? sectionEndSeconds
          : sectionStartSeconds + phraseDurationSeconds * (index + 1);

      phrases.push({
        section: sectionName,
        sectionInstanceId,
        sourceLineIndex,
        sourceLyric: sourceLines[sourceLineIndex]?.trim() || "",
        startSeconds: Number(startSeconds.toFixed(3)),
        endSeconds: Number(endSeconds.toFixed(3)),
        notes: [],
      });
    });
  });

  return phrases;
}
