export type DetectedSection = {
  id: string
  label: string
}

export const normaliseSectionName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/:$/, '')
    .replace(/\s*#\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

export const parseSectionTarget = (sectionName: string) => {
  const clean = sectionName.replace(/\s*#\d+$/, '').trim()
  const instanceMatch = sectionName.match(/#(\d+)$/)

  return {
    label: normaliseSectionName(clean),
    instance: instanceMatch ? Number(instanceMatch[1]) : 1,
  }
}

export const isSectionBoundary = (
  line: string,
  looksLikeChordLine: (line: string) => boolean
) => {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (looksLikeChordLine(trimmed)) return false

  return (
    /^\[[^\]]+\]$/.test(trimmed) ||
    /^[A-Za-z0-9][A-Za-z0-9\s\-\/]*:$/.test(trimmed)
  )
}

export const detectSections = (
  text: string,
  isSectionHeader: (line: string) => boolean
): DetectedSection[] => {
  const counts: Record<string, number> = {}

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => isSectionHeader(line))
    .map((line) => {
      const label = line
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .replace(/:$/, '')
        .trim()

      const key = label.toLowerCase()
      counts[key] = (counts[key] || 0) + 1

      return {
        id: `${key}-${counts[key]}`,
        label: `${label} #${counts[key]}`,
      }
    })
}


export const extractSectionTextStrict = (
  text: string,
  sectionName: string,
  isSectionBoundary: (line: string) => boolean
) => {
  if (!sectionName.trim()) return ''

  const target = parseSectionTarget(sectionName)
  const lines = text.split('\n')

  const sectionIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isSectionBoundary(line))

  let matchCount = 0

  const targetBoundary = sectionIndexes.find(({ line }) => {
    if (normaliseSectionName(line) !== target.label) return false
    matchCount += 1
    return matchCount === target.instance
  })

  if (!targetBoundary) return ''

  const startIndex = targetBoundary.index

  const nextBoundary = sectionIndexes.find(
    ({ index }) => index > startIndex
  )

  const endIndex = nextBoundary ? nextBoundary.index : lines.length

  return lines.slice(startIndex, endIndex).join('\n').trim()
}

export const replaceSectionText = (
  fullText: string,
  sectionName: string,
  newSectionText: string,
  isSectionBoundary: (line: string) => boolean
) => {
  if (!sectionName.trim()) return fullText

  const target = parseSectionTarget(sectionName)
  const lines = fullText.split('\n')

  const sectionIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isSectionBoundary(line))

  let matchCount = 0

  const targetBoundary = sectionIndexes.find(({ line }) => {
    if (normaliseSectionName(line) !== target.label) return false
    matchCount += 1
    return matchCount === target.instance
  })

  if (!targetBoundary) return fullText

  const startIndex = targetBoundary.index

  const nextBoundary = sectionIndexes.find(
    ({ index }) => index > startIndex
  )

  const endIndex = nextBoundary ? nextBoundary.index : lines.length
  const originalHeader = lines[startIndex]

  const replacementBody: string[] = []
  let hasStartedBody = false

  for (const line of newSectionText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (isSectionBoundary(trimmed)) {
      if (hasStartedBody) break
      continue
    }

    hasStartedBody = true
    replacementBody.push(line)
  }

  return [
    ...lines.slice(0, startIndex),
    originalHeader,
    ...replacementBody,
    '',
    ...lines.slice(endIndex).filter((line, index) => index !== 0 || line.trim() !== ''),
  ].join('\n')
}


