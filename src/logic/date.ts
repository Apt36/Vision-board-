import type { DayKey } from '../types'

export const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const DAY_NAMES: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function dayKeyOf(iso: string): DayKey {
  return DAY_KEYS[fromISO(iso).getDay()]
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Monday of the week containing the given date. */
export function weekStartOf(iso: string): string {
  const d = fromISO(iso)
  const dow = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

export function lastNDays(n: number, endISO: string): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endISO, -i))
  return out
}

export function formatLong(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

export function formatShort(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "09:00" -> "9 AM", "17:00" -> "5 PM", "11:30" -> "11:30 AM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ampm}` : `${h12} ${ampm}`
}

export function hourOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h + m / 60
}
