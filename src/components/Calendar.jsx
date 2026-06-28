import { useState } from 'react'
import styles from './Calendar.module.css'

const DAYS = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\'']
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function Calendar({ events, onEventClick }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null) // selected date string

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Map events to date strings
  const eventsByDate = {}
  events.forEach(ev => {
    if (!ev.date) return
    const key = ev.date.slice(0, 10)
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(ev)
  })

  // Grid: start from Sunday (0), pad with nulls
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = today.toISOString().slice(0, 10)

  // Events for selected date
  const selectedStr = selected
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    : null
  const selectedEvents = selectedStr ? (eventsByDate[selectedStr] || []) : []

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={nextMonth}><i className="ti ti-chevron-right" /></button>
        <span className={styles.monthTitle}>{MONTHS[month]} {year}</span>
        <button className={styles.navBtn} onClick={prevMonth}><i className="ti ti-chevron-left" /></button>
      </div>

      <div className={styles.dayNames}>
        {DAYS.map(d => <div key={d} className={styles.dayName}>{d}</div>)}
      </div>

      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className={styles.cellEmpty} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const evs = eventsByDate[dateStr] || []
          const isToday = dateStr === todayStr
          const isSelected = day === selected
          return (
            <div
              key={day}
              className={`${styles.cell} ${isToday ? styles.today : ''} ${isSelected ? styles.selectedCell : ''} ${evs.length ? styles.hasEvents : ''}`}
              onClick={() => setSelected(day === selected ? null : day)}
            >
              <span className={styles.dayNum}>{day}</span>
              {evs.length > 0 && (
                <div className={styles.dots}>
                  {evs.slice(0, 3).map((ev, idx) => (
                    <span key={idx} className={styles.dot} title={ev.name} />
                  ))}
                  {evs.length > 3 && <span className={styles.dotMore}>+{evs.length - 3}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedStr && (
        <div className={styles.dayPanel}>
          <div className={styles.dayPanelTitle}>
            <i className="ti ti-calendar-event" />
            {` ${selected} ${MONTHS[month]}`}
          </div>
          {selectedEvents.length === 0 ? (
            <div className={styles.noEvents}>אין אירועים ביום זה</div>
          ) : (
            selectedEvents.map(ev => {
              const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
              return (
                <div key={ev.id} className={styles.eventRow} onClick={() => onEventClick(ev)}>
                  <div className={styles.eventRowTop}>
                    <span className={styles.eventRowName}>{ev.name}</span>
                    <span className={styles.eventRowTotal}>₪{total.toLocaleString('he-IL')}</span>
                  </div>
                  <div className={styles.eventRowMeta}>
                    {ev.location && <span><i className="ti ti-map-pin" /> {ev.location}</span>}
                    {ev.time && <span><i className="ti ti-clock" /> {ev.time}</span>}
                    <span><i className="ti ti-users" /> {(ev.workers || []).length} עובדים</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
