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
          <i className="ti ti-calendar-off" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          <p>אין אירועים עדיין</p>
          <button className={styles.emptyAddBtn} onClick={onAdd}>הוסף אירוע ראשון</button>
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
