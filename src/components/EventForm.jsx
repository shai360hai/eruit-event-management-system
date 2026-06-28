import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './EventForm.module.css'

export default function EventForm({ event, onSave, onDelete, onCancel, loading }) {
  const { isAdmin } = useAuth()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [workers, setWorkers] = useState([])
  const [allWorkers, setAllWorkers] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    supabase.from('workers').select('*').order('name').then(({ data }) => setAllWorkers(data || []))
  }, [])

  useEffect(() => {
    if (event) {
      setName(event.name || '')
      setLocation(event.location || '')
      setDate(event.date || '')
      setTime(event.time || '')
      setWorkers(event.workers?.length
        ? event.workers.map(w => ({ ...w, _id: w._id || Date.now() + Math.random() }))
        : [])
    } else {
      setName(''); setLocation(''); setDate(''); setTime(''); setWorkers([])
    }
  }, [event])

  const total = workers.reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)

  function addFromList(w) {
    if (workers.find(ew => ew.name === w.name)) return
    setWorkers(ws => [...ws, { _id: Date.now() + Math.random(), name: w.name, role: w.role || '', salary: '' }])
  }

  function addManual() {
    setWorkers(ws => [...ws, { _id: Date.now() + Math.random(), name: '', role: '', salary: '' }])
  }

  function updateWorker(id, field, val) {
    setWorkers(ws => ws.map(w => w._id === id ? { ...w, [field]: val } : w))
  }

  function removeWorker(id) {
    setWorkers(ws => ws.filter(w => w._id !== id))
  }

  async function handleSave() {
    if (!name.trim()) { alert('נא להזין שם אירוע'); return }
    const cleanWorkers = workers.filter(w => w.name.trim()).map(({ _id, ...w }) => w)

    // Save new workers (not already in list) to workers table
    const existingNames = new Set(allWorkers.map(w => w.name))
    const newWorkers = cleanWorkers.filter(w => !existingNames.has(w.name))
    if (newWorkers.length > 0) {
      await supabase.from('workers').insert(newWorkers.map(w => ({
        name: w.name,
        role: w.role || '',
        phone: ''
      })))
    }

    onSave({ name: name.trim(), location: location.trim(), date, time, workers: cleanWorkers })
  }

  const filteredAllWorkers = allWorkers.filter(w =>
    !workers.find(ew => ew.name === w.name) &&
    w.name.includes(pickerSearch)
  )

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
          <div className={styles.workerBtns}>
            <button className={styles.addWorkerBtn} onClick={() => { setShowPicker(p => !p); setPickerSearch('') }}>
              <i className="ti ti-users" /> בחר מרשימה
            </button>
            <button className={styles.addWorkerBtn} onClick={addManual}>
              <i className="ti ti-plus" /> הוסף ידנית
            </button>
          </div>
        </div>

        {showPicker && (
          <div className={styles.picker}>
            <input
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              placeholder="חיפוש עובד..."
              className={styles.pickerSearch}
              autoFocus
            />
            <div className={styles.pickerList}>
              {filteredAllWorkers.length === 0 ? (
                <div className={styles.pickerEmpty}>אין עובדים זמינים</div>
              ) : filteredAllWorkers.map(w => (
                <div key={w.id} className={styles.pickerItem} onClick={() => { addFromList(w); setShowPicker(false) }}>
                  <span className={styles.pickerName}>{w.name}</span>
                  <span className={styles.pickerRole}>{w.role || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {workers.length > 0 && (
          <div className={styles.workerHeader}>
            <span>שם עובד</span>
            <span>תפקיד</span>
            <span>שכר ₪</span>
            <span />
          </div>
        )}

        {workers.map(w => (
          <div key={w._id} className={styles.workerRow}>
            <input value={w.name} onChange={e => updateWorker(w._id, 'name', e.target.value)} placeholder="שם מלא" />
            <input value={w.role} onChange={e => updateWorker(w._id, 'role', e.target.value)} placeholder="תפקיד" />
            <input type="number" value={w.salary} onChange={e => updateWorker(w._id, 'salary', e.target.value)} placeholder="0" min="0" />
            <button className={styles.removeBtn} onClick={() => removeWorker(w._id)}>
              <i className="ti ti-x" />
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
          {event && isAdmin && (
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
