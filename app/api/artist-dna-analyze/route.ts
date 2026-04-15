import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()

    const lyricsSamples = String(body.lyrics_samples || '').trim()
    const chordExamples = String(body.chord_examples || '').trim()
    const artistReferences = String(body.artist_references || '').trim()
    const selfDescription = String(body.self_description || '').trim()

    if (!lyricsSamples) {
      return NextResponse.json(
        { error: 'Lyrics samples are required' },
        { status: 400 }
      )
    }

    const prompt = `
You are an expert songwriting coach, artist development strategist, and music producer.

Analyze the user's songwriting and infer an artist DNA profile.

Inputs:

Lyrics Samples:
${lyricsSamples}

Chord Examples:
${chordExamples || 'None provided'}

Artist References:
${artistReferences || 'None provided'}

Self Description:
${selfDescription || 'None provided'}

Return ONLY valid JSON in this exact shape:

{
  "artist_name": "",
  "vocal_range": "",
  "core_genres": "",
  "lyrical_style": "",
  "emotional_tone": "",
  "writing_strengths": "",
  "avoid_list": "",
  "visual_style": "",
  "performance_style": "",
  "dna_summary": ""
}

Requirements:
- Infer carefully from the evidence provided.
- Be specific, practical, and musically useful.
- Do not copy reference artists directly.
- "avoid_list" should contain likely clichés, traps, or tendencies to avoid, written as a compact paragraph or comma-separated guidance.
- "dna_summary" should be a concise but rich summary of the artist identity.
- Do not include markdown.
- Do not include commentary outside JSON.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0].message.content || '{}'

    let analysis
    try {
      analysis = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from model', raw: text },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile: analysis })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Artist DNA analysis failed' },
      { status: 500 }
    )
  }
}