import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const CHORD_GENERATION_TIMEOUT_MS = 300_000;

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    error.name === "AbortError" ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("aborted")
  );
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    status?: number;
    code?: string;
    type?: string;
  };

  return (
    record.status === 429 ||
    record.code === "insufficient_quota" ||
    record.type === "insufficient_quota"
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function parseModelJson(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to fallback extraction below.
  }

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutCodeFence);
  } catch {
    // Continue to object extraction below.
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);
    return JSON.parse(jsonCandidate);
  }

  throw new Error("Could not parse JSON from model response.");
}

async function getArtistDNAString() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return "";

    const { data, error } = await supabase
      .from("artist_dna_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return "";

    return `
Artist DNA Profile:
- Artist Name: ${data.artist_name || ""}
- Vocal Range: ${data.vocal_range || ""}
- Core Genres: ${data.core_genres || ""}
- Lyrical Style: ${data.lyrical_style || ""}
- Emotional Tone: ${data.emotional_tone || ""}
- Writing Strengths: ${data.writing_strengths || ""}
- Avoid List: ${data.avoid_list || ""}
- Visual Style: ${data.visual_style || ""}
- Performance Style: ${data.performance_style || ""}
- DNA Summary: ${data.dna_summary || ""}

Use this DNA as a strong stylistic guide. Do not mention it explicitly in the output.
`;
  } catch (err) {
    console.error("Artist DNA lookup failed in chords route:", err);
    return "";
  }
}

