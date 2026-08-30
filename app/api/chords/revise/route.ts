import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      lyrics = "",
      songTitle = "",
      songVersionTitle = "",
      currentChords = {},
      genre = "",
      emotionalDirection = "",
      songCharacterDescriptors = [],
      harmonyCharacterDescriptors = [],
      harmonyRichness = "balanced",
      harmonyGuitarFeel = "mixed",
      harmonyMovement = "balanced",
      sectionIntents = [],
      revisionNotes = "",
    } = body ?? {};

    if (!String(lyrics).trim()) {
      return NextResponse.json(
        { error: "Lyrics are required." },
        { status: 400 },
      );
    }

    if (
      !currentChords ||
      typeof currentChords !== "object" ||
      Array.isArray(currentChords)
    ) {
      return NextResponse.json(
        { error: "Current chord data is required." },
        { status: 400 },
      );
    }

    const prompt = `
You are revising the harmony of an existing singer-songwriter song.

This is NOT a request to generate an unrelated new chord arrangement.

Start from the CURRENT CHORDS and preserve musical ideas that already work.
Change only what is justified by the songwriter's requested direction.

SONG
Title: ${songTitle || "Untitled"}
Version: ${songVersionTitle || "Untitled"}

LYRICS
${lyrics}

CURRENT CHORD DATA
${JSON.stringify(currentChords, null, 2)}

SONGWRITER DIRECTION

Genre / style:
${genre || "Not specified"}

Emotional direction:
${emotionalDirection || "Not specified"}

Song character:
${
  Array.isArray(songCharacterDescriptors) && songCharacterDescriptors.length > 0
    ? songCharacterDescriptors.join(", ")
    : "Not specified"
}

Harmony character:
${
  Array.isArray(harmonyCharacterDescriptors) &&
  harmonyCharacterDescriptors.length > 0
    ? harmonyCharacterDescriptors.join(", ")
    : "Not specified"
}

Harmonic richness:
${harmonyRichness}

Guitar feel:
${harmonyGuitarFeel}

Harmonic movement:
${harmonyMovement}

Section-specific direction:
${
  Array.isArray(sectionIntents) && sectionIntents.length > 0
    ? JSON.stringify(sectionIntents, null, 2)
    : "None"
}

Additional songwriter direction:
${revisionNotes || "None"}

INTERPRET THE SONGWRITER'S LANGUAGE MUSICALLY.

Examples:

- emotional:
  support emotional contour, meaningful tension and release, avoid mechanical repetition

- dreamy:
  consider open voicings, add9, sus, maj7 or similar colour when stylistically appropriate,
  gentler harmonic movement and smooth voice-leading

- poppy:
  favour memorable progression shapes, strong chorus identity and clear resolution,
  without becoming generic unless requested

- rockier:
  favour firmer chord movement, stronger roots and more direct harmonic impact

- folkier:
  favour natural acoustic movement, familiar open-chord relationships and playable shapes

- less folky:
  reduce obvious folk clichés and overly predictable open-chord movement

- softer:
  use gentler transitions, less aggressive dominant movement and sympathetic voicings

- more upbeat:
  encourage forward harmonic motion and brighter harmonic energy where appropriate

- moody:
  allow darker colour, minor/modal flavour and less immediate resolution

- intimate:
  keep movement supportive and conversational rather than oversized

- anthemic:
  give important sections, especially choruses, a stronger sense of arrival and lift

- cinematic:
  allow broader tension/release, sustained colour and emotionally purposeful movement

- raw / gritty:
  avoid excessive polish or decorative harmony; favour direct, characterful changes

- confessional:
  support the lyric closely and avoid harmony that distracts from the vocal

- playful:
  allow unexpected but musical changes where they suit the lyric

- driving:
  favour stronger forward movement and rhythmic harmonic energy

- slow-building:
  preserve restraint early and increase harmonic weight or colour later

- stripped-back:
  reduce chord density, extensions and unnecessary movement

- simple:
  favour clear, playable progressions and basic chord vocabulary

- richer:
  introduce tasteful colour, substitutions, extensions, inversions or passing harmony
  only where they improve the song

- warm:
  favour sympathetic, rounded harmonic colour and natural voice-leading

- darker:
  favour minor/modal colour and reduced brightness where appropriate

- open:
  favour spacious guitar-friendly voicings and open-string possibilities

- lush:
  allow richer extensions, inversions and smoother voice-leading

- familiar:
  favour recognisable functional movement

- less predictable:
  avoid default four-chord loops when a more distinctive choice would serve the song

- tense:
  preserve or introduce unresolved motion where emotionally useful

- smooth:
  favour connected voice-leading and natural transitions

- more movement:
  increase harmonic activity where it improves phrasing or section momentum

- resolved:
  provide satisfying harmonic arrival at important destinations

- leave some tension:
  avoid resolving every phrase too neatly

GUITAR FEEL

- open:
  prioritise singer-songwriter-friendly open chords, capo-friendly shapes and practical guitar playing

- mixed:
  balance playability with harmonic colour

- colourful:
  allow richer shapes, extensions, inversions and distinctive voicings while remaining realistically playable

IMPORTANT RULES

1. Preserve the song's existing harmonic identity unless the requested direction calls for change.
2. Do not change chords merely to appear creative.
3. Prefer musically meaningful changes over theoretical complexity.
4. Keep the result practical for a singer-songwriter performing with acoustic guitar.
5. Consider vocal support, section contrast, tension and release, and emotional storytelling.
6. A chorus may need greater harmonic lift than a verse, but do not force this if the song does not need it.
7. Respect any explicit "keep" section directions.
8. Do not invent or rewrite lyrics.
9. Do not produce chord-over-lyric placement unless that structure is already part of the supplied chord object.
10. Preserve useful existing metadata unless there is a musical reason to change it.
11. Return the COMPLETE revised chord object, not only the fields you changed.
12. Keep the output compatible with the structure of CURRENT CHORD DATA.

Return valid JSON only.

The response must have this exact top-level shape:

{
  "chords": {
    ...complete revised chord object...
  },
  "revisionSummary": {
    "kept": ["short descriptions of important things preserved"],
    "changed": ["short descriptions of meaningful changes"],
    "reason": "brief songwriter-friendly explanation of why the revision better matches the requested direction"
  }
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are a professional songwriter, acoustic arranger, harmony specialist, and practical guitar accompanist. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Harmony revision returned no result." },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(content);

    if (
      !parsed?.chords ||
      typeof parsed.chords !== "object" ||
      Array.isArray(parsed.chords)
    ) {
      return NextResponse.json(
        { error: "Harmony revision returned invalid chord data." },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Harmony revision failed:", error);

    return NextResponse.json(
      { error: "Could not revise the harmony." },
      { status: 500 },
    );
  }
}
