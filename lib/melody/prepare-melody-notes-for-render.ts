import type { MelodyNote, MelodyPhrase } from "@/types/song";

import { buildArticulatedMelodyNotes } from "./build-articulated-melody-notes";
import { buildRenderedPhraseEndingNotes } from "./build-rendered-phrase-ending-notes";

export function prepareMelodyNotesForRender(
  phrases: MelodyPhrase[],
): MelodyNote[] {
  return buildArticulatedMelodyNotes(
    buildRenderedPhraseEndingNotes(phrases),
  );
}