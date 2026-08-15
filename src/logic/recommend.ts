import type { AppState } from '../types'
import { mealCount } from '../store'
import { capacityFor, dayInfo } from './capacity'
import { computeAttention, neglectedDomains } from './attention'
import { addDays, dayKeyOf, hourOf, lastNDays, weekStartOf } from './date'

// ===== shared insights =====

/** Average meals on the last N workdays that have a check-in. */
export function workdayMealAverage(state: AppState, today: string, n = 14): number | null {
  const days = lastNDays(n, today).filter(d => !state.settings.schedule[dayKeyOf(d)].off)
  const cs = days.map(d => state.checkins[d]).filter(Boolean)
  if (cs.length < 2) return null
  return Math.round((cs.reduce((s, c) => s + mealCount(c!), 0) / cs.length) * 10) / 10
}

/** How often lunch and dinner actually happen — the two he's trying to master. */
export function lunchDinnerRate(state: AppState, today: string, n = 14): { lunch: number; dinner: number; days: number } | null {
  const cs = lastNDays(n, today).map(d => state.checkins[d]).filter(Boolean)
  if (cs.length < 3) return null
  return {
    lunch: Math.round((cs.filter(c => c!.lunch).length / cs.length) * 100),
    dinner: Math.round((cs.filter(c => c!.dinner).length / cs.length) * 100),
    days: cs.length
  }
}

export function currentWeekPriorities(state: AppState, today: string): string[] {
  const review = state.weeklyReviews.find(r => r.weekStart === weekStartOf(today))
  return review?.priorities ?? []
}

/** Footage captured that no edit session has used yet. */
export function unusedFootage(state: AppState) {
  return state.content.filter(c => (c.kind === 'footage' || c.kind === 'clip') && !c.editId)
}

function domainName(state: AppState, id: string): string {
  return state.domains.find(d => d.id === id)?.name ?? id
}

// ===== Today priorities =====

export interface TodayPriority { domainId: string; domainName: string; text: string }
export interface TodayPlan { priorities: TodayPriority[]; avoid: string[] }

const domainActions: Record<string, { high: string; low: string }> = {
  body: { high: 'Eat all three + move.', low: 'Eat all three. No forced workout.' },
  relationships: { high: 'Protect real time with your people.', low: 'Connect, even briefly.' },
  mind: { high: 'Read or reflect for 20 minutes.', low: '10 minutes of reading.' },
  french: { high: '20 minutes of French.', low: 'Duolingo, that is enough.' },
  career: { high: '60 minutes on the licence or applications.', low: 'Do the leasing job well. That counts.' },
  realestate: { high: 'One real estate study block.', low: 'Save studying for an off day.' },
  money: { high: 'Check the numbers. Buy nothing.', low: 'Nothing needed today.' },
  creative: { high: 'Film something. Cut something.', low: 'Capture one clip if it comes naturally.' },
  style: { high: 'Handle a grooming or style item.', low: 'Skincare and teeth, twice. That is it.' },
  projects: { high: 'One focused block.', low: 'Capture ideas only.' }
}

