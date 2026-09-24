import { useState, useEffect } from 'react'

/**
 * A month string persisted in sessionStorage.
 * Returns [month, setMonth] where month is a 1-based string like "3" or "".
 */
export function usePersistedMonth(key) {
  const [month, setMonth] = useState(() => {
    try {
      const s = sessionStorage.getItem(key)
      if (s !== null) return s
    } catch {}
    return String(new Date().getMonth() + 1)
  })

  useEffect(() => {
    try { sessionStorage.setItem(key, month) } catch {}
  }, [month, key])

  return [month, setMonth]
}
