import type { MelodyNote, MelodyPhrase } from "@/types/song";
import type { MelodyPitchFrameworkPhrase } from "@/lib/melody/build-melody-pitch-framework";

const PITCH_CLASS_TO_NUMBER: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

function getSectionTargetMidi(section: string) {
  const normalised = section.toLowerCase();

  if (
    normalised.includes("chorus") ||
    normalised.includes("hook") ||
    normalised.includes("refrain")
  ) {
    return 55;
  }

  if (normalised.includes("bridge") || normalised.includes("middle")) {
    return 54;
  }

  return 52;
}

function getPitchCandidates(
  pitchClasses: string[],
  minimumMidi: number,
  maximumMidi: number,
) {
  const pitchClassNumbers = new Set(
    pitchClasses
      .map((pitchClass) => PITCH_CLASS_TO_NUMBER[pitchClass])
      .filter((value): value is number => value !== undefined),
  );

  const candidates: number[] = [];

  for (let midi = minimumMidi; midi <= maximumMidi; midi += 1) {
    if (pitchClassNumbers.has(midi % 12)) {
      candidates.push(midi);
    }
  }

  return candidates;
}

function chooseAnchorPitch({
  pitchClasses,
  section,
  previousPitchMidi,
  isSectionStart,
}: {
  pitchClasses: string[];
  section: string;
  previousPitchMidi: number | null;
  isSectionStart: boolean;
}) {
  const candidates = getPitchCandidates(pitchClasses, 43, 60);

  if (candidates.length === 0) {
    return null;
  }

  const sectionTargetMidi = getSectionTargetMidi(section);
  if (isSectionStart) {
    return candidates.reduce((bestCandidate, candidate) =>
      Math.abs(candidate - sectionTargetMidi) <
      Math.abs(bestCandidate - sectionTargetMidi)
        ? candidate
        : bestCandidate,
    );
  }

  return candidates.reduce((bestCandidate, candidate) => {
    const candidatePreviousDistance =
      previousPitchMidi === null ? 0 : Math.abs(candidate - previousPitchMidi);

    const bestPreviousDistance =
      previousPitchMidi === null
        ? 0
        : Math.abs(bestCandidate - previousPitchMidi);

    const candidateScore =
      candidatePreviousDistance +
      Math.abs(candidate - sectionTargetMidi) * 0.35;

    const bestScore =
      bestPreviousDistance + Math.abs(bestCandidate - sectionTargetMidi) * 0.35;

    return candidateScore < bestScore ? candidate : bestCandidate;
  });
}

export function buildInitialMelodyAnchors(
  framework: MelodyPitchFrameworkPhrase[],
): MelodyPhrase[] {
  let previousPitchMidi: number | null = null;
  let previousSection = "";

  return framework.map((item) => {
    const phrase = item.phrase;

    const isSectionStart = phrase.section !== previousSection;

    const pitchMidi = chooseAnchorPitch({
      pitchClasses: item.pitchClasses,
      section: phrase.section,
      previousPitchMidi,
      isSectionStart,
    });

    if (pitchMidi === null) {
      return {
        ...phrase,
        notes: [],
      };
    }

    const phraseDurationSeconds = Math.max(
      0,
      phrase.endSeconds - phrase.startSeconds,
    );

    const anchorDurationSeconds = Math.min(
      1.5,
      Math.max(0.4, phraseDurationSeconds * 0.3),
    );

    const anchorNote: MelodyNote = {
      pitchMidi,
      startSeconds: phrase.startSeconds,
      durationSeconds: Number(anchorDurationSeconds.toFixed(3)),
      lyricText: phrase.sourceLyric,
    };

    previousPitchMidi = pitchMidi;
    previousSection = phrase.section;

    return {
      ...phrase,
      notes: [anchorNote],
    };
  });
}
