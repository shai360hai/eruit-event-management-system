import styles from './EventsList.module.css'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function EventsList({ events, onEdit, onAdd }) {
  const [filterMonth, setFilterMonth] = [
    typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('m') || '') : '',
    () => {}
  ]

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>אירועים</h1>
        <button className={styles.addBtn} onClick={onAdd}>
          <i className="ti ti-plus" /> אירוע חדש
        </button>
      </div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:.3,marginBottom:14}}>
            <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M6 18h36" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="30" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M24 27v6M21 30h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p style={{color:'var(--text-secondary)',marginBottom:12}}>עדיין לא נוצרו אירועים</p>
          <button className={styles.emptyAddBtn} onClick={onAdd}>
            <i className="ti ti-plus" /> צור את האירוע הראשון
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {[...events]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(ev => {
              const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
              const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
              const wc = (ev.workers || []).length
              return (
                <div key={ev.id} className={styles.card} onClick={() => onEdit(ev)}>
                  <div className={styles.cardTop}>
                    <span className={styles.eventName}>{ev.name}</span>
                    <span className={styles.eventTotal}>₪{total.toLocaleString('he-IL')}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    {ev.location && <span><i className="ti ti-map-pin" /> {ev.location}</span>}
                    <span><i className="ti ti-calendar" /> {d}</span>
                    {ev.time && <span><i className="ti ti-clock" /> {ev.time}</span>}
                    <span><i className="ti ti-users" /> {wc} עובדים</span>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
