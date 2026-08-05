import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './Calendar.module.css'

const DAYS = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\'']
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const DEFAULT_COLOR = '#4f6ef7'
const COLOR_PALETTE = ['#4f6ef7', '#3b9d5b', '#e0862a', '#d64550', '#8e5bd1', '#1fa8a8', '#c94f9c', '#7a7a2a']

// Persist month/year across navigation within the session
function loadCalPos() {
  try {
    const s = sessionStorage.getItem('eruit-cal-pos')
    if (s) return JSON.parse(s)
  } catch {}
  const t = new Date()
  return { year: t.getFullYear(), month: t.getMonth() }
}

export default function Calendar({ events, onEventClick, onAddEvent }) {
  const { isAdmin } = useAuth()
  const today = new Date()
  const init = loadCalPos()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [selected, setSelected] = useState(null)
  const [locations, setLocations] = useState([])
  const [showLocManager, setShowLocManager] = useState(false)
  const [newLocName, setNewLocName] = useState('')
  const [newLocColor, setNewLocColor] = useState(COLOR_PALETTE[0])
  const [busy, setBusy] = useState(false)

  useEffect(() => { fetchLocations() }, [])

  useEffect(() => {
    try { sessionStorage.setItem('eruit-cal-pos', JSON.stringify({ year, month })) } catch {}
  }, [year, month])

  async function fetchLocations() {
    const { data } = await supabase.from('locations').select('*').order('name')
    setLocations(data || [])
  }

  const colorFor = (locName) => {
    const loc = locations.find(l => l.name === locName)
    return loc?.color || DEFAULT_COLOR
  }

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
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelected(today.getDate())
  }

  async function handleAddLocation() {
    if (!newLocName.trim()) return
    setBusy(true)
    const { error } = await supabase.from('locations')
      .insert([{ name: newLocName.trim(), color: newLocColor }])
    if (error) alert('שגיאה: ' + error.message)
    await fetchLocations()
    setNewLocName('')
    setBusy(false)
  }

  async function handleDeleteLocation(loc) {
    if (!confirm(`למחוק את המיקום "${loc.name}"?`)) return
    setBusy(true)
    await supabase.from('locations').delete().eq('id', loc.id)
    await fetchLocations()
    setBusy(false)
  }

  async function handleColorChange(loc, color) {
    setLocations(ls => ls.map(l => l.id === loc.id ? { ...l, color } : l))
    await supabase.from('locations').update({ color }).eq('id', loc.id)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const eventsByDate = {}
  events.forEach(ev => {
    if (!ev.date) return
    const key = ev.date.slice(0, 10)
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(ev)
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = today.toISOString().slice(0, 10)

  const selectedStr = selected
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    : null
  const selectedEvents = selectedStr ? (eventsByDate[selectedStr] || []) : []

  return (
    <div className={styles.layout}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <button className={styles.navBtn} onClick={nextMonth}><i className="ti ti-chevron-right" /></button>
          <div className={styles.monthTitleWrap}>
            <span className={styles.monthTitle}>{MONTHS[month]} {year}</span>
            <button className={styles.todayBtn} onClick={goToday}>היום</button>
          </div>
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
                className={`${styles.cell} ${isToday ? styles.today : ''} ${isSelected ? styles.selectedCell : ''}`}
                onClick={() => setSelected(day === selected ? null : day)}
              >
                <span className={styles.dayNum}>{day}</span>
                {evs.length > 0 && (
                  <div className={styles.eventChips}>
                    {evs.slice(0, 2).map((ev, idx) => (
                      <span
                        key={idx}
                        className={styles.eventChip}
                        title={`${ev.name}${ev.location ? ' · ' + ev.location : ''}`}
                        style={{
                          background: colorFor(ev.location) + '22',
                          color: colorFor(ev.location),
                          borderRight: `3px solid ${colorFor(ev.location)}`
                        }}
                      >{ev.name}</span>
                    ))}
                    {evs.length > 2 && <span className={styles.dotMore}>+{evs.length - 2}</span>}
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
              <div className={styles.dayEmpty}>
                <p className={styles.dayEmptyText}>אין אירועים ביום זה</p>
                <button className={styles.addEventBtn} onClick={() => onAddEvent(selectedStr)}>
                  <i className="ti ti-plus" /> הוסף אירוע
                </button>
              </div>
            ) : (
              selectedEvents.map(ev => {
                const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
                return (
                  <div key={ev.id} className={styles.eventRow} onClick={() => onEventClick(ev)}
                    style={{ borderRightColor: colorFor(ev.location), borderRightWidth: 3 }}>
                    <div className={styles.eventRowTop}>
                      <span className={styles.eventRowName}>{ev.name}</span>
                      <span className={styles.eventRowTotal}>₪{total.toLocaleString('he-IL')}</span>
                    </div>
                    <div className={styles.eventRowMeta}>
                      {ev.location && (
                        <span style={{ color: colorFor(ev.location), fontWeight: 600 }}>
                          <i className="ti ti-map-pin" /> {ev.location}
                        </span>
                      )}
                      {ev.time && <span><i className="ti ti-clock" /> {ev.time}</span>}
                      <span><i className="ti ti-users" /> {(ev.workers || []).length} עובדים</span>
                    </div>
                  </div>
                )
              })
            )}
            <button className={styles.addEventBtnSmall} onClick={() => onAddEvent(selectedStr)}>
              <i className="ti ti-plus" /> הוסף אירוע לתאריך זה
            </button>
          </div>
        )}
      </div>

      {/* ── Legend sidebar ── */}
      <div className={styles.legend}>
        <div className={styles.legendHeader}>
          <span className={styles.legendTitle}>מקרא מיקומים</span>
          {isAdmin && (
            <button className={styles.legendEditBtn} onClick={() => setShowLocManager(s => !s)} title="ניהול מיקומים">
              <i className={`ti ${showLocManager ? 'ti-x' : 'ti-settings'}`} />
            </button>
          )}
        </div>

        {locations.length === 0 ? (
          <div className={styles.legendEmpty}>אין מיקומים</div>
        ) : locations.map(loc => (
          <div key={loc.id} className={styles.legendItem}>
            {showLocManager && isAdmin ? (
              <input
                type="color"
                value={loc.color || DEFAULT_COLOR}
                onChange={e => handleColorChange(loc, e.target.value)}
                className={styles.colorPicker}
                title="שנה צבע"
              />
            ) : (
              <span className={styles.legendDot} style={{ background: loc.color || DEFAULT_COLOR }} />
            )}
            <span className={styles.legendName}>{loc.name}</span>
            {showLocManager && isAdmin && (
              <button
                className={styles.legendDelBtn}
                onClick={() => handleDeleteLocation(loc)}
                disabled={busy}
                title="מחק מיקום"
              ><i className="ti ti-trash" /></button>
            )}
          </div>
        ))}

        {showLocManager && isAdmin && (
          <div className={styles.legendAddRow}>
            <div className={styles.legendAddInputs}>
              <input
                type="color"
                value={newLocColor}
                onChange={e => setNewLocColor(e.target.value)}
                className={styles.colorPicker}
              />
              <input
                value={newLocName}
                onChange={e => setNewLocName(e.target.value)}
                placeholder="מיקום חדש"
                className={styles.legendAddInput}
                onKeyDown={e => { if (e.key === 'Enter') handleAddLocation() }}
              />
            </div>
            <button className={styles.legendAddBtn} onClick={handleAddLocation} disabled={busy || !newLocName.trim()}>
              {busy ? '...' : 'הוסף'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
