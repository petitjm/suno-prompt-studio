export const looksLikeChordLine = (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return false

  // Do not treat obvious lyric lines as chord lines
  if (
    /[a-z]{2,}/.test(
      trimmed.replace(
        /\b(add|maj|min|dim|aug|sus|solo|intro|outro|bridge|verse|chorus)\b/gi,
        ''
      )
    )
  ) {
    const lyricWords = trimmed
      .split(/\s+/)
      .filter((word) => /^[a-z]{2,}$/i.test(word))
      .length

    if (lyricWords >= 3 && !trimmed.includes('|')) return false
  }

  const chordTokenRegex =
    /^[A-G](#|b)?(m|maj|min|dim|aug|sus|add)?[0-9]*(\((add|sus|maj|min|dim|aug)?[#b]?[0-9]+\))?((add|sus|maj|min|dim|aug)[#b]?[0-9]+)?(\/[A-G](#|b)?)?$/i

  const cleaned = trimmed
    .replace(/[|]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  let tokens = cleaned
    .split(' ')
    .flatMap((token) =>
      token
        .replace(/[()[\]]/g, '')
        .split('-')
        .map((part) => part.trim())
        .filter(Boolean)
    )

  const leadingLabels = [
    'solo',
    'intro',
    'outro',
    'instrumental',
    'break',
    'turnaround',
    'alt',
  ]

  if (tokens.length > 1 && leadingLabels.includes(tokens[0].toLowerCase())) {
    tokens = tokens.slice(1)
  }

  if (!tokens.length) return false

  const chordCount = tokens.filter((token) => chordTokenRegex.test(token)).length

  // Single standalone chord line, e.g. G, D7, Am, Bbmaj7
  if (tokens.length === 1 && chordCount === 1) {
    return true
  }

  // Bar-line chord format, e.g. solo |G |D7 |G |C
  if (trimmed.includes('|') && chordCount >= 2) return true

  // Spaced chord line, e.g. G        D7       C
  if (chordCount >= 2 && chordCount >= Math.ceil(tokens.length * 0.6)) {
    return true
  }

  return false
}