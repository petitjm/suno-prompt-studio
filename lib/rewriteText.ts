export const cleanRewriteText = (text: string) =>
  text
    .replace(/^\s*\[[^\]]+\]\s*$/gm, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    .trim()

export const countLyricLines = (
  text: string,
  isSectionHeader: (line: string) => boolean
) =>
  text
    .split('\n')
    .filter((line) => line.trim().length > 0 && !isSectionHeader(line))
    .length

export const buildNumberedRewriteSource = (
  sourceText: string,
  isSectionHeader: (line: string) => boolean
) => {
  const lines = sourceText.split('\n')

  const lyricLines = lines.filter(
    (line) => line.trim().length > 0 && !isSectionHeader(line)
  )

  const numbered = lyricLines
    .map((line, index) => `${index + 1}. ${line}`)
    .join('\n')

  return `
FULL SECTION (for context):
${sourceText}

REWRITE THESE NUMBERED LINES:
${numbered}
`
}