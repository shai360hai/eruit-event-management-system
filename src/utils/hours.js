// Compute worked hours from "HH:MM" start/end. Handles shifts crossing midnight.
export function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some(n => isNaN(n))) return 0
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60   // crossed midnight
  return Math.round((mins / 60) * 100) / 100
}

export function fmtHours(h) {
  if (!h) return '—'
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  return mins ? `${whole}:${String(mins).padStart(2, '0')}` : `${whole}`
}
