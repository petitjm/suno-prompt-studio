import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const { versionId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: version, error: versionError } = await supabase
      .from('song_versions')
      .select('id, project_id, projects!inner(user_id)')
      .eq('id', versionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: 'Song version not found' }, { status: 404 })
    }

    // @ts-ignore
    if (version.projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('song_versions')
      .delete()
      .eq('id', versionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to delete song version' },
      { status: 500 }
    )
  }
}