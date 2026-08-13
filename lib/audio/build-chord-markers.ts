export type AudioChordMarker = {
  section: string;
  chord: string;
  timeSeconds: number;
};

const getRecord = (value: unknown): Record<string, unknown> | null => {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const getArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const getString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const buildChordMarkersFromCueSheetSections = (
  value: unknown,
): AudioChordMarker[] => {
  return getArray(value).flatMap((rawSection) => {
    const cueSection = getRecord(rawSection);

    if (!cueSection) {
      return [];
    }

    const section = getString(cueSection.section);
    const startSeconds = getNumber(cueSection.startSeconds);
    const endSeconds = getNumber(cueSection.endSeconds);
    const estimatedBars = getNumber(cueSection.estimatedBars) ?? 0;
    const chordPlacements = getArray(cueSection.chordPlacements);

    if (
      !section ||
      startSeconds === null ||
      endSeconds === null ||
      chordPlacements.length === 0
    ) {
      return [];
    }

    const sectionDurationSeconds = endSeconds - startSeconds;

    if (sectionDurationSeconds <= 0) {
      return [];
    }

    const suppliedLyricLineCount = getNumber(cueSection.lyricLineCount);

    const lyricLineCount =
      suppliedLyricLineCount !== null && suppliedLyricLineCount > 0
        ? suppliedLyricLineCount
        : Math.max(1, chordPlacements.length);

    return chordPlacements
      .map((placement, index) => {
        const record = getRecord(placement);

        if (!record) {
          return null;
        }

        const chord = getString(record.chord);
        const lineIndex = getNumber(record.lineIndex);
        const charIndex = getNumber(record.charIndex);
        const lyricLength = getNumber(record.lyricLength);

        if (
          !chord ||
          lineIndex === null ||
          charIndex === null ||
          lyricLength === null ||
          lyricLength <= 0
        ) {
          return null;
        }

        const linePosition = Math.min(
          0.98,
          Math.max(
            0.02,
            (lineIndex + charIndex / lyricLength) / lyricLineCount,
          ),
        );

        const fallbackPosition = (index + 1) / (chordPlacements.length + 1);

        const lineFraction =
          estimatedBars > 0 ? linePosition : fallbackPosition;

        return {
          section,
          chord,
          timeSeconds: Number(
            (startSeconds + sectionDurationSeconds * lineFraction).toFixed(3),
          ),
        };
      })
      .filter((marker): marker is AudioChordMarker => marker !== null);
  });
};
