import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('projects GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects: data || [] })
  } catch (err: any) {
    console.error('projects GET route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to load projects' },
      { status: 500 }
    )
  }
}

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

    const title = String(body.title || '').trim()

    if (!title) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        title,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('projects POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('projects POST route failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}