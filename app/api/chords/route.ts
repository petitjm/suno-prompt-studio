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

    const prompt = `
You are a professional songwriter, acoustic arranger, and live performance songsheet editor.

Create playable acoustic-guitar chords and a performance songsheet for these lyrics.

Song title: ${songTitle || "Untitled song"}
Song version: ${songVersionTitle || "Untitled version"}

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
  "tempoBpm": 82,
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
  "verse": "",
  "chorus": "",
  "bridge": "",
  "notes": "",
  "songSheetLines": [
    {
      "section": "Verse 1",
      "lyric": "Actual lyric line here",
      "chords": [
        {
  "chord": "G",
  "charIndex": 0,
  "bar": 1,
  "beat": 1
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
- The placed chord positions must reflect the intended performance feel, tempo, groove, phrasing, breath points, and instrumental movement. They are more important than a generic chord progression summary.
- songSheetLines must preserve the actual lyric lines in order.
- Each lyric line should appear once.
- Do not invent new lyrics.
- Do not omit lyric lines.
- Put chords only where actual chord changes happen.
- Every chord placement must contain both visual lyric placement and musical timing.
- charIndex is zero-based and means where the chord should appear above the lyric line.
- bar is the 1-based musical bar number within the current section.
- beat is the 1-based beat within that bar.
- Example: {"chord":"G","charIndex":0,"bar":1,"beat":1} means display G at character 0 and change to G on bar 1 beat 1.
- Example: {"chord":"C","charIndex":12,"bar":1,"beat":3} means display C at character 12 and change to C on bar 1 beat 3.
- Place charIndex above the syllable or word where the singer should feel the chord change for natural performance phrasing.
- Determine bar and beat from the intended harmonic rhythm, time signature, tempo, groove, vocal phrasing, breath points, pickups, held notes, and instrumental movement.
- Do not derive bar or beat from charIndex, lyric length, word spacing, or distance across the lyric line.
- Two words that are visually close together may occur on different beats or bars.
- Words that are visually far apart may occur within one held musical phrase.
- Keep bar numbers continuous within each section and reset bar numbering to 1 at the start of each new section.
- beat must be valid for the chosen timeSignature. For example, use beats 1 through 4 in 4/4 and beats 1 through 3 in 3/4.
- Fractional beats may be used only when the musical change genuinely occurs between main beats, for example beat 2.5.
- Do not place every chord at the start of the line unless the change truly happens there.
- Use the requested genre, mood, artist DNA, and live acoustic performance feel to choose harmonic rhythm and phrasing.
- Keep placements practical for a singer-guitarist reading a songsheet.
- If a lyric line has no chord change, include the line with an empty chords array.
- Review songSheetLines before final output for both visual placement and musical timing.
- Avoid placing most chords at charIndex 0.
- At least half of the visual chord placements should normally fall after character 0 unless the song genuinely changes chords only at line starts.
- Prefer fewer meaningful chord changes over too many mechanical placements.
- Make sure every charIndex points to a valid character position in that lyric line.
- Return the final checked JSON only.
Musical timing plan requirements:
- Include musicalTimingPlan as the authoritative musical timeline for the song.
- Include one section entry for every section instance represented in songSheetLines, in song order.
- section must match the corresponding songSheetLines section name.
- bars is the total number of musical bars in that section, including sung bars, held bars, rests, pickups resolved into the section, turnarounds, and instrumental space that belong to the section.
- Do not calculate bars from the number of lyric lines.
- A lyric line may occupy less than one bar, one bar, or several bars.
- Sections may contain any number of lyric lines; do not force conventional 4-line, 8-line, or other fixed section shapes.
- timeSignature is the time signature in effect at bar 1 of that section.
- If the time signature changes within a section, include each change in meterChanges using the 1-based bar at which the new time signature begins.
- If the meter does not change within the section, return an empty meterChanges array.
- Do not invent meter changes merely to create variety.
- bar values in songSheetLines chord placements must refer to the same bar numbering used by musicalTimingPlan for that section.
- No chord placement may reference a bar greater than that section's bars value.
- Determine section length from the intended musical phrasing, harmonic rhythm, meter, groove, vocal phrasing, held notes, rests, turnarounds, pickups, and instrumental movement.
- Review musicalTimingPlan and songSheetLines together before returning the final JSON so their bar numbering is internally consistent.
Performance intent requirements:
- Include tempoBpm as a realistic number for the song style.
- Include timeSignature as the song's opening or primary time signature, usually "4/4" unless another meter is clearly better. Use musicalTimingPlan for section-level timing and any later meter changes.
- Include groove, describing the rhythmic feel, for example "laid-back fingerpicked 8th-note feel" or "steady brushed country ballad pulse".
- Include phrasingNotes describing how the vocal should sit against the guitar rhythm.
- Include vocalDelivery describing the emotional and rhythmic delivery.
- Include guitarPattern describing the likely accompaniment pattern.
- Make guideTrackPlan specific enough that a simple audio-preview feature could use it later.
- Use these performance intent fields to guide both songSheetLines visual chord placement and musical bar/beat timing.
- If a chord occurs after the final sung word on a line, keep its charIndex near the end of the lyric line but give it the true bar and beat for the turnaround, held chord, pickup, breath, or instrumental response.
- Include guideTrackPlan as a practical plan for a future simple audio guide track.
- The guide track is not a finished production.
- It should help the songwriter remember tempo, groove, phrasing, chord timing, vocal entry points, and dynamic shape.
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
