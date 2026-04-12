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
You are a songwriting assistant that creates Suno-ready outputs.

USER INPUT:
Genre: ${body.genre}
Mood: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme}
Hook: ${body.hook}

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
  "style_short": "string",
  "style_detailed": "string",
  "lyrics_brief": "string",
  "lyrics_full": "string"
}

Rules:
- style_short should be concise and Suno-friendly
- style_detailed should be richer but still practical
- lyrics_brief should summarise the song direction in 1 to 3 sentences
- lyrics_full should be complete lyrics, not an outline
- lyrics_full should use section labels like [Verse 1], [Chorus], [Verse 2], [Bridge], [Final Chorus]
- lyrics_full should be singable, emotionally clear, and grounded in vivid imagery
- keep the lyrics aligned with the user's genre, mood, theme, hook, and selected DNA
- include the hook naturally in the chorus
- avoid markdown code fences
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
    console.error('Generate route error:', error)

    return NextResponse.json(
      { error: error?.message || 'Failed to generate output' },
      { status: 500 }
    )
  }
}