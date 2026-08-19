import type {
  MelodyCharacter,
  MelodySectionIntent,
  SongVersionRecord,
} from "@/types/song";
import { DEFAULT_MELODY_CHARACTER } from "@/types/song";

export function getSongVersionLyrics(version?: SongVersionRecord | null) {
  return version?.result?.lyrics_full || "";
}

export function getSongVersionMusicalIntent(
  version?: SongVersionRecord | null,
): {
  character: MelodyCharacter;
  sectionIntents: MelodySectionIntent[];
} {
  const musicalIntent = version?.result?.musical_intent;

  const character: MelodyCharacter = {
    register:
      musicalIntent?.melody_character?.register === "low" ||
      musicalIntent?.melody_character?.register === "high"
        ? musicalIntent.melody_character.register
        : "mid",

    lift:
      musicalIntent?.melody_character?.lift === "restrained" ||
      musicalIntent?.melody_character?.lift === "strong"
        ? musicalIntent.melody_character.lift
        : "balanced",

    movement:
      musicalIntent?.melody_character?.movement === "calm" ||
      musicalIntent?.melody_character?.movement === "active"
        ? musicalIntent.melody_character.movement
        : "balanced",
  };

  const sectionIntents = Array.isArray(musicalIntent?.section_intents)
    ? (musicalIntent.section_intents as MelodySectionIntent[])
    : [];

  return {
    character: character || DEFAULT_MELODY_CHARACTER,
    sectionIntents,
  };
}

export function getInitialCompareSongIds(songVersions: SongVersionRecord[]) {
  if (songVersions.length >= 2) {
    return {
      leftId: songVersions[0].id,
      rightId: songVersions[1].id,
    };
  }

  return {
    leftId: "",
    rightId: "",
  };
}
