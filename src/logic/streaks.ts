import type { AppState, Challenge, Commitment } from '../types'
import { addDays, todayISO, fromISO } from './date'

export function isCommitmentDone(state: AppState, c: Commitment, date: string): boolean {
  return (state.commitmentLog[date]?.[c.id] ?? 0) >= c.target
}

/**
 * Consecutive days completed, ending today — or yesterday if today isn't done
 * yet, so an unfinished morning doesn't read as a broken streak.
 */
export function commitmentStreak(state: AppState, c: Commitment, today = todayISO()): number {
  let d = today
  if (!isCommitmentDone(state, c, today)) d = addDays(today, -1)
  let n = 0
  while (isCommitmentDone(state, c, d)) { n++; d = addDays(d, -1) }
  return n
}

export function lastNDone(state: AppState, c: Commitment, n: number, today = todayISO()): boolean[] {
  const out: boolean[] = []
  for (let i = n - 1; i >= 0; i--) out.push(isCommitmentDone(state, c, addDays(today, -i)))
  return out
}

// ===== Challenge (Monk mode) =====

export interface ChallengeState {
  active: boolean
  /** Day number of the current clean run, 1-based. */
  day: number
  targetDays: number
  cleanDays: number
  slips: number
  bestRun: number
  /** Day the current run began. */
  runStart: string | null
  percent: number
  lastSlip: string | null
}

export function challengeState(state: AppState, today = todayISO()): ChallengeState {
  const ch: Challenge = state.challenge
  const empty: ChallengeState = {
    active: false, day: 0, targetDays: ch.targetDays, cleanDays: 0, slips: 0,
    bestRun: ch.bestRun, runStart: null, percent: 0, lastSlip: null
  }
  if (!ch.active || !ch.startDate) return empty

  const start = ch.startDate
  const totalDays = Math.max(0, Math.round((fromISO(today).getTime() - fromISO(start).getTime()) / 86400000))

  let cleanDays = 0
  let slips = 0
  let lastSlip: string | null = null
  let run = 0          // consecutive non-slip days ending today
  let best = 0
  let runStart: string = start

  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(start, i)
    const rec = state.challengeLog[d]
    if (rec === false) {
      slips++
      lastSlip = d
      run = 0
      runStart = addDays(d, 1)
    } else {
      // Logged clean, or simply not logged — an unlogged day doesn't break the
      // run. This is a support tool, not a lie detector.
      if (rec === true) cleanDays++
      run++
      if (run > best) best = run
    }
  }

  const day = Math.min(ch.targetDays, Math.max(1, run))
  return {
    active: true,
    day,
    targetDays: ch.targetDays,
    cleanDays,
    slips,
    bestRun: Math.max(best, ch.bestRun),
    runStart,
    percent: Math.min(100, Math.round((day / ch.targetDays) * 100)),
    lastSlip
  }
}

export function encouragementFor(cs: ChallengeState): string {
  if (!cs.active) return 'Sixty days. You already know what you are cutting.'
  const left = cs.targetDays - cs.day
  if (cs.day === 1) return 'Day one. The only day that matters is this one.'
  if (cs.day < 7) return 'Early days. This is the part that feels longest.'
  if (cs.day < 21) return 'You are past the hardest stretch. Keep it boring.'
  if (left <= 7) return `${left} day${left === 1 ? '' : 's'} left. Do not get clever now.`
  if (left <= 21) return 'You are deep in it. This is who you are becoming.'
  return 'Steady. Bigger picture.'
}
