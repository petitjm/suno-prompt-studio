import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql`
      select id, user_id, title, created_at, form, result, video_result
      from saved_sessions
      where user_id = ${data.user.id}
      order by created_at desc
    `

    return NextResponse.json({ sessions: rows })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load sessions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const rows = await sql`
      insert into saved_sessions (id, user_id, title, form, result, video_result)
      values (
        ${body.id},
        ${data.user.id},
        ${body.title},
        ${JSON.stringify(body.form)}::jsonb,
        ${JSON.stringify(body.result ?? null)}::jsonb,
        ${JSON.stringify(body.videoResult ?? null)}::jsonb
      )
      returning id, user_id, title, created_at, form, result, video_result
    `

    return NextResponse.json(rows[0])
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save session' },
      { status: 500 }
    )
  }
}