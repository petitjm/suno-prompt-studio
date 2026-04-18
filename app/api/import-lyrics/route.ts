import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const projectId = String(body.project_id || '').trim()
    const lyrics = String(body.lyrics || '').trim()
    const title = String(body.title || 'Imported Lyrics').trim()

    const genre = String(body.genre || '').trim()
    const theme = String(body.theme || '').trim()
    const hook = String(body.hook || '').trim()
    const dnaId = String(body.dnaId || 'mpj-master').trim()
    const moods = Array.isArray(body.moods) ? body.moods : []

    if (!projectId) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })
    }

    if (!lyrics) {
      return NextResponse.json({ error: 'Missing lyrics' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const payload = {
      project_id: projectId,
      title,
      form: {
        genre,
        moods,
        theme,
        hook,
        dnaId,
      },
      result: {
        lyrics_full: lyrics,
        lyrics_brief: theme || hook || 'Imported lyrics',
        style_short: genre || '',
        style_detailed: '',
      },
    }

    const { data, error } = await supabase
      .from('song_versions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id)

    return NextResponse.json({ ok: true, version: data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to import lyrics' },
      { status: 500 }
    )
  }
}