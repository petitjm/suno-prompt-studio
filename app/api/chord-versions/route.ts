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
      title: body.title || 'Untitled Chord Version',
      chord_data: body.chord_data || {},
    }

    const { data, error } = await supabase
      .from('chord_versions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('chord_versions insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.project_id)
      .eq('user_id', user.id)

    return NextResponse.json({ version: data })
  } catch (err: any) {
    console.error('chord_versions POST route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to save chord version' },
      { status: 500 }
    )
  }
}