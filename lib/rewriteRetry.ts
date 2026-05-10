export const shouldStopRewriteAttempts = ({
  rewriteSectionOnly,
  mustPreserveLines,
  shouldRelaxAfterTwoFailures,
  lastLineCount,
  originalLineCount,
}: {
  rewriteSectionOnly: boolean
  mustPreserveLines: boolean
  shouldRelaxAfterTwoFailures: boolean
  lastLineCount: number
  originalLineCount: number
}) => {
  if (!rewriteSectionOnly) return true
  if (!mustPreserveLines) return true
  if (shouldRelaxAfterTwoFailures) return true
  return lastLineCount === originalLineCount
}