import {
  extractSectionTextStrict,
  replaceSectionText,
} from './songSections'
import {
  cleanRewriteText,
  countLyricLines,
} from './rewriteText'
import { assertLineCountPreserved } from './rewriteValidation'

const stripRewriteLineNumbers = (text: string) => {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\d+\.\s*/, ''))
    .join('\n')
    .trim()
}

export const finalizeRewriteText = ({
  rewritten,
  rewriteSectionOnly,
  rewriteSectionName,
  fullSourceText,
  sourceText,
  mustPreserveLines,
  originalLineCount,
  isSectionHeader,
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
  const cleanedRewriteWithoutNumbers = stripRewriteLineNumbers(cleanedRewrite)

  let finalText = cleanedRewriteWithoutNumbers

  if (rewriteSectionOnly) {
    const boundaryCheck = isSectionHeader

    const extractedRewrittenSection = extractSectionTextStrict(
      cleanedRewriteWithoutNumbers,
      rewriteSectionName,
      boundaryCheck
    )

    const safeRewrittenSection =
      extractedRewrittenSection || cleanedRewriteWithoutNumbers

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