export async function POST(req: Request) {
  let generationCheckpoint: Record<string, unknown> | null = null;

  try {
    const body = await req.json();
    const artistDNA = await getArtistDNAString();

    const lyrics = typeof body.lyrics === "string" ? body.lyrics : "";
    const songTitle = typeof body.songTitle === "string" ? body.songTitle : "";
    const songVersionTitle =
      typeof body.songVersionTitle === "string" ? body.songVersionTitle : "";

    const tempoBpm =
      typeof body.tempoBpm === "number" && Number.isFinite(body.tempoBpm)
        ? body.tempoBpm
        : null;

    const suppliedResumeChordData =
      body.resumeChordData &&
      typeof body.resumeChordData === "object" &&
      !Array.isArray(body.resumeChordData)
        ? (body.resumeChordData as Record<string, unknown>)
        : null;

    const prompt = `
You are a professional songwriter, acoustic arranger, and live performance songsheet editor.

Create playable acoustic-guitar chords and a performance songsheet for these lyrics.

Song title: ${songTitle || "Untitled song"}
Song version: ${songVersionTitle || "Untitled version"}

Current performance tempo: ${tempoBpm !== null ? `${tempoBpm} BPM` : "Not supplied"}

Genre: ${body.genre || ""}
Mood: ${Array.isArray(body.moods) ? body.moods.join(", ") : ""}
Theme: ${body.theme || ""}
Hook: ${body.hook || ""}

Lyrics:
${lyrics}

${artistDNA}

Return ONLY valid JSON. Do not include explanation, markdown, comments, or text before or after the JSON.

The JSON must use this shape:

{
  "key": "",
  "capo": "",
  "tuning": "",
  "genre": "",
  "timeSignature": "4/4",
   "musicalTimingPlan": {
  "sections": [
    {
  "section": "Verse 1",
  "bars": 16,
  "timeSignature": "4/4",
  "meterChanges": []
},
    {
      "musicalTimingPlan": {
  "sections": [
    {
      "section": "Section name",
      "bars": 12,
      "timeSignature": "4/4",
      "meterChanges": []
    },
    {
      "section": "Another section",
      "bars": 9,
      "timeSignature": "4/4",
      "meterChanges": [
        {
          "bar": 6,
          "timeSignature": "3/4"
        }
      ]
    }
  ]
},
"groove": "",
  "performanceFeel": "",
  "phrasingNotes": "",
  "vocalDelivery": "",
  "guitarPattern": "",
  "guideTrackPlan": {
  "purpose": "",
  "countIn": "",
  "instrumentation": "",
  "guitarTone": "",
  "rhythmReference": "",
  "vocalGuideStyle": "",
  "sectionPlan": [
    {
          "section": "Verse 1",
          "feel": "",
          "guitarApproach": "",
          "vocalApproach": "",
          "dynamicShape": "",
          "notes": ""
        }
      ]
    },
  "notes": "",
"harmonicTimeline": [
  {
    "section": "Verse 1",
    "events": [
      {
        "chord": "G",
        "bar": 1,
        "beat": 1
      },
      {
        "chord": "C",
        "bar": 2,
        "beat": 3
      }
    ]
  }
]
}

Requirements:
- Make the chords playable for acoustic guitar.
- Use the artist DNA where helpful, especially for vocal range, style, harmonic richness, and live-performance suitability.
- Think like a songwriter and live acoustic performer.
- The output should help the performer remember phrasing, rhythm, melody feel, and chord timing.
- First compose the musical structure and harmony independently of the printed lyric-line layout.
- harmonicTimeline is the authoritative chord-event timeline produced by this generation pass.
- harmonicTimeline must contain one entry for each section instance that contains harmony, in song order.
- Each harmonicTimeline event must contain only chord, bar, and beat.
- Do not include lyric text, lyric line indexes, charIndex, or visual chord placement in harmonicTimeline.
- Do not attach chord events to printed lyric lines in this generation pass.
- bar is the 1-based musical bar number within the current section.
- beat is the 1-based beat within that bar.
- Determine chord bar and beat from musical phrasing, harmonic rhythm, time signature, groove, vocal phrasing, breath points, pickups, held notes, rests, instrumental movement, and the supplied current performance tempo when present.
- Treat the supplied current performance tempo as authoritative when present.
- Do not infer a different tempo from lyric length or formatting.
- Never derive bar or beat from lyric-line count, character position, word spacing, line width, punctuation spacing, or printed line breaks.
- Do not assume one bar, two bars, or any fixed duration per printed lyric line.
- Several printed lyric lines may occur within one musical phrase.
- One printed lyric line may span several musical bars.
- Consecutive printed lyric lines may begin within the same bar when musically appropriate.
- Phrase boundaries do not need to coincide with printed line breaks.
- Chord changes do not need to coincide with printed line starts.
- Keep bar numbers continuous within each section and reset bar numbering to 1 at the start of each new section.
- beat must be valid for the meter active at that bar.
- Fractional beats may be used only when the musical change genuinely occurs between main beats, for example beat 2.5.
- Use the requested genre, mood, artist DNA, and live acoustic performance feel to choose harmonic rhythm and phrasing.
- Treat instrumental sections such as Intro, Interlude, Turnaround, Solo, and Outro as genuine songwriting sections with their own harmonic purpose.
- Do not automatically copy the harmony of the adjacent sung section.
- Consider whether an instrumental section should create contrast, tension, release, anticipation, harmonic colour, or a smoother transition.
- When musically appropriate, borrowed, chromatic, modal, pedal-tone, suspended, or otherwise contrasting harmony is allowed provided it remains convincing and practical for acoustic performance.
- Any instrumental harmony must appear explicitly in harmonicTimeline with its actual bar/beat timing.
- Prefer musically meaningful harmonic movement over a mechanically regular grid.
- Repeated harmonic durations are valid when they are an intentional musical pattern, but not merely because the lyrics are printed in similarly sized lines.
- Before returning the result, verify that harmonicTimeline would still make musical sense if the exact same lyrics were reformatted into completely different printed line breaks.
- Return the final checked JSON only.
Musical timing plan requirements:
- Include musicalTimingPlan as the authoritative section-level musical timeline for the song.
- Include one section entry for every section instance represented in harmonicTimeline, in song order.
- section must match the corresponding harmonicTimeline section name.
- bars is the total number of musical bars in that complete section, including sung time, held bars, rests, turnarounds, pickups resolved into the section, and instrumental space.
- Determine section length before considering how the lyrics happen to be printed into lines.
- Do not calculate bars from the number of lyric lines.
- Do not multiply lyric-line count by any fixed number of bars.
- Do not choose section length merely so that each printed line receives an equal amount of musical time.
- timeSignature is the meter active at bar 1 of the section.
- If the meter changes within a section, include each change in meterChanges using the 1-based bar where the new meter begins.
- If the meter does not change, return an empty meterChanges array.
- Do not invent meter changes merely to create variety.
- Every harmonicTimeline bar/beat event must use the same section-local bar numbering and meter defined by musicalTimingPlan.
- No harmonic event may reference a bar greater than that section's bars value.
- Determine section length from intended musical phrasing, harmonic rhythm, meter, groove, vocal phrasing, held notes, rests, turnarounds, pickups, and instrumental movement.
- For sung sections, verify that the chosen bar count leaves practical vocal space at the supplied tempo for the actual number of sung words, including normal phrase gaps, breaths, held syllables, and expressive timing.
- Do not choose a section length that only works by compressing most lyric phrases close to the minimum singable word density.
- If the lyric content would make the section feel rushed or unnaturally packed at the supplied tempo, increase the section bar count before finalizing musicalTimingPlan.
- Prefer musically natural breathing room over the smallest technically valid section length.
- Review musicalTimingPlan and harmonicTimeline together before returning the JSON so they describe one coherent musical performance.
Performance intent requirements:
- Include timeSignature as the song's opening or primary time signature, usually "4/4" unless another meter is clearly better. Use musicalTimingPlan for section-level timing and any later meter changes.
- Include groove, describing the rhythmic feel, for example "laid-back fingerpicked 8th-note feel" or "steady brushed country ballad pulse".
- Include phrasingNotes describing how the vocal should sit against the guitar rhythm.
- Include vocalDelivery describing the emotional and rhythmic delivery.
- Include guitarPattern describing the likely accompaniment pattern.
- Make guideTrackPlan specific enough that a simple audio-preview feature could use it later.
- Use these performance intent fields to guide musicalTimingPlan and harmonicTimeline bar/beat timing.
- Include guideTrackPlan as a practical plan for a future simple audio guide track.
- The guide track is not a finished production.
- It should help the songwriter remember the supplied performance tempo, groove, phrasing, chord timing, vocal entry points, and dynamic shape.
- Keep instrumentation sparse, usually acoustic guitar plus optional light count-in, foot tap, or metronome.
- Do not suggest full-band production unless the song clearly requires it.
- Use sectionPlan to describe how each major section should feel and develop.
- Include vocalGuideStyle as a simple guide vocal or melody reference, not a polished lead vocal.
- Include rhythmReference to describe the pulse clearly enough that it could later drive audio preview generation.
`;

    let chordData: unknown = suppliedResumeChordData;

    if (!suppliedResumeChordData) {
      const controller = new AbortController();
      const harmonyStartedAt = Date.now();
      let harmonyLocalTimeoutTriggered = false;

      console.log("[chords] initial-harmony started", {
        promptChars: prompt.length,
      });

      const timeoutId = setTimeout(() => {
        harmonyLocalTimeoutTriggered = true;
        controller.abort();
      }, CHORD_GENERATION_TIMEOUT_MS);

      let completion;

      try {
        completion = await openai.chat.completions.create(
          {
            model: "gpt-5",
            messages: [{ role: "user", content: prompt }],
          },
          {
            signal: controller.signal,
          },
        );

        console.log("[chords] initial-harmony completed", {
          elapsedMs: Date.now() - harmonyStartedAt,
        });
      } catch (error) {
        if (harmonyLocalTimeoutTriggered) {
          console.error("[chords] initial-harmony hit local timeout", {
            elapsedMs: Date.now() - harmonyStartedAt,
            promptChars: prompt.length,
          });

          throw new Error(
            `Initial harmony generation timed out after ${
              CHORD_GENERATION_TIMEOUT_MS / 60_000
            } minutes.`,
          );
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      const text = completion.choices[0].message.content || "{}";

      try {
        chordData = parseModelJson(text);
      } catch {
        return NextResponse.json(
          {
            error: "Invalid JSON from model",
            raw: text,
          },
          { status: 500 },
        );
      }
    } else {
      console.log(
        "[chords] resuming from supplied harmony/placement checkpoint",
      );
    }

    const chordDataRecord =
      chordData && typeof chordData === "object" && !Array.isArray(chordData)
        ? (chordData as Record<string, unknown>)
        : null;

    if (!chordDataRecord) {
      return NextResponse.json(
        {
          error: "Chord generation returned invalid chord data.",
        },
        { status: 500 },
      );
    }

    chordDataRecord.musicalTimingProvenance = {
      source: "generated-arrangement",
      status: "proposed",
      authoritative: false,
      detail:
        "Bar and beat timing is part of the generated musical arrangement and should be reviewed before use as final performance timing.",
    };

    const harmonicTimeline =
      chordDataRecord && Array.isArray(chordDataRecord.harmonicTimeline)
        ? chordDataRecord.harmonicTimeline
        : null;

    if (!harmonicTimeline) {
      return NextResponse.json(
        {
          error: "Chord generation did not return a harmonicTimeline.",
        },
        { status: 500 },
      );
    }

    const resumedSongSheetLines =
      suppliedResumeChordData && Array.isArray(chordDataRecord.songSheetLines)
        ? chordDataRecord.songSheetLines
        : null;

    let rebuiltSongSheetLines: Array<{
      section: string;
      sectionIndex: number;
      lyric: string;
      chords: Array<{
        chord: string;
        charIndex: number;
        bar: number;
        beat: number;
        sectionIndex: number;
        eventIndex: number;
      }>;
    }>;

    if (!resumedSongSheetLines) {
      const placementPrompt = `
You are fitting an already-composed harmonic timeline visually to the supplied lyrics.

The music has already been composed.

Do NOT compose or replace chords.
Do NOT change section timing.
Do NOT change bar numbers.
Do NOT change beat numbers.
Do NOT change musicalTimingPlan.
Do NOT change harmonicTimeline.

Your only task is to decide:
1. which lyric row each existing harmonic event should be displayed above; and
2. the charIndex where that chord should appear visually.

Lyrics:
${lyrics}

Completed musical data:
${JSON.stringify(chordData, null, 2)}

The harmonicTimeline array is authoritative.

Each harmonicTimeline section has a zero-based sectionIndex equal to its position in that array.
Each event inside that section has a zero-based eventIndex equal to its position in that section's events array.

Return ONLY valid JSON using this exact shape:

{
  "rows": [
    {
      "sectionIndex": 0,
      "lyric": "",
      "placements": [
        {
          "eventIndex": 0,
          "charIndex": 0
        }
      ]
    },
    {
      "sectionIndex": 1,
      "lyric": "Exact lyric line from the supplied lyrics",
      "placements": [
        {
          "eventIndex": 0,
          "charIndex": 4
        }
      ]
    }
  ]
}

Requirements:

- Preserve the complete song order.
- Include every sung lyric line exactly once and in its original order.
- Copy sung lyric text exactly from the supplied lyrics.
- Do not rewrite, shorten, normalize, paraphrase, or combine lyric lines.
- Do not invent lyric text.

- sectionIndex refers to the zero-based position of the corresponding section in harmonicTimeline.
- eventIndex refers to the zero-based position of an event in that harmonicTimeline section.
- Every harmonicTimeline event must appear exactly once in placements.
- Do not omit an existing harmonic event.
- Do not duplicate an existing harmonic event.
- Do not invent additional harmonic events.

- For sung rows, lyric must be the exact lyric line that should visually carry those chord symbols.
- If a sung lyric line has no chord event, still return the row with placements: [].
- For instrumental sections with no sung lyric, return one or more rows with lyric: "".
- Instrumental events should use charIndex 0.

- charIndex is visual placement only.
- charIndex is zero-based.
- For sung rows, charIndex must point to a valid character position in that exact lyric string.
- Place the chord above the word or syllable where the performer should visually feel the already-timed harmonic event.
- Do not infer musical time from charIndex.
- Do not use charIndex to alter the underlying bar or beat.
- A chord may be displayed partway through a lyric line even when its musical event happens before or after the singer's precise word onset.
- A turnaround or held chord may be displayed near the end of the most relevant lyric line.
- Several harmonic events may belong to one lyric row.
- A lyric row may have no harmonic event.
- Do not force one chord per lyric line.
- Do not distribute chords evenly merely because the lyric lines have similar lengths.

- The supplied harmonicTimeline has already determined harmonic rhythm.
- Printed lyric line breaks do not define bar boundaries.
- Your result should still make sense if the same lyrics were printed with different line lengths.

Return rows only.
`.trim();

      const placementController = new AbortController();
      const placementStartedAt = Date.now();
      let placementLocalTimeoutTriggered = false;

      console.log("[chords] placement started", {
        promptChars: placementPrompt.length,
      });

      const placementTimeoutId = setTimeout(() => {
        placementLocalTimeoutTriggered = true;
        placementController.abort();
      }, CHORD_GENERATION_TIMEOUT_MS);

      let placementCompletion;

      try {
        placementCompletion = await openai.chat.completions.create(
          {
            model: "gpt-5",
            messages: [{ role: "user", content: placementPrompt }],
          },
          {
            signal: placementController.signal,
          },
        );

        console.log("[chords] placement completed", {
          elapsedMs: Date.now() - placementStartedAt,
        });
      } catch (error) {
        if (placementLocalTimeoutTriggered) {
          console.error("[chords] placement hit local timeout", {
            elapsedMs: Date.now() - placementStartedAt,
            promptChars: placementPrompt.length,
          });

          throw new Error(
            `Chord placement timed out after ${
              CHORD_GENERATION_TIMEOUT_MS / 60_000
            } minutes.`,
          );
        }

        throw error;
      } finally {
        clearTimeout(placementTimeoutId);
      }

      const placementText =
        placementCompletion.choices[0].message.content || "{}";

      let placementResult;

      try {
        placementResult = parseModelJson(placementText);
      } catch {
        return NextResponse.json(
          {
            error: "Invalid chord placement JSON from model",
            raw: placementText,
          },
          { status: 500 },
        );
      }

      const placementRows =
        placementResult &&
        typeof placementResult === "object" &&
        !Array.isArray(placementResult) &&
        Array.isArray(placementResult.rows)
          ? placementResult.rows
          : null;

      if (!placementRows) {
        return NextResponse.json(
          {
            error: "Chord placement pass returned invalid row data.",
            raw: placementText,
          },
          { status: 500 },
        );
      }

      rebuiltSongSheetLines = placementRows.flatMap(
        (
          row: unknown,
        ): Array<{
          section: string;
          sectionIndex: number;
          lyric: string;
          chords: Array<{
            chord: string;
            charIndex: number;
            bar: number;
            beat: number;
            sectionIndex: number;
            eventIndex: number;
          }>;
        }> => {
          if (!row || typeof row !== "object" || Array.isArray(row)) {
            return [];
          }

          const rowRecord = row as Record<string, unknown>;

          const sectionIndex =
            typeof rowRecord.sectionIndex === "number" &&
            Number.isInteger(rowRecord.sectionIndex)
              ? rowRecord.sectionIndex
              : -1;

          const timelineSection = harmonicTimeline[sectionIndex];

          if (
            !timelineSection ||
            typeof timelineSection !== "object" ||
            Array.isArray(timelineSection)
          ) {
            return [];
          }

          const timelineSectionRecord = timelineSection as Record<
            string,
            unknown
          >;

          const section =
            typeof timelineSectionRecord.section === "string"
              ? timelineSectionRecord.section
              : "";

          const events = Array.isArray(timelineSectionRecord.events)
            ? timelineSectionRecord.events
            : [];

          const lyric =
            typeof rowRecord.lyric === "string" ? rowRecord.lyric : "";

          const placements = Array.isArray(rowRecord.placements)
            ? rowRecord.placements
            : [];

          const chords = placements.flatMap(
            (
              placement: unknown,
            ): Array<{
              chord: string;
              charIndex: number;
              bar: number;
              beat: number;
              sectionIndex: number;
              eventIndex: number;
            }> => {
              if (
                !placement ||
                typeof placement !== "object" ||
                Array.isArray(placement)
              ) {
                return [];
              }

              const placementRecord = placement as Record<string, unknown>;

              const eventIndex =
                typeof placementRecord.eventIndex === "number" &&
                Number.isInteger(placementRecord.eventIndex)
                  ? placementRecord.eventIndex
                  : -1;

              const event = events[eventIndex];

              if (!event || typeof event !== "object" || Array.isArray(event)) {
                return [];
              }

              const eventRecord = event as Record<string, unknown>;

              const chord =
                typeof eventRecord.chord === "string"
                  ? eventRecord.chord.trim()
                  : "";

              const bar =
                typeof eventRecord.bar === "number" &&
                Number.isFinite(eventRecord.bar)
                  ? eventRecord.bar
                  : null;

              const beat =
                typeof eventRecord.beat === "number" &&
                Number.isFinite(eventRecord.beat)
                  ? eventRecord.beat
                  : null;

              if (!chord || bar === null || beat === null) {
                return [];
              }

              const requestedCharIndex =
                typeof placementRecord.charIndex === "number" &&
                Number.isFinite(placementRecord.charIndex)
                  ? Math.floor(placementRecord.charIndex)
                  : 0;

              const charIndex =
                lyric.length > 0
                  ? Math.max(0, Math.min(requestedCharIndex, lyric.length - 1))
                  : 0;

              return [
                {
                  chord,
                  charIndex,
                  bar,
                  beat,
                  sectionIndex,
                  eventIndex,
                },
              ];
            },
          );

          return [
            {
              section,
              sectionIndex,
              lyric,
              chords,
            },
          ];
        },
      );

      const expectedEventKeys = new Set<string>();

      harmonicTimeline.forEach((timelineSection, sectionIndex) => {
        if (
          !timelineSection ||
          typeof timelineSection !== "object" ||
          Array.isArray(timelineSection)
        ) {
          return;
        }

        const timelineSectionRecord = timelineSection as Record<
          string,
          unknown
        >;

        const events = Array.isArray(timelineSectionRecord.events)
          ? timelineSectionRecord.events
          : [];

        events.forEach((_event, eventIndex) => {
          expectedEventKeys.add(`${sectionIndex}:${eventIndex}`);
        });
      });

      const seenEventKeys = new Set<string>();
      let invalidPlacementReference = false;
      let duplicatePlacementReference = false;

      for (const row of placementRows) {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          continue;
        }

        const rowRecord = row as Record<string, unknown>;

        const sectionIndex =
          typeof rowRecord.sectionIndex === "number" &&
          Number.isInteger(rowRecord.sectionIndex)
            ? rowRecord.sectionIndex
            : -1;

        const placements = Array.isArray(rowRecord.placements)
          ? rowRecord.placements
          : [];

        for (const placement of placements) {
          if (
            !placement ||
            typeof placement !== "object" ||
            Array.isArray(placement)
          ) {
            invalidPlacementReference = true;
            continue;
          }

          const placementRecord = placement as Record<string, unknown>;

          const eventIndex =
            typeof placementRecord.eventIndex === "number" &&
            Number.isInteger(placementRecord.eventIndex)
              ? placementRecord.eventIndex
              : -1;

          const eventKey = `${sectionIndex}:${eventIndex}`;

          if (!expectedEventKeys.has(eventKey)) {
            invalidPlacementReference = true;
            continue;
          }

          if (seenEventKeys.has(eventKey)) {
            duplicatePlacementReference = true;
            continue;
          }

          seenEventKeys.add(eventKey);
        }
      }

      const missingEventKeys = Array.from(expectedEventKeys).filter(
        (eventKey) => !seenEventKeys.has(eventKey),
      );

      if (
        invalidPlacementReference ||
        duplicatePlacementReference ||
        missingEventKeys.length > 0
      ) {
        return NextResponse.json(
          {
            error:
              "Chord placement pass did not preserve every harmonic event exactly once.",
            invalidPlacementReference,
            duplicatePlacementReference,
            missingEventKeys,
            raw: placementText,
          },
          { status: 500 },
        );
      }

      chordDataRecord.songSheetLines = rebuiltSongSheetLines;
    } else {
      rebuiltSongSheetLines = resumedSongSheetLines.flatMap(
        (
          line,
        ): Array<{
          section: string;
          sectionIndex: number;
          lyric: string;
          chords: Array<{
            chord: string;
            charIndex: number;
            bar: number;
            beat: number;
            sectionIndex: number;
            eventIndex: number;
          }>;
        }> => {
          if (!line || typeof line !== "object" || Array.isArray(line)) {
            return [];
          }

          const lineRecord = line as Record<string, unknown>;
          const sectionIndex =
            typeof lineRecord.sectionIndex === "number" &&
            Number.isInteger(lineRecord.sectionIndex)
              ? lineRecord.sectionIndex
              : null;
          const section =
            typeof lineRecord.section === "string" ? lineRecord.section : "";
          const lyric =
            typeof lineRecord.lyric === "string" ? lineRecord.lyric : "";

          const chords = Array.isArray(lineRecord.chords)
            ? lineRecord.chords.flatMap(
                (
                  rawChord,
                ): Array<{
                  chord: string;
                  charIndex: number;
                  bar: number;
                  beat: number;
                  sectionIndex: number;
                  eventIndex: number;
                }> => {
                  if (
                    !rawChord ||
                    typeof rawChord !== "object" ||
                    Array.isArray(rawChord)
                  ) {
                    return [];
                  }

                  const chordRecord = rawChord as Record<string, unknown>;

                  const chord =
                    typeof chordRecord.chord === "string"
                      ? chordRecord.chord
                      : "";

                  const charIndex =
                    typeof chordRecord.charIndex === "number" &&
                    Number.isFinite(chordRecord.charIndex)
                      ? chordRecord.charIndex
                      : null;

                  const bar =
                    typeof chordRecord.bar === "number" &&
                    Number.isFinite(chordRecord.bar)
                      ? chordRecord.bar
                      : null;

                  const beat =
                    typeof chordRecord.beat === "number" &&
                    Number.isFinite(chordRecord.beat)
                      ? chordRecord.beat
                      : null;

                  const sectionIndex =
                    typeof chordRecord.sectionIndex === "number" &&
                    Number.isInteger(chordRecord.sectionIndex)
                      ? chordRecord.sectionIndex
                      : null;

                  const eventIndex =
                    typeof chordRecord.eventIndex === "number" &&
                    Number.isInteger(chordRecord.eventIndex)
                      ? chordRecord.eventIndex
                      : null;

                  if (
                    !chord ||
                    charIndex === null ||
                    bar === null ||
                    beat === null ||
                    sectionIndex === null ||
                    eventIndex === null
                  ) {
                    return [];
                  }

                  return [
                    {
                      chord,
                      charIndex,
                      bar,
                      beat,
                      sectionIndex,
                      eventIndex,
                    },
                  ];
                },
              )
            : [];

          if (sectionIndex === null) {
            return [];
          }

          return [
            {
              section,
              sectionIndex,
              lyric,
              chords,
            },
          ];
        },
      );

      if (rebuiltSongSheetLines.length === 0) {
        return NextResponse.json(
          {
            error:
              "The supplied chord-generation checkpoint does not contain a usable fitted song sheet.",
          },
          { status: 400 },
        );
      }

      chordDataRecord.songSheetLines = rebuiltSongSheetLines;

      console.log(
        "[chords] skipped initial harmony and placement from checkpoint",
        {
          songSheetLines: rebuiltSongSheetLines.length,
        },
      );
    }

    generationCheckpoint = {
      ...chordDataRecord,
      songSheetLines: rebuiltSongSheetLines,
    };

    const songSheetLinesForTiming = rebuiltSongSheetLines;

    const sungWordEntries: Array<{
      wordIndex: number;
      word: string;
      section: string;
      sectionIndex: number;
      sourceLineIndex: number;
      startCharIndex: number;
      endCharIndex: number;
    }> = [];

    songSheetLinesForTiming.forEach(
      (
        line: {
          section: string;
          sectionIndex: number;
          lyric: string;
          chords: Array<{
            chord: string;
            charIndex: number;
            bar: number;
            beat: number;
          }>;
        },
        sourceLineIndex: number,
      ) => {
        const lyric = typeof line.lyric === "string" ? line.lyric : "";
        const section = typeof line.section === "string" ? line.section : "";

        if (!lyric.trim()) {
          return;
        }

        for (const match of lyric.matchAll(/\S+/g)) {
          const word = match[0];
          const startCharIndex = match.index ?? 0;

          sungWordEntries.push({
            wordIndex: sungWordEntries.length,
            word,
            section,
            sectionIndex: line.sectionIndex,
            sourceLineIndex,
            startCharIndex,
            endCharIndex: startCharIndex + word.length,
          });
        }
      },
    );

    if (sungWordEntries.length === 0) {
      return NextResponse.json(
        {
          error: "Could not build sung-word timing input.",
        },
        { status: 500 },
      );
    }

    const indexedSungWords = sungWordEntries
      .map((entry) => `${entry.wordIndex}. [${entry.section}] ${entry.word}`)
      .join("\n");

    const lyricTimingMusicalContext = {
      musicalTimingPlan: chordDataRecord.musicalTimingPlan,
      harmonicTimeline: chordDataRecord.harmonicTimeline,
      groove: chordDataRecord.groove,
      performanceFeel: chordDataRecord.performanceFeel,
      phrasingNotes: chordDataRecord.phrasingNotes,
      vocalDelivery: chordDataRecord.vocalDelivery,
      guitarPattern: chordDataRecord.guitarPattern,
      guideTrackPlan: chordDataRecord.guideTrackPlan,
    };

    const lyricTimingPrompt = `
You are determining natural vocal phrase timing for an already-composed song.

The lyrics below have deliberately been converted into one ordered stream of indexed sung words.

The original printed lyric-line boundaries are NOT provided to you because typography must not determine vocal phrase boundaries.

Do NOT rewrite the lyrics.
Do NOT reharmonize the song.
Do NOT change chord names.
Do NOT change chord bar/beat positions.
Do NOT change musicalTimingPlan.
Do NOT change section lengths or meter.

Your task has two musical parts:

1. Identify natural sung phrase spans using the indexed word stream.
2. Place those phrases into the existing musical timeline using bar and beat coordinates.

Current performance tempo:
${tempoBpm !== null ? `${tempoBpm} BPM` : "Not supplied"}

Indexed sung-word stream:
${indexedSungWords}

Existing musical context:
${JSON.stringify(lyricTimingMusicalContext, null, 2)}

Return ONLY valid JSON using this exact top-level shape:

{
  "wordTimingPlan": {
    "phrases": [
      {
        "section": "Verse 1",
        "startWordIndex": 0,
        "endWordIndexExclusive": 7,
        "startBar": 1,
        "startBeat": 1.5,
        "endBar": 2,
        "endBeat": 3
      },
      {
        "section": "Verse 1",
        "startWordIndex": 7,
        "endWordIndexExclusive": 12,
        "startBar": 2,
        "startBeat": 3.5,
        "endBar": 3,
        "endBeat": 4
      }
    ]
  }
}

Word-span requirements:
- startWordIndex identifies the first sung word belonging to the phrase.
- endWordIndexExclusive identifies the first word after the phrase.
- Therefore a phrase containing words 4, 5, and 6 uses startWordIndex 4 and endWordIndexExclusive 7.
- Word spans must be in ascending song order.
- A phrase must contain at least one word.
- A phrase must not cross a section boundary.
- Use the section labels shown in the indexed word stream.
- Do not invent words or word indexes.
- Do not use punctuation or regular word counts as an automatic phrase-boundary rule.

Phrase-construction requirements:
- First decide the sung phrase boundaries from language, meaning, stress, delivery, breath, melodic continuity, and emotional intent.
- Only after deciding the phrase spans should you assign bar and beat timing.
- Ask where a singer would naturally begin, continue, breathe, hold, interrupt, complete, or carry forward a thought.
- Preserve useful breathing room and rests between phrases.
- Allocate enough musical time for the words to be sung naturally at the supplied tempo.
- Judge phrase duration against the actual amount of lyric material in that phrase.
- Do not solve a crowded section by compressing many words into rapid sixteenth-note-like delivery unless the song's stated vocal style genuinely calls for that effect.
- If a proposed phrase would require rushed articulation, give it more musical duration and reconsider the timing of the surrounding phrases.
- A phrase may be short or long.
- Adjacent phrases do not need equal numbers of words.
- Do not group words into equal-sized blocks merely to make the result regular.
- Do not divide a section into equal phrase lengths merely because that is convenient.
- Repeated verses may share a vocal concept when appropriate, but their phrase spans do not have to be mechanically identical.
- Repeated choruses may use similar phrasing when musically justified.

Musical timing requirements:
- musicalTimingPlan is authoritative for section bars, meter, and meter changes.
- harmonicTimeline is authoritative for chord names and chord bar/beat positions.
- startBar and startBeat identify the actual musical entry of the phrase.
- endBar and endBeat identify the exclusive musical boundary immediately after the phrase.
- Bar/beat values are musical coordinates, not fixed elapsed seconds.
- Do not force phrases to start on beat 1.
- Do not force phrases to end on beat 1.
- Do not force phrase boundaries to coincide with chord changes.
- A vocal phrase may begin before a chord change, after it, or continue through several chord events.

- A phrase may end at bar N+1 beat 1 when that is the boundary immediately after the final bar of an N-bar section.
- If endBar is one greater than the section bar count, endBeat must be 1.
- Otherwise beats must be valid for the meter active at that bar.

Final review:
- Inspect the complete result before returning it.
- Read each phrase as though a singer must actually perform every supplied word at the stated tempo.
- Reject your own timing and redistribute the section if later phrases become progressively compressed merely because earlier phrases consumed too much of the available section.
- The end of a section must not become a dumping ground for remaining lyric words.
- If most phrases contain exactly the same number of words, reconsider whether you have created a mechanical grid.
- If most phrases begin on beat 1, end on beat 1, or occupy identical numbers of bars, verify that this is genuinely justified by the performance. .
- Musical regularity is allowed when the song genuinely calls for it, but it must come from the song rather than from a formatting shortcut.

Return wordTimingPlan only.
`.trim();

    const isTransientLyricTimingRequestError = (error: unknown) => {
      if (isTimeoutError(error)) {
        return true;
      }

      if (!(error instanceof Error)) {
        return false;
      }

      const message = error.message.toLowerCase();

      if (
        message.includes("connection error") ||
        message.includes("fetch failed") ||
        message.includes("network")
      ) {
        return true;
      }

      const cause =
        "cause" in error && error.cause && typeof error.cause === "object"
          ? (error.cause as Record<string, unknown>)
          : null;

      const causeCode =
        cause && typeof cause.code === "string" ? cause.code.toUpperCase() : "";

      return (
        causeCode === "ETIMEDOUT" ||
        causeCode === "ECONNRESET" ||
        causeCode === "ECONNREFUSED"
      );
    };

    const requestLyricTiming = async (prompt: string, stage: string) => {
      for (let requestAttempt = 1; requestAttempt <= 2; requestAttempt += 1) {
        const controller = new AbortController();
        const startedAt = Date.now();
        let localTimeoutTriggered = false;

        console.log(`[chords] ${stage} attempt ${requestAttempt} started`, {
          promptChars: prompt.length,
        });

        const timeoutId = setTimeout(() => {
          localTimeoutTriggered = true;
          controller.abort();
        }, CHORD_GENERATION_TIMEOUT_MS);

        try {
          const completion = await openai.chat.completions.create(
            {
              model: "gpt-5",
              messages: [{ role: "user", content: prompt }],
            },
            {
              signal: controller.signal,
            },
          );

          console.log(`[chords] ${stage} attempt ${requestAttempt} completed`, {
            elapsedMs: Date.now() - startedAt,
          });

          return completion.choices[0].message.content || "{}";
        } catch (error) {
          const elapsedMs = Date.now() - startedAt;

          if (localTimeoutTriggered) {
            console.error(`[chords] ${stage} hit local timeout`, {
              attempt: requestAttempt,
              elapsedMs,
              promptChars: prompt.length,
            });

            throw new Error(
              `${stage} timed out after ${CHORD_GENERATION_TIMEOUT_MS / 60_000} minutes.`,
            );
          }

          const shouldRetry =
            requestAttempt === 1 &&
            !isQuotaError(error) &&
            isTransientLyricTimingRequestError(error);

          console.error(`[chords] ${stage} request failed`, {
            attempt: requestAttempt,
            elapsedMs,
            promptChars: prompt.length,
            willRetry: shouldRetry,
            error,
          });

          if (!shouldRetry) {
            throw error;
          }

          console.warn(
            `[chords] ${stage} failed with a transient connection error; retrying once.`,
          );
        } finally {
          clearTimeout(timeoutId);
        }
      }

      throw new Error("Lyric timing request failed after transient retry.");
    };

    const parseLyricTimingResponse = (
      text: string,
    ):
      | {
          ok: true;
          wordTimingPhrases: unknown[];
        }
      | {
          ok: false;
          error: string;
        } => {
      let result: unknown;

      try {
        result = parseModelJson(text);
      } catch {
        return {
          ok: false,
          error: "Invalid lyric timing JSON from model",
        };
      }

      const record =
        result && typeof result === "object" && !Array.isArray(result)
          ? (result as Record<string, unknown>)
          : null;

      const plan =
        record &&
        record.wordTimingPlan &&
        typeof record.wordTimingPlan === "object" &&
        !Array.isArray(record.wordTimingPlan)
          ? (record.wordTimingPlan as Record<string, unknown>)
          : null;

      const phrases = plan && Array.isArray(plan.phrases) ? plan.phrases : null;

      if (!phrases) {
        return {
          ok: false,
          error: "Lyric timing pass returned invalid timing data.",
        };
      }

      return {
        ok: true,
        wordTimingPhrases: phrases,
      };
    };

    const resumedLyricTimingPhrases =
      suppliedResumeChordData &&
      Array.isArray(suppliedResumeChordData.resumeWordTimingPhrases)
        ? suppliedResumeChordData.resumeWordTimingPhrases
        : null;

    let lyricTimingText: string;

    if (resumedLyricTimingPhrases) {
      lyricTimingText = JSON.stringify({
        wordTimingPlan: {
          phrases: resumedLyricTimingPhrases,
        },
      });

      console.log("[chords] skipped lyric timing from checkpoint", {
        phraseCount: resumedLyricTimingPhrases.length,
      });
    } else {
      lyricTimingText = await requestLyricTiming(
        lyricTimingPrompt,
        "lyric-timing-initial",
      );
    }

    const initialLyricTimingParse = parseLyricTimingResponse(lyricTimingText);

    if (!initialLyricTimingParse.ok) {
      return NextResponse.json(
        {
          error: initialLyricTimingParse.error,
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    let wordTimingPhrases = initialLyricTimingParse.wordTimingPhrases;

    const musicalTimingPlanRecord =
      chordDataRecord.musicalTimingPlan &&
      typeof chordDataRecord.musicalTimingPlan === "object" &&
      !Array.isArray(chordDataRecord.musicalTimingPlan)
        ? (chordDataRecord.musicalTimingPlan as Record<string, unknown>)
        : null;

    const musicalTimingSections =
      musicalTimingPlanRecord && Array.isArray(musicalTimingPlanRecord.sections)
        ? musicalTimingPlanRecord.sections
        : null;

    if (!musicalTimingSections) {
      return NextResponse.json(
        {
          error: "Lyric timing pass returned invalid timing data.",
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    const convertWordTimingPhrases = (phrases: unknown[]) => {
      const conversionErrors: string[] = [];

      const convertedPhrases = phrases.flatMap(
        (
          phrase: unknown,
          phraseIndex,
        ): Array<{
          section: string;
          sectionIndex: number;
          startSourceLineIndex: number;
          startCharIndex: number;
          endSourceLineIndex: number;
          endCharIndex: number;
          startBar: number;
          startBeat: number;
          endBar: number;
          endBeat: number;
        }> => {
          if (!phrase || typeof phrase !== "object" || Array.isArray(phrase)) {
            conversionErrors.push(
              `Phrase ${phraseIndex + 1} is not an object.`,
            );
            return [];
          }

          const phraseRecord = phrase as Record<string, unknown>;

          const section =
            typeof phraseRecord.section === "string"
              ? phraseRecord.section.trim()
              : "";

          const startWordIndex =
            typeof phraseRecord.startWordIndex === "number" &&
            Number.isInteger(phraseRecord.startWordIndex)
              ? phraseRecord.startWordIndex
              : null;

          const endWordIndexExclusive =
            typeof phraseRecord.endWordIndexExclusive === "number" &&
            Number.isInteger(phraseRecord.endWordIndexExclusive)
              ? phraseRecord.endWordIndexExclusive
              : null;

          const startBar =
            typeof phraseRecord.startBar === "number" &&
            Number.isInteger(phraseRecord.startBar)
              ? phraseRecord.startBar
              : null;

          const startBeat =
            typeof phraseRecord.startBeat === "number" &&
            Number.isFinite(phraseRecord.startBeat)
              ? phraseRecord.startBeat
              : null;

          const endBar =
            typeof phraseRecord.endBar === "number" &&
            Number.isInteger(phraseRecord.endBar)
              ? phraseRecord.endBar
              : null;

          const endBeat =
            typeof phraseRecord.endBeat === "number" &&
            Number.isFinite(phraseRecord.endBeat)
              ? phraseRecord.endBeat
              : null;

          if (
            !section ||
            startWordIndex === null ||
            endWordIndexExclusive === null ||
            startBar === null ||
            startBeat === null ||
            endBar === null ||
            endBeat === null
          ) {
            conversionErrors.push(
              `Phrase ${phraseIndex + 1} has missing or invalid word-timing fields.`,
            );
            return [];
          }

          if (
            startWordIndex < 0 ||
            endWordIndexExclusive <= startWordIndex ||
            endWordIndexExclusive > sungWordEntries.length
          ) {
            conversionErrors.push(
              `Phrase ${phraseIndex + 1} has an invalid word span.`,
            );
            return [];
          }

          const phraseWords = sungWordEntries.slice(
            startWordIndex,
            endWordIndexExclusive,
          );

          const startWord = phraseWords[0];
          const endWord = phraseWords[phraseWords.length - 1];

          if (!startWord || !endWord) {
            conversionErrors.push(
              `Phrase ${phraseIndex + 1} could not resolve its word span.`,
            );
            return [];
          }

          const sectionIndex = startWord.sectionIndex;

          if (
            startWord.section !== section ||
            endWord.section !== section ||
            phraseWords.some(
              (word) =>
                word.section !== section || word.sectionIndex !== sectionIndex,
            )
          ) {
            conversionErrors.push(
              `Phrase ${phraseIndex + 1} crosses a section boundary or has the wrong section label.`,
            );
            return [];
          }

          return [
            {
              section,
              sectionIndex,
              startSourceLineIndex: startWord.sourceLineIndex,
              startCharIndex: startWord.startCharIndex,
              endSourceLineIndex: endWord.sourceLineIndex,
              endCharIndex: endWord.endCharIndex,
              startBar,
              startBeat,
              endBar,
              endBeat,
            },
          ];
        },
      );

      const phraseIndexesBySection = new Map<number, number[]>();

      convertedPhrases.forEach((phrase, phraseIndex) => {
        const phraseIndexes =
          phraseIndexesBySection.get(phrase.sectionIndex) ?? [];

        phraseIndexes.push(phraseIndex);

        phraseIndexesBySection.set(phrase.sectionIndex, phraseIndexes);
      });

      phraseIndexesBySection.forEach((phraseIndexes) => {
        if (phraseIndexes.length < 4) {
          return;
        }

        const sectionPhrases = phraseIndexes.map(
          (phraseIndex) => convertedPhrases[phraseIndex],
        );

        const firstBarInterval =
          sectionPhrases[1].startBar - sectionPhrases[0].startBar;

        if (firstBarInterval <= 0) {
          return;
        }

        const hasRegularBarCadence = sectionPhrases
          .slice(1)
          .every(
            (phrase, index) =>
              phrase.startBar - sectionPhrases[index].startBar ===
              firstBarInterval,
          );

        if (!hasRegularBarCadence) {
          return;
        }

        const firstBeat = sectionPhrases[0].startBeat;
        const secondBeat = sectionPhrases[1].startBeat;

        if (Math.abs(firstBeat - secondBeat) < 0.25) {
          return;
        }

        const hasMechanicalAlternation = sectionPhrases.every(
          (phrase, index) => {
            const expectedBeat = index % 2 === 0 ? firstBeat : secondBeat;

            return Math.abs(phrase.startBeat - expectedBeat) < 0.001;
          },
        );

        if (!hasMechanicalAlternation) {
          return;
        }

        const stableStartBeat = Math.min(firstBeat, secondBeat);

        sectionPhrases.forEach((phrase) => {
          phrase.startBeat = stableStartBeat;
        });
      });

      return {
        convertedPhrases,
        conversionErrors,
      };
    };

    let {
      convertedPhrases: convertedLyricTimingPhrases,
      conversionErrors: wordTimingConversionErrors,
    } = convertWordTimingPhrases(wordTimingPhrases);

    if (wordTimingConversionErrors.length > 0) {
      for (
        let repairAttempt = 1;
        repairAttempt <= 2 && wordTimingConversionErrors.length > 0;
        repairAttempt += 1
      ) {
        console.warn(
          `Lyric word-span conversion failed; requesting corrective repair ${repairAttempt} of 2:`,
          wordTimingConversionErrors,
        );

        const wordSpanRepairPrompt = `
${lyricTimingPrompt}

The previous lyric-timing attempt failed deterministic word-span validation.

Previous attempt:
${lyricTimingText}

Word-span validation errors:
${wordTimingConversionErrors.map((error) => `- ${error}`).join("\n")}

Repair requirements:
- Return a complete replacement wordTimingPlan, not a partial patch.
- Preserve the exact number of phrases from the previous attempt.
- Preserve the exact phrase order from the previous attempt.
- Preserve each phrase's section exactly.
- Normally preserve each phrase's startWordIndex and endWordIndexExclusive exactly.
- If a validation error says that a phrase crosses a section boundary or has the wrong section label, adjust that phrase's word-span boundary and, if necessary, its immediately adjacent phrase as little as possible so every phrase contains words from its own section only.
- If a validation error says that a phrase overlaps or appears out of lyric order, adjust that phrase's word-span boundary and, if necessary, its immediately adjacent phrase as little as possible to restore ascending, non-overlapping lyric order.
- Do NOT merge phrases.
- Do NOT split phrases.
- Preserve complete lyric coverage: do not omit, duplicate, or reorder sung words.
- Do not alter lyrics, word order, word indexes, section labels, musicalTimingPlan, section lengths, or meter.
- Keep every phrase inside its existing section.
- Preserve startBar, startBeat, endBar, and endBeat unless a minimal timing adjustment is required to keep the repaired phrase valid.
- Correct every word-span validation error listed above.
- Inspect the complete repaired plan before returning it.

Return ONLY valid JSON in the same wordTimingPlan shape requested above.
`.trim();

        const repairedLyricTimingText = await requestLyricTiming(
          wordSpanRepairPrompt,
          `lyric-word-span-repair-${repairAttempt}`,
        );

        const repairedLyricTimingParse = parseLyricTimingResponse(
          repairedLyricTimingText,
        );

        if (!repairedLyricTimingParse.ok) {
          return NextResponse.json(
            {
              error: repairedLyricTimingParse.error,
              raw: repairedLyricTimingText,
            },
            { status: 500 },
          );
        }

        wordTimingPhrases = repairedLyricTimingParse.wordTimingPhrases;
        lyricTimingText = repairedLyricTimingText;

        const repairedConversion = convertWordTimingPhrases(wordTimingPhrases);

        convertedLyricTimingPhrases = repairedConversion.convertedPhrases;
        wordTimingConversionErrors = repairedConversion.conversionErrors;
      }

      if (wordTimingConversionErrors.length > 0) {
        console.error(
          "Lyric word timing conversion remained invalid after 2 corrective repairs:",
          wordTimingConversionErrors,
        );

        return NextResponse.json(
          {
            error: `Lyric timing pass returned invalid word spans after 2 corrective repairs: ${wordTimingConversionErrors
              .slice(0, 3)
              .join(" | ")}`,
            validationErrors: wordTimingConversionErrors,
            raw: lyricTimingText,
          },
          { status: 500 },
        );
      }
    }

    let lyricTimingPlan = {
      phrases: convertedLyricTimingPhrases,
    };

    let lyricTimingPhrases = convertedLyricTimingPhrases;
    musicalTimingPlanRecord && Array.isArray(musicalTimingPlanRecord.sections)
      ? musicalTimingPlanRecord.sections
      : null;

    if (
      !lyricTimingPhrases ||
      !songSheetLinesForTiming ||
      !musicalTimingSections
    ) {
      return NextResponse.json(
        {
          error: "Lyric timing pass returned invalid timing data.",
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    const parseMeterBeats = (value: unknown) => {
      if (typeof value !== "string") {
        return null;
      }

      const match = value.trim().match(/^(\d+)\/(\d+)$/);

      if (!match) {
        return null;
      }

      const beats = Number(match[1]);

      return Number.isFinite(beats) && beats >= 1 ? beats : null;
    };

    const getActiveBeatsForBar = (
      sectionRecord: Record<string, unknown>,
      bar: number,
    ) => {
      let beats = parseMeterBeats(sectionRecord.timeSignature);

      if (beats === null) {
        return null;
      }

      const meterChanges = Array.isArray(sectionRecord.meterChanges)
        ? sectionRecord.meterChanges
        : [];

      const orderedChanges = meterChanges
        .flatMap(
          (
            change: unknown,
          ): Array<{
            bar: number;
            beats: number;
          }> => {
            if (
              !change ||
              typeof change !== "object" ||
              Array.isArray(change)
            ) {
              return [];
            }

            const changeRecord = change as Record<string, unknown>;

            const changeBar =
              typeof changeRecord.bar === "number" &&
              Number.isInteger(changeRecord.bar) &&
              changeRecord.bar >= 1
                ? changeRecord.bar
                : null;

            const changeBeats = parseMeterBeats(changeRecord.timeSignature);

            if (changeBar === null || changeBeats === null) {
              return [];
            }

            return [
              {
                bar: changeBar,
                beats: changeBeats,
              },
            ];
          },
        )
        .sort((a, b) => a.bar - b.bar);

      for (const change of orderedChanges) {
        if (change.bar > bar) {
          break;
        }

        beats = change.beats;
      }

      return beats;
    };

    const parseMeterForVocalDensity = (value: unknown) => {
      if (typeof value !== "string") {
        return null;
      }

      const match = value.trim().match(/^(\d+)\/(\d+)$/);

      if (!match) {
        return null;
      }

      const numerator = Number(match[1]);
      const denominator = Number(match[2]);

      if (
        !Number.isFinite(numerator) ||
        !Number.isFinite(denominator) ||
        numerator < 1 ||
        denominator < 1
      ) {
        return null;
      }

      return {
        numerator,
        denominator,
        quarterNotesPerBeat: 4 / denominator,
      };
    };

    const getActiveMeterForVocalDensity = (
      sectionRecord: Record<string, unknown>,
      bar: number,
    ) => {
      let meter = parseMeterForVocalDensity(sectionRecord.timeSignature);

      if (!meter) {
        return null;
      }

      const meterChanges = Array.isArray(sectionRecord.meterChanges)
        ? sectionRecord.meterChanges
        : [];

      const orderedChanges = meterChanges
        .flatMap(
          (
            change: unknown,
          ): Array<{
            bar: number;
            meter: {
              numerator: number;
              denominator: number;
              quarterNotesPerBeat: number;
            };
          }> => {
            if (
              !change ||
              typeof change !== "object" ||
              Array.isArray(change)
            ) {
              return [];
            }

            const changeRecord = change as Record<string, unknown>;

            const changeBar =
              typeof changeRecord.bar === "number" &&
              Number.isInteger(changeRecord.bar) &&
              changeRecord.bar >= 1
                ? changeRecord.bar
                : null;

            const changeMeter = parseMeterForVocalDensity(
              changeRecord.timeSignature,
            );

            if (changeBar === null || !changeMeter) {
              return [];
            }

            return [
              {
                bar: changeBar,
                meter: changeMeter,
              },
            ];
          },
        )
        .sort((a, b) => a.bar - b.bar);

      for (const change of orderedChanges) {
        if (change.bar > bar) {
          break;
        }

        meter = change.meter;
      }

      return meter;
    };

    const getQuarterNotePosition = ({
      sectionRecord,
      bars,
      bar,
      beat,
    }: {
      sectionRecord: Record<string, unknown>;
      bars: number;
      bar: number;
      beat: number;
    }) => {
      if (bar === bars + 1 && beat === 1) {
        let totalQuarterNotes = 0;

        for (let currentBar = 1; currentBar <= bars; currentBar += 1) {
          const meter = getActiveMeterForVocalDensity(
            sectionRecord,
            currentBar,
          );

          if (!meter) {
            return null;
          }

          totalQuarterNotes += meter.numerator * meter.quarterNotesPerBeat;
        }

        return totalQuarterNotes;
      }

      if (bar < 1 || bar > bars) {
        return null;
      }

      let quarterNotes = 0;

      for (let currentBar = 1; currentBar < bar; currentBar += 1) {
        const meter = getActiveMeterForVocalDensity(sectionRecord, currentBar);

        if (!meter) {
          return null;
        }

        quarterNotes += meter.numerator * meter.quarterNotesPerBeat;
      }

      const activeMeter = getActiveMeterForVocalDensity(sectionRecord, bar);

      if (!activeMeter) {
        return null;
      }

      quarterNotes += (beat - 1) * activeMeter.quarterNotesPerBeat;

      return quarterNotes;
    };

    const getMusicalPositionFromQuarterNotes = ({
      sectionRecord,
      bars,
      quarterNotes,
    }: {
      sectionRecord: Record<string, unknown>;
      bars: number;
      quarterNotes: number;
    }) => {
      if (!Number.isFinite(quarterNotes) || quarterNotes < 0) {
        return null;
      }

      let remainingQuarterNotes = quarterNotes;

      for (let currentBar = 1; currentBar <= bars; currentBar += 1) {
        const meter = getActiveMeterForVocalDensity(sectionRecord, currentBar);

        if (!meter) {
          return null;
        }

        const quarterNotesInBar = meter.numerator * meter.quarterNotesPerBeat;

        if (remainingQuarterNotes < quarterNotesInBar - 0.000001) {
          return {
            bar: currentBar,
            beat: Number(
              (1 + remainingQuarterNotes / meter.quarterNotesPerBeat).toFixed(
                6,
              ),
            ),
          };
        }

        remainingQuarterNotes -= quarterNotesInBar;

        if (Math.abs(remainingQuarterNotes) < 0.000001) {
          if (currentBar === bars) {
            return {
              bar: bars + 1,
              beat: 1,
            };
          }

          return {
            bar: currentBar + 1,
            beat: 1,
          };
        }
      }

      return null;
    };

    const MINIMUM_AVERAGE_SECONDS_PER_SUNG_WORD = 0.36;
    const SINGABLE_DENSITY_EPSILON_SECONDS = 1e-6;

    const lyricTimingCapacityDiagnostics = musicalTimingSections.flatMap(
      (
        timingSection: unknown,
        timingSectionIndex: number,
      ): Array<Record<string, unknown>> => {
        if (
          !timingSection ||
          typeof timingSection !== "object" ||
          Array.isArray(timingSection)
        ) {
          return [];
        }

        const timingSectionRecord = timingSection as Record<string, unknown>;

        const section =
          typeof timingSectionRecord.section === "string"
            ? timingSectionRecord.section
            : "";

        const bars =
          typeof timingSectionRecord.bars === "number" &&
          Number.isInteger(timingSectionRecord.bars) &&
          timingSectionRecord.bars >= 1
            ? timingSectionRecord.bars
            : null;

        if (!section || bars === null) {
          return [];
        }

        const sungWords = sungWordEntries.filter(
          (entry) => entry.sectionIndex === timingSectionIndex,
        );

        const availableQuarterNotes = getQuarterNotePosition({
          sectionRecord: timingSectionRecord,
          bars,
          bar: bars + 1,
          beat: 1,
        });

        const minimumRequiredSeconds =
          sungWords.length * MINIMUM_AVERAGE_SECONDS_PER_SUNG_WORD;

        const minimumRequiredQuarterNotes =
          tempoBpm !== null && tempoBpm > 0
            ? (minimumRequiredSeconds / 60) * tempoBpm
            : null;

        const headroomQuarterNotes =
          availableQuarterNotes !== null && minimumRequiredQuarterNotes !== null
            ? availableQuarterNotes - minimumRequiredQuarterNotes
            : null;

        const utilizationPercent =
          availableQuarterNotes !== null &&
          availableQuarterNotes > 0 &&
          minimumRequiredQuarterNotes !== null
            ? (minimumRequiredQuarterNotes / availableQuarterNotes) * 100
            : null;

        return [
          {
            timingSectionIndex,
            section,
            bars,
            sungWords: sungWords.length,
            availableQuarterNotes,
            minimumRequiredSeconds: Number(minimumRequiredSeconds.toFixed(2)),
            minimumRequiredQuarterNotes:
              minimumRequiredQuarterNotes !== null
                ? Number(minimumRequiredQuarterNotes.toFixed(2))
                : null,
            headroomQuarterNotes:
              headroomQuarterNotes !== null
                ? Number(headroomQuarterNotes.toFixed(2))
                : null,
            utilizationPercent:
              utilizationPercent !== null
                ? Number(utilizationPercent.toFixed(1))
                : null,
          },
        ];
      },
    );

    console.log("[chords] lyric-capacity", lyricTimingCapacityDiagnostics);

    const validateLyricTimingPhrases = (
      phrases: typeof lyricTimingPhrases,
      rawWordTimingPhrases: unknown[],
    ) => {
      const errors: string[] = [];

      let previousEndSourceLineIndex = -1;
      let previousEndCharIndex = -1;

      phrases.forEach((phrase, phraseIndex) => {
        if (!phrase || typeof phrase !== "object" || Array.isArray(phrase)) {
          errors.push(`Phrase ${phraseIndex + 1} is not an object.`);
          return;
        }

        const phraseRecord = phrase as Record<string, unknown>;

        const section =
          typeof phraseRecord.section === "string"
            ? phraseRecord.section.trim()
            : "";

        const sectionIndex =
          typeof phraseRecord.sectionIndex === "number" &&
          Number.isInteger(phraseRecord.sectionIndex)
            ? phraseRecord.sectionIndex
            : null;

        const startSourceLineIndex =
          typeof phraseRecord.startSourceLineIndex === "number" &&
          Number.isInteger(phraseRecord.startSourceLineIndex)
            ? phraseRecord.startSourceLineIndex
            : null;

        const endSourceLineIndex =
          typeof phraseRecord.endSourceLineIndex === "number" &&
          Number.isInteger(phraseRecord.endSourceLineIndex)
            ? phraseRecord.endSourceLineIndex
            : null;

        const startCharIndex =
          typeof phraseRecord.startCharIndex === "number" &&
          Number.isInteger(phraseRecord.startCharIndex)
            ? phraseRecord.startCharIndex
            : null;

        const endCharIndex =
          typeof phraseRecord.endCharIndex === "number" &&
          Number.isInteger(phraseRecord.endCharIndex)
            ? phraseRecord.endCharIndex
            : null;

        const startBar =
          typeof phraseRecord.startBar === "number" &&
          Number.isInteger(phraseRecord.startBar)
            ? phraseRecord.startBar
            : null;

        const startBeat =
          typeof phraseRecord.startBeat === "number" &&
          Number.isFinite(phraseRecord.startBeat)
            ? phraseRecord.startBeat
            : null;

        const endBar =
          typeof phraseRecord.endBar === "number" &&
          Number.isInteger(phraseRecord.endBar)
            ? phraseRecord.endBar
            : null;

        const endBeat =
          typeof phraseRecord.endBeat === "number" &&
          Number.isFinite(phraseRecord.endBeat)
            ? phraseRecord.endBeat
            : null;

        if (
          !section ||
          startSourceLineIndex === null ||
          endSourceLineIndex === null ||
          startCharIndex === null ||
          endCharIndex === null ||
          startBar === null ||
          startBeat === null ||
          endBar === null ||
          endBeat === null
        ) {
          errors.push(
            `Phrase ${phraseIndex + 1} has missing or invalid fields.`,
          );
          return;
        }

        if (
          startSourceLineIndex < 0 ||
          endSourceLineIndex < startSourceLineIndex ||
          endSourceLineIndex >= songSheetLinesForTiming.length
        ) {
          errors.push(
            `Phrase ${phraseIndex + 1} has an invalid source-line span.`,
          );
          return;
        }

        const startLine = songSheetLinesForTiming[startSourceLineIndex];
        const endLine = songSheetLinesForTiming[endSourceLineIndex];

        if (
          !startLine ||
          typeof startLine !== "object" ||
          Array.isArray(startLine) ||
          !endLine ||
          typeof endLine !== "object" ||
          Array.isArray(endLine)
        ) {
          errors.push(
            `Phrase ${phraseIndex + 1} refers to invalid songsheet rows.`,
          );
          return;
        }

        const startLineRecord = startLine as Record<string, unknown>;
        const endLineRecord = endLine as Record<string, unknown>;

        const startLyric =
          typeof startLineRecord.lyric === "string"
            ? startLineRecord.lyric
            : "";

        const endLyric =
          typeof endLineRecord.lyric === "string" ? endLineRecord.lyric : "";

        if (!startLyric.trim() || !endLyric.trim()) {
          errors.push(
            `Phrase ${phraseIndex + 1} starts or ends on an instrumental row.`,
          );
        }

        if (startCharIndex < 0 || startCharIndex >= startLyric.length) {
          errors.push(
            `Phrase ${phraseIndex + 1} has an invalid startCharIndex.`,
          );
        }

        if (endCharIndex <= 0 || endCharIndex > endLyric.length) {
          errors.push(
            `Phrase ${phraseIndex + 1} has an invalid exclusive endCharIndex.`,
          );
        }

        if (
          startSourceLineIndex === endSourceLineIndex &&
          endCharIndex <= startCharIndex
        ) {
          errors.push(
            `Phrase ${phraseIndex + 1} has an empty or reversed lyric span.`,
          );
        }

        for (
          let lineIndex = startSourceLineIndex;
          lineIndex <= endSourceLineIndex;
          lineIndex += 1
        ) {
          const line = songSheetLinesForTiming[lineIndex];

          if (!line || typeof line !== "object" || Array.isArray(line)) {
            errors.push(
              `Phrase ${phraseIndex + 1} contains an invalid songsheet row.`,
            );
            continue;
          }

          const lineRecord = line as Record<string, unknown>;

          const lineSection =
            typeof lineRecord.section === "string"
              ? lineRecord.section.trim()
              : "";

          const lineSectionIndex =
            typeof lineRecord.sectionIndex === "number" &&
            Number.isInteger(lineRecord.sectionIndex)
              ? lineRecord.sectionIndex
              : null;

          const lineLyric =
            typeof lineRecord.lyric === "string" ? lineRecord.lyric : "";

          if (!lineLyric.trim()) {
            errors.push(
              `Phrase ${phraseIndex + 1} crosses an instrumental row.`,
            );
          }

          if (lineSection !== section || lineSectionIndex !== sectionIndex) {
            errors.push(
              `Phrase ${phraseIndex + 1} crosses a section boundary.`,
            );
          }
        }

        const matchingTimingSections = musicalTimingSections.flatMap(
          (
            timingSection: unknown,
            timingSectionIndex: number,
          ): Array<Record<string, unknown>> => {
            if (
              !timingSection ||
              typeof timingSection !== "object" ||
              Array.isArray(timingSection)
            ) {
              return [];
            }

            const timingSectionRecord = timingSection as Record<
              string,
              unknown
            >;

            return timingSectionRecord.section === section
              ? [timingSectionRecord]
              : [];
          },
        );

        if (matchingTimingSections.length === 0) {
          errors.push(
            `Phrase ${phraseIndex + 1} refers to unknown section "${section}".`,
          );
        } else {
          const timingRangeIsValid = matchingTimingSections.some(
            (timingSectionRecord) => {
              const bars =
                typeof timingSectionRecord.bars === "number" &&
                Number.isInteger(timingSectionRecord.bars) &&
                timingSectionRecord.bars >= 1
                  ? timingSectionRecord.bars
                  : null;

              if (bars === null) {
                return false;
              }

              if (
                startBar < 1 ||
                startBar > bars ||
                endBar < startBar ||
                endBar > bars + 1
              ) {
                return false;
              }

              if (endBar === bars + 1 && endBeat !== 1) {
                return false;
              }

              const startBeatsInBar = getActiveBeatsForBar(
                timingSectionRecord,
                startBar,
              );

              if (
                startBeatsInBar === null ||
                startBeat < 1 ||
                startBeat >= startBeatsInBar + 1
              ) {
                return false;
              }

              if (endBar <= bars) {
                const endBeatsInBar = getActiveBeatsForBar(
                  timingSectionRecord,
                  endBar,
                );

                if (
                  endBeatsInBar === null ||
                  endBeat < 1 ||
                  endBeat >= endBeatsInBar + 1
                ) {
                  return false;
                }
              }

              if (startBar === endBar && endBeat <= startBeat) {
                return false;
              }

              return true;
            },
          );

          if (!timingRangeIsValid) {
            const firstMatchingTimingSection = matchingTimingSections[0];

            const sectionBars =
              firstMatchingTimingSection &&
              typeof firstMatchingTimingSection.bars === "number" &&
              Number.isInteger(firstMatchingTimingSection.bars)
                ? firstMatchingTimingSection.bars
                : null;

            const startBeatsInBar =
              firstMatchingTimingSection && sectionBars !== null
                ? getActiveBeatsForBar(firstMatchingTimingSection, startBar)
                : null;

            const endBeatsInBar =
              firstMatchingTimingSection &&
              sectionBars !== null &&
              endBar >= 1 &&
              endBar <= sectionBars
                ? getActiveBeatsForBar(firstMatchingTimingSection, endBar)
                : null;

            errors.push(
              `Phrase ${phraseIndex + 1} has invalid bar/beat timing for section "${section}": start bar ${startBar} beat ${startBeat}, end bar ${endBar} beat ${endBeat}, section bars ${
                sectionBars ?? "unknown"
              }, start-bar beats ${
                startBeatsInBar ?? "unknown"
              }, end-bar beats ${endBeatsInBar ?? "boundary/outside"}.`,
            );
          } else if (tempoBpm !== null && tempoBpm > 0) {
            const rawWordTimingPhrase = rawWordTimingPhrases[phraseIndex];

            const rawWordTimingPhraseRecord =
              rawWordTimingPhrase &&
              typeof rawWordTimingPhrase === "object" &&
              !Array.isArray(rawWordTimingPhrase)
                ? (rawWordTimingPhrase as Record<string, unknown>)
                : null;

            const startWordIndex =
              typeof rawWordTimingPhraseRecord?.startWordIndex === "number" &&
              Number.isInteger(rawWordTimingPhraseRecord.startWordIndex)
                ? rawWordTimingPhraseRecord.startWordIndex
                : null;

            const endWordIndexExclusive =
              typeof rawWordTimingPhraseRecord?.endWordIndexExclusive ===
                "number" &&
              Number.isInteger(rawWordTimingPhraseRecord.endWordIndexExclusive)
                ? rawWordTimingPhraseRecord.endWordIndexExclusive
                : null;

            const sungWordCount =
              startWordIndex !== null &&
              endWordIndexExclusive !== null &&
              endWordIndexExclusive > startWordIndex
                ? endWordIndexExclusive - startWordIndex
                : null;

            if (sungWordCount !== null) {
              let bestPhraseDurationSeconds = Number.NEGATIVE_INFINITY;
              let bestPhraseQuarterNotes = Number.NEGATIVE_INFINITY;
              const phraseHasSingableDensity = matchingTimingSections.some(
                (timingSectionRecord) => {
                  const bars =
                    typeof timingSectionRecord.bars === "number" &&
                    Number.isInteger(timingSectionRecord.bars) &&
                    timingSectionRecord.bars >= 1
                      ? timingSectionRecord.bars
                      : null;

                  if (bars === null) {
                    return false;
                  }

                  const phraseStartQuarterNotes = getQuarterNotePosition({
                    sectionRecord: timingSectionRecord,
                    bars,
                    bar: startBar,
                    beat: startBeat,
                  });

                  const phraseEndQuarterNotes = getQuarterNotePosition({
                    sectionRecord: timingSectionRecord,
                    bars,
                    bar: endBar,
                    beat: endBeat,
                  });

                  if (
                    phraseStartQuarterNotes === null ||
                    phraseEndQuarterNotes === null ||
                    phraseEndQuarterNotes <= phraseStartQuarterNotes
                  ) {
                    return false;
                  }

                  const phraseQuarterNotes =
                    phraseEndQuarterNotes - phraseStartQuarterNotes;

                  const phraseDurationSeconds =
                    (phraseQuarterNotes / tempoBpm) * 60;

                  if (phraseDurationSeconds > bestPhraseDurationSeconds) {
                    bestPhraseDurationSeconds = phraseDurationSeconds;
                    bestPhraseQuarterNotes = phraseQuarterNotes;
                  }

                  const averageSecondsPerWord =
                    phraseDurationSeconds / sungWordCount;

                  return (
                    averageSecondsPerWord + SINGABLE_DENSITY_EPSILON_SECONDS >=
                    MINIMUM_AVERAGE_SECONDS_PER_SUNG_WORD
                  );
                },
              );

              if (!phraseHasSingableDensity) {
                const requiredDurationSeconds =
                  sungWordCount * MINIMUM_AVERAGE_SECONDS_PER_SUNG_WORD;

                const requiredQuarterNotes =
                  (requiredDurationSeconds / 60) * tempoBpm;

                const hasMeasuredPhraseDuration =
                  Number.isFinite(bestPhraseDurationSeconds) &&
                  Number.isFinite(bestPhraseQuarterNotes);

                const actualDurationText = hasMeasuredPhraseDuration
                  ? `${bestPhraseDurationSeconds.toFixed(2)}s`
                  : "unknown";

                const actualQuarterNotesText = hasMeasuredPhraseDuration
                  ? bestPhraseQuarterNotes.toFixed(2)
                  : "unknown";

                const shortfallQuarterNotes = hasMeasuredPhraseDuration
                  ? Math.max(0, requiredQuarterNotes - bestPhraseQuarterNotes)
                  : null;

                errors.push(
                  `Phrase ${phraseIndex + 1} [${section}] is too compressed for ${sungWordCount} sung words at ${tempoBpm} BPM: actual ${actualQuarterNotesText} quarter notes / ${actualDurationText}; minimum ${requiredQuarterNotes.toFixed(
                    2,
                  )} quarter notes / ${requiredDurationSeconds.toFixed(
                    2,
                  )}s; shortfall ${
                    shortfallQuarterNotes !== null
                      ? `${shortfallQuarterNotes.toFixed(2)} quarter notes`
                      : "unknown"
                  }.`,
                );
              }
            }
          }
        }

        if (
          previousEndSourceLineIndex > startSourceLineIndex ||
          (previousEndSourceLineIndex === startSourceLineIndex &&
            previousEndCharIndex > startCharIndex)
        ) {
          errors.push(
            `Phrase ${phraseIndex + 1} overlaps or appears out of lyric order.`,
          );
        }

        previousEndSourceLineIndex = endSourceLineIndex;
        previousEndCharIndex = endCharIndex;
      });

      return errors;
    };

    let timingValidationErrors = validateLyricTimingPhrases(
      lyricTimingPhrases,
      wordTimingPhrases,
    );

    const lyricTimingAllocationDiagnostics = musicalTimingSections.flatMap(
      (
        timingSection: unknown,
        timingSectionIndex: number,
      ): Array<Record<string, unknown>> => {
        if (
          !timingSection ||
          typeof timingSection !== "object" ||
          Array.isArray(timingSection)
        ) {
          return [];
        }

        const timingSectionRecord = timingSection as Record<string, unknown>;

        const section =
          typeof timingSectionRecord.section === "string"
            ? timingSectionRecord.section
            : "";

        const bars =
          typeof timingSectionRecord.bars === "number" &&
          Number.isInteger(timingSectionRecord.bars) &&
          timingSectionRecord.bars >= 1
            ? timingSectionRecord.bars
            : null;

        if (!section || bars === null) {
          return [];
        }

        const availableQuarterNotes = getQuarterNotePosition({
          sectionRecord: timingSectionRecord,
          bars,
          bar: bars + 1,
          beat: 1,
        });

        if (availableQuarterNotes === null) {
          return [];
        }

        const sectionPhraseRows = lyricTimingPhrases.flatMap(
          (
            phrase: unknown,
            phraseIndex: number,
          ): Array<{
            phraseIndex: number;
            startQuarterNotes: number;
            endQuarterNotes: number;
            durationQuarterNotes: number;
          }> => {
            if (
              !phrase ||
              typeof phrase !== "object" ||
              Array.isArray(phrase)
            ) {
              return [];
            }

            const phraseRecord = phrase as Record<string, unknown>;

            if (
              phraseRecord.section !== section ||
              phraseRecord.sectionIndex !== timingSectionIndex
            ) {
              return [];
            }

            const startBar =
              typeof phraseRecord.startBar === "number" &&
              Number.isFinite(phraseRecord.startBar)
                ? phraseRecord.startBar
                : null;

            const startBeat =
              typeof phraseRecord.startBeat === "number" &&
              Number.isFinite(phraseRecord.startBeat)
                ? phraseRecord.startBeat
                : null;

            const endBar =
              typeof phraseRecord.endBar === "number" &&
              Number.isFinite(phraseRecord.endBar)
                ? phraseRecord.endBar
                : null;

            const endBeat =
              typeof phraseRecord.endBeat === "number" &&
              Number.isFinite(phraseRecord.endBeat)
                ? phraseRecord.endBeat
                : null;

            if (
              startBar === null ||
              startBeat === null ||
              endBar === null ||
              endBeat === null
            ) {
              return [];
            }

            const startQuarterNotes = getQuarterNotePosition({
              sectionRecord: timingSectionRecord,
              bars,
              bar: startBar,
              beat: startBeat,
            });

            const endQuarterNotes = getQuarterNotePosition({
              sectionRecord: timingSectionRecord,
              bars,
              bar: endBar,
              beat: endBeat,
            });

            if (
              startQuarterNotes === null ||
              endQuarterNotes === null ||
              endQuarterNotes <= startQuarterNotes
            ) {
              return [];
            }

            return [
              {
                phraseIndex,
                startQuarterNotes,
                endQuarterNotes,
                durationQuarterNotes: endQuarterNotes - startQuarterNotes,
              },
            ];
          },
        );

        if (sectionPhraseRows.length === 0) {
          return [
            {
              timingSectionIndex,
              section,
              availableQuarterNotes,
              phraseCount: 0,
              actualPhraseQuarterNotes: 0,
              leadingUnusedQuarterNotes: availableQuarterNotes,
              interPhraseGapQuarterNotes: 0,
              trailingUnusedQuarterNotes: 0,
            },
          ];
        }

        sectionPhraseRows.sort(
          (left, right) => left.startQuarterNotes - right.startQuarterNotes,
        );

        const actualPhraseQuarterNotes = sectionPhraseRows.reduce(
          (sum, phrase) => sum + phrase.durationQuarterNotes,
          0,
        );

        const leadingUnusedQuarterNotes = Math.max(
          0,
          sectionPhraseRows[0].startQuarterNotes,
        );

        let interPhraseGapQuarterNotes = 0;

        for (
          let phraseIndex = 1;
          phraseIndex < sectionPhraseRows.length;
          phraseIndex += 1
        ) {
          const previousPhrase = sectionPhraseRows[phraseIndex - 1];
          const currentPhrase = sectionPhraseRows[phraseIndex];

          interPhraseGapQuarterNotes += Math.max(
            0,
            currentPhrase.startQuarterNotes - previousPhrase.endQuarterNotes,
          );
        }

        const trailingUnusedQuarterNotes = Math.max(
          0,
          availableQuarterNotes -
            sectionPhraseRows[sectionPhraseRows.length - 1].endQuarterNotes,
        );

        const sungWords = sungWordEntries.filter(
          (entry) => entry.sectionIndex === timingSectionIndex,
        ).length;

        const minimumRequiredQuarterNotes =
          tempoBpm !== null && tempoBpm > 0
            ? ((sungWords * MINIMUM_AVERAGE_SECONDS_PER_SUNG_WORD) / 60) *
              tempoBpm
            : null;

        return [
          {
            timingSectionIndex,
            section,
            phraseCount: sectionPhraseRows.length,
            sungWords,
            availableQuarterNotes: Number(availableQuarterNotes.toFixed(2)),
            actualPhraseQuarterNotes: Number(
              actualPhraseQuarterNotes.toFixed(2),
            ),
            minimumRequiredQuarterNotes:
              minimumRequiredQuarterNotes !== null
                ? Number(minimumRequiredQuarterNotes.toFixed(2))
                : null,
            leadingUnusedQuarterNotes: Number(
              leadingUnusedQuarterNotes.toFixed(2),
            ),
            interPhraseGapQuarterNotes: Number(
              interPhraseGapQuarterNotes.toFixed(2),
            ),
            trailingUnusedQuarterNotes: Number(
              trailingUnusedQuarterNotes.toFixed(2),
            ),
          },
        ];
      },
    );

    console.log("[chords] lyric-allocation", lyricTimingAllocationDiagnostics);

    if (
      timingValidationErrors.length > 0 &&
      timingValidationErrors.every((error) =>
        error.includes("is too compressed for"),
      ) &&
      tempoBpm !== null &&
      tempoBpm > 0
    ) {
      const repairedConvertedPhrases = convertedLyricTimingPhrases.map(
        (phrase) => ({ ...phrase }),
      );

      const deterministicRepairDiagnostics: Array<Record<string, unknown>> = [];

      musicalTimingSections.forEach(
        (timingSection: unknown, timingSectionIndex: number) => {
          if (
            !timingSection ||
            typeof timingSection !== "object" ||
            Array.isArray(timingSection)
          ) {
            return;
          }

          const timingSectionRecord = timingSection as Record<string, unknown>;

          const section =
            typeof timingSectionRecord.section === "string"
              ? timingSectionRecord.section
              : "";

          const bars =
            typeof timingSectionRecord.bars === "number" &&
            Number.isInteger(timingSectionRecord.bars) &&
            timingSectionRecord.bars >= 1
              ? timingSectionRecord.bars
              : null;

          if (!section || bars === null) {
            return;
          }

          const availableQuarterNotes = getQuarterNotePosition({
            sectionRecord: timingSectionRecord,
            bars,
            bar: bars + 1,
            beat: 1,
          });

          if (availableQuarterNotes === null) {
            return;
          }

          const sectionPhrases = repairedConvertedPhrases.flatMap(
            (
              phrase,
              phraseIndex,
            ): Array<{
              phraseIndex: number;
              startQuarterNotes: number;
              endQuarterNotes: number;
              currentDurationQuarterNotes: number;
              requiredDurationQuarterNotes: number;
              targetDurationQuarterNotes: number;
            }> => {
              if (
                !phrase ||
                phrase.section !== section ||
                phrase.sectionIndex !== timingSectionIndex
              ) {
                return [];
              }

              const rawPhrase = wordTimingPhrases[phraseIndex];

              if (
                !rawPhrase ||
                typeof rawPhrase !== "object" ||
                Array.isArray(rawPhrase)
              ) {
                return [];
              }

              const rawPhraseRecord = rawPhrase as Record<string, unknown>;

              const startWordIndex =
                typeof rawPhraseRecord.startWordIndex === "number" &&
                Number.isInteger(rawPhraseRecord.startWordIndex)
                  ? rawPhraseRecord.startWordIndex
                  : null;

              const endWordIndexExclusive =
                typeof rawPhraseRecord.endWordIndexExclusive === "number" &&
                Number.isInteger(rawPhraseRecord.endWordIndexExclusive)
                  ? rawPhraseRecord.endWordIndexExclusive
                  : null;

              if (
                startWordIndex === null ||
                endWordIndexExclusive === null ||
                endWordIndexExclusive <= startWordIndex
              ) {
                return [];
              }

              const startQuarterNotes = getQuarterNotePosition({
                sectionRecord: timingSectionRecord,
                bars,
                bar: phrase.startBar,
                beat: phrase.startBeat,
              });

              const endQuarterNotes = getQuarterNotePosition({
                sectionRecord: timingSectionRecord,
                bars,
                bar: phrase.endBar,
                beat: phrase.endBeat,
              });

              if (
                startQuarterNotes === null ||
                endQuarterNotes === null ||
                endQuarterNotes <= startQuarterNotes
              ) {
                return [];
              }

              const sungWordCount = endWordIndexExclusive - startWordIndex;

              const requiredDurationSeconds =
                sungWordCount * MINIMUM_AVERAGE_SECONDS_PER_SUNG_WORD;

              const requiredDurationQuarterNotes =
                (requiredDurationSeconds / 60) * tempoBpm;

              const currentDurationQuarterNotes =
                endQuarterNotes - startQuarterNotes;

              return [
                {
                  phraseIndex,
                  startQuarterNotes,
                  endQuarterNotes,
                  currentDurationQuarterNotes,
                  requiredDurationQuarterNotes,
                  targetDurationQuarterNotes: Math.max(
                    currentDurationQuarterNotes,
                    requiredDurationQuarterNotes,
                  ),
                },
              ];
            },
          );

          if (sectionPhrases.length === 0) {
            return;
          }

          sectionPhrases.sort(
            (left, right) => left.startQuarterNotes - right.startQuarterNotes,
          );

          const hasCompressedPhrase = sectionPhrases.some(
            (phrase) =>
              phrase.currentDurationQuarterNotes + 0.000001 <
              phrase.requiredDurationQuarterNotes,
          );

          if (!hasCompressedPhrase) {
            return;
          }

          const totalTargetPhraseQuarterNotes = sectionPhrases.reduce(
            (sum, phrase) => sum + phrase.targetDurationQuarterNotes,
            0,
          );

          const remainingGapQuarterNotes =
            availableQuarterNotes - totalTargetPhraseQuarterNotes;

          if (remainingGapQuarterNotes < -0.000001) {
            deterministicRepairDiagnostics.push({
              section,
              status: "insufficient-capacity",
              availableQuarterNotes: Number(availableQuarterNotes.toFixed(2)),
              targetPhraseQuarterNotes: Number(
                totalTargetPhraseQuarterNotes.toFixed(2),
              ),
            });

            return;
          }

          const originalLeadingGap = Math.max(
            0,
            sectionPhrases[0].startQuarterNotes,
          );

          const originalInterPhraseGaps = sectionPhrases
            .slice(1)
            .map((phrase, phraseOffset) =>
              Math.max(
                0,
                phrase.startQuarterNotes -
                  sectionPhrases[phraseOffset].endQuarterNotes,
              ),
            );

          const originalTrailingGap = Math.max(
            0,
            availableQuarterNotes -
              sectionPhrases[sectionPhrases.length - 1].endQuarterNotes,
          );

          const originalGapQuarterNotes =
            originalLeadingGap +
            originalInterPhraseGaps.reduce((sum, gap) => sum + gap, 0) +
            originalTrailingGap;

          const gapScale =
            originalGapQuarterNotes > 0
              ? Math.min(1, remainingGapQuarterNotes / originalGapQuarterNotes)
              : 0;

          let cursorQuarterNotes = originalLeadingGap * gapScale;

          sectionPhrases.forEach((phrase, sectionPhraseIndex) => {
            const repairedStartQuarterNotes = cursorQuarterNotes;
            const repairedEndQuarterNotes =
              repairedStartQuarterNotes + phrase.targetDurationQuarterNotes;

            const repairedStart = getMusicalPositionFromQuarterNotes({
              sectionRecord: timingSectionRecord,
              bars,
              quarterNotes: repairedStartQuarterNotes,
            });

            const repairedEnd = getMusicalPositionFromQuarterNotes({
              sectionRecord: timingSectionRecord,
              bars,
              quarterNotes: repairedEndQuarterNotes,
            });

            if (!repairedStart || !repairedEnd) {
              return;
            }

            repairedConvertedPhrases[phrase.phraseIndex] = {
              ...repairedConvertedPhrases[phrase.phraseIndex],
              startBar: repairedStart.bar,
              startBeat: repairedStart.beat,
              endBar: repairedEnd.bar,
              endBeat: repairedEnd.beat,
            };

            cursorQuarterNotes = repairedEndQuarterNotes;

            if (sectionPhraseIndex < originalInterPhraseGaps.length) {
              cursorQuarterNotes +=
                originalInterPhraseGaps[sectionPhraseIndex] * gapScale;
            }
          });

          deterministicRepairDiagnostics.push({
            section,
            status: "redistributed",
            availableQuarterNotes: Number(availableQuarterNotes.toFixed(2)),
            originalGapQuarterNotes: Number(originalGapQuarterNotes.toFixed(2)),
            remainingGapQuarterNotes: Number(
              remainingGapQuarterNotes.toFixed(2),
            ),
            gapScale: Number(gapScale.toFixed(4)),
          });
        },
      );

      convertedLyricTimingPhrases = repairedConvertedPhrases;
      lyricTimingPhrases = convertedLyricTimingPhrases;
      lyricTimingPlan = {
        phrases: convertedLyricTimingPhrases,
      };

      timingValidationErrors = validateLyricTimingPhrases(
        lyricTimingPhrases,
        wordTimingPhrases,
      );

      console.log("[chords] deterministic lyric compression repair", {
        sections: deterministicRepairDiagnostics,
        remainingValidationErrors: timingValidationErrors,
      });
    }

    if (timingValidationErrors.length > 0) {
      for (
        let repairAttempt = 1;
        repairAttempt <= 2 && timingValidationErrors.length > 0;
        repairAttempt += 1
      ) {
        console.warn(
          `Lyric timing validation failed; requesting corrective repair ${repairAttempt} of 2:`,
          timingValidationErrors,
        );

        const lyricTimingRepairContext =
          repairAttempt === 1
            ? lyricTimingPrompt
            : `
You are performing a second, narrowly targeted correction of an existing vocal wordTimingPlan.

Do not redesign the song or reconsider the phrase structure.

Tempo:
${tempoBpm !== null ? `${tempoBpm} BPM` : "Not supplied"}

Authoritative musicalTimingPlan:
${JSON.stringify(chordDataRecord.musicalTimingPlan, null, 2)}

The complete current wordTimingPlan is supplied below.
Its phrase count, phrase order, sections, and word spans are already established.
Only repair the remaining deterministic validation errors.
`.trim();

        const lyricTimingRepairPrompt = `
${lyricTimingRepairContext}

The previous lyric-timing attempt failed deterministic validation.

You must repair the timing rather than redesign the song.

Previous attempt:
${lyricTimingText}

Validation errors:
${timingValidationErrors.map((error) => `- ${error}`).join("\n")}

Repair requirements:
- Return a complete replacement wordTimingPlan, not a partial patch.
- Preserve the exact number of phrases from the previous attempt.
- Preserve the exact phrase order from the previous attempt.
- Preserve each phrase's section exactly.
- Normally preserve each phrase's startWordIndex and endWordIndexExclusive exactly.
- If, and only if, a validation error explicitly says that a phrase overlaps or appears out of lyric order, you may adjust the word-span boundary of that phrase and its immediately adjacent phrase as little as necessary to restore ascending, non-overlapping lyric order.
- Do NOT merge phrases.
- Do NOT split phrases.
- Do NOT move words between phrases except when required to correct an explicitly reported overlap or lyric-order error.
- Preserve complete lyric coverage: do not omit, duplicate, or reorder sung words.
- Repair startBar, startBeat, endBar, and endBeat as needed to correct timing-validation errors.
- Preserve all supplied song structure and timing context exactly. Do not alter lyrics, word order, word indexes, section labels, musicalTimingPlan, section lengths, or meter.
- Correct every validation error listed above.
- Give compressed phrases enough musical duration for their sung words at the supplied tempo.
- Redistribute surrounding phrase timing when necessary rather than merely moving the problem into the next phrase.
- Keep every phrase inside its existing section.
- Preserve natural vocal phrasing, breathing room, and musical continuity.
- Do not create overlapping phrases.
- Inspect the entire repaired plan before returning it so later phrases do not become progressively compressed.

Return ONLY valid JSON in the same wordTimingPlan shape requested above.
`.trim();

        const repairedLyricTimingText = await requestLyricTiming(
          lyricTimingRepairPrompt,
          `lyric-timing-repair-${repairAttempt}`,
        );

        const repairedLyricTimingParse = parseLyricTimingResponse(
          repairedLyricTimingText,
        );

        if (!repairedLyricTimingParse.ok) {
          return NextResponse.json(
            {
              error: repairedLyricTimingParse.error,
              raw: repairedLyricTimingText,
            },
            { status: 500 },
          );
        }

        wordTimingPhrases = repairedLyricTimingParse.wordTimingPhrases;
        lyricTimingText = repairedLyricTimingText;

        const repairedConversion = convertWordTimingPhrases(wordTimingPhrases);

        convertedLyricTimingPhrases = repairedConversion.convertedPhrases;
        wordTimingConversionErrors = repairedConversion.conversionErrors;

        if (wordTimingConversionErrors.length > 0) {
          console.error(
            `Lyric timing repair ${repairAttempt} word-span conversion failed:`,
            wordTimingConversionErrors,
          );

          return NextResponse.json(
            {
              error: `Lyric timing repair ${repairAttempt} returned invalid word spans: ${wordTimingConversionErrors
                .slice(0, 3)
                .join(" | ")}`,
              validationErrors: wordTimingConversionErrors,
              raw: lyricTimingText,
            },
            { status: 500 },
          );
        }

        lyricTimingPlan = {
          phrases: convertedLyricTimingPhrases,
        };

        lyricTimingPhrases = convertedLyricTimingPhrases;

        timingValidationErrors = validateLyricTimingPhrases(
          lyricTimingPhrases,
          wordTimingPhrases,
        );

        if (timingValidationErrors.length === 0) {
          console.log(
            `Lyric timing repair ${repairAttempt} passed validation.`,
          );
        } else {
          console.warn(
            `Lyric timing repair ${repairAttempt} still has validation errors:`,
            timingValidationErrors,
          );
        }
      }

      if (timingValidationErrors.length > 0) {
        console.error(
          "Lyric timing remained invalid after 2 corrective repairs:",
          timingValidationErrors,
        );

        return NextResponse.json(
          {
            error: `Lyric timing remained invalid after 2 corrective repairs: ${timingValidationErrors
              .slice(0, 3)
              .join(" | ")}`,
            validationErrors: timingValidationErrors,
            raw: lyricTimingText,
          },
          { status: 500 },
        );
      }
    }

    const confirmedPhraseWordRanges = wordTimingPhrases.flatMap(
      (
        rawPhrase: unknown,
        phraseIndex,
      ): Array<{
        phraseIndex: number;
        section: string;
        sectionIndex: number;
        startWordIndex: number;
        endWordIndexExclusive: number;
        startBar: number;
        startBeat: number;
        endBar: number;
        endBeat: number;
      }> => {
        if (
          !rawPhrase ||
          typeof rawPhrase !== "object" ||
          Array.isArray(rawPhrase)
        ) {
          return [];
        }

        const rawPhraseRecord = rawPhrase as Record<string, unknown>;
        const convertedPhrase = convertedLyricTimingPhrases[phraseIndex];

        if (!convertedPhrase) {
          return [];
        }

        const startWordIndex =
          typeof rawPhraseRecord.startWordIndex === "number" &&
          Number.isInteger(rawPhraseRecord.startWordIndex)
            ? rawPhraseRecord.startWordIndex
            : null;

        const endWordIndexExclusive =
          typeof rawPhraseRecord.endWordIndexExclusive === "number" &&
          Number.isInteger(rawPhraseRecord.endWordIndexExclusive)
            ? rawPhraseRecord.endWordIndexExclusive
            : null;

        if (
          startWordIndex === null ||
          endWordIndexExclusive === null ||
          startWordIndex < 0 ||
          endWordIndexExclusive <= startWordIndex ||
          endWordIndexExclusive > sungWordEntries.length
        ) {
          return [];
        }

        return [
          {
            phraseIndex,
            section: convertedPhrase.section,
            sectionIndex: convertedPhrase.sectionIndex,
            startWordIndex,
            endWordIndexExclusive,
            startBar: convertedPhrase.startBar,
            startBeat: convertedPhrase.startBeat,
            endBar: convertedPhrase.endBar,
            endBeat: convertedPhrase.endBeat,
          },
        ];
      },
    );

    if (
      confirmedPhraseWordRanges.length !== convertedLyricTimingPhrases.length
    ) {
      return NextResponse.json(
        {
          error:
            "Could not construct confirmed phrase word ranges for word-rhythm generation.",
        },
        { status: 500 },
      );
    }

    generationCheckpoint = {
      ...(generationCheckpoint ?? chordDataRecord),
      lyricTimingPlan,
      resumeWordTimingPhrases: confirmedPhraseWordRanges.map((phrase) => ({
        section: phrase.section,
        sectionIndex: phrase.sectionIndex,
        startWordIndex: phrase.startWordIndex,
        endWordIndexExclusive: phrase.endWordIndexExclusive,
        startBar: phrase.startBar,
        startBeat: phrase.startBeat,
        endBar: phrase.endBar,
        endBeat: phrase.endBeat,
      })),
    };

    const phraseWordRhythmContext = confirmedPhraseWordRanges.map((phrase) => ({
      phraseIndex: phrase.phraseIndex,
      section: phrase.section,
      startWordIndex: phrase.startWordIndex,
      endWordIndexExclusive: phrase.endWordIndexExclusive,
      startBar: phrase.startBar,
      startBeat: phrase.startBeat,
      endBar: phrase.endBar,
      endBeat: phrase.endBeat,
      words: sungWordEntries
        .slice(phrase.startWordIndex, phrase.endWordIndexExclusive)
        .map((word) => ({
          wordIndex: word.wordIndex,
          word: word.word,
        })),
    }));

    const wordRhythmPrompt = `
You are determining the sung rhythm of individual lyric words inside vocal phrases that have already been approved.

Do NOT change the lyrics.
Do NOT change word order.
Do NOT change phrase boundaries.
Do NOT change phrase start or end positions.
Do NOT change chord names, harmony, musicalTimingPlan, section lengths, or meter.

The vocal phrase structure is already authoritative.

Your only task is to decide where each word begins and ends musically inside its confirmed phrase.

Current performance tempo:
${tempoBpm !== null ? `${tempoBpm} BPM` : "Not supplied"}

Confirmed vocal phrases and their words:
${JSON.stringify(phraseWordRhythmContext, null, 2)}

Existing musical context:
${JSON.stringify(lyricTimingMusicalContext, null, 2)}

Return ONLY valid JSON using this exact shape:

{
  "wordRhythmPlan": {
    "words": [
      {
        "phraseIndex": 0,
        "wordIndex": 0,
        "startBar": 1,
        "startBeat": 1.5,
        "endBar": 1,
        "endBeat": 2
      },
      {
        "phraseIndex": 0,
        "wordIndex": 1,
        "startBar": 1,
        "startBeat": 2,
        "endBar": 1,
        "endBeat": 2.75
      }
    ]
  }
}

Requirements:

- Return exactly one timing entry for every word listed in the confirmed phrases.
- Use the supplied wordIndex exactly.
- Use the supplied phraseIndex exactly.
- Do not invent, omit, duplicate, reorder, merge, or split words.
- Every word must remain inside its confirmed phrase.
- Word timing must remain in lyric order.
- A word's end may equal the next word's start, but words must not overlap.
- Musical space between words is allowed when natural.
- The first word may start exactly at the phrase start or later.
- The final word may end exactly at the phrase end or earlier.
- Never place a word before its phrase start.
- Never place a word after its phrase end.

Rhythmic decisions should reflect how a singer would actually deliver the lyric:
- natural language stress
- syllabic density
- pickups and anticipations
- syncopation
- repeated-word emphasis
- punctuation as expressive context rather than a mechanical timing rule
- held or emphasized words
- compressed runs of lighter words
- intentional rests and breathing space
- section character and vocal delivery
- melodic continuity

Do not divide a phrase evenly by word count.
Do not assign identical durations merely because words have similar lengths.
Do not use lexical word length as the primary timing rule.
Do not automatically stretch only the final word.
Do not force every word onto a main beat.
Do not force every word boundary onto a chord change.

musicalTimingPlan is authoritative for meter and bar structure.
harmonicTimeline is authoritative for harmonic context.

Bar and beat values are musical coordinates, not elapsed seconds.

A word ending at the boundary after a final section bar may use bar N+1 beat 1 only when its containing phrase already permits that boundary.

Return wordRhythmPlan only.
`.trim();

    const wordRhythmController = new AbortController();
    const wordRhythmStartedAt = Date.now();
    let wordRhythmLocalTimeoutTriggered = false;

    console.log("[chords] word-rhythm started", {
      promptChars: wordRhythmPrompt.length,
    });

    const wordRhythmTimeoutId = setTimeout(() => {
      wordRhythmLocalTimeoutTriggered = true;
      wordRhythmController.abort();
    }, CHORD_GENERATION_TIMEOUT_MS);

    let wordRhythmCompletion;

    try {
      wordRhythmCompletion = await openai.chat.completions.create(
        {
          model: "gpt-5",
          messages: [{ role: "user", content: wordRhythmPrompt }],
        },
        {
          signal: wordRhythmController.signal,
        },
      );

      console.log("[chords] word-rhythm completed", {
        elapsedMs: Date.now() - wordRhythmStartedAt,
      });
    } catch (error) {
      if (wordRhythmLocalTimeoutTriggered) {
        console.error("[chords] word-rhythm hit local timeout", {
          elapsedMs: Date.now() - wordRhythmStartedAt,
          promptChars: wordRhythmPrompt.length,
        });

        throw new Error(
          `Word-rhythm generation timed out after ${
            CHORD_GENERATION_TIMEOUT_MS / 60_000
          } minutes.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(wordRhythmTimeoutId);
    }

    const wordRhythmText =
      wordRhythmCompletion.choices[0].message.content || "{}";

    let wordRhythmResult;

    try {
      wordRhythmResult = parseModelJson(wordRhythmText);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid word-rhythm JSON from model",
          raw: wordRhythmText,
          resumeChordData: generationCheckpoint,
        },
        { status: 500 },
      );
    }

    const wordRhythmRecord =
      wordRhythmResult &&
      typeof wordRhythmResult === "object" &&
      !Array.isArray(wordRhythmResult)
        ? (wordRhythmResult as Record<string, unknown>)
        : null;

    const wordRhythmPlan =
      wordRhythmRecord &&
      wordRhythmRecord.wordRhythmPlan &&
      typeof wordRhythmRecord.wordRhythmPlan === "object" &&
      !Array.isArray(wordRhythmRecord.wordRhythmPlan)
        ? (wordRhythmRecord.wordRhythmPlan as Record<string, unknown>)
        : null;

    const wordRhythmWords =
      wordRhythmPlan && Array.isArray(wordRhythmPlan.words)
        ? wordRhythmPlan.words
        : null;

    if (!wordRhythmWords) {
      return NextResponse.json(
        {
          error: "Word-rhythm pass returned invalid timing data.",
          raw: wordRhythmText,
          resumeChordData: generationCheckpoint,
        },
        { status: 500 },
      );
    }

    const compareMusicalPositions = (
      leftBar: number,
      leftBeat: number,
      rightBar: number,
      rightBeat: number,
    ) => {
      if (leftBar !== rightBar) {
        return leftBar - rightBar;
      }

      return leftBeat - rightBeat;
    };

    const expectedWordRhythmEntries = new Map<
      number,
      {
        phraseIndex: number;
        section: string;
        sectionIndex: number;
        phraseStartBar: number;
        phraseStartBeat: number;
        phraseEndBar: number;
        phraseEndBeat: number;
      }
    >();

    confirmedPhraseWordRanges.forEach((phrase) => {
      for (
        let wordIndex = phrase.startWordIndex;
        wordIndex < phrase.endWordIndexExclusive;
        wordIndex += 1
      ) {
        expectedWordRhythmEntries.set(wordIndex, {
          phraseIndex: phrase.phraseIndex,
          section: phrase.section,
          sectionIndex: phrase.sectionIndex,
          phraseStartBar: phrase.startBar,
          phraseStartBeat: phrase.startBeat,
          phraseEndBar: phrase.endBar,
          phraseEndBeat: phrase.endBeat,
        });
      }
    });

    const wordRhythmValidationErrors: string[] = [];
    const seenWordRhythmIndexes = new Set<number>();

    let previousWordEndBar: number | null = null;
    let previousWordEndBeat: number | null = null;
    let previousWordPhraseIndex: number | null = null;

    const validatedWordRhythmWords = wordRhythmWords.flatMap(
      (
        rawWord: unknown,
        resultIndex,
      ): Array<{
        phraseIndex: number;
        wordIndex: number;
        word: string;
        section: string;
        startBar: number;
        startBeat: number;
        endBar: number;
        endBeat: number;
      }> => {
        if (!rawWord || typeof rawWord !== "object" || Array.isArray(rawWord)) {
          wordRhythmValidationErrors.push(
            `Word rhythm entry ${resultIndex + 1} is not an object.`,
          );
          return [];
        }

        const wordRecord = rawWord as Record<string, unknown>;

        const phraseIndex =
          typeof wordRecord.phraseIndex === "number" &&
          Number.isInteger(wordRecord.phraseIndex)
            ? wordRecord.phraseIndex
            : null;

        const wordIndex =
          typeof wordRecord.wordIndex === "number" &&
          Number.isInteger(wordRecord.wordIndex)
            ? wordRecord.wordIndex
            : null;

        let startBar =
          typeof wordRecord.startBar === "number" &&
          Number.isInteger(wordRecord.startBar)
            ? wordRecord.startBar
            : null;

        let startBeat =
          typeof wordRecord.startBeat === "number" &&
          Number.isFinite(wordRecord.startBeat)
            ? wordRecord.startBeat
            : null;

        const endBar =
          typeof wordRecord.endBar === "number" &&
          Number.isInteger(wordRecord.endBar)
            ? wordRecord.endBar
            : null;

        const endBeat =
          typeof wordRecord.endBeat === "number" &&
          Number.isFinite(wordRecord.endBeat)
            ? wordRecord.endBeat
            : null;

        if (
          phraseIndex === null ||
          wordIndex === null ||
          startBar === null ||
          startBeat === null ||
          endBar === null ||
          endBeat === null
        ) {
          wordRhythmValidationErrors.push(
            `Word rhythm entry ${resultIndex + 1} has missing or invalid fields.`,
          );
          return [];
        }

        const expected = expectedWordRhythmEntries.get(wordIndex);
        const sourceWord = sungWordEntries[wordIndex];

        if (!expected || !sourceWord) {
          wordRhythmValidationErrors.push(
            `Word rhythm entry ${resultIndex + 1} refers to unknown wordIndex ${wordIndex}.`,
          );
          return [];
        }

        if (seenWordRhythmIndexes.has(wordIndex)) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} appears more than once in wordRhythmPlan.`,
          );
          return [];
        }

        seenWordRhythmIndexes.add(wordIndex);

        if (phraseIndex !== expected.phraseIndex) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} was assigned to the wrong phrase.`,
          );
        }

        if (
          sourceWord.section !== expected.section ||
          sourceWord.sectionIndex !== expected.sectionIndex
        ) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} does not belong to the expected section instance "${expected.section}".`,
          );
        }

        if (
          compareMusicalPositions(startBar, startBeat, endBar, endBeat) >= 0
        ) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} has an empty or reversed musical span.`,
          );
        }

        if (
          compareMusicalPositions(
            startBar,
            startBeat,
            expected.phraseStartBar,
            expected.phraseStartBeat,
          ) < 0
        ) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} starts before its confirmed phrase.`,
          );
        }

        if (
          compareMusicalPositions(
            endBar,
            endBeat,
            expected.phraseEndBar,
            expected.phraseEndBeat,
          ) > 0
        ) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} ends after its confirmed phrase.`,
          );
        }

        if (
          previousWordEndBar !== null &&
          previousWordEndBeat !== null &&
          previousWordPhraseIndex === phraseIndex &&
          compareMusicalPositions(
            startBar,
            startBeat,
            previousWordEndBar,
            previousWordEndBeat,
          ) < 0
        ) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} overlaps the previous word in its phrase.`,
          );
        }

        if (
          previousWordEndBar !== null &&
          previousWordEndBeat !== null &&
          previousWordPhraseIndex === phraseIndex
        ) {
          const matchingTimingSection = musicalTimingSections.find(
            (timingSection: unknown, timingSectionIndex: number) => {
              if (
                !timingSection ||
                typeof timingSection !== "object" ||
                Array.isArray(timingSection)
              ) {
                return false;
              }

              return (
                timingSectionIndex === expected.sectionIndex &&
                (timingSection as Record<string, unknown>).section ===
                  expected.section
              );
            },
          );

          if (
            matchingTimingSection &&
            typeof matchingTimingSection === "object" &&
            !Array.isArray(matchingTimingSection)
          ) {
            const timingSectionRecord = matchingTimingSection as Record<
              string,
              unknown
            >;

            const bars =
              typeof timingSectionRecord.bars === "number" &&
              Number.isInteger(timingSectionRecord.bars) &&
              timingSectionRecord.bars >= 1
                ? timingSectionRecord.bars
                : null;

            if (bars !== null) {
              const previousEndQuarterNotes = getQuarterNotePosition({
                sectionRecord: timingSectionRecord,
                bars,
                bar: previousWordEndBar,
                beat: previousWordEndBeat,
              });

              const currentStartQuarterNotes = getQuarterNotePosition({
                sectionRecord: timingSectionRecord,
                bars,
                bar: startBar,
                beat: startBeat,
              });

              if (
                previousEndQuarterNotes !== null &&
                currentStartQuarterNotes !== null
              ) {
                const internalGapQuarterNotes =
                  currentStartQuarterNotes - previousEndQuarterNotes;

                if (internalGapQuarterNotes > 1.001) {
                  const repairedStartPosition =
                    getMusicalPositionFromQuarterNotes({
                      sectionRecord: timingSectionRecord,
                      bars,
                      quarterNotes: previousEndQuarterNotes + 1,
                    });

                  if (
                    repairedStartPosition &&
                    compareMusicalPositions(
                      repairedStartPosition.bar,
                      repairedStartPosition.beat,
                      expected.phraseStartBar,
                      expected.phraseStartBeat,
                    ) >= 0 &&
                    compareMusicalPositions(
                      repairedStartPosition.bar,
                      repairedStartPosition.beat,
                      endBar,
                      endBeat,
                    ) < 0
                  ) {
                    startBar = repairedStartPosition.bar;
                    startBeat = repairedStartPosition.beat;
                  }
                }
              }
            }
          }
        }

        const matchingTimingSections = musicalTimingSections.flatMap(
          (
            timingSection: unknown,
            timingSectionIndex: number,
          ): Array<Record<string, unknown>> => {
            if (
              !timingSection ||
              typeof timingSection !== "object" ||
              Array.isArray(timingSection)
            ) {
              return [];
            }

            const timingSectionRecord = timingSection as Record<
              string,
              unknown
            >;

            return timingSectionIndex === expected.sectionIndex &&
              timingSectionRecord.section === expected.section
              ? [timingSectionRecord]
              : [];
          },
        );

        const musicalPositionIsValid = matchingTimingSections.some(
          (timingSectionRecord) => {
            const bars =
              typeof timingSectionRecord.bars === "number" &&
              Number.isInteger(timingSectionRecord.bars) &&
              timingSectionRecord.bars >= 1
                ? timingSectionRecord.bars
                : null;

            if (bars === null) {
              return false;
            }

            const positionIsValid = (bar: number, beat: number) => {
              if (bar === bars + 1) {
                return beat === 1;
              }

              if (bar < 1 || bar > bars) {
                return false;
              }

              const beatsInBar = getActiveBeatsForBar(timingSectionRecord, bar);

              return beatsInBar !== null && beat >= 1 && beat < beatsInBar + 1;
            };

            return (
              positionIsValid(startBar, startBeat) &&
              positionIsValid(endBar, endBeat)
            );
          },
        );

        if (!musicalPositionIsValid) {
          wordRhythmValidationErrors.push(
            `wordIndex ${wordIndex} has invalid bar/beat coordinates for section "${expected.section}".`,
          );
        }

        previousWordEndBar = endBar;
        previousWordEndBeat = endBeat;
        previousWordPhraseIndex = phraseIndex;

        return [
          {
            phraseIndex,
            wordIndex,
            word: sourceWord.word,
            section: expected.section,
            startBar,
            startBeat,
            endBar,
            endBeat,
          },
        ];
      },
    );

    const missingWordRhythmIndexes = Array.from(
      expectedWordRhythmEntries.keys(),
    ).filter((wordIndex) => !seenWordRhythmIndexes.has(wordIndex));

    if (missingWordRhythmIndexes.length > 0) {
      wordRhythmValidationErrors.push(
        `wordRhythmPlan is missing word indexes: ${missingWordRhythmIndexes
          .slice(0, 12)
          .join(", ")}${missingWordRhythmIndexes.length > 12 ? ", ..." : ""}.`,
      );
    }

    if (validatedWordRhythmWords.length !== expectedWordRhythmEntries.size) {
      wordRhythmValidationErrors.push(
        `wordRhythmPlan returned ${validatedWordRhythmWords.length} valid word entries; expected ${expectedWordRhythmEntries.size}.`,
      );
    }

    if (wordRhythmValidationErrors.length > 0) {
      console.error(
        "Word rhythm validation failed:",
        wordRhythmValidationErrors,
      );

      return NextResponse.json(
        {
          error: `Word-rhythm pass returned invalid timing: ${wordRhythmValidationErrors
            .slice(0, 3)
            .join(" | ")}`,
          validationErrors: wordRhythmValidationErrors,
          raw: wordRhythmText,
          resumeChordData: generationCheckpoint,
        },
        { status: 500 },
      );
    }

    chordDataRecord.lyricTimingPlan = lyricTimingPlan;
    chordDataRecord.wordRhythmPlan = {
      words: validatedWordRhythmWords,
    };

    if (body.project_id) {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("chord_versions").insert({
        project_id: body.project_id,
        chord_data: chordData,
      });

      if (user) {
        const { error: projectUpdateError } = await supabase
          .from("projects")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", body.project_id)
          .eq("user_id", user.id);

        if (projectUpdateError) {
          console.error(
            "projects updated_at bump failed after chord save:",
            projectUpdateError,
          );
        }
      }
    }

    return NextResponse.json(chordData);
  } catch (error) {
    console.error("Chords route failure:", error);

    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error:
            "OpenAI API quota has been exceeded. Please check your API billing/usage, then try generating chords again.",
          resumeChordData: generationCheckpoint,
        },
        { status: 429 },
      );
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Chord generation timed out.",
          resumeChordData: generationCheckpoint,
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Could not generate chords." },
      { status: 500 },
    );
  }
}
