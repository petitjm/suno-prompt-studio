
export type SongwriterReferenceOctaveTracePoint = {
  timeSeconds: number;
  frequencyHz: number | null;
  correctedFrequencyHz: number | null;
};

export type SongwriterReferenceOctaveCandidate = {
  startTimeSeconds: number;
  endTimeSeconds: number;
  midiNote: number;
  noteName: string;
};

export type SongwriterReferenceHarmonicEvidence = {
  timeSeconds: number;
  harmonicEvidenceSupportsRawPitch: boolean | null;
};

export type SongwriterReferenceNoteOctaveEvidence = {
  startSeconds: number;
  endSeconds: number;
  noteName: string;
  midiNote: number;
  durationSeconds: number;
  analysedFrames: number;
  rawLowerOctaveFrames: number;
  lowerOctaveRatio: number;
  rawMedianHz: number;
  correctedMedianHz: number;
  harmonicAssessedFrames: number;
  harmonicSupportingFrames: number;
  harmonicSupportRatio: number | null;
  proposedMidiNote: number | null;
};

function medianNumber(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function inspectSongwriterReferenceNoteOctaves({
  trace,
  candidates,
  harmonicEvidence,
}: {
  trace: SongwriterReferenceOctaveTracePoint[];
  candidates: SongwriterReferenceOctaveCandidate[];
  harmonicEvidence: SongwriterReferenceHarmonicEvidence[];
}): SongwriterReferenceNoteOctaveEvidence[] {
  return candidates.flatMap((candidate) => {
    const candidateFrames = trace.filter(
      (point) =>
        point.timeSeconds >= candidate.startTimeSeconds &&
        point.timeSeconds <= candidate.endTimeSeconds &&
        typeof point.frequencyHz === "number" &&
        Number.isFinite(point.frequencyHz) &&
        typeof point.correctedFrequencyHz === "number" &&
        Number.isFinite(point.correctedFrequencyHz),
    );

    if (candidateFrames.length < 5) {
      return [];
    }

    const rawFrequencies = candidateFrames.map(
      (frame) => frame.frequencyHz as number,
    );

    const correctedFrequencies = candidateFrames.map(
      (frame) => frame.correctedFrequencyHz as number,
    );

    const rawMedianHz = medianNumber(rawFrequencies);
    const correctedMedianHz = medianNumber(correctedFrequencies);

    const candidateFrequencyHz =
      440 * Math.pow(2, (candidate.midiNote - 69) / 12);

    const rawLowerOctaveFrames = candidateFrames.filter((frame) => {
      const rawHz = frame.frequencyHz as number;

      const semitonesBelowCandidate =
        12 * Math.log2(candidateFrequencyHz / rawHz);

      return (
        semitonesBelowCandidate >= 10.5 &&
        semitonesBelowCandidate <= 13.5
      );
    });

    const lowerOctaveRatio =
      rawLowerOctaveFrames.length / candidateFrames.length;

    const matchingHarmonicFrames = harmonicEvidence.filter(
      (evidence) =>
        evidence.timeSeconds >= candidate.startTimeSeconds &&
        evidence.timeSeconds <= candidate.endTimeSeconds &&
        evidence.harmonicEvidenceSupportsRawPitch !== null,
    );

    const harmonicSupportingFrames = matchingHarmonicFrames.filter(
      (evidence) => evidence.harmonicEvidenceSupportsRawPitch === true,
    );

    const harmonicSupportRatio =
      matchingHarmonicFrames.length > 0
        ? harmonicSupportingFrames.length / matchingHarmonicFrames.length
        : null;

    const proposedMidiNote =
      candidate.midiNote >= 60 &&
      lowerOctaveRatio >= 0.75 &&
      rawLowerOctaveFrames.length >= 5 &&
      harmonicSupportingFrames.length >= 3 &&
      harmonicSupportRatio !== null &&
      harmonicSupportRatio >= 0.6
        ? candidate.midiNote - 12
        : null;

    return [
      {
        startSeconds: Number(candidate.startTimeSeconds.toFixed(3)),
        endSeconds: Number(candidate.endTimeSeconds.toFixed(3)),
        noteName: candidate.noteName,
        midiNote: candidate.midiNote,
        durationSeconds: Number(
          (candidate.endTimeSeconds - candidate.startTimeSeconds).toFixed(3),
        ),
        analysedFrames: candidateFrames.length,
        rawLowerOctaveFrames: rawLowerOctaveFrames.length,
        lowerOctaveRatio: Number(lowerOctaveRatio.toFixed(3)),
        rawMedianHz: Number(rawMedianHz.toFixed(2)),
        correctedMedianHz: Number(correctedMedianHz.toFixed(2)),
        harmonicAssessedFrames: matchingHarmonicFrames.length,
        harmonicSupportingFrames: harmonicSupportingFrames.length,
        harmonicSupportRatio:
          harmonicSupportRatio !== null
            ? Number(harmonicSupportRatio.toFixed(3))
            : null,
        proposedMidiNote,
      },
    ];
  });
}


export function buildReconciledSongwriterReferenceNoteCandidates<
  T extends SongwriterReferenceOctaveCandidate & {
    medianFrequencyHz: number;
  },
>({
  candidates,
  evidence,
}: {
  candidates: T[];
  evidence: SongwriterReferenceNoteOctaveEvidence[];
}): T[] {
  const noteNames = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B",
  ];

  return candidates.map((candidate) => {
    const matchingEvidence = evidence.find(
      (item) =>
        Math.abs(item.startSeconds - candidate.startTimeSeconds) < 0.002 &&
        Math.abs(item.endSeconds - candidate.endTimeSeconds) < 0.002 &&
        item.midiNote === candidate.midiNote,
    );

    if (
      !matchingEvidence ||
      matchingEvidence.proposedMidiNote === null
    ) {
      return { ...candidate };
    }

    const midiNote = matchingEvidence.proposedMidiNote;
    const noteName =
      noteNames[((midiNote % 12) + 12) % 12] +
      (Math.floor(midiNote / 12) - 1);

    return {
      ...candidate,
      midiNote,
      noteName,
      medianFrequencyHz: candidate.medianFrequencyHz / 2,
    };
  });
}

export function buildReconciledSongwriterReferenceTrace<
  T extends SongwriterReferenceOctaveTracePoint,
>({
  trace,
  evidence,
}: {
  trace: T[];
  evidence: SongwriterReferenceNoteOctaveEvidence[];
}): T[] {
  const acceptedCorrections = evidence.filter(
    (item) =>
      item.proposedMidiNote !== null &&
      item.proposedMidiNote === item.midiNote - 12,
  );

  return trace.map((point) => {
    if (
      typeof point.correctedFrequencyHz !== "number" ||
      !Number.isFinite(point.correctedFrequencyHz)
    ) {
      return { ...point };
    }

    const matchingCorrection = acceptedCorrections.find(
      (correction) =>
        point.timeSeconds >= correction.startSeconds &&
        point.timeSeconds <= correction.endSeconds,
    );

    if (!matchingCorrection) {
      return { ...point };
    }

    const originalNoteFrequencyHz =
      440 * Math.pow(2, (matchingCorrection.midiNote - 69) / 12);

    const semitonesFromOriginal =
      12 *
      Math.log2(
        point.correctedFrequencyHz / originalNoteFrequencyHz,
      );

    // Only lower frames belonging to the original note's octave.
    if (Math.abs(semitonesFromOriginal) > 1.5) {
      return { ...point };
    }

    return {
      ...point,
      correctedFrequencyHz: point.correctedFrequencyHz / 2,
    };
  });
}
