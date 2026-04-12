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
You are generating OpenArt-ready music video prompts.

USER INPUT:
Genre: ${body.genre || ''}
Mood: ${Array.isArray(body.moods) ? body.moods.join(', ') : ''}
Theme: ${body.theme || ''}
Hook: ${body.hook || ''}
Lyrics:
${body.lyrics || ''}

CREATIVE DNA:
Name: ${dna.name}
Tone: ${dna.tone.join(', ')}
Style Bias: ${dna.style_bias.join(', ')}

Return valid JSON only with exactly these keys:
{
  "global_style": "string",
  "character_prompt": "string",
  "video_concept": "string",
  "scene_prompts": [
    {
      "section": "string",
      "prompt": "string"
    }
  ]
}

Rules:
- global_style should be a reusable cinematic style prompt
- character_prompt should define a consistent main character for scene chaining
- video_concept should summarise the narrative arc in 2 to 4 sentences
- scene_prompts should be short, clear, and OpenArt-friendly
- each prompt should be suitable for visual generation and scene chaining
- keep prompts practical and cinematic
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
    console.error('Video route error:', error)

    return NextResponse.json(
      { error: error?.message || 'Failed to generate video prompts' },
      { status: 500 }
    )
  }
}