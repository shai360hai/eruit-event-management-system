import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import styles from './Dashboard.module.css'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function Dashboard({ events, onNavigate }) {
  const [payments, setPayments] = useState([])
  const now = new Date()
  const thisMonth = now.getMonth() + 1
  const monthName = MONTHS[thisMonth]

  useEffect(() => {
    supabase.from('payments').select('*').then(({ data }) => setPayments(data || []))
  }, [])

  // This month events
  const monthEvents = events.filter(e => {
    if (!e.date) return false
    return new Date(e.date + 'T00:00:00').getMonth() + 1 === thisMonth
  })

  // Upcoming (next 7 days)
  const upcoming = events.filter(e => {
    if (!e.date) return false
    const d = new Date(e.date + 'T00:00:00')
    const diff = (d - now) / 86400000
    return diff >= 0 && diff <= 7
  }).sort((a, b) => new Date(a.date) - new Date(b.date))

  // Financials
  const monthSalary = monthEvents.reduce((s, e) =>
    s + (e.workers || []).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)

  const totalUnpaid = payments.filter(p => !p.paid).reduce((s, p) => s + p.amount, 0)
  const totalPaid = payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0)

  // Top workers this month
  const workerMap = {}
  monthEvents.forEach(e => {
    ;(e.workers || []).forEach(w => {
      if (!w.name) return
      if (!workerMap[w.name]) workerMap[w.name] = { total: 0, count: 0 }
      workerMap[w.name].total += parseFloat(w.salary) || 0
      workerMap[w.name].count++
    })
  })
  const topWorkers = Object.entries(workerMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)

  return (
    <div className={styles.wrapper}>
      <div className={styles.greeting}>
        <h1 className={styles.title}>שלום! 👋</h1>
        <p className={styles.sub}>סיכום {monthName} {now.getFullYear()}</p>
      </div>

      {/* Key metrics */}
      <div className={styles.metrics}>
        <div className={styles.metric} onClick={() => onNavigate('list')}>
          <div className={styles.metricIcon} style={{background:'var(--chip-bg)'}}>
            <i className="ti ti-calendar-event" style={{color:'var(--chip-text)'}} />
          </div>
          <div className={styles.metricVal}>{monthEvents.length}</div>
          <div className={styles.metricLbl}>אירועים החודש</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{background:'var(--success-bg)'}}>
            <i className="ti ti-cash" style={{color:'var(--success)'}} />
          </div>
          <div className={styles.metricVal}>₪{monthSalary.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>שכר החודש</div>
        </div>
        <div className={styles.metric} onClick={() => onNavigate('payments')}>
          <div className={styles.metricIcon} style={{background:'var(--danger-bg)'}}>
            <i className="ti ti-alert-circle" style={{color:'var(--danger)'}} />
          </div>
          <div className={styles.metricVal} style={{color: totalUnpaid > 0 ? '#c0392b' : 'inherit'}}>
            ₪{totalUnpaid.toLocaleString('he-IL')}
          </div>
          <div className={styles.metricLbl}>חוב לעובדים</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{background:'var(--success-bg)'}}>
            <i className="ti ti-check" style={{color:'var(--success)'}} />
          </div>
          <div className={styles.metricVal}>₪{totalPaid.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>שולם סה"כ</div>
        </div>
      </div>

      <div className={styles.cols}>
        {/* Upcoming events */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>אירועים קרובים</span>
            <button className={styles.cardLink} onClick={() => onNavigate('calendar')}>לוח שנה →</button>
          </div>
          {upcoming.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:.35,marginBottom:12}}>
                <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M6 18h36" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 26h8M16 32h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p>אין אירועים ב-7 הימים הקרובים</p>
              <button className={styles.emptyBtn} onClick={() => onNavigate('form')}>
                <i className="ti ti-plus" /> צור אירוע חדש
              </button>
            </div>
          ) : upcoming.map(ev => {
            const d = new Date(ev.date + 'T00:00:00')
            const dayDiff = Math.round((d - now) / 86400000)
            const label = dayDiff === 0 ? 'היום' : dayDiff === 1 ? 'מחר' : `בעוד ${dayDiff} ימים`
            const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
            return (
              <div key={ev.id} className={styles.upcomingRow}>
                <div>
                  <div className={styles.upcomingName}>{ev.name}</div>
                  <div className={styles.upcomingMeta}>
                    {ev.location && <span><i className="ti ti-map-pin" /> {ev.location}</span>}
                    {ev.time && <span><i className="ti ti-clock" /> {ev.time}</span>}
                    <span><i className="ti ti-users" /> {(ev.workers || []).length}</span>
                  </div>
                </div>
                <div className={styles.upcomingRight}>
                  <span className={`${styles.dayLabel} ${dayDiff === 0 ? styles.dayLabelToday : ''}`}>{label}</span>
                  <span className={styles.upcomingTotal}>₪{total.toLocaleString('he-IL')}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Top workers this month */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>עובדים מובילים — {monthName}</span>
            <button className={styles.cardLink} onClick={() => onNavigate('workers')}>כל העובדים →</button>
          </div>
          {topWorkers.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:.35,marginBottom:12}}>
                <circle cx="24" cy="18" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="10" cy="22" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="38" cy="22" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M2 40c0-5 3.6-8 8-8M46 40c0-5-3.6-8-8-8M8 40c0-7 7-12 16-12s16 5 16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              <p>אין שיבוצי עובדים החודש</p>
              <button className={styles.emptyBtn} onClick={() => onNavigate('workers')}>
                <i className="ti ti-user-plus" /> הוסף עובד
              </button>
            </div>
          ) : topWorkers.map(([name, v], i) => (
            <div key={name} className={styles.workerRankRow}>
              <span className={styles.rank}>{i + 1}</span>
              <div>
                <div className={styles.rankName}>{name}</div>
                <div className={styles.rankSub}>{v.count} אירועים</div>
              </div>
              <span className={styles.rankSalary}>₪{v.total.toLocaleString('he-IL')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
