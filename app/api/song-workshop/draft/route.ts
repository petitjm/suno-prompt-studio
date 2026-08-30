import OpenAI from "openai";
import {
  buildSongWorkshopDraftPrompt,
  getDevelopmentFocusLabel,
} from "@/lib/songWorkshopPrompts";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const readJsonSafe = async (req: NextRequest) => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    const body = await readJsonSafe(req);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const lyrics = String(body.lyrics || "").trim();
    const songTitle = String(body.songTitle || "").trim();
    const songVersionTitle = String(body.songVersionTitle || "").trim();
    const workshopNotes = String(body.workshopNotes || "").trim();
    const workshopControls = body.workshopControls || {};
    const analysisResult = body.analysisResult || null;

    const developmentFocus = String(
      workshopControls.developmentFocus || "connect-fragments",
    );
    const developmentFocusLabel = getDevelopmentFocusLabel(developmentFocus);
    const changeIntensity = Number(workshopControls.changeIntensity || 3);
    const preserveOriginal = Number(workshopControls.preserveOriginal || 4);
    const emotionalDirectness = Number(
      workshopControls.emotionalDirectness || 3,
    );
    const singability = Number(workshopControls.singability || 4);

    if (!lyrics) {
      return NextResponse.json(
        { error: "Lyrics or song fragments are required." },
        { status: 400 },
      );
    }

    const controlSummary = [
      `Development focus: ${developmentFocusLabel}`,
      `Change intensity: ${changeIntensity}/5`,
      `Preserve original phrases: ${preserveOriginal}/5`,
      `Emotional directness: ${emotionalDirectness}/5`,
      `Singability: ${singability}/5`,
    ];

    const revisionApproach =
      changeIntensity >= 4
        ? "Use a bolder restructuring approach while preserving the song's central identity."
        : changeIntensity <= 2
          ? "Stay close to the existing structure and make relatively light developmental changes."
          : "Balance preservation with meaningful improvements to structure, clarity, and emotional progression.";

    const preservationApproach =
      preserveOriginal >= 4
        ? "Preserve strong original images, phrases, hooks, and distinctive wording wherever they continue to serve the song."
        : preserveOriginal <= 2
          ? "Preserve the central idea, but allow wording and structure to move more freely."
          : "Keep the strongest original material while reshaping weaker connective lines where useful.";

    const performanceApproach =
      singability >= 4
        ? "Prioritise natural performance flow, clear phrasing, and singable line movement."
        : "Prioritise lyric meaning while still keeping the draft reasonably performable.";

    const analysisApproach = analysisResult
      ? "Use the supplied Song Workshop analysis as additional context, but treat the current source lyrics as the primary source."
      : "Work directly from the lyrics, workshop notes, and creative controls because no prior analysis was supplied.";

    const modelPrompt = buildSongWorkshopDraftPrompt({
      lyrics,
      songTitle,
      songVersionTitle,
      workshopNotes,
      workshopControls,
      analysisResult,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are an expert songwriting collaborator.",
            "Develop only the song supplied by the user.",
            "Do not introduce unrelated stories, characters, themes, titles, or imagery from other songs.",
            "Preserve the songwriter's distinctive voice and strongest existing material.",
            "Do not automatically rewrite everything merely because you can.",
            "Return only valid JSON. Do not use markdown or code fences.",
          ].join(" "),
        },
        {
          role: "user",
          content: `${modelPrompt}

Important implementation requirements:

Return a JSON object with exactly these keys:

{
  "title": string,
  "versionTitle": string,
  "lyric": string,
  "whatWasKept": string[],
  "whatChanged": string[],
  "nextStep": string
}

Additional requirements:
- Base the draft only on the supplied source song and analysis.
- Respect the requested change intensity and preservation level.
- If the existing chorus or hook is strong, preserve it rather than replacing it gratuitously.
- Keep recognisable original wording wherever it remains effective.
- Improve weak, generic, forced, or disconnected lines where the controls justify doing so.
- Preserve section labels in square brackets.
- Do not put explanatory commentary inside the lyric.
- Do not include artist metadata such as {artist: ...} in the lyric.
- Do not invent a new title unless changing the title genuinely improves the song.
- whatWasKept should identify important material deliberately preserved from the source.
- whatChanged should identify meaningful developmental changes actually made.
- nextStep should recommend the single most useful next songwriting decision after reviewing this draft.`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";

    let generated: {
      title?: unknown;
      versionTitle?: unknown;
      lyric?: unknown;
      whatWasKept?: unknown;
      whatChanged?: unknown;
      nextStep?: unknown;
    };

    try {
      generated = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "Song Workshop draft response was not valid JSON.",
          raw: text,
        },
        { status: 500 },
      );
    }

    const generatedLyric =
      typeof generated.lyric === "string" ? generated.lyric.trim() : "";

    if (!generatedLyric) {
      return NextResponse.json(
        { error: "Song Workshop returned no draft lyric." },
        { status: 500 },
      );
    }

    const draft = {
      generatedAt: new Date().toISOString(),
      title:
        typeof generated.title === "string" && generated.title.trim()
          ? generated.title.trim()
          : songTitle || "Untitled song",
      versionTitle:
        typeof generated.versionTitle === "string" &&
        generated.versionTitle.trim()
          ? generated.versionTitle.trim()
          : "Cohesive workshop draft",
      workshopNotes,
      workshopControls,
      analysisContext: analysisResult,
      modelPrompt,
      lyric: generatedLyric,
      whatWasKept: Array.isArray(generated.whatWasKept)
        ? generated.whatWasKept
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      workshopControlNotes: [
        ...controlSummary,
        revisionApproach,
        preservationApproach,
        performanceApproach,
        analysisApproach,
      ],
      whatChanged: Array.isArray(generated.whatChanged)
        ? generated.whatChanged
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      nextStep:
        typeof generated.nextStep === "string" ? generated.nextStep.trim() : "",
    };

    return NextResponse.json({ draft });
  } catch (err: any) {
    console.error("Song Workshop draft failed", err);

    return NextResponse.json(
      {
        error: err?.message || "Failed to create cohesive draft.",
      },
      { status: 500 },
    );
  }
}
