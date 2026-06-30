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
// Reversing the character order + reversing words lets it visually render correctly
// for our purposes (simple text, no complex ligatures/diacritics).
function rtl(str) {
  if (str === null || str === undefined) return ''
  str = String(str)
  // Keep numbers and punctuation runs in their natural order while reversing Hebrew runs
  // Simple approach: reverse the whole string (works well for plain Hebrew phrases)
  return str.split('').reverse().join('')
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
  doc.text(rtl(`הופק על ידי ERUIT · ${new Date().toLocaleDateString('he-IL')}`), pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' })

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
  doc.text(rtl(`הופק על ידי ERUIT · ${new Date().toLocaleDateString('he-IL')}`), pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' })

  doc.save(`סיכום-חודשי-${monthLabel || 'all'}.pdf`)
}

export { MONTHS }
