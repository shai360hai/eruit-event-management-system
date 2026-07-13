import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import EventsList from './components/EventsList'
import EventForm from './components/EventForm'
import Summary from './components/Summary'
import Calendar from './components/Calendar'
import WorkersList from './components/WorkersList'
import Login from './components/Login'
import Payments from './components/Payments'
import Dashboard from './components/Dashboard'
import { getEvents, createEvent, updateEvent, deleteEvent } from './api'
import styles from './App.module.css'
import { useDarkMode } from './hooks/useDarkMode'

function Shell() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth()
  const [dark, setDark] = useDarkMode()
  const [events, setEvents] = useState([])
  const [view, setView] = useState('dashboard')
  const [editEvent, setEditEvent] = useState(null)
  const [prefillDate, setPrefillDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [unpaidTotal, setUnpaidTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setFetching(false))

    // Fetch unpaid total for badge
    import('./utils/payments').then(({ getAllPayments }) => {
      getAllPayments().then(ps => {
        const total = ps.filter(p => !p.paid).reduce((s, p) => s + (p.amount || 0), 0)
        setUnpaidTotal(total)
      }).catch(() => {})
    })
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
      setView('dashboard')
      setEditEvent(null)
      setPrefillDate('')
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
      setView('dashboard')
      setEditEvent(null)
    } catch (err) {
      alert('שגיאה במחיקה: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() { setEditEvent(null); setView('form') }
  function openAddWithDate(date) { setEditEvent(null); setPrefillDate(date); setView('form') }
  function openEdit(ev) { setEditEvent(ev); setView('form') }
  function cancel() { setEditEvent(null); setPrefillDate(''); setView('dashboard') }

  const NAV = [
    { id: 'dashboard', icon: 'ti-home', label: 'בית' },
    { id: 'calendar', icon: 'ti-calendar-month', label: 'לוח שנה' },
    { id: 'list',     icon: 'ti-list',            label: 'אירועים' },
    { id: 'workers',  icon: 'ti-users',            label: 'עובדים' },
    { id: 'summary',  icon: 'ti-chart-bar',        label: 'סיכום' },
    { id: 'payments', icon: 'ti-wallet',            label: 'תשלומים' },
  ]

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <i className="ti ti-confetti" />
          ניהול אירועים
        </div>
        <div className={styles.navLinks}>
          {NAV.map(n => (
            <button key={n.id}
              className={`${styles.navLink} ${view === n.id ? styles.active : ''}`}
              onClick={() => { setView(n.id); setEditEvent(null) }}
            >
              <i className={`ti ${n.icon}`} /> {n.label}
              {n.id === 'payments' && unpaidTotal > 0 && (
                <span className={styles.unpaidBadge}>₪{unpaidTotal.toLocaleString('he-IL')}</span>
              )}
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
            <button className={styles.darkBtn} onClick={() => setDark(d => !d)} title={dark ? 'מצב יום' : 'מצב לילה'}>
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
            </button>
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
        ) : view === 'dashboard' ? (
          <Dashboard events={events} onNavigate={v => { setView(v); setEditEvent(null) }} />
        ) : view === 'form' ? (
          <EventForm event={editEvent} prefillDate={prefillDate} onSave={handleSave} onDelete={handleDelete} onCancel={cancel} loading={loading} />
        ) : view === 'calendar' ? (
          <Calendar events={events} onEventClick={openEdit} onAddEvent={openAddWithDate} />
        ) : view === 'list' ? (
          <EventsList events={events} onEdit={openEdit} onAdd={openAdd} />
        ) : view === 'workers' ? (
          <WorkersList events={events} />
        ) : view === 'payments' ? (
          <Payments />
        ) : (
          <Summary events={events} onEventsUpdate={async () => {
            const fresh = await import('./api').then(m => m.getEvents())
            setEvents(fresh)
          }} />
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
