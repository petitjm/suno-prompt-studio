export const shouldRelaxChorusAfterTwoFailures = ({
  rewriteSectionName,
  rewriteConstraint,
  attempt,
  normaliseSectionName,
}: {
  rewriteSectionName: string
  rewriteConstraint: string
  attempt: number
  normaliseSectionName: (value: string) => string
}) => {
  return (
    normaliseSectionName(rewriteSectionName).includes('chorus') &&
    rewriteConstraint === 'keep-lines' &&
    attempt >= 3
  )
}

export const isRelaxedChorusRewrite = ({
  rewriteSectionName,
  rewriteConstraint,
  lastLineCount,
  originalLineCount,
  normaliseSectionName,
}: {
  rewriteSectionName: string
  rewriteConstraint: string
  lastLineCount: number
  originalLineCount: number
  normaliseSectionName: (value: string) => string
}) => {
  return (
    normaliseSectionName(rewriteSectionName).includes('chorus') &&
    rewriteConstraint === 'keep-lines' &&
    lastLineCount !== originalLineCount
  )
}

export const assertSelectedSectionOnly = ({
  rewriteSectionOnly,
  sourceText,
  isSectionBoundary,
}: {
  rewriteSectionOnly: boolean
  sourceText: string
  isSectionBoundary: (line: string) => boolean
}) => {
  if (!rewriteSectionOnly) return

  const sourceSectionCount = sourceText
    .split('\n')
    .filter((line) => isSectionBoundary(line))
    .length

  if (sourceSectionCount > 1) {
    throw new Error(
      `Selected section extraction failed — found ${sourceSectionCount} sections instead of 1.`
    )
  }
}

export const assertLineCountPreserved = ({
  mustPreserveLines,
  rewrittenLineCount,
  originalLineCount,
}: {
  mustPreserveLines: boolean
  rewrittenLineCount: number
  originalLineCount: number
}) => {
  if (mustPreserveLines && rewrittenLineCount !== originalLineCount) {
    throw new Error(
      `Rewrite changed the line count (${originalLineCount} → ${rewrittenLineCount}). Try again.`
    )
  }
}