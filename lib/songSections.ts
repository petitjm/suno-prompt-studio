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