export function todayPlan(state: AppState, today: string): TodayPlan {
  const info = dayInfo(state, today)
  const cap = capacityFor(state, today)
  const neglected = neglectedDomains(computeAttention(state, today))
  const protectedIds = currentWeekPriorities(state, today)
  const mealAvg = workdayMealAverage(state, today)
  const ld = lunchDinnerRate(state, today)

  const maxItems = cap.tier === 'low' ? 4 : cap.tier === 'medium' ? 4 : 5
  const picked: TodayPriority[] = []
  const used = new Set<string>()
  const pick = (domainId: string, text?: string) => {
    if (used.has(domainId) || picked.length >= maxItems) return
    used.add(domainId)
    const a = domainActions[domainId]
    picked.push({
      domainId, domainName: domainName(state, domainId),
      text: text ?? (a ? (cap.tier === 'low' ? a.low : a.high) : 'Give this a turn today.')
    })
  }

  if (info.isWorkDay) {
    if (ld && ld.dinner < 70) pick('body', `Lunch and dinner, both. Dinner has only happened ${ld.dinner}% of the last ${ld.days} days.`)
    else if (mealAvg != null && mealAvg < 2.5) pick('body', `Three meals. Your workday average is ${mealAvg}.`)
    else pick('body', 'Three meals. Pushups in the morning.')
    pick('career', 'Do the leasing job well.')
    for (const id of protectedIds) {
      if (picked.length >= maxItems - 1) break
      if (id !== 'career' && id !== 'body') pick(id)
    }
    for (const n of neglected) {
      if (picked.length >= maxItems - 1) break
      if (n.domainId !== 'projects') pick(n.domainId)
    }
    pick('relationships', 'Go home, eat, recover, connect.')
  } else {
    for (const id of protectedIds) pick(id)
    for (const n of neglected) {
      if (n.domainId === 'projects') continue
      pick(n.domainId)
    }
    pick('body'); pick('career'); pick('french'); pick('relationships')
  }

  const avoid: string[] = []
  const accora = state.rooms.find(r => r.id === 'r-accora')
  if (accora?.status === 'maintenance') {
    avoid.push(info.isWorkDay
      ? "Accora Brain — it's in maintenance mode"
      : 'Sinking the whole day into Accora Brain')
  }
  if (state.settings.money.minimalSpendMonth) {
    const waiting = state.wishlist.filter(w => w.status === 'waiting').length
    if (waiting > 0) avoid.push('Buying tools. This is a minimal-spend month — the list can wait')
  }
  if (cap.tier === 'low') {
    avoid.push('A full workout late at night')
    avoid.push('Unnecessary productivity — recovery is the win today')
  } else if (!info.isWorkDay) {
    avoid.push('Filling every hour. Leave room.')
  }
  if (dayInfo(state, addDays(today, 1)).earlyStart) avoid.push('Staying up late — tomorrow starts early')

  return { priorities: picked, avoid }
}

// ===== "WHAT SHOULD I DO?" engine =====

export interface Recommendation { context: string; steps: string[]; not: string[] }

