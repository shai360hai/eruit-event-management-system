import { calcHours } from './hours'

/**
 * Sum the total salary for an event's workers array.
 * @param {Array} workers
 * @returns {number}
 */
export function totalSalary(workers = []) {
  return workers.reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
}

/**
 * Sum the paid salary for an event's workers array.
 * @param {Array} workers
 * @returns {number}
 */
export function paidSalary(workers = []) {
  return workers.filter(w => w.paid).reduce((s, w) => s + (parseFloat(w.salary) || 0), 0)
}

/**
 * Sum total hours for an event's workers array.
 * @param {Array} workers
 * @returns {number}
 */
export function totalHours(workers = []) {
  return workers.reduce((s, w) => s + calcHours(w.start_time, w.end_time), 0)
}
