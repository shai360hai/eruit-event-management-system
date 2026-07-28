import { useState } from 'react'
import styles from './Summary.module.css'
import { exportMonthlyAllWorkersPdf } from '../utils/pdfExport'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const SORT_OPTIONS = [
  { value: 'salary',   label: 'לפי שכר' },
  { value: 'role',     label: 'לפי תפקיד' },
  { value: 'name',     label: 'לפי שם' },
  { value: 'location', label: 'לפי מיקום' },
  { value: 'count',    label: 'לפי מספר אירועים' },
]

export default function Summary({ events }) {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [sortBy, setSortBy] = useState('salary')

  const filtered = month
    ? events.filter(e => e.date && new Date(e.date + 'T00:00:00').getMonth() + 1 === parseInt(month))
    : events

  const totalEvents = filtered.length
  const totalPay = filtered.reduce((s, e) =>
    s + (e.workers || []).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)
  const totalPaid = filtered.reduce((s, e) =>
    s + (e.workers || []).filter(w => w.paid).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)

  // ── Build worker map ──
  const workerMap = {}
  filtered.forEach(ev => {
    const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : ''
    ;(ev.workers || []).forEach((w, idx) => {
      if (!w.name) return
      const sal = parseFloat(w.salary) || 0
      if (!workerMap[w.name]) workerMap[w.name] = {
        role: w.role || '', total: 0, totalPaid: 0, count: 0,
        location: ev.location || '', dates: []
      }
      workerMap[w.name].total += sal
      if (w.paid) workerMap[w.name].totalPaid += sal
      workerMap[w.name].count++
      if (w.role && !workerMap[w.name].role) workerMap[w.name].role = w.role
      if (ev.location && !workerMap[w.name].location) workerMap[w.name].location = ev.location
      workerMap[w.name].dates.push({
        date: d, event: ev.name || '', location: ev.location || '',
        salary: sal, paid: !!w.paid, eventId: ev.id, workerIdx: idx
      })
    })
  })

  // ── Sort ──
  let sorted = Object.entries(workerMap)
  if (sortBy === 'salary')   sorted.sort((a, b) => b[1].total - a[1].total)
  else if (sortBy === 'role') sorted.sort((a, b) => (a[1].role||'').localeCompare(b[1].role||'','he') || a[0].localeCompare(b[0],'he'))
  else if (sortBy === 'name') sorted.sort((a, b) => a[0].localeCompare(b[0], 'he'))
  else if (sortBy === 'location') sorted.sort((a, b) => (a[1].location||'').localeCompare(b[1].location||'','he'))
  else if (sortBy === 'count') sorted.sort((a, b) => b[1].count - a[1].count)

  const grandTotal = sorted.reduce((s, [, v]) => s + v.total, 0)
  const grandPaid  = sorted.reduce((s, [, v]) => s + v.totalPaid, 0)
  const monthLabel = month ? MONTHS[parseInt(month)] : 'כל החודשים'

  function handleExportAll() {
    const data = sorted.map(([name, v]) => ({ name, role: v.role, count: v.count, total: v.total }))
    exportMonthlyAllWorkersPdf(data, monthLabel, grandTotal)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>סיכום חודשי</h1>
        <div className={styles.headerActions}>
          <select value={month} onChange={e => setMonth(e.target.value)} className={styles.monthSelect}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className={styles.exportBtn} onClick={handleExportAll} disabled={sorted.length === 0}>
            <i className="ti ti-file-type-pdf" /> ייצוא PDF
          </button>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{totalEvents}</div>
          <div className={styles.metricLbl}>אירועים</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>₪{totalPay.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>סה"כ שכר</div>
        </div>
        <div className={`${styles.metric} ${styles.metricSuccess}`}>
          <div className={styles.metricVal}>₪{totalPaid.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>שולם</div>
        </div>
        <div className={`${styles.metric} ${styles.metricDanger}`}>
          <div className={styles.metricVal}>₪{(totalPay - totalPaid).toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>ממתין</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{sorted.length}</div>
          <div className={styles.metricLbl}>עובדים</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>אין נתונים ל{month ? MONTHS[parseInt(month)] : 'תקופה זו'}</div>
      ) : (
        <>
          {/* Summary table */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>חתך עובדים</h2>
            <div className={styles.tableHeader}>
              <span>שם עובד</span>
              <span>תפקיד</span>
              <span>אירועים</span>
              <span>שולם</span>
              <span>סה"כ שכר</span>
            </div>
            {sorted.map(([name, v]) => {
              const pct = v.total > 0 ? Math.round(v.totalPaid / v.total * 100) : 0
              return (
                <div key={name} className={styles.tableRow}>
                  <span className={styles.workerName}>{name}</span>
                  <span className={styles.muted}>{v.role || '—'}</span>
                  <span>{v.count}</span>
                  <span>
                    <span className={pct === 100 ? styles.paidFull : pct > 0 ? styles.paidPartial : styles.paidNone}>
                      {pct === 100 ? '✓ שולם' : pct > 0 ? `${pct}%` : '—'}
                    </span>
                  </span>
                  <span className={styles.salary}>₪{v.total.toLocaleString('he-IL')}</span>
                </div>
              )
            })}
            <div className={styles.totalRow}>
              <span>סה"כ</span>
              <span />
              <span>{sorted.reduce((s, [, v]) => s + v.count, 0)}</span>
              <span className={grandPaid > 0 ? styles.paidFull : ''}>
                {grandPaid > 0 ? `₪${grandPaid.toLocaleString('he-IL')}` : '—'}
              </span>
              <span>₪{grandTotal.toLocaleString('he-IL')}</span>
            </div>
          </div>

          {/* Per-event breakdown with paid status */}
          <div className={styles.card} style={{marginTop:16}}>
            <h2 className={styles.cardTitle}>פירוט לפי עובד — כולל סטטוס תשלום</h2>
            {sorted.map(([name, v]) => (
              <div key={name} className={styles.workerBlock}>
                <div className={styles.workerBlockName}>
                  <span>{name}</span>
                  {v.role && <span className={styles.workerBlockRole}>{v.role}</span>}
                  <span className={styles.workerBlockTotal}>₪{v.total.toLocaleString('he-IL')}</span>
                  {v.totalPaid === v.total && v.total > 0 && <span className={styles.paidFull}>✓ שולם הכל</span>}
                  {v.totalPaid > 0 && v.totalPaid < v.total && (
                    <span className={styles.paidPartial}>שולם ₪{v.totalPaid.toLocaleString('he-IL')}</span>
                  )}
                </div>
                <div className={styles.dateHeader}>
                  <span>תאריך</span>
                  <span>אירוע</span>
                  <span>מיקום</span>
                  <span>שכר</span>
                  <span>סטטוס</span>
                </div>
                {v.dates.map((d, i) => (
                  <div key={i} className={`${styles.dateRow} ${d.paid ? styles.dateRowPaid : ''}`}>
                    <span className={styles.muted}>{d.date}</span>
                    <span>{d.event}</span>
                    <span className={styles.muted}>{d.location || '—'}</span>
                    <span className={styles.salary}>₪{d.salary.toLocaleString('he-IL')}</span>
                    <span>
                      {d.paid
                        ? <span className={styles.paidFull}>✓ שולם</span>
                        : <span className={styles.paidNone}>ממתין</span>
                      }
                    </span>
                  </div>
                ))}
                <div className={styles.workerSubTotal}>
                  <span>סה"כ: ₪{v.total.toLocaleString('he-IL')}</span>
                  {v.totalPaid > 0 && <span className={styles.paidFull}>שולם: ₪{v.totalPaid.toLocaleString('he-IL')}</span>}
                  {v.totalPaid < v.total && <span className={styles.paidNone}>נותר: ₪{(v.total - v.totalPaid).toLocaleString('he-IL')}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
