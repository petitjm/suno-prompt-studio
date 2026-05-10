import {
  extractSectionTextStrict,
  isSectionBoundary,
  replaceSectionText,
} from './songSections'
import {
  cleanRewriteText,
  countLyricLines,
} from './rewriteText'
import { assertLineCountPreserved } from './rewriteValidation'

export const finalizeRewriteText = ({
  rewritten,
  rewriteSectionOnly,
  rewriteSectionName,
  fullSourceText,
  sourceText,
  mustPreserveLines,
  originalLineCount,
  isSectionHeader,
  looksLikeChordLine,
}: {
  rewritten: string
  rewriteSectionOnly: boolean
  rewriteSectionName: string
  fullSourceText: string
  sourceText: string
  mustPreserveLines: boolean
  originalLineCount: number
  isSectionHeader: (line: string) => boolean
  looksLikeChordLine: (line: string) => boolean
}) => {
  const cleanedRewrite = cleanRewriteText(rewritten)

  let finalText = cleanedRewrite

  if (rewriteSectionOnly) {
    const boundaryCheck = (line: string) =>
      isSectionBoundary(line, looksLikeChordLine)

    const extractedRewrittenSection = extractSectionTextStrict(
      rewritten,
      rewriteSectionName,
      boundaryCheck
    )

    const safeRewrittenSection =
      extractedRewrittenSection || cleanedRewrite

    if (!safeRewrittenSection.trim()) {
      throw new Error('Failed to isolate rewritten section')
    }

    const rewrittenLineCount = countLyricLines(
      safeRewrittenSection,
      isSectionHeader
    )

    assertLineCountPreserved({
      mustPreserveLines,
      rewrittenLineCount,
      originalLineCount,
    })

    const originalLyricLineCount = sourceText
      .split('\n')
      .filter((line) => line.trim().length > 0 && !boundaryCheck(line))
      .length

    const safeSectionForReplacement = safeRewrittenSection
      .split('\n')
      .filter((line) => line.trim().length > 0 && !boundaryCheck(line))
      .slice(0, originalLyricLineCount)
      .join('\n')

    finalText = replaceSectionText(
      fullSourceText,
      rewriteSectionName,
      safeSectionForReplacement,
      boundaryCheck
    )
  }

  return finalText
}