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
      "bars": 8,
      "timeSignature": "4/4",
      "meterChanges": []
    },
    {
      "section": "Bridge",
      "bars": 7,
      "timeSignature": "4/4",
      "meterChanges": [
        {
          "bar": 5,
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

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
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
    } finally {
      clearTimeout(timeoutId);
    }

    const text = completion.choices[0].message.content || "{}";

    let chordData;
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

    const placementTimeoutId = setTimeout(() => {
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

    const rebuiltSongSheetLines = placementRows.flatMap(
      (
        row: unknown,
      ): Array<{
        section: string;
        lyric: string;
        chords: Array<{
          chord: string;
          charIndex: number;
          bar: number;
          beat: number;
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
              },
            ];
          },
        );

        return [
          {
            section,
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

      const timelineSectionRecord = timelineSection as Record<string, unknown>;

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

    const songSheetLinesForTiming = rebuiltSongSheetLines;

    const sungWordEntries: Array<{
      wordIndex: number;
      word: string;
      section: string;
      sourceLineIndex: number;
      startCharIndex: number;
      endCharIndex: number;
    }> = [];

    songSheetLinesForTiming.forEach(
      (
        line: {
          section: string;
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
- Fractional beats may be used for genuine pickups, anticipations, syncopations, rests, breaths, or phrase endings.
- startBar must lie within the section.
- A phrase may end at bar N+1 beat 1 when that is the boundary immediately after the final bar of an N-bar section.
- If endBar is one greater than the section bar count, endBeat must be 1.
- Otherwise beats must be valid for the meter active at that bar.

Final review:
- Inspect the complete result before returning it.
- If most phrases contain exactly the same number of words, reconsider whether you have created a mechanical grid.
- If most phrases begin on beat 1, end on beat 1, or occupy identical numbers of bars, verify that this is genuinely justified by the performance.
- Musical regularity is allowed when the song genuinely calls for it, but it must come from the song rather than from a formatting shortcut.

Return wordTimingPlan only.
`.trim();

    const lyricTimingController = new AbortController();

    const lyricTimingTimeoutId = setTimeout(() => {
      lyricTimingController.abort();
    }, CHORD_GENERATION_TIMEOUT_MS);

    let lyricTimingCompletion;

    try {
      lyricTimingCompletion = await openai.chat.completions.create(
        {
          model: "gpt-5",
          messages: [{ role: "user", content: lyricTimingPrompt }],
        },
        {
          signal: lyricTimingController.signal,
        },
      );
    } finally {
      clearTimeout(lyricTimingTimeoutId);
    }

    const lyricTimingText =
      lyricTimingCompletion.choices[0].message.content || "{}";

    let lyricTimingResult;

    try {
      lyricTimingResult = parseModelJson(lyricTimingText);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid lyric timing JSON from model",
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    const lyricTimingRecord =
      lyricTimingResult &&
      typeof lyricTimingResult === "object" &&
      !Array.isArray(lyricTimingResult)
        ? (lyricTimingResult as Record<string, unknown>)
        : null;

    const wordTimingPlan =
      lyricTimingRecord &&
      lyricTimingRecord.wordTimingPlan &&
      typeof lyricTimingRecord.wordTimingPlan === "object" &&
      !Array.isArray(lyricTimingRecord.wordTimingPlan)
        ? (lyricTimingRecord.wordTimingPlan as Record<string, unknown>)
        : null;

    const wordTimingPhrases =
      wordTimingPlan && Array.isArray(wordTimingPlan.phrases)
        ? wordTimingPlan.phrases
        : null;

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

    if (!wordTimingPhrases || !musicalTimingSections) {
      return NextResponse.json(
        {
          error: "Lyric timing pass returned invalid timing data.",
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    const wordTimingConversionErrors: string[] = [];

    const convertedLyricTimingPhrases = wordTimingPhrases.flatMap(
      (
        phrase: unknown,
        phraseIndex,
      ): Array<{
        section: string;
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
          wordTimingConversionErrors.push(
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
          wordTimingConversionErrors.push(
            `Phrase ${phraseIndex + 1} has missing or invalid word-timing fields.`,
          );
          return [];
        }

        if (
          startWordIndex < 0 ||
          endWordIndexExclusive <= startWordIndex ||
          endWordIndexExclusive > sungWordEntries.length
        ) {
          wordTimingConversionErrors.push(
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
          wordTimingConversionErrors.push(
            `Phrase ${phraseIndex + 1} could not resolve its word span.`,
          );
          return [];
        }

        if (
          startWord.section !== section ||
          endWord.section !== section ||
          phraseWords.some((word) => word.section !== section)
        ) {
          wordTimingConversionErrors.push(
            `Phrase ${phraseIndex + 1} crosses a section boundary or has the wrong section label.`,
          );
          return [];
        }

        return [
          {
            section,
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

    if (wordTimingConversionErrors.length > 0) {
      console.error(
        "Lyric word timing conversion failed:",
        wordTimingConversionErrors,
      );

      return NextResponse.json(
        {
          error: `Lyric timing pass returned invalid word spans: ${wordTimingConversionErrors
            .slice(0, 3)
            .join(" | ")}`,
          validationErrors: wordTimingConversionErrors,
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    const lyricTimingPlan = {
      phrases: convertedLyricTimingPhrases,
    };

    const lyricTimingPhrases = convertedLyricTimingPhrases;
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

    const timingValidationErrors: string[] = [];

    let previousEndSourceLineIndex = -1;
    let previousEndCharIndex = -1;

    lyricTimingPhrases.forEach((phrase, phraseIndex) => {
      if (!phrase || typeof phrase !== "object" || Array.isArray(phrase)) {
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} is not an object.`,
        );
        return;
      }

      const phraseRecord = phrase as Record<string, unknown>;

      const section =
        typeof phraseRecord.section === "string"
          ? phraseRecord.section.trim()
          : "";

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
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} has missing or invalid fields.`,
        );
        return;
      }

      if (
        startSourceLineIndex < 0 ||
        endSourceLineIndex < startSourceLineIndex ||
        endSourceLineIndex >= songSheetLinesForTiming.length
      ) {
        timingValidationErrors.push(
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
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} refers to invalid songsheet rows.`,
        );
        return;
      }

      const startLineRecord = startLine as Record<string, unknown>;
      const endLineRecord = endLine as Record<string, unknown>;

      const startLyric =
        typeof startLineRecord.lyric === "string" ? startLineRecord.lyric : "";

      const endLyric =
        typeof endLineRecord.lyric === "string" ? endLineRecord.lyric : "";

      if (!startLyric.trim() || !endLyric.trim()) {
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} starts or ends on an instrumental row.`,
        );
      }

      if (startCharIndex < 0 || startCharIndex >= startLyric.length) {
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} has an invalid startCharIndex.`,
        );
      }

      if (endCharIndex <= 0 || endCharIndex > endLyric.length) {
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} has an invalid exclusive endCharIndex.`,
        );
      }

      if (
        startSourceLineIndex === endSourceLineIndex &&
        endCharIndex <= startCharIndex
      ) {
        timingValidationErrors.push(
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
          timingValidationErrors.push(
            `Phrase ${phraseIndex + 1} contains an invalid songsheet row.`,
          );
          continue;
        }

        const lineRecord = line as Record<string, unknown>;

        const lineSection =
          typeof lineRecord.section === "string"
            ? lineRecord.section.trim()
            : "";

        const lineLyric =
          typeof lineRecord.lyric === "string" ? lineRecord.lyric : "";

        if (!lineLyric.trim()) {
          timingValidationErrors.push(
            `Phrase ${phraseIndex + 1} crosses an instrumental row.`,
          );
        }

        if (lineSection !== section) {
          timingValidationErrors.push(
            `Phrase ${phraseIndex + 1} crosses a section boundary.`,
          );
        }
      }

      const matchingTimingSections = musicalTimingSections.flatMap(
        (timingSection: unknown): Array<Record<string, unknown>> => {
          if (
            !timingSection ||
            typeof timingSection !== "object" ||
            Array.isArray(timingSection)
          ) {
            return [];
          }

          const timingSectionRecord = timingSection as Record<string, unknown>;

          return timingSectionRecord.section === section
            ? [timingSectionRecord]
            : [];
        },
      );

      if (matchingTimingSections.length === 0) {
        timingValidationErrors.push(
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
              startBeat > startBeatsInBar
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
                endBeat > endBeatsInBar
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
          timingValidationErrors.push(
            `Phrase ${phraseIndex + 1} has invalid bar/beat timing for section "${section}".`,
          );
        }
      }

      if (
        previousEndSourceLineIndex > startSourceLineIndex ||
        (previousEndSourceLineIndex === startSourceLineIndex &&
          previousEndCharIndex > startCharIndex)
      ) {
        timingValidationErrors.push(
          `Phrase ${phraseIndex + 1} overlaps or appears out of lyric order.`,
        );
      }

      previousEndSourceLineIndex = endSourceLineIndex;
      previousEndCharIndex = endCharIndex;
    });

    if (timingValidationErrors.length > 0) {
      console.error("Lyric timing validation failed:", timingValidationErrors);

      return NextResponse.json(
        {
          error: `Lyric timing pass returned invalid phrase timing: ${timingValidationErrors
            .slice(0, 3)
            .join(" | ")}`,
          validationErrors: timingValidationErrors,
          raw: lyricTimingText,
        },
        { status: 500 },
      );
    }

    chordDataRecord.lyricTimingPlan = lyricTimingPlan;

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
        },
        { status: 429 },
      );
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        {
          error:
            "Chord generation timed out after 5 minutes. Please try again, or shorten the lyrics/prompt context and regenerate.",
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
