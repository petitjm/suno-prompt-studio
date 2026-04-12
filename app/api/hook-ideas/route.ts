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
You are helping a songwriter generate strong hook ideas.

USER INPUT:
Theme: ${body.theme}
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

Return valid JSON only with exactly this shape:
{
  "hooks": ["string", "string", "string", "string", "string", "string"]
}

Rules:
- style_short should be concise and Suno-friendly
- style_detailed should be richer but still practical
- lyrics_brief should summarise the song direction in 1 to 3 sentences

- lyrics_full should be complete lyrics, not an outline
- lyrics_full MUST use real line breaks (\\n) between every line
- each lyric line must be on its own line (no commas joining lines)

- format EXACTLY like this:

[Verse 1]
Line one
Line two
Line three

[Chorus]
Line one
Line two

- include section headers like [Verse 1], [Chorus], [Bridge], [Final Chorus]
- keep lines short, natural, and singable
- avoid long sentences or paragraph-style writing
- include the hook naturally in the chorus
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
    console.error('Hook ideas route error:', error)

    return NextResponse.json(
      { error: error?.message || 'Failed to generate hook ideas' },
      { status: 500 }
    )
  }
}