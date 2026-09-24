import { useState, useEffect } from 'react'
import { toggleWorkerPaid, updateEvent } from '../api'
import { calcHours, fmtHours } from '../utils/hours'
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

export default function Payments({ events, onEventsChange, isAdmin }) {
  const [month, setMonth] = usePersistedMonth('eruit-month-payments')
  const [groupBy, setGroupBy] = useState('event')   // event | worker | payer
  const [filterPaid, setFilterPaid] = useState('all')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)
  const [openKey, setOpenKey] = useState(null)
  const [editPayer, setEditPayer] = useState(null)
  const [payerVal, setPayerVal] = useState('')

  // ── Every charge row derives from events (single source of truth) ──
  const rows = []
  events.forEach(ev => {
    const evMonth = ev.date ? new Date(ev.date + 'T00:00:00').getMonth() + 1 : null
    ;(ev.workers || []).forEach((w, idx) => {
      if (!w.name) return
      rows.push({
        key: ev.id + ':' + idx,
        event: ev,
        workerIdx: idx,
        workerName: w.name.trim(),
        role: w.role || '',
        hours: calcHours(w.start_time, w.end_time),
        start: w.start_time || '',
        end: w.end_time || '',
        note: w.note || '',
        amount: parseFloat(w.salary) || 0,
        paid: !!w.paid,
        paidAt: w.paid_at || null,
        month: evMonth
      })
    })
  })

  const q = search.trim()
  const filtered = rows.filter(r => {
    if (month && r.month !== parseInt(month)) return false
    if (filterPaid === 'paid' && !r.paid) return false
    if (filterPaid === 'unpaid' && r.paid) return false
    if (q && !r.workerName.includes(q)
          && !(r.event.name || '').includes(q)
          && !(r.event.payer || '').includes(q)) return false
    return true
  })

  const totalOwed = filtered.reduce((s, r) => s + (!r.paid ? r.amount : 0), 0)
  const totalPaid = filtered.reduce((s, r) => s + (r.paid ? r.amount : 0), 0)
  const totalAll  = totalOwed + totalPaid
  const openCount = filtered.filter(r => !r.paid).length
  const monthLabel = month ? MONTHS[parseInt(month)] : 'כל החודשים'

  async function handleToggle(r) {
    setBusy(r.key)
    try {
      const updated = await toggleWorkerPaid(r.event, r.workerIdx, !r.paid)
      onEventsChange(updated)
    } catch (e) { alert('שגיאה: ' + e.message) }
    setBusy(null)
  }

  async function handlePayAll(ev, evRows) {
    const unpaid = evRows.filter(r => !r.paid)
    if (!unpaid.length) return
    const sum = unpaid.reduce((s, r) => s + r.amount, 0)
    if (!confirm(`לסמן ${unpaid.length} עובדים כשולם? (₪${sum.toLocaleString('he-IL')})`)) return
    setBusy('all:' + ev.id)
    try {
      const now = new Date().toISOString()
      const updatedWorkers = (ev.workers || []).map((w, i) =>
        unpaid.find(r => r.workerIdx === i) ? { ...w, paid: true, paid_at: now } : w
      )
      const updated = await updateEvent(ev.id, { ...ev, workers: updatedWorkers })
      onEventsChange(updated)
    } catch (e) { alert('שגיאה: ' + e.message) }
    setBusy(null)
  }

  async function savePayer(ev) {
    setBusy('payer:' + ev.id)
    try {
      const updated = await updateEvent(ev.id, { ...ev, payer: payerVal.trim() })
      onEventsChange(updated)
      setEditPayer(null)
    } catch (e) { alert('שגיאה: ' + e.message) }
    setBusy(null)
  }

  // ── Group ──
  const groups = {}
  filtered.forEach(r => {
    const id = groupBy === 'event' ? r.event.id : groupBy === 'payer' ? (r.event.payer?.trim() || '__no_payer__') : r.workerName
    if (!groups[id]) {
      groups[id] = {
        id,
        title: groupBy === 'event' ? (r.event.name || '—') : groupBy === 'payer' ? (r.event.payer?.trim() || 'לא הוגדר משלם') : r.workerName,
        event: groupBy === 'event' ? r.event : null, isPayer: groupBy === 'payer',
        rows: []
      }
    }
    groups[id].rows.push(r)
  })

  const groupList = Object.values(groups).map(g => {
    const total = g.rows.reduce((s, r) => s + r.amount, 0)
    const owed  = g.rows.reduce((s, r) => s + (!r.paid ? r.amount : 0), 0)
    const hours = g.rows.reduce((s, r) => s + r.hours, 0)
    return { ...g, total, owed, paid: total - owed, hours, allPaid: owed === 0 && total > 0 }
  }).sort((a, b) => {
    if (a.allPaid !== b.allPaid) return a.allPaid ? 1 : -1
    if (groupBy === 'event') return new Date(b.event?.date || 0) - new Date(a.event?.date || 0)
    if (groupBy === 'payer') return b.owed - a.owed || b.total - a.total
    return b.owed - a.owed || b.total - a.total
  })

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>חיובים</h1>
        <div className={styles.filters}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש עובד / אירוע / משלם..." className={styles.searchInput} />
          <select value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <div className={styles.filterBtns}>
            {[['event','לפי אירוע'],['worker','לפי עובד'],['payer','לפי משלם']].map(([v,l]) => (
              <button key={v} className={`${styles.filterBtn} ${groupBy === v ? styles.filterBtnActive : ''}`}
                onClick={() => { setGroupBy(v); setOpenKey(null) }}>{l}</button>
            ))}
          </div>
          <div className={styles.filterBtns}>
            {[['all','הכל'],['unpaid','חייב'],['paid','שולם']].map(([v,l]) => (
              <button key={v} className={`${styles.filterBtn} ${filterPaid === v ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterPaid(v)}>{l}</button>
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
          <div className={styles.metricLbl}>סה"כ {monthLabel}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{openCount}</div>
          <div className={styles.metricLbl}>חיובים פתוחים</div>
        </div>
      </div>

      {groupList.length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-receipt-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
          אין חיובים להציג
        </div>
      ) : groupList.map(g => {
        const ev = g.event
        const isOpen = openKey === g.id
        const d = ev?.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : null
        const isBusyAll = busy === 'all:' + ev?.id

        return (
          <div key={g.id} className={`${styles.eventCard} ${g.allPaid ? styles.eventCardDone : ''}`}>
            <div className={styles.eventCardHeader} onClick={() => setOpenKey(isOpen ? null : g.id)}>
              <div className={styles.headLeft}>
                <div className={styles.eventCardTitle}>
                  <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-left'} ${styles.chev}`} />
                  {g.title}
                </div>
                <div className={styles.eventCardMeta}>
                  {groupBy === 'event' ? (
                    <>
                      {ev?.location && <span><i className="ti ti-map-pin" /> {ev.location}</span>}
                      {d && <span><i className="ti ti-calendar" /> {d}</span>}
                      <span><i className="ti ti-users" /> {g.rows.length}</span>
                      {g.hours > 0 && <span><i className="ti ti-hourglass" /> {fmtHours(g.hours)}</span>}
                    </>
                  ) : groupBy === 'payer' ? (
                    <>
                      <span><i className="ti ti-calendar" /> {[...new Set(g.rows.map(r => r.event.name))].join(', ')}</span>
                      <span><i className="ti ti-users" /> {g.rows.length} עובדים</span>
                      {g.hours > 0 && <span><i className="ti ti-hourglass" /> {fmtHours(g.hours)} שעות</span>}
                    </>
                  ) : (
                    <>
                      <span><i className="ti ti-calendar" /> {g.rows.length} אירועים</span>
                      {g.hours > 0 && <span><i className="ti ti-hourglass" /> {fmtHours(g.hours)} שעות</span>}
                    </>
                  )}
                </div>
              </div>

              <div className={styles.eventCardTotals}>
                {g.owed > 0 && <span className={styles.owedBadge}>חייב ₪{g.owed.toLocaleString('he-IL')}</span>}
                {g.allPaid && <span className={styles.paidBadge}><i className="ti ti-check" /> שולם הכל</span>}
                <span className={styles.totalLabel}>סה"כ ₪{g.total.toLocaleString('he-IL')}</span>
                {!g.allPaid && groupBy === 'event' && (
                  <button className={styles.payAllBtn} disabled={isBusyAll}
                    onClick={e => { e.stopPropagation(); handlePayAll(ev, g.rows) }}>
                    {isBusyAll ? '...' : <><i className="ti ti-checks" /> שלם הכל</>}
                  </button>
                )}
              </div>
            </div>

            {/* Payer line — who should pay for this event */}
            {groupBy === 'event' && (
              <div className={styles.payerBar}>
                <span className={styles.payerLbl}><i className="ti ti-user-dollar" /> משלם:</span>
                {editPayer === ev.id ? (
                  <>
                    <input className={styles.payerInput} value={payerVal} autoFocus
                      onChange={e => setPayerVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') savePayer(ev); if (e.key === 'Escape') setEditPayer(null) }}
                      placeholder="שם המשלם / לקוח" />
                    <button className={styles.payerSave} onClick={() => savePayer(ev)} disabled={busy === 'payer:' + ev.id}>
                      {busy === 'payer:' + ev.id ? '...' : 'שמור'}
                    </button>
                    <button className={styles.payerCancel} onClick={() => setEditPayer(null)}>ביטול</button>
                  </>
                ) : (
                  <>
                    <span className={ev.payer ? styles.payerName : styles.payerEmpty}>
                      {ev.payer || 'לא הוגדר'}
                    </span>
                    <button className={styles.payerEdit}
                      onClick={() => { setEditPayer(ev.id); setPayerVal(ev.payer || '') }}>
                      <i className="ti ti-pencil" />
                    </button>
                  </>
                )}
              </div>
            )}

            {isOpen && (
              <div className={styles.paymentList}>
                <div className={styles.rowHead}>
                  <span>{groupBy === 'event' ? 'עובד' : 'אירוע'}</span>
                  <span>{groupBy === 'event' ? 'תפקיד' : 'תאריך'}</span>
                  <span>שעות</span>
                  <span>סכום</span>
                  <span>סטטוס</span>
                </div>
                {g.rows.map(r => (
                  <div key={r.key} className={`${styles.paymentRow} ${r.paid ? styles.paymentRowPaid : ''}`}>
                    <span className={styles.workerName}>
                      {groupBy === 'payer' ? r.workerName : groupBy === 'event' ? r.workerName : (r.event.name || '—')}
                      {r.note && <span className={styles.rowNote}> · {r.note}</span>}
                    </span>
                    <span className={styles.muted}>
                      {groupBy === 'event'
                        ? (r.role || '—')
                        : groupBy === 'payer'
                          ? (r.event.name || '—')
                          : (r.event.date ? new Date(r.event.date + 'T00:00:00').toLocaleDateString('he-IL') : '—')}
                    </span>
                    <span className={styles.muted}>
                      {r.hours ? (r.start && r.end ? `${r.start}-${r.end}` : fmtHours(r.hours)) : '—'}
                    </span>
                    <span className={styles.amount}>₪{r.amount.toLocaleString('he-IL')}</span>
                    <span>
                      <button
                        className={`${styles.toggleBtn} ${r.paid ? styles.toggleBtnPaid : styles.toggleBtnUnpaid}`}
                        onClick={() => handleToggle(r)}
                        disabled={busy === r.key}
                        title={r.paid && r.paidAt ? `שולם ${new Date(r.paidAt).toLocaleDateString('he-IL')}` : ''}
                      >
                        {busy === r.key ? '...' : r.paid
                          ? <><i className="ti ti-check" /> שולם</>
                          : <><i className="ti ti-clock" /> ממתין</>}
                      </button>
                    </span>
                  </div>
                ))}
                <div className={styles.rowTotal}>
                  <span>סה"כ</span>
                  <span />
                  <span>{g.hours > 0 ? fmtHours(g.hours) : '—'}</span>
                  <span>₪{g.total.toLocaleString('he-IL')}</span>
                  <span className={g.owed > 0 ? styles.owedTxt : styles.paidTxt}>
                    {g.owed > 0 ? `נותר ₪${g.owed.toLocaleString('he-IL')}` : '✓ שולם'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
