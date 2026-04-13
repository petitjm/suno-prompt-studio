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
      select event_type, count(*)::int as count
      from usage_events
      where user_id = ${data.user.id}
      group by event_type
    `

    const usage = {
      generate_count: 0,
      rewrite_count: 0,
      video_count: 0,
      save_count: 0,
    }

    for (const row of rows) {
      if (row.event_type === 'generate') usage.generate_count = row.count
      if (row.event_type === 'rewrite') usage.rewrite_count = row.count
      if (row.event_type === 'video') usage.video_count = row.count
      if (row.event_type === 'save') usage.save_count = row.count
    }

    return NextResponse.json(usage)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load usage' },
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

    await sql`
      insert into usage_events (id, user_id, event_type)
      values (${crypto.randomUUID()}, ${data.user.id}, ${body.eventType})
    `

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to track usage' },
      { status: 500 }
    )
  }
}