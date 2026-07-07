import { NextResponse } from 'next/server'

type AudioPreviewSpec = {
  type?: string
  version?: number
  project?: string
  songVersion?: string
  chordVersion?: string
  key?: string
  transposeSemitones?: number
  readiness?: {
    label?: string
    detail?: string
  }
  performanceIntent?: Record<string, string>
  guideTrackPlan?: {
    rows?: Record<string, string>
    sectionPlan?: unknown[]
  }
  songsheetLines?: unknown[]
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AudioPreviewSpec

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Audio preview spec is required.' },
        { status: 400 },
      )
    }

    if (body.type !== 'audio-preview-spec') {
      return NextResponse.json(
        { error: 'Invalid audio preview spec type.' },
        { status: 400 },
      )
    }

    if (!Array.isArray(body.songsheetLines) || body.songsheetLines.length === 0) {
      return NextResponse.json(
        { error: 'Audio preview spec must include songsheetLines.' },
        { status: 400 },
      )
    }

    const response = {
      status: 'ready',
      message:
        'Audio preview spec received. Audio generation is not connected yet.',
      previewRequest: {
        project: body.project || 'Untitled project',
        songVersion: body.songVersion || 'Untitled song version',
        chordVersion: body.chordVersion || 'Untitled chord version',
        key: body.key || '',
        transposeSemitones: body.transposeSemitones ?? 0,
        readiness: body.readiness || null,
        performanceIntent: body.performanceIntent || {},
        guideTrackPlan: body.guideTrackPlan || {},
        songsheetLineCount: body.songsheetLines.length,
      },
      nextStep:
        'Connect this route to an audio generation service or local guide-track renderer.',
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json(
      { error: 'Could not parse audio preview request.' },
      { status: 400 },
    )
  }
}