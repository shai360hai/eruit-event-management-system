import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { togglePayment } from '../utils/payments'
import styles from './Payments.module.css'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [filterPaid, setFilterPaid] = useState('all') // all | paid | unpaid
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('payments')
      .select('*, events(name, date, location)')
      .order('created_at', { ascending: false })
    if (!error) setPayments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  async function handlePayAll(eventPayments) {
    const unpaid = eventPayments.filter(p => !p.paid)
    if (!unpaid.length) return
    if (!confirm(`לסמן ${unpaid.length} עובדים כשולם?`)) return
    await Promise.all(unpaid.map(p => togglePayment(p.id, true)))
    setPayments(ps => ps.map(x =>
      unpaid.find(u => u.id === x.id)
        ? { ...x, paid: true, paid_at: new Date().toISOString() }
        : x
    ))
  }

  async function handleToggle(p) {
    setToggling(p.id)
    try {
      await togglePayment(p.id, !p.paid)
      setPayments(ps => ps.map(x => x.id === p.id
        ? { ...x, paid: !p.paid, paid_at: !p.paid ? new Date().toISOString() : null }
        : x
      ))
    } catch (e) {
      alert('שגיאה: ' + e.message)
    }
    setToggling(null)
  }

  // Filter
  let filtered = payments.filter(p => {
    if (month) {
      const d = p.events?.date
      if (!d || new Date(d + 'T00:00:00').getMonth() + 1 !== parseInt(month)) return false
    }
    if (filterPaid === 'paid' && !p.paid) return false
    if (filterPaid === 'unpaid' && p.paid) return false
    if (search.trim() && !p.worker_name.includes(search.trim()) && !p.events?.name?.includes(search.trim())) return false
    return true
  })

  // Sort: unpaid first, then by event date desc
  filtered.sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    return new Date(b.events?.date || 0) - new Date(a.events?.date || 0)
  })

  // Totals
  const totalOwed = filtered.reduce((s, p) => s + (!p.paid ? p.amount : 0), 0)
  const totalPaid = filtered.reduce((s, p) => s + (p.paid ? p.amount : 0), 0)
  const totalAll = filtered.reduce((s, p) => s + p.amount, 0)

  // Group by event
  const byEvent = {}
  filtered.forEach(p => {
    const key = p.event_id
    if (!byEvent[key]) byEvent[key] = { name: p.events?.name || '—', date: p.events?.date, location: p.events?.location, payments: [] }
    byEvent[key].payments.push(p)
  })
  const events = Object.values(byEvent).sort((a, b) => {
    const aUnpaid = a.payments.some(p => !p.paid)
    const bUnpaid = b.payments.some(p => !p.paid)
    if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1
    return new Date(b.date || 0) - new Date(a.date || 0)
  })

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

      {/* Summary metrics */}
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
          <div className={styles.metricVal}>{filtered.filter(p => !p.paid).length}</div>
          <div className={styles.metricLbl}>תשלומים פתוחים</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>טוען...</div>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-receipt-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
          אין תשלומים להציג
        </div>
      ) : events.map(ev => {
        const evTotal = ev.payments.reduce((s, p) => s + p.amount, 0)
        const evOwed = ev.payments.reduce((s, p) => s + (!p.paid ? p.amount : 0), 0)
        const allPaid = ev.payments.every(p => p.paid)
        const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : '—'

        return (
          <div key={ev.name + ev.date} className={`${styles.eventCard} ${allPaid ? styles.eventCardDone : ''}`}>
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
                  <button className={styles.payAllBtn} onClick={() => handlePayAll(ev.payments)}>
                    <i className="ti ti-checks" /> שלם הכל
                  </button>
                )}
              </div>
            </div>

            <div className={styles.paymentList}>
              {ev.payments.map(p => (
                <div key={p.id} className={`${styles.paymentRow} ${p.paid ? styles.paymentRowPaid : ''}`}>
                  <span className={styles.workerName}>{p.worker_name}</span>
                  <span className={styles.amount}>₪{p.amount.toLocaleString('he-IL')}</span>
                  {p.paid && p.paid_at && (
                    <span className={styles.paidAt}>
                      שולם {new Date(p.paid_at).toLocaleDateString('he-IL')}
                    </span>
                  )}
                  {!p.paid && <span className={styles.pendingLabel}>ממתין</span>}
                  <button
                    className={`${styles.toggleBtn} ${p.paid ? styles.toggleBtnPaid : styles.toggleBtnUnpaid}`}
                    onClick={() => handleToggle(p)}
                    disabled={toggling === p.id}
                  >
                    {toggling === p.id
                      ? '...'
                      : p.paid
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
