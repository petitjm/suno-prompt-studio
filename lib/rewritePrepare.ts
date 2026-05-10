import { buildNumberedRewriteSource } from './rewriteText'

export const buildStructuredRewriteSource = ({
  sourceText,
  rewriteSectionOnly,
  mustPreserveLines,
  isSectionHeader,
}: {
  sourceText: string
  rewriteSectionOnly: boolean
  mustPreserveLines: boolean
  isSectionHeader: (line: string) => boolean
}) => {
  if (rewriteSectionOnly && mustPreserveLines) {
    return buildNumberedRewriteSource(sourceText, isSectionHeader)
  }

  return sourceText
}