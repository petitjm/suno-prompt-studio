
import type { SongSectionTiming } from "./build-song-section-timing";

export type ArrangementChordPlacement = {
  chord: string;
  lineIndex: number;
  charIndex: number;
  lyricLength: number;
  bar?: number;
  beat?: number;
  absoluteSeconds: number | null;
  timingSource: "confirmed-bar-beat" | "missing-confirmed-bar-beat";
};

export type ArrangementSectionWithChords = SongSectionTiming & {
  chordPlacements: ArrangementChordPlacement[];
};

function getRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function buildArrangementChordPlacements({
  sections,
  songsheetLines,
  tempoBpm,
}: {
  sections: SongSectionTiming[];
  songsheetLines: unknown;
  tempoBpm: number;
}): ArrangementSectionWithChords[] {
  const sourceLines = Array.isArray(songsheetLines) ? songsheetLines : [];

  if (!Number.isFinite(tempoBpm) || tempoBpm <= 0) {
    return sections.map((section) => ({
      ...section,
      chordPlacements: [],
    }));
  }

  return sections.map((section) => {
    const chordPlacements: ArrangementChordPlacement[] = [];

    section.sourceLineIndexes.forEach((sourceLineIndex, lineIndex) => {
      const line = getRecord(sourceLines[sourceLineIndex]);

      if (!line) {
        return;
      }

      const lyricLength = Math.max(
        1,
        typeof line.lyric === "string" ? line.lyric.length : 1,
      );

      const chords = Array.isArray(line.chords) ? line.chords : [];

      chords.forEach((rawChord) => {
        const record = getRecord(rawChord);

        if (!record) {
          return;
        }

        const chord =
          typeof record.chord === "string" ? record.chord.trim() : "";

        const charIndex = record.charIndex;

        if (
          !chord ||
          typeof charIndex !== "number" ||
          !Number.isFinite(charIndex) ||
          charIndex < 0
        ) {
          return;
        }

        const bar =
          typeof record.bar === "number" &&
          Number.isInteger(record.bar) &&
          record.bar >= 1
            ? record.bar
            : undefined;

        const beat =
          typeof record.beat === "number" &&
          Number.isFinite(record.beat) &&
          record.beat >= 1
            ? record.beat
            : undefined;

        const activeBar =
          bar === undefined
            ? undefined
            : section.barTiming.find((item) => item.bar === bar);

        // Match the current Audio Guide renderer's confirmed
        // chord-position rules. Fractional final-beat support
        // can be reconciled separately across both consumers.
        const hasConfirmedMusicalPosition =
          bar !== undefined &&
          beat !== undefined &&
          activeBar !== undefined &&
          beat <= activeBar.beatsPerBar;

        let absoluteSeconds: number | null = null;

        if (hasConfirmedMusicalPosition && activeBar) {
          const quarterNotesBeforeBar = section.barTiming
            .filter((item) => item.bar < bar)
            .reduce((total, item) => total + item.quarterNotesPerBar, 0);

          const quarterNotesIntoBar =
            (beat - 1) * activeBar.quarterNotesPerBeat;

          absoluteSeconds = Number(
            (
              section.startSeconds +
              ((quarterNotesBeforeBar + quarterNotesIntoBar) / tempoBpm) * 60
            ).toFixed(3),
          );
        }

        chordPlacements.push({
          chord,
          lineIndex,
          charIndex,
          lyricLength,
          ...(bar !== undefined ? { bar } : {}),
          ...(beat !== undefined ? { beat } : {}),
          absoluteSeconds,
          timingSource: hasConfirmedMusicalPosition
            ? "confirmed-bar-beat"
            : "missing-confirmed-bar-beat",
        });
      });
    });

    return {
      ...section,
      chordPlacements,
    };
  });
}
