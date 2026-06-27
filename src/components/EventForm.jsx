import { useState, useEffect } from 'react'
import styles from './EventForm.module.css'

const emptyWorker = () => ({ id: Date.now() + Math.random(), name: '', role: '', salary: '' })

export default function EventForm({ event, onSave, onDelete, onCancel, loading }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [workers, setWorkers] = useState([emptyWorker()])

  useEffect(() => {
    if (event) {
      setName(event.name || '')
      setLocation(event.location || '')
      setDate(event.date || '')
      setTime(event.time || '')
      setWorkers(event.workers?.length ? event.workers.map(w => ({ ...w, id: w.id || Date.now() + Math.random() })) : [emptyWorker()])
    } else {
      setName(''); setLocation(''); setDate(''); setTime('')
      setWorkers([emptyWorker()])
    }
  }, [event])

  const total = workers.reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)

  function updateWorker(id, field, val) {
    setWorkers(ws => ws.map(w => w.id === id ? { ...w, [field]: val } : w))
  }
  function addWorker() { setWorkers(ws => [...ws, emptyWorker()]) }
  function removeWorker(id) { setWorkers(ws => ws.filter(w => w.id !== id)) }

  function handleSave() {
    if (!name.trim()) { alert('נא להזין שם אירוע'); return }
    const cleanWorkers = workers.filter(w => w.name.trim()).map(({ id, ...w }) => w)
    onSave({ name: name.trim(), location: location.trim(), date, time, workers: cleanWorkers })
  }

  return (
    <div className={styles.form}>
      <h2 className={styles.title}>{event ? `עריכה: ${event.name}` : 'אירוע חדש'}</h2>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>שם האירוע</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="שם האירוע" />
        </div>
        <div className={styles.field}>
          <label>מיקום</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="מיקום האירוע" />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>תאריך</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>שעה</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      <div className={styles.workersSection}>
        <div className={styles.workersSectionTitle}>
          <span>עובדים באירוע</span>
          <button className={styles.addWorkerBtn} onClick={addWorker}>
            <i className="ti ti-plus" /> הוסף עובד
          </button>
        </div>

        <div className={styles.workerHeader}>
          <span>שם עובד</span>
          <span>תפקיד</span>
          <span>שכר ₪</span>
          <span />
        </div>

        {workers.map(w => (
          <div key={w.id} className={styles.workerRow}>
            <input value={w.name} onChange={e => updateWorker(w.id, 'name', e.target.value)} placeholder="שם מלא" />
            <input value={w.role} onChange={e => updateWorker(w.id, 'role', e.target.value)} placeholder="תפקיד" />
            <input type="number" value={w.salary} onChange={e => updateWorker(w.id, 'salary', e.target.value)} placeholder="0" min="0" />
            <button className={styles.removeBtn} onClick={() => removeWorker(w.id)} title="הסר">
              <i className="ti ti-trash" />
            </button>
          </div>
        ))}

        <div className={styles.totalBox}>
          <span>סה"כ לשלם באירוע</span>
          <span className={styles.totalAmount}>₪{total.toLocaleString('he-IL')}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <div>
          {event && (
            <button className={styles.deleteBtn} onClick={onDelete} disabled={loading}>
              <i className="ti ti-trash" /> מחק אירוע
            </button>
          )}
        </div>
        <div className={styles.actionsRight}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>ביטול</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? 'שומר...' : 'שמור אירוע'}
          </button>
        </div>
      </div>
    </div>
  )
}
