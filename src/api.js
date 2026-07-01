import { supabase } from './supabase'

async function syncPayments(eventId, workers) {
  if (!workers?.length) return
  const rows = workers
    .filter(w => w.name?.trim())
    .map(w => ({
      event_id: eventId,
      worker_name: w.name.trim(),
      amount: parseFloat(w.salary) || 0,
      paid: false
    }))
  if (!rows.length) return
  await supabase.from('payments')
    .upsert(rows, { onConflict: 'event_id,worker_name', ignoreDuplicates: true })
}

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []).map(ev => ({
    ...ev,
    workers: typeof ev.workers === 'string' ? JSON.parse(ev.workers) : (ev.workers || [])
  }))
}

export async function createEvent(eventData) {
  const { data, error } = await supabase
    .from('events')
    .insert([{
      name: eventData.name,
      location: eventData.location,
      date: eventData.date || null,
      time: eventData.time || null,
      workers: JSON.stringify(eventData.workers || [])
    }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  const ev = { ...data, workers: JSON.parse(data.workers || '[]') }
  await syncPayments(ev.id, ev.workers)
  return ev
}

export async function updateEvent(id, eventData) {
  const { data, error } = await supabase
    .from('events')
    .update({
      name: eventData.name,
      location: eventData.location,
      date: eventData.date || null,
      time: eventData.time || null,
      workers: JSON.stringify(eventData.workers || [])
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  const ev = { ...data, workers: JSON.parse(data.workers || '[]') }
  await syncPayments(ev.id, ev.workers)
  return ev
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { ok: true }
}
