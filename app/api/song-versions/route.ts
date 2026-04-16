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

    if (!body.project_id) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', body.project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const payload = {
      project_id: body.project_id,
      title: body.title || 'Untitled Version',
      form: body.form || {},
      result: body.result || {},
    }

    const { data, error } = await supabase
      .from('song_versions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('song_versions insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.project_id)
      .eq('user_id', user.id)

    if (projectUpdateError) {
      console.error('projects updated_at bump failed after song save:', projectUpdateError)
    }

    return NextResponse.json({ version: data })
  } catch (err: any) {
    console.error('song_versions POST route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to save song version' },
      { status: 500 }
    )
  }
}