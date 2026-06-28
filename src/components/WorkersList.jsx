import { useState } from 'react'
import styles from './WorkersList.module.css'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function WorkersList({ events }) {
  const [month, setMonth] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const filtered = month
    ? events.filter(e => e.date && new Date(e.date + 'T00:00:00').getMonth() + 1 === parseInt(month))
    : events

  // Build worker map
  const workerMap = {}
  filtered.forEach(ev => {
    const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : '—'
    ;(ev.workers || []).forEach(w => {
      if (!w.name) return
      if (!workerMap[w.name]) workerMap[w.name] = { role: w.role || '', total: 0, events: [] }
      workerMap[w.name].total += parseFloat(w.salary) || 0
      workerMap[w.name].events.push({
        date: d,
        eventName: ev.name || '—',
        salary: parseFloat(w.salary) || 0,
        role: w.role || ''
      })
      if (w.role && !workerMap[w.name].role) workerMap[w.name].role = w.role
    })
  })

  let workers = Object.entries(workerMap).sort((a, b) => b[1].total - a[1].total)
  if (search.trim()) {
    workers = workers.filter(([name]) => name.includes(search.trim()))
  }

  const grandTotal = workers.reduce((s, [, v]) => s + v.total, 0)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>עובדים</h1>
        <div className={styles.filters}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש שם עובד..."
            className={styles.searchInput}
          />
          <select value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {workers.length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-users-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
          אין עובדים להציג
        </div>
      ) : (
        <>
          <div className={styles.tableHeader}>
            <span>שם עובד</span>
            <span>תפקיד</span>
            <span>אירועים</span>
            <span>סה"כ שכר</span>
          </div>

          {workers.map(([name, v]) => (
            <div key={name} className={styles.workerBlock}>
              <div
                className={`${styles.workerRow} ${expanded === name ? styles.workerRowOpen : ''}`}
                onClick={() => setExpanded(expanded === name ? null : name)}
              >
                <span className={styles.workerName}>
                  <i className={`ti ${expanded === name ? 'ti-chevron-down' : 'ti-chevron-left'} ${styles.chevron}`} />
                  {name}
                </span>
                <span className={styles.muted}>{v.role || '—'}</span>
                <span className={styles.count}>{v.events.length}</span>
                <span className={styles.salary}>₪{v.total.toLocaleString('he-IL')}</span>
              </div>

              {expanded === name && (
                <div className={styles.eventsDetail}>
                  <div className={styles.detailHeader}>
                    <span>תאריך</span>
                    <span>אירוע</span>
                    <span>תפקיד</span>
                    <span>שכר</span>
                  </div>
                  {v.events.map((e, i) => (
                    <div key={i} className={styles.detailRow}>
                      <span className={styles.muted}>{e.date}</span>
                      <span>{e.eventName}</span>
                      <span className={styles.muted}>{e.role || '—'}</span>
                      <span className={styles.salary}>₪{e.salary.toLocaleString('he-IL')}</span>
                    </div>
                  ))}
                  <div className={styles.detailTotal}>
                    <span>סה"כ</span>
                    <span />
                    <span />
                    <span className={styles.salary}>₪{v.total.toLocaleString('he-IL')}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className={styles.grandTotal}>
            <span>סה"כ ({workers.length} עובדים)</span>
            <span />
            <span>{workers.reduce((s,[,v])=>s+v.events.length,0)}</span>
            <span className={styles.salary}>₪{grandTotal.toLocaleString('he-IL')}</span>
          </div>
        </>
      )}
    </div>
  )
}
