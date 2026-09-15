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
    const chordPlacements = getArray(cueSection.chordPlacements);

    if (
      !section ||
      startSeconds === null ||
      endSeconds === null ||
      endSeconds <= startSeconds ||
      chordPlacements.length === 0
    ) {
      return [];
    }

    return chordPlacements
      .map((placement) => {
        const record = getRecord(placement);

        if (!record) {
          return null;
        }

        const chord = getString(record.chord);
        const absoluteSeconds = getNumber(record.absoluteSeconds);
        const timingSource = getString(record.timingSource);

        if (
          !chord ||
          absoluteSeconds === null ||
          absoluteSeconds < startSeconds ||
          absoluteSeconds >= endSeconds ||
          timingSource !== "confirmed-bar-beat"
        ) {
          return null;
        }

        return {
          section,
          chord,
          timeSeconds: absoluteSeconds,
        };
      })
      .filter((marker): marker is AudioChordMarker => marker !== null);
  });
};
