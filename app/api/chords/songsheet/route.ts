import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SONGSHEET_TIMEOUT_MS = 240_000;
const SONGSHEET_MODEL = process.env.OPENAI_SONGSHEET_MODEL || "gpt-5";

function logOpenAIUsage(
  routeName: string,
  startedAt: number,
  completion: unknown,
) {
  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  const usage =
    completion && typeof completion === "object" && "usage" in completion
      ? (
          completion as {
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
            };
          }
        ).usage
      : undefined;

  console.log(
    `[${routeName}] duration=${durationSeconds}s input=${usage?.prompt_tokens ?? "unknown"} output=${usage?.completion_tokens ?? "unknown"} total=${usage?.total_tokens ?? "unknown"}`,
  );
}

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

function parseModelJson(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutCodeFence);
  } catch {}

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Could not parse JSON from model response.");
}

type SongsheetChordPlacement = {
  chord: string;
  charIndex: number;
  bar?: number;
  beat?: number;
};

type SongsheetLine = {
  section: string;
  lyric: string;
  chords: SongsheetChordPlacement[];
};

type SongsheetLineRef = {
  section: string;
  lineNumber: number;
  chords: SongsheetChordPlacement[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSourceLyricContentLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (/^\[[^\]]+\]$/.test(trimmed)) {
    return false;
  }

  if (/^\{[^}]+:[^}]*\}$/.test(trimmed)) {
    return false;
  }

  if (
    /^(intro|verse|verse\s+\d+|chorus|pre-chorus|prechorus|bridge|outro|tag|breakdown|final chorus)$/i.test(
      trimmed,
    )
  ) {
    return false;
  }

  return true;
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getChordPlacements(value: unknown): SongsheetChordPlacement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((chordItem): SongsheetChordPlacement[] => {
    if (Array.isArray(chordItem)) {
      const chord = typeof chordItem[0] === "string" ? chordItem[0].trim() : "";

      const charIndex =
        typeof chordItem[1] === "number" && Number.isFinite(chordItem[1])
          ? chordItem[1]
          : 0;

      const bar =
        typeof chordItem[2] === "number" &&
        Number.isFinite(chordItem[2]) &&
        chordItem[2] >= 1
          ? Math.floor(chordItem[2])
          : undefined;

      const beat =
        typeof chordItem[3] === "number" &&
        Number.isFinite(chordItem[3]) &&
        chordItem[3] >= 1
          ? chordItem[3]
          : undefined;

      if (!chord) {
        return [];
      }

      return [
        {
          chord,
          charIndex: Math.max(0, Math.floor(charIndex)),
          ...(bar !== undefined ? { bar } : {}),
          ...(beat !== undefined ? { beat } : {}),
        },
      ];
    }

    if (!isRecord(chordItem)) {
      return [];
    }

    const chord =
      typeof chordItem.chord === "string" ? chordItem.chord.trim() : "";

    const charIndex =
      typeof chordItem.charIndex === "number" &&
      Number.isFinite(chordItem.charIndex)
        ? chordItem.charIndex
        : 0;

    const bar =
      typeof chordItem.bar === "number" &&
      Number.isFinite(chordItem.bar) &&
      chordItem.bar >= 1
        ? Math.floor(chordItem.bar)
        : undefined;

    const beat =
      typeof chordItem.beat === "number" &&
      Number.isFinite(chordItem.beat) &&
      chordItem.beat >= 1
        ? chordItem.beat
        : undefined;

    if (!chord) {
      return [];
    }

    return [
      {
        chord,
        charIndex: Math.max(0, Math.floor(charIndex)),
        ...(bar !== undefined ? { bar } : {}),
        ...(beat !== undefined ? { beat } : {}),
      },
    ];
  });
}

