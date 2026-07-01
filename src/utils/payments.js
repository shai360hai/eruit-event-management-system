import { supabase } from '../supabase'

export async function getPaymentsForEvent(eventId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('event_id', eventId)
  if (error) throw new Error(error.message)
  return data || []
}

export async function getPaymentsForMonth(month, year) {
  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const to = `${year}-${String(month).padStart(2,'0')}-31`
  const { data, error } = await supabase
    .from('payments')
    .select('*, events(name, date, location)')
    .gte('events.date', from)
    .lte('events.date', to)
  if (error) throw new Error(error.message)
  return data || []
}

export async function upsertPayments(eventId, workers) {
  // workers: [{name, amount}]
  const rows = workers.map(w => ({
    event_id: eventId,
    worker_name: w.name,
    amount: parseFloat(w.salary) || 0,
    paid: false
  }))
  const { error } = await supabase
    .from('payments')
    .upsert(rows, { onConflict: 'event_id,worker_name', ignoreDuplicates: true })
  if (error) console.error('upsert payments error:', error.message)
}

export async function togglePayment(id, paid) {
  const { error } = await supabase
    .from('payments')
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAllPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, events(name, date)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
