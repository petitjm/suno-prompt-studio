type SectionInput = {
  label: string;
  content: string;
};

export function buildMelodySectionIntentTargets(
  performanceSections: SectionInput[],
) {
  const sourceLines = performanceSections.flatMap((section) => {
    const normalizedSectionLabel = String(section.label || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}' ]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    return section.content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) {
          return false;
        }

        if (
          (line.startsWith("[") && line.endsWith("]")) ||
          (line.startsWith("{") && line.endsWith("}"))
        ) {
          return false;
        }

        const normalizedLine = line
          .toLowerCase()
          .replace(/[^\p{L}\p{N}' ]/gu, "")
          .replace(/\s+/g, " ")
          .trim();

        return (
          !normalizedSectionLabel || normalizedLine !== normalizedSectionLabel
        );
      })
      .map((lyric) => ({
        section: section.label,
        lyric,
      }));
  });

  const sectionInstances: {
    section: string;
    sourceLineIndexes: number[];
  }[] = [];

  sourceLines.forEach((line, sourceLineIndex) => {
    const section = line.section || "Unknown section";
    const previousSection = sectionInstances[sectionInstances.length - 1];

    if (previousSection && previousSection.section === section) {
      previousSection.sourceLineIndexes.push(sourceLineIndex);
      return;
    }

    sectionInstances.push({
      section,
      sourceLineIndexes: [sourceLineIndex],
    });
  });

  return sectionInstances.map((sectionInstance, index) => {
    const order = index + 1;

    const sectionSlug =
      sectionInstance.section
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";

    const sourceLineSlug =
      sectionInstance.sourceLineIndexes.length > 0
        ? sectionInstance.sourceLineIndexes.join("-")
        : "none";

    return {
      section: sectionInstance.section,
      sectionInstanceId: `${order}-${sectionSlug}-${sourceLineSlug}`,
    };
  });
}