function validateSongSheetLines(
  value: unknown,
  sourceLyricLines: string[],
): {
  lines: SongsheetLine[];
  rejectedLines: string[];
} {
  if (!Array.isArray(value)) {
    return {
      lines: [],
      rejectedLines: [],
    };
  }

  function expandSongSheetLineRefs(
    value: unknown,
    sourceLyricLines: string[],
  ): {
    lines: SongsheetLine[];
    rejectedLines: string[];
  } {
    if (!Array.isArray(value)) {
      return {
        lines: [],
        rejectedLines: [],
      };
    }

    const rejectedLines: string[] = [];

    const lines = value.flatMap((item): SongsheetLine[] => {
      if (!isRecord(item)) {
        return [];
      }

      const section =
        typeof item.section === "string" ? item.section.trim() : "";

      const lineNumber =
        typeof item.lineNumber === "number" && Number.isFinite(item.lineNumber)
          ? Math.floor(item.lineNumber)
          : 0;

      const lyric = sourceLyricLines[lineNumber - 1];

      if (!lyric) {
        rejectedLines.push(`Invalid lineNumber: ${lineNumber}`);
        return [];
      }

      return [
        {
          section,
          lyric,
          chords: getChordPlacements(item.chords),
        },
      ];
    });

    return {
      lines,
      rejectedLines,
    };
  }

  const exactSourceLines = new Set(sourceLyricLines);
  const normalizedSourceLineMap = new Map(
    sourceLyricLines.map((line: string) => [normalizeMatchText(line), line]),
  );

  const rejectedLines: string[] = [];

  const lines = value.flatMap((item): SongsheetLine[] => {
    if (!isRecord(item)) {
      return [];
    }

    const rawLyric = typeof item.lyric === "string" ? item.lyric.trim() : "";
    const section = typeof item.section === "string" ? item.section.trim() : "";

    if (!rawLyric) {
      return [
        {
          section,
          lyric: "",
          chords: [],
        },
      ];
    }

    const exactLyric = exactSourceLines.has(rawLyric)
      ? rawLyric
      : normalizedSourceLineMap.get(normalizeMatchText(rawLyric));

    if (!exactLyric) {
      rejectedLines.push(rawLyric);
      return [];
    }

    const chords = getChordPlacements(item.chords);

    return [
      {
        section,
        lyric: exactLyric,
        chords,
      },
    ];
  });

  return {
    lines,
    rejectedLines,
  };
}

