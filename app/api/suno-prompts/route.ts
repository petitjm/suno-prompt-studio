import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type SunoPromptRequest = {
  lyrics?: string
  currentStylePrompt?: string
  currentVocalDirection?: string
  currentArrangementNotes?: string
  currentIntroSoloOutro?: string
  currentNegativePrompt?: string
  creationNotes?: string
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
    const currentStylePrompt = body.currentStylePrompt?.trim() || ''
    const currentVocalDirection = body.currentVocalDirection?.trim() || ''
    const currentArrangementNotes = body.currentArrangementNotes?.trim() || ''
    const currentIntroSoloOutro = body.currentIntroSoloOutro?.trim() || ''
    const currentNegativePrompt = body.currentNegativePrompt?.trim() || ''
    const creationNotes = body.creationNotes?.trim() || ''

    if (!lyrics) {
      return NextResponse.json(
        { error: 'Add lyrics before generating Suno prompts.' },
        { status: 400 }
      )
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.9,
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
- Keep the prompts practical for Suno 5.5 Advanced mode.
- Make the style prompt concise but descriptive.
- Assume a natural British male low baritone vocal unless the lyrics clearly suggest otherwise.
- Keep the arrangement song-focused, not overproduced.
- Include useful intro, solo, and outro direction.
- Include a negative prompt that avoids common unwanted outputs.
- When revision notes are present, the output should feel like a revised next attempt, not a repeat.


Current prompt direction:
Style prompt: ${currentStylePrompt || 'Not provided'}
Vocal direction: ${currentVocalDirection || 'Not provided'}
Arrangement notes: ${currentArrangementNotes || 'Not provided'}
Intro / solo / outro: ${currentIntroSoloOutro || 'Not provided'}
Negative prompt: ${currentNegativePrompt || 'Not provided'}

Suno creation notes from previous generations:
${creationNotes || 'No previous Suno creation notes provided.'}

Revision rules:
- If creation notes are provided, you MUST revise the prompts in a noticeable way.
- Keep anything the notes say worked well.
- Directly fix anything the notes say did not work.
- If the notes mention the vocal, change the vocalDirection and voice-related wording.
- If the notes mention the intro, solo, outro, or arrangement, change the arrangementNotes and introSoloOutro fields.
- If the notes mention the style being wrong, change the stylePrompt.
- If the notes mention unwanted sounds, add them to the negativePrompt.
- Do not simply repeat the current prompt direction when creation notes ask for changes.
- Make the next Suno version more targeted and practical.

Use the current prompt direction as guidance. If creation notes are provided, adapt the next prompts to address them. Keep what worked, fix what did not work, and make the next Suno version more usable.

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