export function whatShouldIDo(state: AppState, now: Date): Recommendation {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const hour = now.getHours() + now.getMinutes() / 60
  const info = dayInfo(state, today)
  const cap = capacityFor(state, today)
  const c = state.checkins[today]
  const neglected = neglectedDomains(computeAttention(state, today))
  const protectedIds = currentWeekPriorities(state, today)
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const energy = c?.energy ?? null
  const meals = c ? mealCount(c) : 0
  const ld = lunchDinnerRate(state, today)
  const accoraMaintenance = state.rooms.find(r => r.id === 'r-accora')?.status === 'maintenance'

  // The most overdue room that isn't a daily habit — the "give this a turn" pick.
  const urgentRoom = state.rooms.find(r => r.urgent && r.status === 'active' && r.lastEntered !== today)

  const steps: string[] = []
  const not: string[] = []
  let context: string

  const shiftStart = info.isWorkDay ? hourOf(info.shift.start) : null
  const shiftEnd = info.isWorkDay ? hourOf(info.shift.end) : null

  const energyBit = energy != null ? ` Your energy is ${energy}/10` : ''
  const mealsBit = meals === 0
    ? (energy != null ? ' and you have not logged a meal yet.' : ' You have not logged a meal yet.')
    : meals === 1 ? (energy != null ? ' and you have only logged one meal.' : ' You have only logged one meal.')
    : energy != null ? '.' : ''

  const smallInvestment = (): string | null => {
    const pool = [...protectedIds.filter(id => !['body', 'career', 'relationships'].includes(id)),
      ...neglected.map(n => n.domainId)]
    for (const id of pool) {
      if (id === 'french') return 'Duolingo — two minutes, keeps the streak'
      if (id === 'mind') return 'Read a few pages before bed'
      if (id === 'creative') return 'Dump today\'s footage while you remember what it was'
    }
    return null
  }

  if (info.isWorkDay && shiftStart != null && hour < shiftStart - 0.75) {
    context = `It's ${timeStr} before a ${info.label} shift.${energyBit}${mealsBit}`
    steps.push('60 pushups.')
    steps.push('Breakfast — a real one.')
    steps.push('Skincare and teeth, then get ready.')
    if (protectedIds.includes('french') || neglected.some(n => n.domainId === 'french'))
      steps.push('French on the commute — Duolingo or a podcast.')
    not.push('Opening a room you cannot finish before work.')
  } else if (info.isWorkDay && shiftEnd != null && hour >= shiftStart! - 0.75 && hour < shiftEnd) {
    context = `It's ${timeStr} — you're inside a ${info.label} workday. Demand is ${info.demand}.`
    steps.push('Do the leasing job well. That is the room you are in.')
    steps.push(meals < 1 && hour > 12 ? 'You have not eaten — take a real lunch.' : 'Take a real lunch. Not a snack.')
    steps.push('Water. Your steps take care of themselves here.')
    not.push('Squeezing side projects into work hours.')
  } else if (info.isWorkDay && shiftEnd != null && hour >= shiftEnd) {
    const late = hour >= 20 || info.demand === 'high'
    context = `It's ${timeStr} after a ${info.label} workday.${energyBit}${mealsBit}`
    if (!c?.dinner) steps.push('Dinner. This is the meal that decides whether you gain.')
    steps.push('Shower, skincare, teeth.')
    steps.push('Time with your partner.')
    const inv = smallInvestment()
    if (inv && (!late || (energy != null && energy >= 6) || inv.includes('Duolingo'))) steps.push(inv + '.')
    steps.push(dayInfo(state, addDays(today, 1)).earlyStart ? 'Sleep early — tomorrow starts early.' : 'Sleep.')
    if (accoraMaintenance) not.push('Working on Accora Brain tonight.')
    not.push('A full workout at this hour.')
    if ((energy != null && energy <= 4) || cap.tier === 'low')
      not.push('Any "catching up". Eat, wash, connect, sleep — that is a successful day.')
  } else {
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    const negNames = neglected.slice(0, 3).map(n => n.name)
    const negText = negNames.length
      ? ` ${negNames.join(', ')} ${negNames.length === 1 ? 'has' : 'have'} been neglected.`
      : ''
    context = `It's ${dayName} and you're off. Capacity is ${cap.tier}.${negText}${energyBit}${energyBit ? '.' : ''}`

    if (hour < 11) { steps.push('60 pushups, then breakfast.') }
    if (cap.tier !== 'low') {
      if (urgentRoom) steps.push(`${urgentRoom.name} — ${urgentRoom.nextAction || 'give it a real block'}.`)
      const usedSlots = new Set<string>()
      const slot = (id: string, text: string) => {
        if (usedSlots.has(id) || steps.length >= 6) return
        usedSlots.add(id); steps.push(text)
      }
      for (const id of [...protectedIds, ...neglected.map(n => n.domainId), 'body', 'creative', 'french', 'relationships']) {
        if (id === 'body') slot('body', hour < 17 ? 'Workout in the apartment.' : 'Proper dinner; train tomorrow.')
        if (id === 'career') slot('career', 'Licence study or applications — 60 minutes.')
        if (id === 'french') slot('french', 'French, 20 minutes.')
        if (id === 'creative') slot('creative', 'Film something, then dump the footage.')
        if (id === 'mind') slot('mind', 'Read for 20 minutes.')
        if (id === 'realestate') slot('realestate', 'One real estate study block.')
        if (id === 'relationships') slot('relationships', 'Spend the evening with people.')
        if (id === 'money') slot('money', 'Update the numbers. Buy nothing.')
        if (id === 'style') slot('style', 'One grooming or style item.')
      }
      if (steps.length === 0) steps.push('Pick the most overdue room and give it a real turn.')
    } else {
      steps.push('Eat all three meals.')
      steps.push('Rest — your capacity is low even though you are off.')
      steps.push('Walk, gently.')
      steps.push('Connect with someone.')
    }
    if (accoraMaintenance) not.push('Accora Brain stays in maintenance mode.')
    if (hour >= 20) not.push('Starting anything big this late.')
    not.push('Trying to give every room a turn in one day.')
  }

  if (ld && ld.dinner < 60 && !steps.some(s => /dinner/i.test(s))) {
    steps.unshift(`Dinner — it has only happened ${ld.dinner}% of the last ${ld.days} days, and you are trying to gain.`)
  }

  return { context, steps: steps.slice(0, 6), not: not.slice(0, 3) }
}
