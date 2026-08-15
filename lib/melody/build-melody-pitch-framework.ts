import type { MelodyPhrase } from "@/types/song";

export type MelodyChordMarker = {
  chord: string;
  timeSeconds: number;
};

export type MelodyHarmonyEvent = {
  chord: string;
  startSeconds: number;
  endSeconds: number;
  pitchClasses: string[];
};

export type MelodyPitchFrameworkPhrase = {
  phrase: MelodyPhrase;
  chords: string[];
  pitchClasses: string[];
  harmonyEvents: MelodyHarmonyEvent[];
};

const NOTE_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const PITCH_CLASS_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function getChordPitchClasses(chord: string): string[] {
  const trimmedChord = chord.trim();

  const match = trimmedChord.match(/^([A-G](?:#|b)?)(.*)$/);

  if (!match) {
    return [];
  }

  const rootName = match[1];
  const suffix = match[2].toLowerCase();
  const rootPitchClass = NOTE_TO_PITCH_CLASS[rootName];

  if (rootPitchClass === undefined) {
    return [];
  }

  const isMajorSeventh = suffix.startsWith("maj7");
  const isMinorSeventh = suffix.startsWith("m7");
  const isMinor = suffix.startsWith("m") && !suffix.startsWith("maj");
  const isDominantSeventh = suffix.startsWith("7");

  const intervals = isMajorSeventh
    ? [0, 4, 7, 11]
    : isMinorSeventh
      ? [0, 3, 7, 10]
      : isDominantSeventh
        ? [0, 4, 7, 10]
        : isMinor
          ? [0, 3, 7]
          : [0, 4, 7];

  return intervals.map(
    (interval) => PITCH_CLASS_NAMES[(rootPitchClass + interval) % 12],
  );
}

function buildPhraseHarmonyEvents({
  phrase,
  chordMarkers,
}: {
  phrase: MelodyPhrase;
  chordMarkers: MelodyChordMarker[];
}): MelodyHarmonyEvent[] {
  const sortedMarkers = [...chordMarkers].sort(
    (a, b) => a.timeSeconds - b.timeSeconds,
  );

  const precedingMarker = [...sortedMarkers]
    .reverse()
    .find((marker) => marker.timeSeconds <= phrase.startSeconds);

  const markersInsidePhrase = sortedMarkers.filter(
    (marker) =>
      marker.timeSeconds > phrase.startSeconds &&
      marker.timeSeconds < phrase.endSeconds,
  );

  const phraseMarkers: MelodyChordMarker[] = [];

  if (precedingMarker) {
    phraseMarkers.push({
      chord: precedingMarker.chord,
      timeSeconds: phrase.startSeconds,
    });
  } else {
    const markerAtPhraseStart = sortedMarkers.find(
      (marker) => marker.timeSeconds === phrase.startSeconds,
    );

    if (markerAtPhraseStart) {
      phraseMarkers.push(markerAtPhraseStart);
    }
  }

  markersInsidePhrase.forEach((marker) => {
    if (
      !phraseMarkers.some(
        (existing) =>
          existing.timeSeconds === marker.timeSeconds &&
          existing.chord === marker.chord,
      )
    ) {
      phraseMarkers.push(marker);
    }
  });

  return phraseMarkers.map((marker, index) => {
    const nextMarker = phraseMarkers[index + 1];

    return {
      chord: marker.chord,
      startSeconds: Math.max(phrase.startSeconds, marker.timeSeconds),
      endSeconds: Math.min(
        phrase.endSeconds,
        nextMarker?.timeSeconds ?? phrase.endSeconds,
      ),
      pitchClasses: getChordPitchClasses(marker.chord),
    };
  });
}

export function buildMelodyPitchFramework({
  phrases,
  chordMarkers,
}: {
  phrases: MelodyPhrase[];
  chordMarkers: MelodyChordMarker[];
}): MelodyPitchFrameworkPhrase[] {
  return phrases.map((phrase) => {
    const markersInsidePhrase = chordMarkers.filter(
      (marker) =>
        marker.timeSeconds >= phrase.startSeconds &&
        marker.timeSeconds < phrase.endSeconds,
    );

    const precedingMarker = [...chordMarkers]
      .reverse()
      .find((marker) => marker.timeSeconds <= phrase.startSeconds);

    const relevantMarkers =
      markersInsidePhrase.length > 0
        ? markersInsidePhrase
        : precedingMarker
          ? [precedingMarker]
          : [];

    const chords = Array.from(
      new Set(
        relevantMarkers.map((marker) => marker.chord.trim()).filter(Boolean),
      ),
    );

    const pitchClasses = Array.from(
      new Set(chords.flatMap((chord) => getChordPitchClasses(chord))),
    );

    const harmonyEvents = buildPhraseHarmonyEvents({
      phrase,
      chordMarkers,
    });

    const activeChords = Array.from(
      new Set(harmonyEvents.map((event) => event.chord)),
    );

    const activePitchClasses = Array.from(
      new Set(harmonyEvents.flatMap((event) => event.pitchClasses)),
    );

    return {
      phrase,
      chords: activeChords,
      pitchClasses: activePitchClasses,
      harmonyEvents,
    };
  });
}
