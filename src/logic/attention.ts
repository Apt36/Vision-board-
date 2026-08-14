import type { AppState, DailyCheckin } from '../types'
import { lastNDays, dayKeyOf } from './date'

export interface DomainAttention {
  domainId: string
  name: string
  color: string
  score: number // 0-100 — recent attention/investment, NOT performance
}

/** Attention events a single day's check-in contributes to each domain. */
function checkinSignals(c: DailyCheckin): Record<string, number> {
  const sig: Record<string, number> = {}
  const add = (d: string, w: number) => { sig[d] = (sig[d] || 0) + w }

  if (c.meals >= 2) add('body', 0.5)
  else if (c.meals === 1) add('body', 0.2)
  if (c.exercised) add('body', 0.7)
  if (c.sleepHours != null && c.sleepHours >= 7) add('body', 0.2)
  if (c.steps != null && c.steps >= 8000) add('body', 0.2)
  if (c.weight != null) add('body', 0.15)

  const conn = c.connection
  if (conn.partner) add('relationships', 0.6)
  if (conn.family) add('relationships', 0.5)
  if (conn.friends) add('relationships', 0.5)

  if (c.reading) add('mind', 0.6)
  if (c.mind) add('mind', 0.6)

  if (c.french.practiced) add('french', Math.min(1, 0.6 + c.french.minutes / 60))

  if (c.career) add('career', 0.8)
  if (c.creative) add('creative', 0.8)

  return sig
}

const WINDOW = 7

/**
 * Life Radar: how much attention each domain has received in the last 7 days,
 * normalised against that domain's expected weekly effort. Recency-weighted.
 */
export function computeAttention(state: AppState, today: string): DomainAttention[] {
  const days = lastNDays(WINDOW, today)
  const totals: Record<string, number> = {}
  const add = (d: string, w: number) => { totals[d] = (totals[d] || 0) + w }

  days.forEach((date, i) => {
    // today weighs 1.0, 6 days ago weighs ~0.65
    const recency = 0.65 + 0.35 * (i / (WINDOW - 1))

    const c = state.checkins[date]
    if (c) {
      const sig = checkinSignals(c)
      for (const [dom, w] of Object.entries(sig)) add(dom, w * recency)
    }

    // The job itself consumes career attention on work days.
    const shift = state.settings.schedule[dayKeyOf(date)]
    if (!shift.off) add('career', 0.85 * recency)

    // Explicit activity events (goals worked on, job apps, therapy, content, money updates…)
    for (const a of state.activity.filter(a => a.date === date)) add(a.domainId, a.weight * recency)
  })

  return state.domains.map(d => {
    const raw = totals[d.id] || 0
    const score = Math.min(100, Math.round((raw / d.weeklyTarget) * 100))
    return { domainId: d.id, name: d.name, color: d.color, score }
  })
}

export function neglectedDomains(attention: DomainAttention[], threshold = 35): DomainAttention[] {
  return attention.filter(a => a.score < threshold).sort((a, b) => a.score - b.score)
}

export function steeringNote(attention: DomainAttention[]): string | null {
  if (attention.length === 0) return null
  const sorted = [...attention].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const low = sorted.filter(a => a.score < 35).slice(-3).reverse()
  if (top.score < 40 && low.length === 0) return null
  if (low.length === 0) {
    return `Things look reasonably balanced right now. ${top.name} is getting the most attention.`
  }
  const lowNames = low.map(l => l.name)
  const lowText = lowNames.length === 1 ? lowNames[0]
    : lowNames.length === 2 ? `${lowNames[0]} and ${lowNames[1]}`
    : `${lowNames.slice(0, -1).join(', ')} and ${lowNames[lowNames.length - 1]}`
  return `${top.name} is consuming a lot of your attention. ${lowText} ${lowNames.length === 1 ? 'has' : 'have'} been neglected.\n\nYou don't need to fix everything today. Give one of them a turn.`
}
