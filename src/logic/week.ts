import type { AppState, DailyCheckin } from '../types'
import { mealCount } from '../store'
import { addDays, dayKeyOf, weekStartOf } from './date'

export interface WeekStats {
  weekStart: string
  days: string[]
  workDays: number
  offDays: number
  checkinCount: number
  avgEnergy: number | null
  avgSleep: number | null
  avgMeals: number | null
  lunchDays: number
  dinnerDays: number
  pushupDays: number
  exerciseDays: number
  frenchDays: number
  readingDays: number
  connectionDays: number
  careerDays: number
  creativeDays: number
  mindDays: number
  roomsEntered: number
  sessionMinutes: number
  filmedSessions: number
}

export function weekStats(state: AppState, anyDateInWeek: string): WeekStats {
  const weekStart = weekStartOf(anyDateInWeek)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayset = new Set(days)
  const checkins = days.map(d => state.checkins[d]).filter(Boolean) as DailyCheckin[]
  const sessions = state.roomSessions.filter(s => dayset.has(s.date))

  const avg = (vals: number[]) =>
    vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null

  return {
    weekStart,
    days,
    workDays: days.filter(d => !state.settings.schedule[dayKeyOf(d)].off).length,
    offDays: days.filter(d => state.settings.schedule[dayKeyOf(d)].off).length,
    checkinCount: checkins.length,
    avgEnergy: avg(checkins.map(c => c.energy).filter((x): x is number => x != null)),
    avgSleep: avg(checkins.map(c => c.sleepHours).filter((x): x is number => x != null)),
    avgMeals: avg(checkins.map(mealCount)),
    lunchDays: checkins.filter(c => c.lunch).length,
    dinnerDays: checkins.filter(c => c.dinner).length,
    pushupDays: checkins.filter(c => c.pushups > 0).length,
    exerciseDays: checkins.filter(c => c.exercised).length,
    frenchDays: checkins.filter(c => c.french.practiced).length,
    readingDays: checkins.filter(c => c.reading).length,
    connectionDays: checkins.filter(c => c.connection.partner || c.connection.family || c.connection.friends).length,
    careerDays: checkins.filter(c => c.career).length,
    creativeDays: checkins.filter(c => c.creative).length,
    mindDays: checkins.filter(c => c.mind).length,
    roomsEntered: new Set(sessions.map(s => s.roomId)).size,
    sessionMinutes: sessions.reduce((n, s) => n + s.minutes, 0),
    filmedSessions: sessions.filter(s => s.filmed).length
  }
}

export function frenchStreak(state: AppState, today: string): number {
  let streak = 0
  let d = today
  if (!state.checkins[today]?.french.practiced) d = addDays(today, -1)
  while (state.checkins[d]?.french.practiced) { streak++; d = addDays(d, -1) }
  return streak
}
