export const formatUkDateTime = (value?: string) => {
  if (!value) return ''

  const hasTimezone =
    value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)

  const date = new Date(hasTimezone ? value : `${value}Z`)

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}