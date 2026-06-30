import { useState } from 'react'
import styles from './Summary.module.css'
import { exportMonthlyAllWorkersPdf } from '../utils/pdfExport'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function Summary({ events }) {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))

  const filtered = month
    ? events.filter(e => {
        if (!e.date) return false
        return new Date(e.date + 'T00:00:00').getMonth() + 1 === parseInt(month)
      })
    : events

  const totalEvents = filtered.length
  const totalPay = filtered.reduce((s, e) =>
    s + (e.workers || []).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)

  // Build worker map from filtered events
  const workerMap = {}
  filtered.forEach(e => {
    const d = e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('he-IL') : ''
    ;(e.workers || []).forEach(w => {
      if (!w.name) return
      if (!workerMap[w.name]) workerMap[w.name] = { role: w.role || '', total: 0, count: 0, dates: [] }
      workerMap[w.name].total += parseFloat(w.salary) || 0
      workerMap[w.name].count++
      workerMap[w.name].dates.push({ date: d, event: e.name || '', salary: parseFloat(w.salary) || 0 })
      if (w.role && !workerMap[w.name].role) workerMap[w.name].role = w.role
    })
  })

  const sorted = Object.entries(workerMap).sort((a, b) => b[1].total - a[1].total)
  const grandTotal = sorted.reduce((s, [, v]) => s + v.total, 0)
  const workerCount = sorted.length
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
        <div className={styles.metric}>
          <div className={styles.metricVal}>{workerCount}</div>
          <div className={styles.metricLbl}>עובדים</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>
          אין נתונים ל{month ? MONTHS[parseInt(month)] : 'תקופה זו'}
        </div>
      ) : (
        <>
          {/* Worker salary table */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>חתך עובדים — שכר ואירועים</h2>
            <div className={styles.tableHeader}>
              <span>שם עובד</span>
              <span>תפקיד</span>
              <span>אירועים</span>
              <span>סה"כ שכר</span>
            </div>
            {sorted.map(([name, v]) => (
              <div key={name} className={styles.tableRow}>
                <span className={styles.workerName}>{name}</span>
                <span className={styles.muted}>{v.role || '—'}</span>
                <span>{v.count}</span>
                <span className={styles.salary}>₪{v.total.toLocaleString('he-IL')}</span>
              </div>
            ))}
            <div className={styles.totalRow}>
              <span>סה"כ</span>
              <span />
              <span>{sorted.reduce((s, [, v]) => s + v.count, 0)}</span>
              <span>₪{grandTotal.toLocaleString('he-IL')}</span>
            </div>
          </div>

          {/* Dates per worker */}
          <div className={styles.card} style={{ marginTop: 16 }}>
            <h2 className={styles.cardTitle}>פירוט תאריכים לפי עובד</h2>
            {sorted.map(([name, v]) => (
              <div key={name} className={styles.workerBlock}>
                <div className={styles.workerBlockName}>
                  {name}
                  <span className={styles.workerBlockTotal}>₪{v.total.toLocaleString('he-IL')}</span>
                </div>
                {v.dates.map((d, i) => (
                  <div key={i} className={styles.dateRow}>
                    <span className={styles.muted}>{d.date}</span>
                    <span>{d.event}</span>
                    <span className={styles.salary}>₪{d.salary.toLocaleString('he-IL')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
