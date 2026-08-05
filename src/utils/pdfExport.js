import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { NotoSansHebrewRegular } from '../fonts/NotoSansHebrewRegular'
import { NotoSansHebrewBold } from '../fonts/NotoSansHebrewBold'

let fontsRegistered = false

function ensureFonts(doc) {
  if (!fontsRegistered) {
    doc.addFileToVFS('NotoSansHebrew-Regular.ttf', NotoSansHebrewRegular)
    doc.addFont('NotoSansHebrew-Regular.ttf', 'Hebrew', 'normal')
    doc.addFileToVFS('NotoSansHebrew-Bold.ttf', NotoSansHebrewBold)
    doc.addFont('NotoSansHebrew-Bold.ttf', 'Hebrew', 'bold')
    fontsRegistered = true
  } else {
    doc.addFileToVFS('NotoSansHebrew-Regular.ttf', NotoSansHebrewRegular)
    doc.addFont('NotoSansHebrew-Regular.ttf', 'Hebrew', 'normal')
    doc.addFileToVFS('NotoSansHebrew-Bold.ttf', NotoSansHebrewBold)
    doc.addFont('NotoSansHebrew-Bold.ttf', 'Hebrew', 'bold')
  }
  doc.setFont('Hebrew', 'normal')
}

// jsPDF's base text engine is LTR and doesn't shape/reorder Hebrew (RTL) text.
// We reverse the string for visual RTL — but keep numeric runs (dates, amounts,
// times: digits with . / : , -) in their original order so "1.7.2026" stays readable.
function rtl(str) {
  if (str === null || str === undefined) return ''
  str = String(str)
  // Split into tokens: numeric runs vs everything else
  const tokens = str.match(/[0-9][0-9.\/:,-]*[0-9]|[0-9]|[^0-9]+/g) || []
  // Reverse each non-numeric token's characters; leave numeric tokens intact.
  const processed = tokens.map(t =>
    /^[0-9]/.test(t) ? t : t.split('').reverse().join('')
  )
  // Reverse token order so the whole line reads right-to-left
  return processed.reverse().join('')
}

function fmtDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(d)) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const MONTHS = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

