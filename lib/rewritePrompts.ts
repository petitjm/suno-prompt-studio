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
  sectionOnly: boolean
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
  parts.push('Preserve the emotional meaning, story context, and point of view of the original lyric.')
  parts.push('Do not introduce new characters, places, imagery, or cultural references unless they already exist in the source lyric or the user explicitly asks for them.')

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