import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import styles from './WorkersList.module.css'
import { exportWorkerPdf, exportMonthlyAllWorkersPdf } from '../utils/pdfExport'

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

  // Build salary map from events, with each entry tagged by its own month
  const salaryMap = {}
  events.forEach(ev => {
    const evMonth = ev.date ? new Date(ev.date + 'T00:00:00').getMonth() + 1 : null
    const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : '—'
    ;(ev.workers || []).forEach(w => {
      if (!w.name) return
      if (!salaryMap[w.name]) salaryMap[w.name] = []
      salaryMap[w.name].push({ date: d, month: evMonth, eventName: ev.name || '—', salary: parseFloat(w.salary) || 0, role: w.role || '' })
    })
  })

  let filtered = workers.filter(w => {
    if (search.trim() && !w.name.includes(search.trim())) return false
    return true
  })

  // Attach filtered (by month) entries + totals, then sort by total descending
  filtered = filtered.map(w => {
    const allEntries = salaryMap[w.name] || []
    const entries = month ? allEntries.filter(e => e.month === parseInt(month)) : allEntries
    const total = entries.reduce((s, e) => s + e.salary, 0)
    return { ...w, _entries: entries, _total: total }
  })

  // Always show the full roster — sort by relevant-month total first, then alphabetically for ties (e.g. zero-salary workers)
  filtered.sort((a, b) => b._total - a._total || a.name.localeCompare(b.name, 'he'))

  const monthLabel = month ? MONTHS[parseInt(month)] : 'כל החודשים'

  function handleExportWorker(w) {
    exportWorkerPdf(w, w._entries, w._total, monthLabel)
  }

  function handleExportAll() {
    // PDF should only include workers who actually have entries (avoid a list full of zeros)
    const active = filtered.filter(w => w._entries.length > 0)
    const data = active.map(w => ({ name: w.name, role: w.role, count: w._entries.length, total: w._total }))
    const grand = active.reduce((s, w) => s + w._total, 0)
    exportMonthlyAllWorkersPdf(data, monthLabel, grand)
  }

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
          <button className={styles.exportBtn} onClick={handleExportAll}>
            <i className="ti ti-file-type-pdf" /> ייצוא PDF
          </button>
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
            const entries = w._entries
            const total = w._total
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
                  <span>{entries.length}</span>
                  <span className={styles.salary}>₪{total.toLocaleString('he-IL')}</span>
                  <span className={styles.rowActions}>
                    <button className={styles.pdfBtn} onClick={(e) => { e.stopPropagation(); handleExportWorker(w) }} title="ייצוא PDF"><i className="ti ti-file-type-pdf" /></button>
                    <button className={styles.editBtn} style={{display: isAdmin ? '' : 'none'}} onClick={() => openEdit(w)} title="עריכה"><i className="ti ti-pencil" /></button>
                    <button className={styles.deleteBtn} style={{display: isAdmin ? '' : 'none'}} onClick={() => handleDelete(w.id, w.name)} title="מחיקה"><i className="ti ti-trash" /></button>
                  </span>
                </div>

                {isExp && entries.length > 0 && (
                  <div className={styles.eventsDetail}>
                    <div className={styles.detailHeader}>
                      <span>תאריך</span><span>אירוע</span><span>תפקיד</span><span>שכר</span>
                    </div>
                    {entries.map((e, i) => (
                      <div key={i} className={styles.detailRow}>
                        <span className={styles.muted}>{e.date}</span>
                        <span>{e.eventName}</span>
                        <span className={styles.muted}>{e.role || '—'}</span>
                        <span className={styles.salary}>₪{e.salary.toLocaleString('he-IL')}</span>
                      </div>
                    ))}
                    <div className={styles.detailTotal}>
                      <span>סה"כ</span><span /><span />
                      <span className={styles.salary}>₪{total.toLocaleString('he-IL')}</span>
                    </div>
                  </div>
                )}
                {isExp && entries.length === 0 && (
                  <div className={styles.eventsDetail}>
                    <div className={styles.noEvents}>
                      {month ? `לא שובץ לאירועים ב${monthLabel}` : 'לא שובץ לאירועים עדיין'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div className={styles.grandTotal}>
            <span>סה"כ ({filtered.length} עובדים)</span>
            <span /><span />
            <span>{filtered.reduce((s,w)=>s+w._entries.length,0)}</span>
            <span className={styles.salary}>₪{filtered.reduce((s,w)=>s+w._total,0).toLocaleString('he-IL')}</span>
            <span />
          </div>
        </>
      )}
    </div>
  )
}
