import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const CHORD_REWRITE_INSTRUCTIONS: Record<string, string> = {
  lift_chorus:
    'Rewrite the chord progression so the chorus lifts harder and feels more emotionally elevated, while keeping the song coherent.',
  simpler_live:
    'Rewrite the chord progression to be simpler, easier, and stronger for live acoustic performance.',
  richer_chords:
    'Rewrite the progression with richer colour chords and more harmonic interest, while remaining playable on acoustic guitar.',
  better_bridge:
    'Rewrite the bridge progression so it contrasts more effectively with the verse and chorus.',
  baritone_key:
    'Rewrite the progression into a key that is more comfortable for a baritone singer, while keeping the song strong and playable.',
  capo_friendly:
    'Rewrite the progression into a more capo-friendly acoustic guitar version with practical chord shapes.',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const mode = String(body.mode || '')
    const instruction = CHORD_REWRITE_INSTRUCTIONS[mode]

    if (!instruction) {
      return NextResponse.json({ error: 'Invalid chord rewrite mode' }, { status: 400 })
    }

    const currentChords = body.currentChords
    if (!currentChords) {
      return NextResponse.json({ error: 'Current chords are required' }, { status: 400 })
    }

    const prompt = `
You are an expert songwriter, arranger, and acoustic guitar music director.

Rewrite this chord set according to the instruction below.

Instruction:
${instruction}

Song context:
Genre: ${body.genre || ''}
Moods: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme || ''}
Hook: ${body.hook || ''}

Current chords:
Key: ${currentChords.key || ''}
Capo: ${currentChords.capo || ''}
Verse: ${currentChords.verse || ''}
Chorus: ${currentChords.chorus || ''}
Bridge: ${currentChords.bridge || ''}
Notes: ${currentChords.notes || ''}

Return ONLY valid JSON in this exact shape:
{
  "key": "",
  "capo": "",
  "verse": "",
  "chorus": "",
  "bridge": "",
  "notes": ""
}

Requirements:
- Keep it playable for acoustic guitar.
- Keep it musically coherent with the song idea.
- Do not include markdown fences.
- Do not include commentary outside JSON.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = completion.choices[0].message.content || '{}'

    let rewritten
    try {
      rewritten = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON from model', raw: text },
        { status: 500 }
      )
    }

    if (body.project_id) {
      const supabase = await createClient()

      await supabase.from('chord_versions').insert({
        project_id: body.project_id,
        chord_data: rewritten,
      })
    }

    return NextResponse.json(rewritten)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Chord rewrite failed' },
      { status: 500 }
    )
  }
}