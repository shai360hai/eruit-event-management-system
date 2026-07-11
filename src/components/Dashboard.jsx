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
          <div className={styles.metricIcon} style={{background:'#e8eeff'}}>
            <i className="ti ti-calendar-event" style={{color:'#2a3fa0'}} />
          </div>
          <div className={styles.metricVal}>{monthEvents.length}</div>
          <div className={styles.metricLbl}>אירועים החודש</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{background:'#eaf3de'}}>
            <i className="ti ti-cash" style={{color:'#3b6d11'}} />
          </div>
          <div className={styles.metricVal}>₪{monthSalary.toLocaleString('he-IL')}</div>
          <div className={styles.metricLbl}>שכר החודש</div>
        </div>
        <div className={styles.metric} onClick={() => onNavigate('payments')}>
          <div className={styles.metricIcon} style={{background:'#fdf5f5'}}>
            <i className="ti ti-alert-circle" style={{color:'#c0392b'}} />
          </div>
          <div className={styles.metricVal} style={{color: totalUnpaid > 0 ? '#c0392b' : 'inherit'}}>
            ₪{totalUnpaid.toLocaleString('he-IL')}
          </div>
          <div className={styles.metricLbl}>חוב לעובדים</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricIcon} style={{background:'#f0f8ed'}}>
            <i className="ti ti-check" style={{color:'#3b6d11'}} />
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
            <div className={styles.cardEmpty}>אין אירועים ב-7 הימים הקרובים</div>
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
            <div className={styles.cardEmpty}>אין נתוני שכר לחודש זה</div>
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
