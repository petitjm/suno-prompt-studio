
type SourceLine = {
  section?: unknown;
};

type TimingSection = {
  section?: unknown;
  bars?: unknown;
  timeSignature?: unknown;
  meterChanges?: unknown;
};

export type SongSectionTiming = {
  section: string;
  sectionInstanceId: string;
  sourceLineIndexes: number[];
  startSeconds: number;
  endSeconds: number;
  barTiming: {
    bar: number;
    beatsPerBar: number;
    quarterNotesPerBeat: number;
    quarterNotesPerBar: number;
  }[];
};

function getSectionMatchKey(value: string): string {
  const normalised = value
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9:\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const canonicalVerse = normalised.match(/^verse:(\d+)$/);

  if (canonicalVerse) {
    return `verse:${canonicalVerse[1]}`;
  }

  const verse = normalised.match(/\bverse\s*(\d+)\b/);

  if (verse) {
    return `verse:${verse[1]}`;
  }

  if (normalised.includes("final chorus")) return "final chorus";
  if (normalised.includes("chorus")) return "chorus";
  if (normalised.includes("bridge")) return "bridge";

  if (normalised.includes("outro") || normalised.includes("tag")) {
    return "final chorus";
  }

  return normalised;
}

function getMeter(value: unknown) {
  if (typeof value !== "string") return null;

  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/);

  if (!match) return null;

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);

  if (
    !Number.isInteger(numerator) ||
    numerator <= 0 ||
    !Number.isInteger(denominator) ||
    denominator <= 0
  ) {
    return null;
  }

  const quarterNotesPerBeat = 4 / denominator;

  return {
    beatsPerBar: numerator,
    quarterNotesPerBeat,
    quarterNotesPerBar: numerator * quarterNotesPerBeat,
  };
}

export function buildSongSectionTiming({
  songsheetLines,
  musicalTimingPlan,
  tempoBpm,
}: {
  songsheetLines: unknown;
  musicalTimingPlan: unknown;
  tempoBpm: number;
}): SongSectionTiming[] {
  if (
    !Array.isArray(songsheetLines) ||
    !musicalTimingPlan ||
    typeof musicalTimingPlan !== "object" ||
    Array.isArray(musicalTimingPlan) ||
    !Number.isFinite(tempoBpm) ||
    tempoBpm <= 0
  ) {
    return [];
  }

  const timingPlan = musicalTimingPlan as Record<string, unknown>;

  if (!Array.isArray(timingPlan.sections)) {
    return [];
  }

  const sourceSections: {
    section: string;
    sourceLineIndexes: number[];
  }[] = [];

  songsheetLines.forEach((rawLine, index) => {
    if (
      !rawLine ||
      typeof rawLine !== "object" ||
      Array.isArray(rawLine)
    ) {
      return;
    }

    const line = rawLine as SourceLine;

    const section =
      typeof line.section === "string" && line.section.trim()
        ? line.section.trim()
        : "Unknown section";

    const previous = sourceSections[sourceSections.length - 1];

    if (previous?.section === section) {
      previous.sourceLineIndexes.push(index);
    } else {
      sourceSections.push({
        section,
        sourceLineIndexes: [index],
      });
    }
  });

  const timingSections = timingPlan.sections.filter(
    (entry): entry is TimingSection =>
      entry !== null &&
      typeof entry === "object" &&
      !Array.isArray(entry),
  );

  const occurrences = new Map<string, number>();
  const results: SongSectionTiming[] = [];

  let cumulativeSeconds = 0;

  for (const [index, sourceSection] of sourceSections.entries()) {
    const key = getSectionMatchKey(sourceSection.section);

    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);

    const matchingSections = timingSections.filter(
      (entry) =>
        typeof entry.section === "string" &&
        getSectionMatchKey(entry.section) === key,
    );

    const matching = matchingSections[occurrence];

    if (!matching) {
      return [];
    }

    const bars = matching.bars;

    if (
      typeof bars !== "number" ||
      !Number.isInteger(bars) ||
      bars <= 0
    ) {
      return [];
    }

    const initialMeter = getMeter(matching.timeSignature);

    if (!initialMeter) {
      return [];
    }

    const meterChanges = Array.isArray(matching.meterChanges)
      ? matching.meterChanges.flatMap((change) => {
          if (
            !change ||
            typeof change !== "object" ||
            Array.isArray(change)
          ) {
            return [];
          }

          const record = change as Record<string, unknown>;
          const meter = getMeter(record.timeSignature);

          if (
            typeof record.bar !== "number" ||
            !Number.isInteger(record.bar) ||
            record.bar < 1 ||
            record.bar > bars ||
            !meter
          ) {
            return [];
          }

          return [{ bar: record.bar, meter }];
        }).sort((a, b) => a.bar - b.bar)
      : [];

    const barTiming = Array.from({ length: bars }, (_, barIndex) => {
      const bar = barIndex + 1;

      const applicableChange = meterChanges
        .filter((change) => change.bar <= bar)
        .at(-1);

      return {
        bar,
        ...(applicableChange?.meter ?? initialMeter),
      };
    });

    const totalQuarterNotes = barTiming.reduce(
      (sum, bar) => sum + bar.quarterNotesPerBar,
      0,
    );

    const sectionSeconds = Number(
      ((totalQuarterNotes / tempoBpm) * 60).toFixed(1),
    );

    const startSeconds = Number(cumulativeSeconds.toFixed(1));
    const endSeconds = Number(
      (cumulativeSeconds + sectionSeconds).toFixed(1),
    );

    cumulativeSeconds += sectionSeconds;

    const order = index + 1;

    const sectionSlug =
      sourceSection.section
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";

    const sourceLineSlug =
      sourceSection.sourceLineIndexes.length > 0
        ? sourceSection.sourceLineIndexes.join("-")
        : "none";

    results.push({
      section: sourceSection.section,
      sectionInstanceId:
        `${order}-${sectionSlug}-${sourceLineSlug}`,
      sourceLineIndexes: sourceSection.sourceLineIndexes,
      startSeconds,
      endSeconds,
      barTiming,
    });
  }

  return results;
}
