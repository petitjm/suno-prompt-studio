import type { MelodyPhrase, MelodyVersionData } from "@/types/song";

export function buildMelodyVersionData({
  songVersionId,
  chordVersionId,
  tempoBpm,
  phrases,
}: {
  songVersionId: string;
  chordVersionId: string | null;
  tempoBpm: number;
  phrases: MelodyPhrase[];
}): MelodyVersionData | null {
  if (!songVersionId || !Number.isFinite(tempoBpm) || tempoBpm <= 0) {
    return null;
  }

  return {
    songVersionId,
    chordVersionId,
    tempoBpm,
    phrases,
  };
}
