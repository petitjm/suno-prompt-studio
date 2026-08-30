import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { dnaProfiles } from "@/lib/dnaProfiles";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function generateVideoForDNA({
  openai,
  body,
  dna,
}: {
  openai: OpenAI;
  body: any;
  dna: any;
}) {
  const prompt = `
You are developing a coherent visual treatment for a music video.

Your first job is to understand the supplied song: its story, emotional movement,
important images, point of view, recurring ideas, and actual section structure.

Create a distinctive visual direction from that song rather than producing a
generic music-video treatment.

SONG DIRECTION:
Genre: ${body.genre || "Not specified"}
Mood: ${
    Array.isArray(body.moods) && body.moods.length
      ? body.moods.join(", ")
      : "Not specified"
  }
Theme: ${body.theme || "Not specified"}
Visual hook / focus: ${
    body.hook ||
    "Not specified. Derive a recurring visual idea from the lyrics, theme, moods, and emotional arc."
  }

LYRICS:
${body.lyrics || ""}

CREATIVE DNA:
Name: ${dna.name}
Vocal / performer identity: ${dna.vocal}
Tone: ${dna.tone.join(", ")}
Style tendencies: ${dna.style_bias.join(", ")}
Structure tendency: ${dna.structure_bias}
Instrumentation character: ${dna.instrumentation_bias.join(", ")}
Avoid: ${dna.avoid.join(", ")}

Return valid JSON only with exactly these keys:
{
  "global_style": "string",
  "character_prompt": "string",
  "video_concept": "string",
  "scene_prompts": [
    {
      "section": "string",
      "prompt": "string"
    }
  ]
}

RULES:

GLOBAL STYLE
- Describe a reusable visual language for the whole video.
- Include useful decisions about atmosphere, lighting, colour, texture, framing,
  camera character, realism, period or setting where relevant.
- Make it specific to this song rather than relying on generic words such as
  cinematic, emotional, dreamy, beautiful, or moody.
- Do not simply translate the music genre into a visual genre.

CHARACTER
- character_prompt defines the principal recurring on-camera performer / singer
  whose identity must remain consistent across generated material.
- Use the supplied Vocal / performer identity as important context.
- Do not infer the performer's gender, age, appearance, or identity merely from
  a person mentioned in the lyrics.
- A person who is the subject of the song may appear as a separate narrative
  character without replacing the principal performer.
- Describe only characteristics that are visually useful for maintaining
  continuity.
- Do not invent unnecessary biographical detail.

VIDEO CONCEPT
- Summarise one coherent visual treatment in 2 to 4 sentences.
- Identify the central visual idea or recurring motif.
- Relate the visual progression to the song's emotional movement.
- Prefer a specific, filmable concept over a collection of unrelated attractive
  images.
- Do not illustrate every lyric literally.
- Do not invent a symbolic object, recurring prop, relationship milestone,
  location, or backstory unless it is supported by the lyrics or strongly
  motivated by the supplied theme.
- If you introduce a visual motif that is not literally present in the lyrics,
  it must arise naturally from the song's emotional meaning and should not
  require an invented story to make sense.
- Allow performance, narrative, symbolic imagery, or a mixture when appropriate
  to the song.

SCENE PLAN

- Read the supplied lyrics and use the actual labelled song sections where they
  are available.
- Preserve meaningful section names such as Verse 1, Chorus, Verse 2, Bridge,
  Final Chorus, Outro, rather than inventing a generic structure.
- If the lyrics do not contain explicit section labels, infer the smallest useful
  scene structure.
- Give each section a clear visual purpose in the overall treatment.
- Develop the visual story across sections instead of repeating the same scene
  with minor variations.
- Prefer scenes that feel specific to the supplied lyric's emotional journey
  rather than generic romantic montage imagery.
- Avoid default stock-romance scenes such as picnics, dancing in the rain,
  running through fields, weddings, large family gatherings, or celebratory
  parties unless they are directly supported by the lyrics or user input.
- Let later sections deepen the emotional meaning rather than simply increasing
  visual scale or spectacle.
- Repeated choruses should evolve visually rather than repeat the same type of
  affectionate imagery.
- The first chorus should express possibility, wonder, or uncertainty where
  appropriate to the lyric.
- Later choruses should reflect growing confidence, closeness, commitment, or
  certainty where that progression is supported by the song.
- Do not invent specific events such as first meetings, dates, picnics,
  arguments, proposals, weddings, or shared homes unless the lyrics support
  them.
- Prefer visual situations grounded in what the song actually tells us.
- Scene prompts must describe visual action and imagery only; do not include
  musical, vocal, arrangement, or production instructions.
- Maintain continuity of performer, locations, wardrobe, visual motif, time,
  lighting, and emotional progression where appropriate.
- Chorus imagery may recur, but should develop when the song develops.
- The final section should resolve the emotional question of the song in a way
  that matches the lyric's destination.
- Do not turn the ending into a large public celebration, party, wedding, or
  family event unless the lyrics clearly support that interpretation.
- Prefer intimacy, emotional resolution, or a meaningful return to an earlier
  visual idea when that better reflects the song.
- Keep each scene prompt practical enough to become an image or video-generation
  instruction later.

GENERAL
- The ending should reflect the emotional destination of the supplied song.
  Do not introduce loneliness, separation, loss, or uncertainty at the end
  unless the lyrics actually support that interpretation.
- Ground important choices in the supplied lyrics and song direction.
- Do not invent unrelated storylines just to make the treatment dramatic.
- Avoid generic romance montages, anonymous walking shots, random sunsets,
  meaningless slow motion, and other stock music-video imagery unless the
  supplied song genuinely calls for them.
  - When choosing between a familiar music-video cliche and a quieter image that
  is more faithful to the lyric, prefer the image that is more specific to the
  song.
- Do not invent extra narrative events merely to make the video feel more
  cinematic.
- Respect the Creative DNA without forcing every DNA tendency into the video.
- Do not mention OpenArt or any external provider in these four creative fields.
- Do not use markdown code fences.
`;

  const response = await openai.responses.create({
    model: "gpt-5",
    input: prompt,
  });

  const content = response.output_text || "";
  const cleaned = stripCodeFences(content);
  const parsed = JSON.parse(cleaned);

  return {
    dna_id: dna.id,
    dna_name: dna.name,
    ...parsed,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const multiVersion = Boolean(body.multiVersion);

    if (multiVersion) {
      const selectedDNAs = dnaProfiles.filter((profile) =>
        ["mpj-master", "commercial-hit", "raw-folk"].includes(profile.id),
      );

      const versions = await Promise.all(
        selectedDNAs.map((dna) =>
          generateVideoForDNA({
            openai,
            body,
            dna,
          }),
        ),
      );

      return NextResponse.json({ versions });
    }

    const dna =
      dnaProfiles.find((profile) => profile.id === body.dnaId) ||
      dnaProfiles[0];

    const single = await generateVideoForDNA({
      openai,
      body,
      dna,
    });

    return NextResponse.json(single);
  } catch (error: any) {
    console.error("Video route error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to generate video prompts" },
      { status: 500 },
    );
  }
}
