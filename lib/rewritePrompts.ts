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

  if (constraint === 'shorten') {
    parts.push('Shorten the lyrics while preserving the main emotional meaning.')
  }

  if (constraint === 'same-structure') {
    parts.push('Keep the same section structure and overall shape.')
  }

  return parts.join(' ')
}