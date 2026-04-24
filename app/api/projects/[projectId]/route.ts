import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 })
    }

    const { data: songVersions, error: songError } = await supabase
      .from('song_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (songError) {
      return NextResponse.json({ error: songError.message }, { status: 500 })
    }

    const { data: chordVersions, error: chordError } = await supabase
      .from('chord_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (chordError) {
      return NextResponse.json({ error: chordError.message }, { status: 500 })
    }

    return NextResponse.json({
      project,
      songVersions: songVersions || [],
      chordVersions: chordVersions || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load project' },
      { status: 500 }
    )
  }
}




export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { error: songDeleteError } = await supabase
      .from('song_versions')
      .delete()
      .eq('project_id', projectId)

    if (songDeleteError) {
      return NextResponse.json({ error: songDeleteError.message }, { status: 500 })
    }

    const { error: chordDeleteError } = await supabase
      .from('chord_versions')
      .delete()
      .eq('project_id', projectId)

    if (chordDeleteError) {
      return NextResponse.json({ error: chordDeleteError.message }, { status: 500 })
    }

    const { error: projectDeleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id)

    if (projectDeleteError) {
      return NextResponse.json({ error: projectDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete project' },
      { status: 500 }
    )
  }
}