function expandSongSheetLineRefs(
  value: unknown,
  sourceLyricLines: string[],
): {
  lines: SongsheetLine[];
  rejectedLines: string[];
} {
  if (!Array.isArray(value)) {
    return {
      lines: [],
      rejectedLines: [],
    };
  }

  const rejectedLines: string[] = [];

  const lines = value.flatMap((item): SongsheetLine[] => {
    if (!isRecord(item)) {
      return [];
    }

    const section = typeof item.section === "string" ? item.section.trim() : "";

    const lineNumber =
      typeof item.lineNumber === "number" && Number.isFinite(item.lineNumber)
        ? Math.floor(item.lineNumber)
        : 0;

    const lyric = sourceLyricLines[lineNumber - 1];

    if (!lyric) {
      rejectedLines.push(`Invalid lineNumber: ${lineNumber}`);
      return [];
    }

    return [
      {
        section,
        lyric,
        chords: getChordPlacements(item.chords),
      },
    ];
  });

  return {
    lines,
    rejectedLines,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const lyrics = typeof body.lyrics === "string" ? body.lyrics : "";
    const songTitle = typeof body.songTitle === "string" ? body.songTitle : "";
    const songVersionTitle =
      typeof body.songVersionTitle === "string" ? body.songVersionTitle : "";

    const chordData =
      body.chordData &&
      typeof body.chordData === "object" &&
      !Array.isArray(body.chordData)
        ? body.chordData
        : null;

    if (!lyrics.trim()) {
      return NextResponse.json(
        { error: "Lyrics are required to generate a placed songsheet." },
        { status: 400 },
      );
    }

    if (!chordData) {
      return NextResponse.json(
        { error: "Chord data is required to generate a placed songsheet." },
        { status: 400 },
      );
    }

    const sourceLyricLines = lyrics
      .split("\n")
      .map((line: string) => line.trim())
      .filter(isSourceLyricContentLine);

    const numberedSourceLyricLines = sourceLyricLines
      .map((line: string, index: number) => `${index + 1}. ${line}`)
      .join("\n");

    const prompt = `
You are helping a singer-songwriter turn a chord draft into a practical chord-over-lyric songsheet.

Return JSON only. No markdown. No commentary.

Song title: ${songTitle || "Untitled song"}
Song version: ${songVersionTitle || "Untitled version"}

Source sung lyric lines:
${numberedSourceLyricLines}

Existing chord data:
${JSON.stringify(chordData, null, 2)}

Return this exact JSON shape:

    {
      "musicalTimingPlan": {
        "sections": [
          {
            "section": "Verse 1",
            "bars": 8,
            "timeSignature": "4/4",
            "meterChanges": []
          }
        ]
      },
      "songSheetLineRefs": [
        {
          "section": "Verse 1",
          "lineNumber": 1,
          "chords": [
            ["Em", 0, 1, 1],
            ["C", 12, 1, 3]
          ]
        }
      ],
      "songsheetNotes": "One or two short notes only."
    }

Requirements:
- Do not return lyric text.
- Keep JSON compact. Return only musicalTimingPlan, songSheetLineRefs, and songsheetNotes at the top level.
- Within songSheetLineRefs, use only section, lineNumber, and chords.
- Use lineNumber to refer to the numbered source sung lyric lines.
- lineNumber must be the 1-based number from the source lyric list.
- Preserve source lyric order.
- Include each source sung lyric line once.
- For every chord change, provide both visual lyric placement and musical timing.
- charIndex is the zero-based character position where the chord should appear above the source lyric line.
- bar is the 1-based musical bar number within the current section.
- beat is the 1-based beat within that bar.
- Use compact chord tuples: ["ChordName", charIndex, bar, beat].
Musical timing plan requirements:
- musicalTimingPlan is the authoritative musical timeline for this songsheet.
- Include one musicalTimingPlan section entry for every section instance in the song, in song order.
- section must correspond to the section names used in songSheetLineRefs.
- bars is the total number of musical bars occupied by that complete section.
- timeSignature is the time signature in effect at bar 1 of that section.
- If the time signature changes within a section, include the 1-based bar where each new meter begins in meterChanges.
- If the meter does not change, use an empty meterChanges array.
- Do not invent meter changes merely for variety.
- Every chord bar and beat must use the same bar numbering and meter described by musicalTimingPlan.
- No chord event may reference a bar greater than that section's bars value.

Musical phrasing requirements:
- Never calculate section length by multiplying lyric-line count by a fixed number of bars.
- Do not assume one bar, two bars, or any other fixed duration per lyric line.
- Do not use "2 bars per line", "1 bar per line", or a similar formula as the basis for timing.
- Determine musical duration from the supplied harmony together with intended vocal phrasing, harmonic rhythm, tempo feel, pickups, held notes, rests, breaths, turnarounds, and instrumental movement.
- Different lyric lines within the same section may occupy different amounts of musical time.
- Multiple short lyric lines may share musical space, while one sustained lyric phrase may extend across several bars.
- Equal phrase lengths are valid when musically intended, but must not be inferred merely because the lyrics are written on separate lines.
- Before returning the result, verify that the section bar count can be justified musically without referring to the number of lyric lines.
- Example: ["Em", 0, 1, 1] means display Em at character 0 and change to Em on bar 1 beat 1.
- Example: ["C", 12, 1, 3] means display C at character 12 and change to C on bar 1 beat 3.
- Do not infer bar or beat from character spacing. Decide bar and beat from the intended musical phrasing, harmonic rhythm, time signature, groove, and chord progression.
- Chords that visually align with words close together may still occur on different beats, and words far apart may occur within the same beat or held phrase.
- Do not put every chord at charIndex 0.
- Header/section label lines may have no chords.
- If a chord belongs after the lyric line as a turnaround or held chord, keep its charIndex near the end of the line but still give its true musical bar and beat.
- Treat the existing chord data as the harmonic source of truth.
- Preserve the supplied chord names and progression rather than composing a replacement progression.
- Your job is to place and time the supplied harmony against the lyrics, not to reharmonize the song.
- Do not add substitute chords merely because another progression seems preferable.
- If the existing chord data contains repeated chords or deliberate holds, preserve that musical intent.
- Keep the result practical for acoustic guitar performance.
- Keep songsheetNotes under 60 words.
- Do not explain every section.
- Do not repeat the full chord progression in songsheetNotes.
- Do not include performance arrangement notes here.
- The server will expand lineNumber back into exact lyric text, so the response must stay compact.
`.trim();

    const startedAt = Date.now();

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SONGSHEET_TIMEOUT_MS);

    let completion;

    try {
      completion = await openai.chat.completions.create(
        {
          model: SONGSHEET_MODEL,
          messages: [{ role: "user", content: prompt }],
          reasoning_effort: "low",
        },
        {
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    function getOpenAIUsageMeta(
      routeName: string,
      model: string,
      startedAt: number,
      completion: unknown,
    ) {
      const durationSeconds = Number(
        ((Date.now() - startedAt) / 1000).toFixed(1),
      );

      const usage =
        completion && typeof completion === "object" && "usage" in completion
          ? (
              completion as {
                usage?: {
                  prompt_tokens?: number;
                  completion_tokens?: number;
                  total_tokens?: number;
                };
              }
            ).usage
          : undefined;

      return {
        route: routeName,
        model,
        durationSeconds,
        inputTokens: usage?.prompt_tokens ?? null,
        outputTokens: usage?.completion_tokens ?? null,
        totalTokens: usage?.total_tokens ?? null,
        generatedAt: new Date().toISOString(),
      };
    }

    logOpenAIUsage(
      `chords/songsheet model=${SONGSHEET_MODEL}`,
      startedAt,
      completion,
    );

    const text = completion.choices[0]?.message?.content || "";
    const songsheetData = parseModelJson(text);

    const songsheetRecord = isRecord(songsheetData) ? songsheetData : {};

    const validation = Array.isArray(songsheetRecord.songSheetLineRefs)
      ? expandSongSheetLineRefs(
          songsheetRecord.songSheetLineRefs,
          sourceLyricLines,
        )
      : validateSongSheetLines(
          songsheetRecord.songSheetLines,
          sourceLyricLines,
        );

    const { songSheetLineRefs, ...cleanSongsheetRecord } = songsheetRecord;

    return NextResponse.json({
      ...chordData,
      ...cleanSongsheetRecord,
      generationMeta: getOpenAIUsageMeta(
        "chords/songsheet",
        SONGSHEET_MODEL,
        startedAt,
        completion,
      ),
      songSheetLines: validation.lines,
      songsheetValidation: {
        sourceLineCount: sourceLyricLines.length,
        acceptedLineCount: validation.lines.length,
        rejectedLineCount: validation.rejectedLines.length,
        rejectedLines: validation.rejectedLines.slice(0, 12),
      },
      songsheetNotes: [
        typeof songsheetRecord.songsheetNotes === "string"
          ? songsheetRecord.songsheetNotes.trim().slice(0, 500)
          : "",
        validation.rejectedLines.length > 0
          ? `${validation.rejectedLines.length} generated songsheet line${validation.rejectedLines.length === 1 ? "" : "s"} rejected because they did not match the source lyrics.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      draftType:
        typeof chordData.draftType === "string"
          ? chordData.draftType
          : "chord-draft-with-songsheet",
    });
  } catch (error) {
    console.error("Songsheet route failure:", error);

    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error:
            "OpenAI API quota has been exceeded. Please check your API billing/usage, then try generating the songsheet again.",
        },
        { status: 429 },
      );
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        {
          error:
            "Placed songsheet generation timed out after 4 minutes. Please try again, or shorten the lyrics.",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Could not generate placed songsheet." },
      { status: 500 },
    );
  }
}
