export const rewritePresets = [
  'Make it more emotional',
  'Make it more conversational',
  'Make it more poetic',
  'Make it more radio-friendly',
  'Simplify the language',
]

export const buildRewriteInstruction = (
  instruction: string,
  constraint: string,
  sectionOnly: boolean,
  rewriteVoice: string,
  protectSongContext: boolean
) => {
  const parts: string[] = []

  if (instruction.trim()) {
    if (instruction === 'Make it more poetic') {
      parts.push(
        'Make it more poetic without becoming ornate. Preserve the emotional meaning, natural voice, and singability. Improve imagery only where it strengthens the line. Do not replace simple heartfelt phrases with awkward metaphors. Keep the lyric clear, human, and performable.'
      )
    } else {
      parts.push(instruction)
    }
  }

  parts.push('Return rewritten lyrics only.')
  parts.push('Do not explain the changes.')
  parts.push('Do not create a new song structure.')
 
  if (protectSongContext) {
  parts.push('CONTEXT PROTECTION:')
  parts.push('Preserve the song’s existing story, emotional situation, speaker, and point of view.')
  parts.push('Do not introduce new characters, locations, events, cultural references, or imagery unless they already exist in the source lyric or the user explicitly asks for them.')
  parts.push('Improve the wording without changing what the line or section is fundamentally saying.')
}
  if (rewriteVoice === 'british-natural') {
      parts.push(
        'VOICE / LOCALE: Use natural British phrasing. Keep the language believable for a UK songwriter and singer. Avoid unnecessary American idioms, Nashville clichés, Southern imagery, trucks, highways, whiskey bars, dust roads, or small-town USA references unless they already exist in the source lyric or the user explicitly asks for them.'
      )
    }

    if (rewriteVoice === 'british-songwriter') {
      parts.push(
        'VOICE / LOCALE: Use a British singer-songwriter voice. Keep the lyric emotionally direct, understated where appropriate, literate but not ornate, and natural for a UK performer. Avoid Americanised phrasing and imported Americana imagery unless requested.'
      )
    }

    if (rewriteVoice === 'uk-folk-rock') {
      parts.push(
        'VOICE / LOCALE: Use a UK folk rock voice. Keep phrasing grounded, human, melodic, and suitable for acoustic guitar performance. Prefer natural British imagery and avoid American country clichés unless already present in the lyric.'
      )
    }

    if (rewriteVoice === 'americana-country') {
      parts.push(
        'VOICE / LOCALE: Use modern country / Americana phrasing where appropriate. Warm, direct, emotionally clear, and singable. Country imagery is allowed, but do not add clichés or new story details that conflict with the original lyric.'
      )
    }

    if (rewriteVoice === 'neutral-commercial') {
      parts.push(
        'VOICE / LOCALE: Use neutral commercial songwriting language. Keep it clear, accessible, emotionally direct, and broadly singable. Avoid strong regional idioms unless already present in the source lyric.'
      )
    }


  if (sectionOnly) {
    parts.push('Rewrite ONLY the supplied section.')
    parts.push('Do not rewrite the full song.')
    parts.push('Return only the rewritten section, not the full song.')
    parts.push('Do not add other sections.')
  }

  if (constraint === 'keep-lines') {
    parts.push('Keep exactly the same number of lines as the original.')
    parts.push('Do not add lines.')
    parts.push('Do not remove lines.')
    parts.push('Keep each rewritten line roughly the same length as the original line.')
    parts.push('Preserve a similar syllable count and lyrical cadence.')
    parts.push('Avoid expanding short lines into long phrases.')
    parts.push('Keep phrasing tight and singable.')
  }

  if (constraint === 'syllable-feel') {
    parts.push('RHYTHM / SYLLABLE CONSTRAINT:')
    parts.push('Keep exactly the same number of lyric lines as the original.')
    parts.push('For each rewritten line, stay close to the original syllable count and sung rhythm.')
    parts.push('Preserve the natural stress pattern and phrasing shape where possible.')
    parts.push('Do not make lines noticeably longer or shorter than the original.')
    parts.push('Prioritise singability with the existing melody over clever new wording.')
    parts.push('Preserve the emotional meaning and context of each line.')
    parts.push('If a line is short, keep it short. If a line has a strong rhythmic hook, preserve that hook-like rhythm.')
  }

  if (constraint === 'shorten') {
    parts.push('Shorten the lyrics while preserving the main emotional meaning.')
  }

  if (constraint === 'same-structure') {
    parts.push('Keep the same section structure and overall shape.')
  }

  return parts.join(' ')
}