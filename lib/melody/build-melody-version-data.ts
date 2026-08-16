import {
  DEFAULT_MELODY_CHARACTER,
  type MelodyPhrase,
  type MelodyVersionData,
} from "@/types/song";

export function buildMelodyVersionData({
  songVersionId,
  chordVersionId,
  tempoBpm,
  character = DEFAULT_MELODY_CHARACTER,
  phrases,
}: {
  songVersionId: string;
  chordVersionId: string | null;
  tempoBpm: number;
  character?: MelodyVersionData["character"];
  phrases: MelodyPhrase[];
}): MelodyVersionData | null {
  if (!songVersionId || !Number.isFinite(tempoBpm) || tempoBpm <= 0) {
    return null;
  }

  return {
    songVersionId,
    chordVersionId,
    tempoBpm,
    character,
    phrases,
  };
}
