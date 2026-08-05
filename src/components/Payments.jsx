import { useState, useEffect } from 'react'
import { toggleWorkerPaid, updateEvent } from '../api'
import styles from './Payments.module.css'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

function usePersistedMonth(key) {
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

export default function Payments({ events, onEventsChange }) {
  const [month, setMonth] = usePersistedMonth('eruit-month-payments')
  const [filterPaid, setFilterPaid] = useState('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)

  // ── Derive all payment rows from events (single source of truth) ──
  let rows = []
  events.forEach(ev => {
    const evMonth = ev.date ? new Date(ev.date + 'T00:00:00').getMonth() + 1 : null
    ;(ev.workers || []).forEach((w, idx) => {
      if (!w.name) return
      rows.push({
        key: ev.id + ':' + idx,
        event: ev,
        workerIdx: idx,
        workerName: w.name,
        amount: parseFloat(w.salary) || 0,
        paid: !!w.paid,
        paidAt: w.paid_at || null,
        month: evMonth
      })
    })
  })

  // Filter
  let filtered = rows.filter(r => {
    if (month && r.month !== parseInt(month)) return false
    if (filterPaid === 'paid' && !r.paid) return false
    if (filterPaid === 'unpaid' && r.paid) return false
    if (search.trim() && !r.workerName.includes(search.trim()) && !(r.event.name || '').includes(search.trim())) return false
    return true
  })

  // Totals
  const totalOwed = filtered.reduce((s, r) => s + (!r.paid ? r.amount : 0), 0)
  const totalPaid = filtered.reduce((s, r) => s + (r.paid ? r.amount : 0), 0)
  const totalAll  = totalOwed + totalPaid
  const openCount = filtered.filter(r => !r.paid).length

  // Group by event
  const byEvent = {}
  filtered.forEach(r => {
    if (!byEvent[r.event.id]) byEvent[r.event.id] = { event: r.event, rows: [] }
    byEvent[r.event.id].rows.push(r)
  })
  const grouped = Object.values(byEvent).sort((a, b) => {
    const aUnpaid = a.rows.some(r => !r.paid)
    const bUnpaid = b.rows.some(r => !r.paid)
    if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1
    return new Date(b.event.date || 0) - new Date(a.event.date || 0)
  })

  async function handleToggle(r) {
    setBusy(r.key)
    try {
      const updated = await toggleWorkerPaid(r.event, r.workerIdx, !r.paid)
      onEventsChange(updated)
    } catch (e) {
      alert('שגיאה: ' + e.message)
    }
    setBusy(null)
  }

  async function handlePayAll(group) {
    const unpaid = group.rows.filter(r => !r.paid)
    if (!unpaid.length) return
    if (!confirm(`לסמן ${unpaid.length} עובדים כשולם?`)) return
    setBusy('all:' + group.event.id)
    try {
      const now = new Date().toISOString()
      const updatedWorkers = (group.event.workers || []).map((w, i) =>
        unpaid.find(r => r.workerIdx === i)
          ? { ...w, paid: true, paid_at: now }
          : w
      )
      const updated = await updateEvent(group.event.id, { ...group.event, workers: updatedWorkers })
      onEventsChange(updated)
    } catch (e) {
      alert('שגיאה: ' + e.message)
    }
    setBusy(null)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>תשלומים</h1>
        <div className={styles.filters}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש עובד / אירוע..." className={styles.searchInput} />
          <select value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <div className={styles.filterBtns}>
            {[['all','הכל'],['unpaid','חייב'],['paid','שולם']].map(([v,l]) => (
              <button key={v} className={`${styles.filterBtn} ${filterPaid === v ? styles.filterBtnActive : ''}`} onClick={() => setFilterPaid(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={`${styles.metric} ${styles.metricDanger}`}>
          <div className={styles.metricVal}>₪{totalOwed.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>חייב לשלם</div>
        </div>
        <div className={`${styles.metric} ${styles.metricSuccess}`}>
          <div className={styles.metricVal}>₪{totalPaid.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>שולם</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>₪{totalAll.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>סה"כ</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{openCount}</div>
          <div className={styles.metricLbl}>תשלומים פתוחים</div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-receipt-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
          אין תשלומים להציג
        </div>
      ) : grouped.map(group => {
        const ev = group.event
        const evTotal = group.rows.reduce((s, r) => s + r.amount, 0)
        const evOwed  = group.rows.reduce((s, r) => s + (!r.paid ? r.amount : 0), 0)
        const allPaid = group.rows.every(r => r.paid)
        const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : '—'
        const isBusyAll = busy === 'all:' + ev.id

        return (
          <div key={ev.id} className={`${styles.eventCard} ${allPaid ? styles.eventCardDone : ''}`}>
            <div className={styles.eventCardHeader}>
              <div>
                <div className={styles.eventCardTitle}>{ev.name}</div>
                <div className={styles.eventCardMeta}>
                  {ev.location && <span><i className="ti ti-map-pin" /> {ev.location}</span>}
                  <span><i className="ti ti-calendar" /> {d}</span>
                </div>
              </div>
              <div className={styles.eventCardTotals}>
                {evOwed > 0 && <span className={styles.owedBadge}>חייב ₪{evOwed.toLocaleString('he-IL')}</span>}
                {allPaid && <span className={styles.paidBadge}><i className="ti ti-check" /> שולם הכל</span>}
                <span className={styles.totalLabel}>סה"כ ₪{evTotal.toLocaleString('he-IL')}</span>
                {!allPaid && (
                  <button className={styles.payAllBtn} onClick={() => handlePayAll(group)} disabled={isBusyAll}>
                    {isBusyAll ? '...' : <><i className="ti ti-checks" /> שלם הכל</>}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.paymentList}>
              {group.rows.map(r => (
                <div key={r.key} className={`${styles.paymentRow} ${r.paid ? styles.paymentRowPaid : ''}`}>
                  <span className={styles.workerName}>{r.workerName}</span>
                  <span className={styles.amount}>₪{r.amount.toLocaleString('he-IL')}</span>
                  {r.paid && r.paidAt && (
                    <span className={styles.paidAt}>שולם {new Date(r.paidAt).toLocaleDateString('he-IL')}</span>
                  )}
                  {r.paid && !r.paidAt && <span className={styles.paidAt}>שולם</span>}
                  {!r.paid && <span className={styles.pendingLabel}>ממתין</span>}
                  <button
                    className={`${styles.toggleBtn} ${r.paid ? styles.toggleBtnPaid : styles.toggleBtnUnpaid}`}
                    onClick={() => handleToggle(r)}
                    disabled={busy === r.key}
                  >
                    {busy === r.key
                      ? '...'
                      : r.paid
                        ? <><i className="ti ti-x" /> בטל</>
                        : <><i className="ti ti-check" /> שולם</>
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
