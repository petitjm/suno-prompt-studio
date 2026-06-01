import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type SunoPromptRequest = {
  lyrics?: string
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as SunoPromptRequest
    const lyrics = body.lyrics?.trim() || ''

    if (!lyrics) {
      return NextResponse.json(
        { error: 'Add lyrics before generating Suno prompts.' },
        { status: 400 }
      )
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional songwriting, music production, and Suno prompt assistant. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `
Create Suno-ready prompts for this song.

Return JSON with exactly these keys:
{
  "stylePrompt": string,
  "vocalDirection": string,
  "arrangementNotes": string,
  "introSoloOutro": string,
  "negativePrompt": string
}

Guidance:
- Keep the prompts practical for Suno.
- Make the style prompt concise but descriptive.
- Assume a natural British male low baritone vocal unless the lyrics clearly suggest otherwise.
- Keep the arrangement song-focused, not overproduced.
- Include useful intro, solo, and outro direction.
- Include a negative prompt that avoids common unwanted outputs.

Lyrics:
${lyrics}
          `.trim(),
        },
      ],
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No Suno prompt response returned.' },
        { status: 500 }
      )
    }

    let parsed

    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json(
        {
          error: 'Suno prompt response was not valid JSON.',
          raw: content,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Suno prompt generation error:', error)

    return NextResponse.json(
      { error: 'Could not generate Suno prompts.' },
      { status: 500 }
    )
  }
}