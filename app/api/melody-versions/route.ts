
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MelodyVersionData } from "@/types/song";

function isValidMelodyData(
  value: unknown,
): value is MelodyVersionData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (
    typeof data.songVersionId !== "string" ||
    !data.songVersionId ||
    !(
      data.chordVersionId === null ||
      typeof data.chordVersionId === "string"
    ) ||
    typeof data.tempoBpm !== "number" ||
    !Number.isFinite(data.tempoBpm) ||
    data.tempoBpm <= 0 ||
    !Array.isArray(data.sectionIntents) ||
    !data.character ||
    typeof data.character !== "object" ||
    Array.isArray(data.character) ||
    !Array.isArray(data.phrases) ||
    data.phrases.length === 0
  ) {
    return false;
  }

  const character = data.character as Record<string, unknown>;

  if (
    !["low", "mid", "high"].includes(String(character.register)) ||
    !["restrained", "balanced", "strong"].includes(String(character.lift)) ||
    !["calm", "balanced", "active"].includes(String(character.movement))
  ) {
    return false;
  }

  return data.phrases.every((rawPhrase: unknown) => {
    if (
      !rawPhrase ||
      typeof rawPhrase !== "object" ||
      Array.isArray(rawPhrase)
    ) {
      return false;
    }

    const phrase = rawPhrase as Record<string, unknown>;

    return (
      typeof phrase.sourceLyric === "string" &&
      typeof phrase.startSeconds === "number" &&
      Number.isFinite(phrase.startSeconds) &&
      typeof phrase.endSeconds === "number" &&
      Number.isFinite(phrase.endSeconds) &&
      phrase.endSeconds > phrase.startSeconds &&
      Array.isArray(phrase.notes) &&
      phrase.notes.every((rawNote: unknown) => {
        if (
          !rawNote ||
          typeof rawNote !== "object" ||
          Array.isArray(rawNote)
        ) {
          return false;
        }

        const note = rawNote as Record<string, unknown>;

        return (
          typeof note.pitchMidi === "number" &&
          Number.isInteger(note.pitchMidi) &&
          note.pitchMidi >= 0 &&
          note.pitchMidi <= 127 &&
          typeof note.startSeconds === "number" &&
          Number.isFinite(note.startSeconds) &&
          note.startSeconds >= 0 &&
          typeof note.durationSeconds === "number" &&
          Number.isFinite(note.durationSeconds) &&
          note.durationSeconds > 0
        );
      })
    );
  }) && data.phrases.some((rawPhrase: unknown) => {
    const phrase = rawPhrase as Record<string, unknown>;
    return Array.isArray(phrase.notes) && phrase.notes.length > 0;
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const projectId = body.project_id;
    const melodyData = body.melody_data;

    if (typeof projectId !== "string" || !projectId) {
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 },
      );
    }

    if (!isValidMelodyData(melodyData)) {
      return NextResponse.json(
        { error: "Invalid completed melody data" },
        { status: 400 },
      );
    }

    const songVersionId = melodyData.songVersionId;
    const chordVersionId = melodyData.chordVersionId;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const { data: songVersion, error: songError } = await supabase
      .from("song_versions")
      .select("id")
      .eq("id", songVersionId)
      .eq("project_id", projectId)
      .single();

    if (songError || !songVersion) {
      return NextResponse.json(
        { error: "Song version not found for this project" },
        { status: 404 },
      );
    }

    if (chordVersionId) {
      const { data: chordVersion, error: chordError } = await supabase
        .from("chord_versions")
        .select("id, song_version_id")
        .eq("id", chordVersionId)
        .eq("project_id", projectId)
        .single();

      if (chordError || !chordVersion) {
        return NextResponse.json(
          { error: "Chord version not found for this project" },
          { status: 404 },
        );
      }

      if (chordVersion.song_version_id !== songVersionId) {
        return NextResponse.json(
          {
            error:
              "Chord version does not match the selected song version",
          },
          { status: 400 },
        );
      }
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Untitled Melody Version";

    const { data, error } = await supabase
      .from("melody_versions")
      .insert({
        project_id: projectId,
        song_version_id: songVersionId,
        chord_version_id: chordVersionId,
        title,
        melody_data: melodyData,
      })
      .select()
      .single();

    if (error) {
      console.error("melody_versions insert error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", user.id);

    return NextResponse.json({ version: data });
  } catch (error) {
    console.error("melody_versions POST route failure:", error);

    return NextResponse.json(
      { error: "Failed to save melody version" },
      { status: 500 },
    );
  }
}
