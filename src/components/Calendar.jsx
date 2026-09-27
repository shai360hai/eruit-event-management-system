import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { MONTHS, DAYS_SHORT } from '../utils/constants'
import EventForm from './EventForm'
import styles from './Calendar.module.css'

const DAYS = DAYS_SHORT
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

export default function Calendar({ events, onEventClick, onAddEvent, onSave, onDelete, savingEvent }) {
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

  // ── Modal state ──
  const [modal, setModal] = useState(null)  // null | { mode: 'edit'|'add', event?: obj, prefillDate?: str }
  const [formDirty, setFormDirty] = useState(false)

  // ── Day-panel event index (for same-day browsing) ──
  const [dayEventIdx, setDayEventIdx] = useState(0)

  function openEdit(ev) {
    setModal({ mode: 'edit', event: ev })
    setFormDirty(false)
  }
  function openAdd(dateStr) {
    setModal({ mode: 'add', prefillDate: dateStr })
    setFormDirty(false)
  }
  function closeModal() {
    if (formDirty && !confirm('יש שינויים שלא נשמרו. לסגור?')) return
    setModal(null)
    setFormDirty(false)
  }

  async function handleModalSave(data) {
    await onSave(data, modal?.event || null)
    setModal(null)
    setFormDirty(false)
  }

  async function handleModalDelete() {
    if (!modal?.event || !isAdmin || !confirm('למחוק את האירוע?')) return
    await onDelete(modal.event)
    setModal(null)
  }

  // ── Modal event navigation (prev/next across ALL events sorted by date) ──
  function modalNavGuard(cb) {
    if (formDirty && !confirm('יש שינויים שלא נשמרו. לעבור לאירוע הבא?')) return
    setFormDirty(false)
    cb()
  }

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

  // ── Sorted list of all dates that have events (for prev/next date nav) ──
  const eventDates = Object.keys(eventsByDate).sort()

  function selectDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const m = d.getMonth()       // 0-indexed
    const y = d.getFullYear()
    const day = d.getDate()
    setYear(y)
    setMonth(m)
    setSelected(day)
    setDayEventIdx(0)
  }

  function goPrevDate() {
    const idx = eventDates.indexOf(selectedStr)
    if (idx > 0) selectDate(eventDates[idx - 1])
  }
  function goNextDate() {
    const idx = eventDates.indexOf(selectedStr)
    if (idx !== -1 && idx < eventDates.length - 1) selectDate(eventDates[idx + 1])
  }

  const hasPrevDate = selectedStr && eventDates.indexOf(selectedStr) > 0
  const hasNextDate = selectedStr && eventDates.indexOf(selectedStr) < eventDates.length - 1

  // clamp idx when events list changes
  const safeIdx = Math.min(dayEventIdx, Math.max(0, selectedEvents.length - 1))

  // ── All events sorted by date+time for modal navigation ──
  const allEventsSorted = [...events].sort((a, b) => {
    const da = (a.date || '') + (a.time || '')
    const db = (b.date || '') + (b.time || '')
    return da < db ? -1 : da > db ? 1 : 0
  })
  const modalEventIdx = modal?.mode === 'edit' && modal?.event
    ? allEventsSorted.findIndex(e => e.id === modal.event.id)
    : -1
  const modalHasPrev = modalEventIdx > 0
  const modalHasNext = modalEventIdx !== -1 && modalEventIdx < allEventsSorted.length - 1
  function modalGoPrev() {
    modalNavGuard(() => {
      const ev = allEventsSorted[modalEventIdx - 1]
      setModal({ mode: 'edit', event: ev })
      // sync calendar view to that event's date
      if (ev?.date) {
        const d = new Date(ev.date + 'T00:00:00')
        setYear(d.getFullYear()); setMonth(d.getMonth()); setSelected(d.getDate())
      }
    })
  }
  function modalGoNext() {
    modalNavGuard(() => {
      const ev = allEventsSorted[modalEventIdx + 1]
      setModal({ mode: 'edit', event: ev })
      if (ev?.date) {
        const d = new Date(ev.date + 'T00:00:00')
        setYear(d.getFullYear()); setMonth(d.getMonth()); setSelected(d.getDate())
      }
    })
  }

  return (
    <div className={styles.layout}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <button className={styles.navBtn} onClick={nextMonth}><i className="ti ti-chevron-right" /></button>
          <div className={styles.monthTitleWrap}>
            <span className={styles.monthTitle}>{MONTHS[month + 1]} {year}</span>
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
                onClick={() => { setSelected(day === selected ? null : day); setDayEventIdx(0) }}
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
            {/* ── Date navigation bar ── */}
            <div className={styles.dayPanelNav}>
              <button className={styles.dateNavBtn} onClick={goNextDate} disabled={!hasNextDate} title="תאריך הבא עם אירוע">
                <i className="ti ti-chevron-right" />
              </button>
              <div className={styles.dayPanelTitle}>
                <i className="ti ti-calendar-event" />
                {` ${selected} ${MONTHS[month + 1]}`}
                {selectedEvents.length > 0 && (
                  <span className={styles.dayCount}>{selectedEvents.length} אירועים</span>
                )}
              </div>
              <button className={styles.dateNavBtn} onClick={goPrevDate} disabled={!hasPrevDate} title="תאריך קודם עם אירוע">
                <i className="ti ti-chevron-left" />
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className={styles.dayEmpty}>
                <p className={styles.dayEmptyText}>אין אירועים ביום זה</p>
                <button className={styles.addEventBtn} onClick={() => openAdd(selectedStr)}>
                  <i className="ti ti-plus" /> הוסף אירוע
                </button>
              </div>
            ) : (
              <>
                {/* ── Same-day event navigation (only when >1 event) ── */}
                {selectedEvents.length > 1 && (
                  <div className={styles.eventNavBar}>
                    <button className={styles.eventNavBtn} onClick={() => setDayEventIdx(i => Math.min(selectedEvents.length - 1, i + 1))} disabled={safeIdx === selectedEvents.length - 1}>
                      <i className="ti ti-chevron-right" />
                    </button>
                    <span className={styles.eventNavLabel}>
                      אירוע {safeIdx + 1} מתוך {selectedEvents.length}
                    </span>
                    <button className={styles.eventNavBtn} onClick={() => setDayEventIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0}>
                      <i className="ti ti-chevron-left" />
                    </button>
                  </div>
                )}

                {/* ── Current event card ── */}
                {(() => {
                  const ev = selectedEvents[safeIdx]
                  const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
                  return (
                    <div className={styles.eventRow} onClick={() => openEdit(ev)}
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
                      {ev.notes && <div className={styles.eventRowNote}><i className="ti ti-note" /> {ev.notes}</div>}
                    </div>
                  )
                })()}
              </>
            )}

            <button className={styles.addEventBtnSmall} onClick={() => openAdd(selectedStr)}>
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

      {/* ── Event edit/add modal ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className={styles.modalBox}>
            {/* ── Modal header: X + nav ── */}
            <div className={styles.modalHeader}>
              <button className={styles.modalClose} onClick={closeModal} title="סגור">
                <i className="ti ti-x" />
              </button>

              {modal.mode === 'edit' && modalEventIdx !== -1 ? (
                <div className={styles.modalNavBar}>
                  <button
                    className={styles.modalNavBtn}
                    onClick={modalGoNext}
                    disabled={!modalHasNext}
                    title="אירוע הבא"
                  >
                    <i className="ti ti-chevron-right" />
                  </button>
                  <span className={styles.modalNavLabel}>
                    אירוע {modalEventIdx + 1} מתוך {allEventsSorted.length}
                  </span>
                  <button
                    className={styles.modalNavBtn}
                    onClick={modalGoPrev}
                    disabled={!modalHasPrev}
                    title="אירוע קודם"
                  >
                    <i className="ti ti-chevron-left" />
                  </button>
                </div>
              ) : <div />}
            </div>

            <EventForm
              event={modal.mode === 'edit' ? modal.event : null}
              prefillDate={modal.mode === 'add' ? modal.prefillDate : ''}
              duplicateData={null}
              onDirtyChange={setFormDirty}
              onSave={handleModalSave}
              onDelete={handleModalDelete}
              onCancel={closeModal}
              loading={!!savingEvent}
            />
          </div>
        </div>
      )}
    </div>
  )
}
