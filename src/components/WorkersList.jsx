import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './WorkersList.module.css'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function WorkersList({ events }) {
  const { isAdmin } = useAuth()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => { fetchWorkers() }, [])

  async function fetchWorkers() {
    setLoading(true)
    const { data, error } = await supabase.from('workers').select('*').order('name')
    if (!error) setWorkers(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('נא להזין שם עובד'); return }
    setSaving(true)
    if (editId) {
      await supabase.from('workers').update({ name: form.name.trim(), role: form.role.trim(), phone: form.phone.trim() }).eq('id', editId)
    } else {
      await supabase.from('workers').insert([{ name: form.name.trim(), role: form.role.trim(), phone: form.phone.trim() }])
    }
    await fetchWorkers()
    setForm({ name: '', role: '', phone: '' })
    setShowForm(false)
    setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`למחוק את ${name}?`)) return
    await supabase.from('workers').delete().eq('id', id)
    await fetchWorkers()
    if (expanded === id) setExpanded(null)
  }

  function openEdit(w) {
    setForm({ name: w.name, role: w.role || '', phone: w.phone || '' })
    setEditId(w.id)
    setShowForm(true)
  }

  // Build salary map from events
  const salaryMap = {}
  events.forEach(ev => {
    const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : '—'
    ;(ev.workers || []).forEach(w => {
      if (!w.name) return
      if (!salaryMap[w.name]) salaryMap[w.name] = { total: 0, entries: [] }
      salaryMap[w.name].total += parseFloat(w.salary) || 0
      salaryMap[w.name].entries.push({ date: d, eventName: ev.name || '—', salary: parseFloat(w.salary) || 0, role: w.role || '' })
    })
  })

  let filtered = workers.filter(w => {
    if (search.trim() && !w.name.includes(search.trim())) return false
    return true
  })

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>עובדים</h1>
        <div className={styles.headerActions}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className={styles.searchInput} />
          <select value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button className={styles.addBtn} onClick={() => { setForm({ name:'', role:'', phone:'' }); setEditId(null); setShowForm(true) }} style={{display: isAdmin ? '' : 'none'}}>
            <i className="ti ti-plus" /> עובד חדש
          </button>
        </div>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formTitle}>{editId ? 'עריכת עובד' : 'הוספת עובד'}</div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>שם מלא *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="שם העובד" />
            </div>
            <div className={styles.field}>
              <label>תפקיד</label>
              <input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} placeholder="תפקיד" />
            </div>
            <div className={styles.field}>
              <label>טלפון</label>
              <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="050-0000000" />
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditId(null) }}>ביטול</button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'שומר...' : 'שמור'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>טוען...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-users-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
          אין עובדים עדיין
        </div>
      ) : (
        <>
          <div className={styles.tableHeader}>
            <span>שם עובד</span>
            <span>תפקיד</span>
            <span>טלפון</span>
            <span>אירועים</span>
            <span>סה"כ שכר</span>
            <span />
          </div>

          {filtered.map(w => {
            const sal = salaryMap[w.name]
            // filter by month
            const entries = sal ? (month
              ? sal.entries.filter((_, i) => {
                  const ev = events.find(e => (e.workers||[]).some(ew => ew.name === w.name))
                  return ev && new Date(ev.date+'T00:00:00').getMonth()+1 === parseInt(month)
                })
              : sal.entries) : []
            const total = entries.reduce((s, e) => s + e.salary, 0)
            const isExp = expanded === w.id

            return (
              <div key={w.id} className={styles.workerBlock}>
                <div className={`${styles.workerRow} ${isExp ? styles.workerRowOpen : ''}`}>
                  <span className={styles.workerName} onClick={() => setExpanded(isExp ? null : w.id)}>
                    <i className={`ti ${isExp ? 'ti-chevron-down' : 'ti-chevron-left'} ${styles.chevron}`} />
                    {w.name}
                  </span>
                  <span className={styles.muted}>{w.role || '—'}</span>
                  <span className={styles.muted}>{w.phone || '—'}</span>
                  <span>{(sal?.entries || []).length}</span>
                  <span className={styles.salary}>₪{(sal?.total || 0).toLocaleString('he-IL')}</span>
                  <span className={styles.rowActions}>
                    <button className={styles.editBtn} style={{display: isAdmin ? '' : 'none'}} onClick={() => openEdit(w)} title="עריכה"><i className="ti ti-pencil" /></button>
                    <button className={styles.deleteBtn} style={{display: isAdmin ? '' : 'none'}} onClick={() => handleDelete(w.id, w.name)} title="מחיקה"><i className="ti ti-trash" /></button>
                  </span>
                </div>

                {isExp && sal && (
                  <div className={styles.eventsDetail}>
                    <div className={styles.detailHeader}>
                      <span>תאריך</span><span>אירוע</span><span>תפקיד</span><span>שכר</span>
                    </div>
                    {sal.entries.map((e, i) => (
                      <div key={i} className={styles.detailRow}>
                        <span className={styles.muted}>{e.date}</span>
                        <span>{e.eventName}</span>
                        <span className={styles.muted}>{e.role || '—'}</span>
                        <span className={styles.salary}>₪{e.salary.toLocaleString('he-IL')}</span>
                      </div>
                    ))}
                    <div className={styles.detailTotal}>
                      <span>סה"כ</span><span /><span />
                      <span className={styles.salary}>₪{sal.total.toLocaleString('he-IL')}</span>
                    </div>
                  </div>
                )}
                {isExp && !sal && (
                  <div className={styles.eventsDetail}>
                    <div className={styles.noEvents}>לא שובץ לאירועים עדיין</div>
                  </div>
                )}
              </div>
            )
          })}

          <div className={styles.grandTotal}>
            <span>סה"כ ({filtered.length} עובדים)</span>
            <span /><span />
            <span>{Object.values(salaryMap).reduce((s,v)=>s+v.entries.length,0)}</span>
            <span className={styles.salary}>₪{Object.values(salaryMap).reduce((s,v)=>s+v.total,0).toLocaleString('he-IL')}</span>
            <span />
          </div>
        </>
      )}
    </div>
  )
}
