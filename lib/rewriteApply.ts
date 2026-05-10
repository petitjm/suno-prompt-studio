export const applyRewriteToTarget = ({
  rewriteTarget,
  finalText,
  setCompareLeftText,
  setCompareRightText,
  setPerformanceSheet,
  setFlashLeftPanel,
  setFlashRightPanel,
}: {
  rewriteTarget: 'left' | 'right' | 'main'
  finalText: string
  setCompareLeftText: (value: string) => void
  setCompareRightText: (value: string) => void
  setPerformanceSheet: (value: string) => void
  setFlashLeftPanel: (value: boolean) => void
  setFlashRightPanel: (value: boolean) => void
}) => {
  if (rewriteTarget === 'left') {
    setCompareLeftText(finalText)
    setFlashLeftPanel(true)
    window.setTimeout(() => setFlashLeftPanel(false), 600)
    return
  }

  if (rewriteTarget === 'right') {
    setCompareRightText(finalText)
    setFlashRightPanel(true)
    window.setTimeout(() => setFlashRightPanel(false), 600)
    return
  }

  setPerformanceSheet(finalText)
}