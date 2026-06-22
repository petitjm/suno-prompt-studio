// app/api/video-versions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const readJsonSafe = async (req: NextRequest) => {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const projectId = searchParams.get('projectId')
  const songVersionId = searchParams.get('songVersionId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required.' },
      { status: 400 },
    )
  }

  let query = supabase
    .from('video_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (songVersionId) {
    query = query.eq('song_version_id', songVersionId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videoVersions: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await readJsonSafe(req)

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 },
    )
  }

  const projectId = body.projectId || body.project_id
  const songVersionId = body.songVersionId || body.song_version_id
  const title = body.title || 'Untitled video prompt version'
  const videoData = body.videoData || body.video_data || body.video_result

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required.' },
      { status: 400 },
    )
  }

  if (!songVersionId) {
    return NextResponse.json(
      { error: 'songVersionId is required.' },
      { status: 400 },
    )
  }

  if (!videoData) {
    return NextResponse.json(
      { error: 'videoData is required.' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('video_versions')
    .insert({
      project_id: projectId,
      song_version_id: songVersionId,
      title,
      video_data: videoData,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videoVersion: data })
}