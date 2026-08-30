import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    const { versionId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const creativeProfile =
      body.creative_profile &&
      typeof body.creative_profile === "object" &&
      !Array.isArray(body.creative_profile)
        ? body.creative_profile
        : {};

    const { data: version, error: versionError } = await supabase
      .from("song_versions")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Song version not found" },
        { status: 404 },
      );
    }

    // @ts-ignore
    if (version.projects.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("song_versions")
      .update({ creative_profile: creativeProfile })
      .eq("id", versionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", version.project_id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, version: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update song profile" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    const { versionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: version, error: versionError } = await supabase
      .from("song_versions")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Song version not found" },
        { status: 404 },
      );
    }

    // @ts-ignore
    if (version.projects.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("song_versions")
      .delete()
      .eq("id", versionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete song version" },
      { status: 500 },
    );
  }
}
