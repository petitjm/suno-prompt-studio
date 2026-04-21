export function parsePerformanceSections(sheet: string): PerformanceSection[] {
  const lines = sheet.split('\n')
  const sections: PerformanceSection[] = []

  let currentLabel = 'Song'
  let currentContent: string[] = []

  const pushSection = () => {
    const content = currentContent.join('\n').trim()
    if (!content) return

    sections.push({
      id: `section-${sections.length}`,
      label: currentLabel,
      content,
    })
  }

  const normalizePlainHeaderLabel = (value: string) => {
    return value
      .trim()
      .replace(/:$/, '')
      .replace(/\s+/g, ' ')
  }

  const isPlainSectionHeader = (value: string) => {
    return /^(intro|verse(?:\s+\d+)?|pre-chorus|chorus(?:\s+\d+)?|bridge|middle 8|outro|refrain|hook)(:)?$/i.test(
      value.trim()
    )
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const bracketMatch = trimmed.match(/^\[(.+?)\]$/)

    if (bracketMatch) {
      pushSection()
      currentLabel = bracketMatch[1].trim()
      currentContent = [line]
      continue
    }

    if (isPlainSectionHeader(trimmed)) {
      pushSection()
      currentLabel = normalizePlainHeaderLabel(trimmed)
      currentContent = [line]
      continue
    }

    currentContent.push(line)
  }

  pushSection()

  if (sections.length === 0 && sheet.trim()) {
    return [
      {
        id: 'section-0',
        label: 'Song',
        content: sheet.trim(),
      },
    ]
  }

  return sections
}