import OpenAI from "openai";
import {
  buildSongWorkshopAnalysisPrompt,
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

    const controlNotes = [
      `Development focus: ${developmentFocusLabel}`,
      `Change intensity: ${changeIntensity}/5`,
      `Preserve original phrases: ${preserveOriginal}/5`,
      `Emotional directness: ${emotionalDirectness}/5`,
      `Singability: ${singability}/5`,
    ];

    const modelPrompt = buildSongWorkshopAnalysisPrompt({
      lyrics,
      songTitle,
      songVersionTitle,
      workshopNotes,
      workshopControls,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are an expert songwriting coach and song analyst.",
            "Analyse only the song and context supplied by the user.",
            "Do not invent unrelated characters, events, themes, genres, or song sections.",
            "Treat genre as a useful songwriting description, not a rigid classification.",
            "Return only valid JSON. Do not use markdown or code fences.",
          ].join(" "),
        },
        {
          role: "user",
          content: `${modelPrompt}

Return a JSON object with exactly these keys:

{
  "genre": string,
  "moods": string[],
  "coreTheme": string,
  "emotionalCentre": string,
  "fragmentConnection": string,
  "mainWeakness": string,
  "suggestedShape": string[],
  "nextStep": string
}

Additional requirements:
- genre should be a concise likely musical/songwriting genre or style based on the lyrics and supplied context.
- Do not pretend the lyrics alone prove a precise production genre. If uncertain, give the most useful broad songwriting description.
- moods should contain 2 to 5 concise emotional descriptors.
- coreTheme should describe what the song is fundamentally about.
- emotionalCentre should describe the central human feeling or emotional tension.
- fragmentConnection should explain how the existing ideas or sections relate. If the song is already cohesive, say so.
- mainWeakness should identify the most important songwriting weakness or development opportunity. Do not manufacture a weakness merely to be critical.
- suggestedShape should contain practical structural/development suggestions appropriate to this specific song.
- nextStep should identify the single most useful next songwriting action.
- Preserve the songwriter's existing identity and intent.
- Do not rewrite the lyrics in this analysis.`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";

    let generated: {
      genre?: unknown;
      moods?: unknown;
      coreTheme?: unknown;
      emotionalCentre?: unknown;
      fragmentConnection?: unknown;
      mainWeakness?: unknown;
      suggestedShape?: unknown;
      nextStep?: unknown;
    };

    try {
      generated = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "Song analysis response was not valid JSON.",
          raw: text,
        },
        { status: 500 },
      );
    }

    const analysis = {
      generatedAt: new Date().toISOString(),
      genre: typeof generated.genre === "string" ? generated.genre.trim() : "",
      moods: Array.isArray(generated.moods)
        ? generated.moods
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
      coreTheme:
        typeof generated.coreTheme === "string"
          ? generated.coreTheme.trim()
          : "",
      emotionalCentre:
        typeof generated.emotionalCentre === "string"
          ? generated.emotionalCentre.trim()
          : "",
      fragmentConnection:
        typeof generated.fragmentConnection === "string"
          ? generated.fragmentConnection.trim()
          : "",
      mainWeakness:
        typeof generated.mainWeakness === "string"
          ? generated.mainWeakness.trim()
          : "",
      controlNotes,
      modelPrompt,
      suggestedShape: Array.isArray(generated.suggestedShape)
        ? generated.suggestedShape
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      nextStep:
        typeof generated.nextStep === "string" ? generated.nextStep.trim() : "",
    };

    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error("Song Workshop analysis failed", err);

    return NextResponse.json(
      {
        error: err?.message || "Song analysis failed.",
      },
      { status: 500 },
    );
  }
}
