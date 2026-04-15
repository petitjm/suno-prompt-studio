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
      .from('artist_dna_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data || null })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load artist DNA' },
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

    const payload = {
      user_id: user.id,
      artist_name: body.artist_name || '',
      vocal_range: body.vocal_range || '',
      core_genres: body.core_genres || '',
      lyrical_style: body.lyrical_style || '',
      emotional_tone: body.emotional_tone || '',
      writing_strengths: body.writing_strengths || '',
      avoid_list: body.avoid_list || '',
      visual_style: body.visual_style || '',
      performance_style: body.performance_style || '',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('artist_dna_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to save artist DNA' },
      { status: 500 }
    )
  }
}