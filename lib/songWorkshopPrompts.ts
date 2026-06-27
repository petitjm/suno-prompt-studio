type WorkshopControls = {
  developmentFocus?: string
  changeIntensity?: number
  preserveOriginal?: number
  emotionalDirectness?: number
  singability?: number
}

type BuildSongWorkshopDraftPromptInput = {
  lyrics: string
  songTitle: string
  songVersionTitle: string
  workshopNotes: string
  workshopControls: WorkshopControls
  analysisResult?: unknown
}

export const buildSongWorkshopDraftPrompt = ({
  lyrics,
  songTitle,
  songVersionTitle,
  workshopNotes,
  workshopControls,
  analysisResult,
}: BuildSongWorkshopDraftPromptInput) => {
  const developmentFocus =
    workshopControls.developmentFocus || 'connect-fragments'

  const changeIntensity = workshopControls.changeIntensity || 3
  const preserveOriginal = workshopControls.preserveOriginal || 4
  const emotionalDirectness = workshopControls.emotionalDirectness || 3
  const singability = workshopControls.singability || 4

  return `
You are helping develop a song draft for a British male acoustic singer-songwriter.

The goal is not to make the song generic. The goal is to preserve the writer's emotional intent while improving structure, clarity, singability, and cohesion.

PROJECT CONTEXT:
Song title: ${songTitle || 'Untitled project'}
Song version: ${songVersionTitle || 'Unsaved or untitled version'}

DEVELOPMENT FOCUS:
${developmentFocus}

CREATIVE CONTROLS:
- Change intensity: ${changeIntensity}/5
- Preserve original phrases: ${preserveOriginal}/5
- Emotional directness: ${emotionalDirectness}/5
- Singability: ${singability}/5

WORKSHOP NOTES:
${workshopNotes || 'No extra workshop notes provided.'}

CURRENT ANALYSIS:
${
  analysisResult
    ? JSON.stringify(analysisResult, null, 2)
    : 'No prior analysis was provided. Work directly from the lyrics and controls.'
}

SOURCE LYRICS / FRAGMENTS:
${lyrics}

TASK:
Create a cohesive song draft.

RULES:
- Preserve the strongest original images and emotional intent.
- Do not flatten the lyric into generic pop language.
- Keep the voice natural, direct, and singable.
- Use clear song sections such as [Verse 1], [Chorus], [Verse 2], [Bridge], [Final Chorus] where useful.
- If the source contains disconnected fragments, connect them through a clear central idea.
- Let the chorus carry the broader emotional meaning of the song.
- Avoid over-explaining.
- Prefer plain-spoken emotional truth over cleverness.

RETURN FORMAT:
Return only JSON with this shape:
{
  "title": "string",
  "versionTitle": "string",
  "lyric": "string",
  "whatWasKept": ["string"],
  "workshopControlNotes": ["string"],
  "whatChanged": ["string"],
  "nextStep": "string"
}
`.trim()
}


type BuildSongWorkshopAnalysisPromptInput = {
  lyrics: string
  songTitle: string
  songVersionTitle: string
  workshopNotes: string
  workshopControls: WorkshopControls
}

export const buildSongWorkshopAnalysisPrompt = ({
  lyrics,
  songTitle,
  songVersionTitle,
  workshopNotes,
  workshopControls,
}: BuildSongWorkshopAnalysisPromptInput) => {
  const developmentFocus =
    workshopControls.developmentFocus || 'connect-fragments'

  const changeIntensity = workshopControls.changeIntensity || 3
  const preserveOriginal = workshopControls.preserveOriginal || 4
  const emotionalDirectness = workshopControls.emotionalDirectness || 3
  const singability = workshopControls.singability || 4

  return `
You are analysing a rough song idea for a British male acoustic singer-songwriter.

The goal is not to rewrite the song yet. The goal is to diagnose the song idea, identify the emotional centre, explain how disconnected fragments might connect, and recommend the next creative move.

PROJECT CONTEXT:
Song title: ${songTitle || 'Untitled project'}
Song version: ${songVersionTitle || 'Unsaved or untitled version'}

DEVELOPMENT FOCUS:
${developmentFocus}

CREATIVE CONTROLS:
- Change intensity: ${changeIntensity}/5
- Preserve original phrases: ${preserveOriginal}/5
- Emotional directness: ${emotionalDirectness}/5
- Singability: ${singability}/5

WORKSHOP NOTES:
${workshopNotes || 'No extra workshop notes provided.'}

SOURCE LYRICS / FRAGMENTS:
${lyrics}

TASK:
Analyse the song idea.

ANALYSIS RULES:
- Identify the central emotional idea.
- Explain how the fragments could belong to the same song.
- Point out the main weakness honestly but constructively.
- Suggest a practical song shape.
- Respect the writer's original voice.
- Do not over-polish the concept.
- Do not write a full lyric draft.

RETURN FORMAT:
Return only JSON with this shape:
{
  "coreTheme": "string",
  "emotionalCentre": "string",
  "fragmentConnection": "string",
  "mainWeakness": "string",
  "controlNotes": ["string"],
  "suggestedShape": ["string"],
  "nextStep": "string"
}
`.trim()
}