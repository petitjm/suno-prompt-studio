import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const prompt = `
You are a professional songwriter.

Create chord progressions for this song idea:

Genre: ${body.genre}
Mood: ${body.moods?.join(', ')}
Theme: ${body.theme}
Hook: ${body.hook}

Return ONLY valid JSON (no explanation, no text before or after):

{
  "key": "",
  "capo": "",
  "verse": "",
  "chorus": "",
  "bridge": "",
  "notes": ""
}

Make it playable for acoustic guitar.
`

    // ✅ FIX 1: Add the missing OpenAI call
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }],
      // ❌ DO NOT add temperature for this model
    })

    const text = completion.choices[0].message.content || '{}'

    // ✅ FIX 2: Safe JSON parsing
    let chordData
    try {
      chordData = JSON.parse(text)
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON from model',
          raw: text,
        },
        { status: 500 }
      )
    }

    // ✅ FIX 3: Save to DB if project exists
    if (body.project_id) {
      const supabase = await createClient()

      await supabase.from('chord_versions').insert({
        project_id: body.project_id,
        chord_data: chordData,
      })
    }

    return NextResponse.json(chordData)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Chord generation failed' },
      { status: 500 }
    )
  }
}