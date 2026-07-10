import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import styles from './EventForm.module.css'

export default function EventForm({ event, prefillDate, onSave, onDelete, onCancel, loading }) {
  const { isAdmin } = useAuth()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [workers, setWorkers] = useState([])
  const [allWorkers, setAllWorkers] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  const [showNewWorker, setShowNewWorker] = useState(false)
  const [newWorker, setNewWorker] = useState({ name: '', role: '', phone: '', default_salary: '' })
  const [savingWorker, setSavingWorker] = useState(false)

  function refreshWorkers() {
    return supabase.from('workers').select('*').order('name').then(({ data }) => setAllWorkers(data || []))
  }

  useEffect(() => { refreshWorkers() }, [])

  useEffect(() => {
    if (event && event.id) {
      setName(event.name || '')
      setLocation(event.location || '')
      setDate(event.date || '')
      setTime(event.time || '')
      setWorkers(event.workers?.length
        ? event.workers.map(w => ({ ...w, _id: w._id || Date.now() + Math.random() }))
        : [])
    } else {
      setName(''); setLocation(''); setDate(prefillDate || ''); setTime(''); setWorkers([])
    }
  }, [event, prefillDate])

  const total = workers.reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)

  function addFromList(w) {
    if (workers.find(ew => ew.name === w.name)) return
    setWorkers(ws => [...ws, {
      _id: Date.now() + Math.random(),
      name: w.name,
      role: w.role || '',
      phone: w.phone || '',
      // auto-fill default salary — editable per event
      salary: w.default_salary ? String(w.default_salary) : '',
      paid: false
    }])
    setShowPicker(false)
  }

  async function handleAddNewWorker() {
    if (!newWorker.name.trim()) { alert('נא להזין שם עובד'); return }
    setSavingWorker(true)
    await supabase.from('workers')
      .insert([{
        name: newWorker.name.trim(),
        role: newWorker.role.trim(),
        phone: newWorker.phone.trim(),
        default_salary: parseFloat(newWorker.default_salary) || 0
      }])
      .select().single()
    setWorkers(ws => [...ws, {
      _id: Date.now() + Math.random(),
      name: newWorker.name.trim(),
      role: newWorker.role.trim(),
      phone: newWorker.phone.trim(),
      salary: newWorker.default_salary || '',
      paid: false
    }])
    await refreshWorkers()
    setNewWorker({ name: '', role: '', phone: '', default_salary: '' })
    setShowNewWorker(false)
    setSavingWorker(false)
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
    onSave({ name: name.trim(), location: location.trim(), date, time, workers: cleanWorkers })
  }

  const filteredAllWorkers = allWorkers.filter(w =>
    !workers.find(ew => ew.name === w.name) &&
    w.name.includes(pickerSearch)
  )

  return (
    <div className={styles.form}>
      <h2 className={styles.title}>{event && event.id ? `עריכה: ${event.name || '(ללא שם)'}` : 'אירוע חדש'}</h2>

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
            <button className={styles.addWorkerBtn} onClick={() => { setShowPicker(p => !p); setPickerSearch(''); setShowNewWorker(false) }}>
              <i className="ti ti-users" /> בחר מרשימה
            </button>
            <button className={styles.addWorkerBtn} onClick={() => { setShowNewWorker(p => !p); setShowPicker(false); setNewWorker({ name: '', role: '', phone: '', default_salary: '' }) }}>
              <i className="ti ti-user-plus" /> עובד חדש
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
                <div key={w.id} className={styles.pickerItem} onClick={() => addFromList(w)}>
                  <div className={styles.pickerLeft}>
                    <span className={styles.pickerName}>{w.name}</span>
                    <span className={styles.pickerRole}>{w.role || '—'}</span>
                  </div>
                  {w.default_salary > 0 && (
                    <span className={styles.pickerSalary}>₪{Number(w.default_salary).toLocaleString('he-IL')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showNewWorker && (
          <div className={styles.newWorkerBox}>
            <div className={styles.newWorkerTitle}>עובד חדש — יישמר גם ברשימת העובדים</div>
            <div className={styles.newWorkerGrid}>
              <div className={styles.field}>
                <label>שם מלא *</label>
                <input value={newWorker.name} onChange={e => setNewWorker(f => ({...f, name: e.target.value}))} placeholder="שם העובד" autoFocus />
              </div>
              <div className={styles.field}>
                <label>תפקיד</label>
                <input value={newWorker.role} onChange={e => setNewWorker(f => ({...f, role: e.target.value}))} placeholder="תפקיד" />
              </div>
              <div className={styles.field}>
                <label>טלפון</label>
                <input value={newWorker.phone} onChange={e => setNewWorker(f => ({...f, phone: e.target.value}))} placeholder="050-0000000" />
              </div>
              <div className={styles.field}>
                <label>שכר ברירת מחדל ₪</label>
                <input type="number" min="0" value={newWorker.default_salary} onChange={e => setNewWorker(f => ({...f, default_salary: e.target.value}))} placeholder="0" />
              </div>
            </div>
            <div className={styles.newWorkerActions}>
              <button className={styles.cancelBtn} onClick={() => setShowNewWorker(false)}>ביטול</button>
              <button className={styles.saveBtn} onClick={handleAddNewWorker} disabled={savingWorker}>
                {savingWorker ? 'שומר...' : 'הוסף לאירוע'}
              </button>
            </div>
          </div>
        )}

        {workers.length > 0 && (
          <div className={styles.workerHeader}>
            <span>שם עובד</span>
            <span>תפקיד</span>
            <span>שכר ₪</span>
            <span>שולם</span>
            <span />
          </div>
        )}

        {workers.map(w => (
          <div key={w._id} className={styles.workerRow}>
            <input value={w.name} onChange={e => updateWorker(w._id, 'name', e.target.value)} placeholder="שם מלא" />
            <input value={w.role || ''} onChange={e => updateWorker(w._id, 'role', e.target.value)} placeholder="תפקיד" />
            <input
              type="number"
              value={w.salary || ''}
              onChange={e => updateWorker(w._id, 'salary', e.target.value)}
              placeholder="0"
              min="0"
            />
            <label className={styles.paidCheck} title="שולם">
              <input type="checkbox" checked={!!w.paid} onChange={e => updateWorker(w._id, 'paid', e.target.checked)} />
            </label>
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
          {event && event.id && isAdmin && (
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
