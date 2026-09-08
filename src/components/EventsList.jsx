import { useState } from 'react'
import { calcHours, fmtHours } from '../utils/hours'
import styles from './EventsList.module.css'
import { exportEventsPdf } from '../utils/pdfExport'

const MONTHS = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function EventsList({ events, onEdit, onAdd, onDuplicate }) {
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const visibleEvents = [...events]
    .filter(ev => {
      if (monthFilter && (!ev.date || new Date(ev.date + 'T00:00:00').getMonth() + 1 !== parseInt(monthFilter))) return false
      if (search.trim() && !(ev.name || '').includes(search.trim()) && !(ev.location || '').includes(search.trim())) return false
      return true
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  function handleExportPdf() {
    const parts = []
    if (monthFilter) parts.push(MONTHS[parseInt(monthFilter)])
    if (search.trim()) parts.push(`"${search.trim()}"`)
    const label = parts.length ? parts.join(' · ') : 'כל האירועים'
    exportEventsPdf(visibleEvents, label)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>אירועים</h1>
        <div className={styles.headerActions}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש אירוע / מיקום..."
            className={styles.searchInput}
          />
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className={styles.monthSelect}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button className={styles.exportBtn} onClick={handleExportPdf} disabled={visibleEvents.length === 0}>
            <i className="ti ti-file-type-pdf" /> ייצוא PDF
          </button>
          <button className={styles.addBtn} onClick={onAdd}>
            <i className="ti ti-plus" /> אירוע חדש
          </button>
        </div>
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
          {visibleEvents.map(ev => {
              const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
              const paid = (ev.workers || []).filter(w => w.paid).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
              const allPaid = total > 0 && paid === total
              const partPaid = paid > 0 && paid < total
              const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
              const wc = (ev.workers || []).length
                const isOpen = expandedId === ev.id
                const evHours = (ev.workers || []).reduce((s, w) => s + calcHours(w.start_time, w.end_time), 0)
                return (
                <div key={ev.id} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
                  <div
                    className={styles.cardHead}
                    onClick={() => setExpandedId(isOpen ? null : ev.id)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.eventName}>
                        <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-left'} ${styles.chevron}`} />
                        {ev.name}
                      </span>
                      <div className={styles.eventTotalWrap}>
                        <span className={styles.eventTotal}>₪{total.toLocaleString('he-IL')}</span>
                        {allPaid && total > 0 && <span className={styles.paidBadge}>✓ שולם</span>}
                        {partPaid && <span className={styles.partPaidBadge}>שולם ₪{paid.toLocaleString('he-IL')}</span>}
                      </div>
                    </div>
                    <div className={styles.cardMeta}>
                      {ev.event_type && <span className={styles.typeBadge}>{ev.event_type}</span>}
                      {ev.notes && <span title={ev.notes}><i className="ti ti-note" /> הערות</span>}
                      {ev.location && <span><i className="ti ti-map-pin" /> {ev.location}</span>}
                      <span><i className="ti ti-calendar" /> {d}</span>
                      {ev.time && <span><i className="ti ti-clock" /> {ev.time}</span>}
                      <span><i className="ti ti-users" /> {wc} עובדים</span>
                      {evHours > 0 && <span><i className="ti ti-hourglass" /> {fmtHours(evHours)} שעות</span>}
                    </div>
                  </div>

                  {isOpen && (
                    <div className={styles.details}>
                      {ev.notes && (
                        <div className={styles.detailsNotes}>
                          <i className="ti ti-note" /> {ev.notes}
                        </div>
                      )}

                      {wc === 0 ? (
                        <div className={styles.noWorkers}>לא שובצו עובדים לאירוע זה</div>
                      ) : (
                        <>
                          <div className={styles.wHeader}>
                            <span>שם עובד</span>
                            <span>תפקיד</span>
                            <span>שעות</span>
                            <span>שכר</span>
                            <span>סטטוס</span>
                          </div>
                          {(ev.workers || []).map((w, i) => {
                            const hrs = calcHours(w.start_time, w.end_time)
                            return (
                              <div key={i} className={styles.wRow}>
                                <span className={styles.wName}>
                                  {w.name}
                                  {w.note && <span className={styles.wNote}> · {w.note}</span>}
                                </span>
                                <span className={styles.muted}>{w.role || '—'}</span>
                                <span className={styles.muted}>
                                  {hrs ? (w.start_time && w.end_time ? `${w.start_time}-${w.end_time}` : fmtHours(hrs)) : '—'}
                                </span>
                                <span className={styles.wSalary}>₪{(parseFloat(w.salary) || 0).toLocaleString('he-IL')}</span>
                                <span>
                                  {w.paid
                                    ? <span className={styles.paidTxt}>✓ שולם</span>
                                    : <span className={styles.pendTxt}>ממתין</span>}
                                </span>
                              </div>
                            )
                          })}
                          <div className={styles.wTotal}>
                            <span>סה"כ</span>
                            <span />
                            <span>{evHours > 0 ? fmtHours(evHours) : '—'}</span>
                            <span>₪{total.toLocaleString('he-IL')}</span>
                            <span className={allPaid ? styles.paidTxt : styles.pendTxt}>
                              {allPaid ? '✓ שולם' : `נותר ₪${(total - paid).toLocaleString('he-IL')}`}
                            </span>
                          </div>
                        </>
                      )}

                      <div className={styles.detailsActions}>
                        <button className={styles.detailBtn} onClick={() => onDuplicate(ev)}>
                          <i className="ti ti-copy" /> שכפל
                        </button>
                        <button className={styles.detailBtnPrimary} onClick={() => onEdit(ev)}>
                          <i className="ti ti-pencil" /> ערוך אירוע
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
