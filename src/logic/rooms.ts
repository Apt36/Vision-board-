import type { AppState, Room } from '../types'
import { CADENCE_DAYS } from '../store'
import { fromISO, todayISO } from './date'
import { capacityFor } from './capacity'
import { isSeasonFocus } from './channels'
import { currentWeekPriorities } from './recommend'

export function daysSince(iso: string | null, today = todayISO()): number | null {
  if (!iso) return null
  const ms = fromISO(today).getTime() - fromISO(iso).getTime()
  return Math.round(ms / 86400000)
}

export interface RoomCandidate {
  room: Room
  /** >= 1 means it is due. */
  overdue: number
  score: number
  reason: string
}

/**
 * Which rooms deserve a turn. Cadence tells us what "due" means; the rest is
 * about pressing things, protected weekly priorities, and how long it has been.
 */
export function rankRooms(state: AppState, today = todayISO()): RoomCandidate[] {
  const priorities = currentWeekPriorities(state, today)

  return state.rooms
    .filter(r => r.status === 'active')
    .map(r => {
      const cadenceDays = CADENCE_DAYS[r.cadence]
      const since = daysSince(r.lastEntered, today)
      // Never entered → treat as one full cadence overdue so it surfaces.
      const elapsed = since ?? (cadenceDays ?? 14)
      const overdue = cadenceDays ? elapsed / cadenceDays : elapsed / 21

      let score = overdue
      let reason = since == null
        ? 'Not entered yet'
        : since === 0 ? 'Entered today'
        : `${since} day${since === 1 ? '' : 's'} since you were in here`

      if (r.urgent) { score += 1.1; reason = since == null ? 'Pressing — not started' : reason }
      if (isSeasonFocus(state, r.id)) { score += 0.8; reason = `Season focus · ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` }
      if (priorities.includes(r.domainId)) score += 0.5
      if (since === 0) score -= 2.5 // already had its turn today

      return { room: r, overdue, score, reason }
    })
    .sort((a, b) => b.score - a.score)
}

/** How many rooms to actually put in front of him today. */
export function roomsForToday(state: AppState, today = todayISO()): RoomCandidate[] {
  const cap = capacityFor(state, today)
  const limit = cap.tier === 'low' ? 2 : cap.tier === 'medium' ? 3 : 4
  return rankRooms(state, today).filter(c => c.score > 0).slice(0, limit)
}

export function roomSessionStats(state: AppState, roomId: string) {
  const sessions = state.roomSessions.filter(s => s.roomId === roomId)
  const minutes = sessions.reduce((n, s) => n + s.minutes, 0)
  const filmed = sessions.filter(s => s.filmed).length
  return { count: sessions.length, minutes, filmed, sessions }
}

export function nextRoomDue(c: RoomCandidate): string {
  if (c.overdue >= 1.5) return 'Overdue'
  if (c.overdue >= 1) return 'Due'
  return 'On track'
}
