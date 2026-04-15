import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

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

Return JSON:
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



    const text = completion.choices[0].message.content || '{}'
    const chordData = JSON.parse(text)

    // Save if project provided
    if (body.project_id) {
      const supabase = await createClient()
      await supabase.from('chord_versions').insert({
        project_id: body.project_id,
        chord_data: chordData,
      })
    }

    return NextResponse.json(chordData)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}