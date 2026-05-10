export const buildRewriteSuccessMessage = ({
  rewriteConstraint,
  rewriteSectionName,
  originalLineCount,
  lastLineCount,
  normaliseSectionName,
}: {
  rewriteConstraint: string
  rewriteSectionName: string
  originalLineCount: number
  lastLineCount: number
  normaliseSectionName: (value: string) => string
}) => {
  if (
    rewriteConstraint === 'keep-lines' &&
    normaliseSectionName(rewriteSectionName).includes('chorus') &&
    lastLineCount !== originalLineCount
  ) {
    return `Rewrite complete — chorus polished with flexible structure (${originalLineCount} → ${lastLineCount} lines)`
  }

  if (rewriteConstraint === 'keep-lines') {
    return `Rewrite complete — ${originalLineCount} lines preserved`
  }

  return 'Rewrite complete'
}