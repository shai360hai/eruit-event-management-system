import { useState, useEffect } from 'react'
import EventsList from './components/EventsList'
import EventForm from './components/EventForm'
import Summary from './components/Summary'
import { getEvents, createEvent, updateEvent, deleteEvent } from './api'
import styles from './App.module.css'

export default function App() {
  const [events, setEvents] = useState([])
  const [view, setView] = useState('list') // list | form | summary
  const [editEvent, setEditEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setFetching(false))
  }, [])

  async function handleSave(data) {
    setLoading(true)
    try {
      if (editEvent) {
        const updated = await updateEvent(editEvent.id, data)
        setEvents(es => es.map(e => e.id === editEvent.id ? updated : e))
      } else {
        const created = await createEvent(data)
        setEvents(es => [...es, created])
      }
      setView('list')
      setEditEvent(null)
    } catch (err) {
      alert('שגיאה בשמירה: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editEvent || !confirm('למחוק את האירוע?')) return
    setLoading(true)
    try {
      await deleteEvent(editEvent.id)
      setEvents(es => es.filter(e => e.id !== editEvent.id))
      setView('list')
      setEditEvent(null)
    } catch (err) {
      alert('שגיאה במחיקה: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() { setEditEvent(null); setView('form') }
  function openEdit(ev) { setEditEvent(ev); setView('form') }
  function cancel() { setEditEvent(null); setView('list') }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <i className="ti ti-confetti" aria-hidden="true" />
          ERUIT
        </div>
        <div className={styles.navLinks}>
          <button
            className={`${styles.navLink} ${view === 'list' || view === 'form' ? styles.active : ''}`}
            onClick={() => { setView('list'); setEditEvent(null) }}
          >
            <i className="ti ti-calendar" /> אירועים
          </button>
          <button
            className={`${styles.navLink} ${view === 'summary' ? styles.active : ''}`}
            onClick={() => setView('summary')}
          >
            <i className="ti ti-chart-bar" /> סיכום חודשי
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        {fetching ? (
          <div className={styles.loading}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            טוען נתונים...
          </div>
        ) : view === 'summary' ? (
          <Summary events={events} />
        ) : view === 'form' ? (
          <EventForm
            event={editEvent}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={cancel}
            loading={loading}
          />
        ) : (
          <EventsList events={events} onEdit={openEdit} onAdd={openAdd} />
        )}
      </main>
    </div>
  )
}
