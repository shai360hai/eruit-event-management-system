import { supabase } from './supabase'

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  // parse workers JSON string back to array
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
  return { ...data, workers: JSON.parse(data.workers || '[]') }
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
  return { ...data, workers: JSON.parse(data.workers || '[]') }
}

export async function deleteEvent(id) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  return { ok: true }
}
