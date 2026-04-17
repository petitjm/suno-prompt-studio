import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const supabase = await createClient()
    const body = await req.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const title = String(body.title || '').trim()

    if (!title) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Failed to rename project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, project: data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to rename project' },
      { status: 500 }
    )
  }
}