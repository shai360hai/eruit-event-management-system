import { useState, useEffect } from 'react'
import { getPayers, addPayer, deletePayer, getPaymentsReceived, addPaymentReceived, deletePaymentReceived } from '../api'
import { MONTHS } from '../utils/constants'
import { usePersistedMonth } from '../hooks/usePersistedMonth'
import styles from './Settlements.module.css'

export default function Settlements({ events, isAdmin }) {
  const [payers, setPayers] = useState([])
  const [paymentsReceived, setPaymentsReceived] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = usePersistedMonth('eruit-month-settlements')

  // Add payer form (admin only)
  const [newPayerName, setNewPayerName] = useState('')
  const [savingPayer, setSavingPayer] = useState(false)

  // Add payment received form
  const [addingFor, setAddingFor] = useState(null)   // payer name
  const [payForm, setPayForm] = useState({ amount: '', note: '', received_at: new Date().toISOString().slice(0, 10) })
  const [savingPay, setSavingPay] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [p, pr] = await Promise.all([getPayers(), getPaymentsReceived()])
    setPayers(p)
    setPaymentsReceived(pr)
    setLoading(false)
  }

  // ── Debt per payer ─────────────────────────────────────────────────────────
  // For each event whose payer matches, sum unpaid worker salaries
  function debtForPayer(payerName) {
    return events
      .filter(ev => (ev.payer || '').trim() === payerName)
      .filter(ev => !month || (ev.date && new Date(ev.date + 'T00:00:00').getMonth() + 1 === parseInt(month)))
      .reduce((s, ev) =>
        s + (ev.workers || []).filter(w => !w.paid).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)
  }

  function totalDebtForPayer(payerName) {
    return events
      .filter(ev => (ev.payer || '').trim() === payerName)
      .filter(ev => !month || (ev.date && new Date(ev.date + 'T00:00:00').getMonth() + 1 === parseInt(month)))
      .reduce((s, ev) =>
        s + (ev.workers || []).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)
  }

  function receivedForPayer(payerName) {
    return paymentsReceived
      .filter(p => p.payer_name === payerName)
      .filter(p => {
        if (!month) return true
        return new Date(p.received_at + 'T00:00:00').getMonth() + 1 === parseInt(month)
      })
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  }

  function eventsForPayer(payerName) {
    return events
      .filter(ev => (ev.payer || '').trim() === payerName)
      .filter(ev => !month || (ev.date && new Date(ev.date + 'T00:00:00').getMonth() + 1 === parseInt(month)))
  }

  // ── Add payer ──────────────────────────────────────────────────────────────
  async function handleAddPayer() {
    if (!newPayerName.trim()) return
    setSavingPayer(true)
    try {
      await addPayer(newPayerName.trim())
      setNewPayerName('')
      await load()
    } catch (e) { alert('שגיאה: ' + e.message) }
    setSavingPayer(false)
  }

  async function handleDeletePayer(p) {
    if (!confirm(`למחוק את ${p.name}?`)) return
    try {
      await deletePayer(p.id)
      await load()
    } catch (e) { alert('שגיאה: ' + e.message) }
  }

  // ── Add payment received ───────────────────────────────────────────────────
  function openAddPayment(payerName) {
    setAddingFor(payerName)
    setPayForm({ amount: '', note: '', received_at: new Date().toISOString().slice(0, 10) })
  }

  async function handleSavePayment() {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { alert('נא להזין סכום'); return }
    setSavingPay(true)
    try {
      await addPaymentReceived({
        payer_name: addingFor,
        amount: payForm.amount,
        note: payForm.note,
        received_at: payForm.received_at,
      })
      setAddingFor(null)
      await load()
    } catch (e) { alert('שגיאה: ' + e.message) }
    setSavingPay(false)
  }

  async function handleDeletePayment(id) {
    if (!confirm('למחוק רישום זה?')) return
    try {
      await deletePaymentReceived(id)
      await load()
    } catch (e) { alert('שגיאה: ' + e.message) }
  }

  const monthLabel = month ? MONTHS[parseInt(month)] : 'כל החודשים'

  // Grand totals
  const grandDebt = payers.reduce((s, p) => s + Math.max(0, debtForPayer(p.name) - receivedForPayer(p.name)), 0)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>התחשבנות</h1>
        <div className={styles.headerActions}>
          <select value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">כל החודשים</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {grandDebt > 0 && (
        <div className={styles.grandBanner}>
          <i className="ti ti-alert-triangle" />
          סה"כ חוב פתוח ממשלמים{month ? ` ב${monthLabel}` : ''}: <strong>₪{grandDebt.toLocaleString('he-IL')}</strong>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>טוען...</div>
      ) : (
        <>
          {payers.map(payer => {
            const debt       = debtForPayer(payer.name)       // unpaid workers for this payer
            const totalBilled = totalDebtForPayer(payer.name) // all worker salary billed
            const received   = receivedForPayer(payer.name)   // cash received from payer
            const balance    = debt - received                 // what's still owed net
            const payerEvs  = eventsForPayer(payer.name)
            const payerPayments = paymentsReceived
              .filter(p => p.payer_name === payer.name)
              .filter(p => !month || new Date(p.received_at + 'T00:00:00').getMonth() + 1 === parseInt(month))

            return (
              <div key={payer.id} className={`${styles.payerCard} ${balance <= 0 && totalBilled > 0 ? styles.payerCardDone : ''}`}>
                {/* ── Card header ── */}
                <div className={styles.payerCardHead}>
                  <div className={styles.payerNameRow}>
                    <i className={`ti ti-user-dollar ${styles.payerIcon}`} />
                    <span className={styles.payerName}>{payer.name}</span>
                    {isAdmin && (
                      <button className={styles.deletePayerBtn} onClick={() => handleDeletePayer(payer)} title="מחק משלם">
                        <i className="ti ti-trash" />
                      </button>
                    )}
                  </div>
                  <div className={styles.payerTotals}>
                    <div className={`${styles.totalChip} ${styles.totalChipBilled}`}>
                      <span className={styles.chipLbl}>חויב</span>
                      <span className={styles.chipVal}>₪{totalBilled.toLocaleString('he-IL')}</span>
                    </div>
                    <div className={`${styles.totalChip} ${styles.totalChipReceived}`}>
                      <span className={styles.chipLbl}>התקבל</span>
                      <span className={styles.chipVal}>₪{received.toLocaleString('he-IL')}</span>
                    </div>
                    <div className={`${styles.totalChip} ${balance > 0 ? styles.totalChipOwed : styles.totalChipDone}`}>
                      <span className={styles.chipLbl}>{balance > 0 ? 'יתרה לתשלום' : 'מאוזן'}</span>
                      <span className={styles.chipVal}>
                        {balance > 0 ? `₪${balance.toLocaleString('he-IL')}` : <><i className="ti ti-check" /> שולם הכל</>}
                      </span>
                    </div>
                    <button className={styles.addPayBtn} onClick={() => openAddPayment(payer.name)}>
                      <i className="ti ti-plus" /> רשום תשלום שהתקבל
                    </button>
                  </div>
                </div>

                {/* ── Add payment received form ── */}
                {addingFor === payer.name && (
                  <div className={styles.addPayForm}>
                    <div className={styles.addPayTitle}><i className="ti ti-cash" /> רישום תשלום שהתקבל מ{payer.name}</div>
                    <div className={styles.addPayFields}>
                      <div className={styles.field}>
                        <label>סכום ₪ *</label>
                        <input
                          type="number" min="1" autoFocus
                          value={payForm.amount}
                          onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>תאריך קבלה</label>
                        <input
                          type="date"
                          value={payForm.received_at}
                          onChange={e => setPayForm(f => ({ ...f, received_at: e.target.value }))}
                        />
                      </div>
                      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                        <label>הערה (אופציונלי)</label>
                        <input
                          value={payForm.note}
                          onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
                          placeholder="למשל: העברה בנקאית / מזומן / צ'ק"
                          onKeyDown={e => e.key === 'Enter' && handleSavePayment()}
                        />
                      </div>
                    </div>
                    <div className={styles.addPayActions}>
                      <button className={styles.cancelBtn} onClick={() => setAddingFor(null)}>ביטול</button>
                      <button className={styles.saveBtn} onClick={handleSavePayment} disabled={savingPay}>
                        {savingPay ? 'שומר...' : <><i className="ti ti-check" /> שמור תשלום</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Events billed to this payer ── */}
                {payerEvs.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}><i className="ti ti-calendar-event" /> אירועים לחיוב</div>
                    <div className={styles.evTable}>
                      <div className={styles.evTableHead}>
                        <span>אירוע</span>
                        <span>תאריך</span>
                        <span>עובדים</span>
                        <span>סה"כ</span>
                        <span>שולם לעובדים</span>
                        <span>חייב</span>
                      </div>
                      {payerEvs.map(ev => {
                        const evTotal = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
                        const evPaid  = (ev.workers || []).filter(w => w.paid).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
                        const evOwed  = evTotal - evPaid
                        const d = ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('he-IL') : '—'
                        return (
                          <div key={ev.id} className={`${styles.evRow} ${evOwed === 0 && evTotal > 0 ? styles.evRowDone : ''}`}>
                            <span className={styles.evName}>{ev.name}</span>
                            <span className={styles.muted}>{d}</span>
                            <span className={styles.muted}>{(ev.workers || []).length}</span>
                            <span>₪{evTotal.toLocaleString('he-IL')}</span>
                            <span className={evPaid > 0 ? styles.paidTxt : styles.muted}>
                              {evPaid > 0 ? `₪${evPaid.toLocaleString('he-IL')}` : '—'}
                            </span>
                            <span className={evOwed > 0 ? styles.owedTxt : styles.paidTxt}>
                              {evOwed > 0 ? `₪${evOwed.toLocaleString('he-IL')}` : <><i className="ti ti-check" /> אפס</>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Payments received from payer ── */}
                {payerPayments.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}><i className="ti ti-cash" /> תשלומים שהתקבלו</div>
                    <div className={styles.prTable}>
                      <div className={styles.prTableHead}>
                        <span>תאריך</span>
                        <span>סכום</span>
                        <span>הערה</span>
                        <span />
                      </div>
                      {payerPayments.map(pr => (
                        <div key={pr.id} className={styles.prRow}>
                          <span className={styles.muted}>
                            {new Date(pr.received_at + 'T00:00:00').toLocaleDateString('he-IL')}
                          </span>
                          <span className={styles.paidTxt}>₪{parseFloat(pr.amount).toLocaleString('he-IL')}</span>
                          <span className={styles.muted}>{pr.note || '—'}</span>
                          <span>
                            {isAdmin && (
                              <button className={styles.delPayBtn} onClick={() => handleDeletePayment(pr.id)} title="מחק">
                                <i className="ti ti-trash" />
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {payerEvs.length === 0 && payerPayments.length === 0 && (
                  <div className={styles.noData}>אין נתונים{month ? ` ל${monthLabel}` : ''}</div>
                )}
              </div>
            )
          })}

          {/* ── Admin: add new payer ── */}
          {isAdmin && (
            <div className={styles.addPayerCard}>
              <div className={styles.addPayerTitle}><i className="ti ti-user-plus" /> הוסף משלם חדש</div>
              <div className={styles.addPayerRow}>
                <input
                  value={newPayerName}
                  onChange={e => setNewPayerName(e.target.value)}
                  placeholder="שם הלקוח / משלם"
                  onKeyDown={e => e.key === 'Enter' && handleAddPayer()}
                />
                <button className={styles.saveBtn} onClick={handleAddPayer} disabled={savingPayer || !newPayerName.trim()}>
                  {savingPayer ? '...' : <><i className="ti ti-plus" /> הוסף</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
