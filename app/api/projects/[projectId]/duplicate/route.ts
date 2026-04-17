import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: newProject, error: newProjectError } = await supabase
      .from('projects')
      .insert({
        title: `${project.title} Copy`,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (newProjectError || !newProject) {
      return NextResponse.json({ error: newProjectError?.message || 'Failed to duplicate project' }, { status: 500 })
    }

    const { data: songs } = await supabase
      .from('song_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (songs?.length) {
      await supabase.from('song_versions').insert(
        songs.map((s) => ({
          project_id: newProject.id,
          title: s.title,
          form: s.form,
          result: s.result,
        }))
      )
    }

    const { data: chords } = await supabase
      .from('chord_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (chords?.length) {
      await supabase.from('chord_versions').insert(
        chords.map((c) => ({
          project_id: newProject.id,
          title: c.title,
          chord_data: c.chord_data,
        }))
      )
    }

    return NextResponse.json({ ok: true, project: newProject })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to duplicate project' },
      { status: 500 }
    )
  }
}