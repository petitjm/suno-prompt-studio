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
  keepFromLastVersion?: string
  changeInNextVersion?: string
  useCreationNotesAsMainDriver?: boolean
  revisionFocus?: string
  sunoResultRating?: string
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
    const keepFromLastVersion = body.keepFromLastVersion?.trim() || ''
    const changeInNextVersion = body.changeInNextVersion?.trim() || ''
    const revisionFocus = body.revisionFocus?.trim() || 'Balanced revision'
    const sunoResultRating = body.sunoResultRating?.trim() || 'Good but needs changes'
    const useCreationNotesAsMainDriver = Boolean(
      body.useCreationNotesAsMainDriver
    )

    if (!lyrics) {
      return NextResponse.json(
        { error: 'Add lyrics before generating Suno prompts.' },
        { status: 400 }
      )
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
           'You are a professional songwriting, music production, and Suno prompt assistant. Return only valid JSON object text. Do not use markdown. Do not wrap the JSON in code fences.',
        },
        {
          role: 'user',
          content: `
Create Suno-ready prompts for this song.

Return JSON with exactly these keys:
{
  "stylePrompt": string,
  "sunoStyleField": string,
  "vocalDirection": string,
  "arrangementNotes": string,
  "introSoloOutro": string,
  "negativePrompt": string,
  "revisionSummary": string
}

Guidance:
- Keep the prompts practical for Suno 5.5 Advanced mode.
- The sunoStyleField must be a compact paste-ready Suno 5.5 Style field.
- sunoStyleField should include the most important genre, mood, vocal character, instrumentation, and production feel.
- sunoStyleField should not include detailed intro, solo, outro, or full arrangement instructions.
- sunoStyleField should start with a capital letter and read as a clean, paste-ready style phrase.
- Keep sunoStyleField under 350 characters where possible.
- stylePrompt may be fuller and more descriptive than sunoStyleField.
- Make the style prompt concise but descriptive.
- Assume a natural British male low baritone vocal unless the lyrics clearly suggest otherwise.
- Keep the arrangement song-focused, not overproduced.
- Include useful intro, solo, and outro direction.
- If revision notes mention a specific improvement such as stronger guitar, clearer vocal, or female harmony, include a short version of that improvement in sunoStyleField.
- Include a negative prompt that avoids common unwanted outputs.
- When revision notes are present, the output should feel like a revised next attempt, not a repeat.
- revisionSummary should briefly explain what changed and why, especially when creation notes are provided.
- If no creation notes are provided, revisionSummary should say this is a fresh Suno prompt generation from the current lyrics.


Current prompt direction:
Style prompt: ${currentStylePrompt || 'Not provided'}
Vocal direction: ${currentVocalDirection || 'Not provided'}
Arrangement notes: ${currentArrangementNotes || 'Not provided'}
Intro / solo / outro: ${currentIntroSoloOutro || 'Not provided'}
Negative prompt: ${currentNegativePrompt || 'Not provided'}

Revision focus:
${revisionFocus}

Last Suno result:
${sunoResultRating}

Creation notes as main driver:
${useCreationNotesAsMainDriver ? 'Yes' : 'No'}

Suno creation notes from previous generations:
${creationNotes || 'No previous Suno creation notes provided.'}

Keep from last version:
${keepFromLastVersion || 'No keep guidance provided.'}

Change in next version:
${changeInNextVersion || 'No change guidance provided.'}

Revision rules:
- Use the Last Suno result rating to decide revision strength.
- If the result was "Great", make only small careful refinements.
- If the result was "Good but needs changes", preserve the core direction and fix the notes directly.
- If the result was "Poor", make stronger changes while preserving the lyrics and intended genre.
- If the result was "Unusable", make a more decisive reset of style, vocal, and arrangement while still respecting the song.
- Use the revision focus as the main priority when deciding what to change.
- If the revision focus is "Fix vocal", prioritise vocalDirection and voice-related wording.
- If the revision focus is "Fix arrangement", prioritise arrangementNotes and production feel.
- If the revision focus is "Fix intro/solo/outro", prioritise introSoloOutro.
- If the revision focus is "Make more acoustic", reduce electronic, synthetic, or overproduced elements.
- If the revision focus is "Make more commercial", improve accessibility, hook lift, and radio-friendly clarity without making the song generic.
- Treat "Keep from last version" as protected guidance. Preserve those qualities unless they conflict with the lyrics.
- Treat "Change in next version" as direct revision instructions. These should visibly influence the next prompt.
- If keep and change instructions conflict, preserve the keep guidance but adjust the change request more subtly.
- If "Creation notes as main driver" is Yes, prioritise the creation notes over the current prompt direction.
- When creation notes are the main driver, make bolder changes to stylePrompt, sunoStyleField, vocalDirection, arrangementNotes, introSoloOutro, and negativePrompt as needed.
- Still preserve the song’s core lyrical mood and genre unless the creation notes clearly request a change.
- If creation notes are provided, you MUST revise the prompts in a noticeable way.
- If the notes mention vocals being too soft, weak, buried, unclear, or lacking presence, strengthen vocalDirection with clearer diction, more forward vocal presence, and stronger emotional projection.
- If the notes mention guitar needing to be stronger, clearer, more prominent, or more driving, strengthen arrangementNotes and sunoStyleField with more prominent acoustic guitar wording.
- If the notes mention harmony, backing vocals, duet, or female harmony, include that clearly in vocalDirection and arrangementNotes.
- If the notes mention a specific section such as first chorus, second verse, bridge, or final chorus, include that section instruction in arrangementNotes or introSoloOutro as appropriate.
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
  } 
  
  catch (error) {
  console.error('Suno prompt generation error:', error)

  const message =
    error instanceof Error
      ? error.message
      : 'Unknown Suno prompt generation error.'

  return NextResponse.json(
    {
      error: `Could not generate Suno prompts. ${message}`,
    },
    { status: 500 }
  )
}
}