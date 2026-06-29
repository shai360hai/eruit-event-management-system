import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import EventsList from './components/EventsList'
import EventForm from './components/EventForm'
import Summary from './components/Summary'
import Calendar from './components/Calendar'
import WorkersList from './components/WorkersList'
import Login from './components/Login'
import { getEvents, createEvent, updateEvent, deleteEvent } from './api'
import styles from './App.module.css'

function Shell() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth()
  const [events, setEvents] = useState([])
  const [view, setView] = useState('calendar')
  const [editEvent, setEditEvent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!user) return
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setFetching(false))
  }, [user])

  if (authLoading) return (
    <div className={styles.centered}>
      <i className="ti ti-loader-2" style={{ fontSize: 28 }} /> טוען...
    </div>
  )

  if (!user) return <Login />

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
      setView('calendar')
      setEditEvent(null)
    } catch (err) {
      alert('שגיאה בשמירה: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!editEvent || !isAdmin || !confirm('למחוק את האירוע?')) return
    setLoading(true)
    try {
      await deleteEvent(editEvent.id)
      setEvents(es => es.filter(e => e.id !== editEvent.id))
      setView('calendar')
      setEditEvent(null)
    } catch (err) {
      alert('שגיאה במחיקה: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() { setEditEvent(null); setView('form') }
  function openAddWithDate(date) { setEditEvent({ _prefillDate: date }); setView('form') }
  function openEdit(ev) { setEditEvent(ev); setView('form') }
  function cancel() { setEditEvent(null); setView('calendar') }

  const NAV = [
    { id: 'calendar', icon: 'ti-calendar-month', label: 'לוח שנה' },
    { id: 'list',     icon: 'ti-list',            label: 'אירועים' },
    { id: 'workers',  icon: 'ti-users',            label: 'עובדים' },
    { id: 'summary',  icon: 'ti-chart-bar',        label: 'סיכום' },
  ]

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <i className="ti ti-confetti" />
          ERUIT
        </div>
        <div className={styles.navLinks}>
          {NAV.map(n => (
            <button key={n.id}
              className={`${styles.navLink} ${view === n.id ? styles.active : ''}`}
              onClick={() => { setView(n.id); setEditEvent(null) }}
            >
              <i className={`ti ${n.icon}`} /> {n.label}
            </button>
          ))}
        </div>
        <div className={styles.navRight}>
          <button className={styles.addBtn} onClick={openAdd}>
            <i className="ti ti-plus" /> אירוע חדש
          </button>
          <div className={styles.userInfo}>
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} className={styles.avatar} alt="" />
            )}
            {isAdmin && <span className={styles.adminBadge}>Admin</span>}
            <button className={styles.signOutBtn} onClick={signOut} title="התנתק">
              <i className="ti ti-logout" />
            </button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        {fetching ? (
          <div className={styles.centered}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            טוען נתונים...
          </div>
        ) : view === 'form' ? (
          <EventForm event={editEvent} onSave={handleSave} onDelete={handleDelete} onCancel={cancel} loading={loading} />
        ) : view === 'calendar' ? (
          <Calendar events={events} onEventClick={openEdit} onAddEvent={openAddWithDate} />
        ) : view === 'list' ? (
          <EventsList events={events} onEdit={openEdit} onAdd={openAdd} />
        ) : view === 'workers' ? (
          <WorkersList events={events} />
        ) : (
          <Summary events={events} />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