function addHeader(doc, title, subtitle) {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFont('Hebrew', 'bold')
  doc.setFontSize(18)
  doc.text(rtl(title), pageWidth - 14, 18, { align: 'right' })
  if (subtitle) {
    doc.setFont('Hebrew', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(110, 110, 110)
    doc.text(rtl(subtitle), pageWidth - 14, 26, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }
  doc.setDrawColor(220, 220, 220)
  doc.line(14, 31, pageWidth - 14, 31)
}

export function exportWorkerPdf(worker, entries, total, monthLabel) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  ensureFonts(doc)

  addHeader(doc, `דוח שכר — ${worker.name}`, `${monthLabel} · תפקיד: ${worker.role || '—'}${worker.phone ? ' · טלפון: ' + worker.phone : ''}`)

  const head = [['שכר', 'שם אירוע', 'תאריך'].map(rtl)]
  const body = entries.map(e => [
    `\u20AA${(e.salary || 0).toLocaleString('he-IL')}`,
    rtl(e.eventName || '—'),
    rtl(e.date || '—')
  ])

  autoTable(doc, {
    startY: 38,
    head,
    body,
    styles: { font: 'Hebrew', halign: 'right', fontSize: 11, cellPadding: 3 },
    headStyles: { font: 'Hebrew', fontStyle: 'bold', fillColor: [26, 25, 23], textColor: 255, halign: 'right' },
    columnStyles: { 0: { halign: 'left' } },
    margin: { left: 14, right: 14 },
    theme: 'grid'
  })

  const finalY = doc.lastAutoTable.finalY || 38
  doc.setFont('Hebrew', 'bold')
  doc.setFontSize(13)
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.text(rtl(`סה"כ לתשלום: \u20AA${total.toLocaleString('he-IL')}`), pageWidth - 14, finalY + 12, { align: 'right' })

  doc.setFont('Hebrew', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(rtl(`הופק על ידי ERUIT · ${fmtDate(new Date())}`), pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' })

  doc.save(`${worker.name}-${monthLabel || 'all'}.pdf`)
}

export function exportMonthlyAllWorkersPdf(workersWithTotals, monthLabel, grandTotal) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  ensureFonts(doc)

  addHeader(doc, 'סיכום שכר חודשי — כל העובדים', monthLabel)

  const head = [['סה"כ שכר', 'אירועים', 'תפקיד', 'שם עובד'].map(rtl)]
  const body = workersWithTotals.map(w => [
    `\u20AA${w.total.toLocaleString('he-IL')}`,
    String(w.count),
    rtl(w.role || '—'),
    rtl(w.name)
  ])

  autoTable(doc, {
    startY: 38,
    head,
    body,
    styles: { font: 'Hebrew', halign: 'right', fontSize: 11, cellPadding: 3 },
    headStyles: { font: 'Hebrew', fontStyle: 'bold', fillColor: [26, 25, 23], textColor: 255, halign: 'right' },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    theme: 'grid'
  })

  const finalY = doc.lastAutoTable.finalY || 38
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFont('Hebrew', 'bold')
  doc.setFontSize(13)
  doc.text(rtl(`סה"כ כללי: \u20AA${grandTotal.toLocaleString('he-IL')}`), pageWidth - 14, finalY + 12, { align: 'right' })

  doc.setFont('Hebrew', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(rtl(`הופק על ידי ERUIT · ${fmtDate(new Date())}`), pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' })

  doc.save(`סיכום-חודשי-${monthLabel || 'all'}.pdf`)
}


export function exportEventsPdf(eventsList, filterLabel) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  ensureFonts(doc)

  addHeader(doc, 'דוח אירועים', filterLabel)

  const head = [['סטטוס', 'סה"כ שכר', 'עובדים', 'שעה', 'תאריך', 'מיקום', 'שם אירוע'].map(rtl)]
  const body = eventsList.map(ev => {
    const total = (ev.workers || []).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
    const paid = (ev.workers || []).filter(w => w.paid).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
    const status = total === 0 ? '—' : paid === total ? 'שולם' : paid > 0 ? 'חלקי' : 'ממתין'
    const d = ev.date ? fmtDate(ev.date + 'T00:00:00') : '—'
    return [
      rtl(status),
      `\u20AA${total.toLocaleString('he-IL')}`,
      String((ev.workers || []).length),
      ev.time || '—',
      rtl(d),
      rtl(ev.location || '—'),
      rtl(ev.name || '—')
    ]
  })

  const grandTotal = eventsList.reduce((s, ev) =>
    s + (ev.workers || []).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)
  const grandPaid = eventsList.reduce((s, ev) =>
    s + (ev.workers || []).filter(w => w.paid).reduce((ss, w) => ss + (parseFloat(w.salary) || 0), 0), 0)

  autoTable(doc, {
    startY: 38,
    head,
    body,
    styles: { font: 'Hebrew', halign: 'right', fontSize: 10, cellPadding: 2.5 },
    headStyles: { font: 'Hebrew', fontStyle: 'bold', fillColor: [26, 25, 23], textColor: 255, halign: 'right' },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'left' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    margin: { left: 10, right: 10 },
    theme: 'grid'
  })

  const finalY = doc.lastAutoTable.finalY || 38
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFont('Hebrew', 'bold')
  doc.setFontSize(12)
  doc.text(rtl(`${eventsList.length} אירועים · סה"כ: \u20AA${grandTotal.toLocaleString('he-IL')} · שולם: \u20AA${grandPaid.toLocaleString('he-IL')} · נותר: \u20AA${(grandTotal - grandPaid).toLocaleString('he-IL')}`), pageWidth - 14, finalY + 12, { align: 'right' })

  doc.setFont('Hebrew', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(rtl(`הופק · ${fmtDate(new Date())}`), pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' })

  doc.save(`אירועים-${filterLabel || 'הכל'}.pdf`)
}


export function exportDetailedSummaryPdf(sortedWorkers, monthLabel, grandTotal, grandPaid) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  ensureFonts(doc)

  addHeader(doc, 'דוח מפורט — שכר לפי עובד', monthLabel)

  let startY = 38
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  sortedWorkers.forEach(([name, v]) => {
    // New page if near bottom
    if (startY > pageHeight - 60) {
      doc.addPage()
      startY = 20
    }

    // Worker title line
    doc.setFont('Hebrew', 'bold')
    doc.setFontSize(13)
    const roleStr = v.role ? ` · ${v.role}` : ''
    doc.text(rtl(`${name}${roleStr}`), pageWidth - 14, startY, { align: 'right' })
    doc.setFont('Hebrew', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(110, 110, 110)
    const paidStr = v.totalPaid > 0 ? ` · שולם: \u20AA${v.totalPaid.toLocaleString('he-IL')}` : ''
    doc.text(rtl(`סה"כ: \u20AA${v.total.toLocaleString('he-IL')}${paidStr}`), 14, startY, { align: 'left' })
    doc.setTextColor(0, 0, 0)

    const head = [['סטטוס', 'שכר', 'מיקום', 'אירוע', 'תאריך'].map(rtl)]
    const body = v.dates.map(d => [
      rtl(d.paid ? 'שולם' : 'ממתין'),
      `\u20AA${d.salary.toLocaleString('he-IL')}`,
      rtl(d.location || '—'),
      rtl(d.event || '—'),
      rtl(d.date || '—')
    ])

    autoTable(doc, {
      startY: startY + 4,
      head,
      body,
      styles: { font: 'Hebrew', halign: 'right', fontSize: 9.5, cellPadding: 2 },
      headStyles: { font: 'Hebrew', fontStyle: 'bold', fillColor: [70, 70, 68], textColor: 255, halign: 'right', fontSize: 9 },
      columnStyles: { 0: { halign: 'center', cellWidth: 20 }, 1: { halign: 'left', cellWidth: 24 } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const txt = data.cell.raw
          if (txt === rtl('שולם')) data.cell.styles.textColor = [59, 109, 17]
          else data.cell.styles.textColor = [192, 57, 43]
        }
      }
    })

    startY = doc.lastAutoTable.finalY + 12
  })

  // Grand totals
  if (startY > pageHeight - 30) { doc.addPage(); startY = 20 }
  doc.setFont('Hebrew', 'bold')
  doc.setFontSize(12)
  doc.text(rtl(`סה"כ כללי: \u20AA${grandTotal.toLocaleString('he-IL')} · שולם: \u20AA${grandPaid.toLocaleString('he-IL')} · נותר: \u20AA${(grandTotal - grandPaid).toLocaleString('he-IL')}`), pageWidth - 14, startY, { align: 'right' })

  doc.setFont('Hebrew', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(rtl(`הופק · ${fmtDate(new Date())}`), pageWidth - 14, pageHeight - 10, { align: 'right' })

  doc.save(`דוח-מפורט-${monthLabel || 'הכל'}.pdf`)
}

export { MONTHS }
