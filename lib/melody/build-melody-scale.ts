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

export type MelodyScale = {
  keyLabel: string;
  tonic: string;
  mode: "major" | "minor";
  pitchClasses: string[];
};

function transposePitchClass(pitchClass: number, semitones: number) {
  return (pitchClass + semitones + 1200) % 12;
}

export function buildMelodyScale({
  keyLabel,
  transposeSemitones = 0,
}: {
  keyLabel: string;
  transposeSemitones?: number;
}): MelodyScale | null {
  const trimmedKey = keyLabel.trim();

  if (!trimmedKey) {
    return null;
  }

  const match = trimmedKey.match(
    /^([A-G](?:#|b)?)(?:\s*(m|minor|major|maj))?$/i,
  );

  if (!match) {
    return null;
  }

  const sourceTonic = match[1].charAt(0).toUpperCase() + match[1].slice(1);

  const sourcePitchClass = NOTE_TO_PITCH_CLASS[sourceTonic];

  if (sourcePitchClass === undefined) {
    return null;
  }

  const modeText = (match[2] || "").toLowerCase();

  const mode: "major" | "minor" =
    modeText === "m" || modeText === "minor" ? "minor" : "major";

  const tonicPitchClass = transposePitchClass(
    sourcePitchClass,
    transposeSemitones,
  );

  const intervals =
    mode === "minor" ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];

  const pitchClasses = intervals.map(
    (interval) => PITCH_CLASS_NAMES[(tonicPitchClass + interval) % 12],
  );

  return {
    keyLabel:
      transposeSemitones === 0
        ? trimmedKey
        : `${trimmedKey} → ${PITCH_CLASS_NAMES[tonicPitchClass]}${
            mode === "minor" ? "m" : ""
          }`,
    tonic: PITCH_CLASS_NAMES[tonicPitchClass],
    mode,
    pitchClasses,
  };
}
