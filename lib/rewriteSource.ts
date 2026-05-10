export const getRewriteFullSourceText = ({
  rewriteTarget,
  compareLeftText,
  compareRightText,
  performanceSheet,
}: {
  rewriteTarget: 'left' | 'right' | 'main'
  compareLeftText: string
  compareRightText: string
  performanceSheet: string
}) => {
  if (rewriteTarget === 'left') return compareLeftText
  if (rewriteTarget === 'right') return compareRightText
  return performanceSheet
}

export const getMustPreserveLines = (rewriteConstraint: string) => {
  return rewriteConstraint === 'keep-lines'
}