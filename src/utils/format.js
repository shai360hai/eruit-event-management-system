// Shared formatting utilities

/**
 * Format a YYYY-MM-DD date string for display in Hebrew locale.
 * Returns '—' when the input is falsy.
 */
export function fmtDate(dateStr, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', opts)
}

/**
 * Format a YYYY-MM-DD date string as DD/MM/YYYY.
 */
export function fmtDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Get the 1-based month number from a YYYY-MM-DD string.
 */
export function monthOf(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00').getMonth() + 1
}

/**
 * Format a number as an ILS currency string (e.g. "₪1,234").
 */
export function fmtCurrency(amount) {
  return '₪' + (parseFloat(amount) || 0).toLocaleString('he-IL')
}
