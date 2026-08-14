import type { AppState, Shift } from '../types'
import { dayKeyOf, addDays, hourOf, formatTime } from './date'

export interface DayInfo {
  date: string
  isWorkDay: boolean
  shift: Shift
  label: string          // "11 AM – 7 PM" or "Off day"
  demand: 'off' | 'medium' | 'high'
  earlyStart: boolean    // requires ~5 AM wake-up
}

export function dayInfo(state: AppState, date: string): DayInfo {
  const shift = state.settings.schedule[dayKeyOf(date)]
  if (shift.off) {
    return { date, isWorkDay: false, shift, label: 'Off day', demand: 'off', earlyStart: false }
  }
  const start = hourOf(shift.start)
  const dur = hourOf(shift.end) - start
  const earlyStart = start <= 9.5
  // Long shifts + long commute: every workday is demanding; early starts most of all.
  const demand: DayInfo['demand'] = earlyStart || dur >= 9 ? 'high' : 'medium'
  return {
    date,
    isWorkDay: true,
    shift,
    label: `${formatTime(shift.start)} – ${formatTime(shift.end)}`,
    demand,
    earlyStart
  }
}

export interface CapacityResult {
  score: number // 0-100
  tier: 'low' | 'medium' | 'high'
  reasons: string[]
}

/**
 * Capacity is about protecting Matt from overload, not measuring performance.
 * Baseline from the work schedule, adjusted by sleep, energy and yesterday's load.
 */
export function capacityFor(state: AppState, date: string): CapacityResult {
  const info = dayInfo(state, date)
  const reasons: string[] = []

  let score: number
  if (!info.isWorkDay) {
    score = 85
    reasons.push('Off day — high baseline capacity')
  } else if (info.earlyStart) {
    score = 32
    reasons.push('Early workday (~5 AM wake-up + commute) — low baseline')
  } else if (info.demand === 'high') {
    score = 42
    reasons.push('Long workday with commute — low/medium baseline')
  } else {
    score = 52
    reasons.push('Workday — medium baseline')
  }

  const checkin = state.checkins[date]
  if (checkin?.sleepHours != null) {
    if (checkin.sleepHours >= 7.5) { score += 8; reasons.push('Good sleep (+)') }
    else if (checkin.sleepHours >= 6.5) { score += 3 }
    else if (checkin.sleepHours >= 5.5) { score -= 6; reasons.push('Short sleep (−)') }
    else { score -= 14; reasons.push('Very short sleep (−)') }
  }
  if (checkin?.energy != null) {
    score += (checkin.energy - 5) * 2.5
    if (checkin.energy <= 3) reasons.push('Low energy today (−)')
    else if (checkin.energy >= 8) reasons.push('High energy today (+)')
  }

  // Consecutive demanding days wear you down a little.
  const yesterday = dayInfo(state, addDays(date, -1))
  if (info.isWorkDay && yesterday.isWorkDay && yesterday.demand === 'high') {
    score -= 4
    reasons.push('Back-to-back demanding days (−)')
  }

  score = Math.round(Math.max(8, Math.min(100, score)))
  const tier = score < 42 ? 'low' : score < 65 ? 'medium' : 'high'
  return { score, tier, reasons }
}
