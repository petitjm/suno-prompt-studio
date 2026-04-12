import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { dnaProfiles } from '@/lib/dnaProfiles'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function stripCodeFences(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const dna =
      dnaProfiles.find((profile) => profile.id === body.dnaId) || dnaProfiles[0]

    const prompt = `
You are helping a songwriter expand a song theme.

USER INPUT:
Theme seed: ${body.theme}
Genre: ${body.genre}
Mood: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}

CREATIVE DNA:
Name: ${dna.name}
Vocal: ${dna.vocal}
Tone: ${dna.tone.join(', ')}
Style Bias: ${dna.style_bias.join(', ')}
Lyrics Rules: ${dna.lyrics_rules.join(', ')}
Hook Style: ${dna.hook_style}
Structure Bias: ${dna.structure_bias}
Instrumentation Bias: ${dna.instrumentation_bias.join(', ')}
Avoid: ${dna.avoid.join(', ')}

Return valid JSON only with exactly these keys:
{
  "refined_theme": "string",
  "related_themes": ["string", "string", "string", "string", "string"]
}

Rules:
- refined_theme should be one stronger, clearer version of the user's idea
- related_themes should be short alternative but related angles
- keep them suitable for songwriting
- do not use markdown code fences
`

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
    })

    const content = response.output_text || ''
    const cleaned = stripCodeFences(content)
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Theme ideas route error:', error)

    return NextResponse.json(
      { error: error?.message || 'Failed to suggest theme ideas' },
      { status: 500 }
    )
  }
}