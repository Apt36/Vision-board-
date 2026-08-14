import type { AppState } from '../types'
import { capacityFor, dayInfo } from './capacity'
import { computeAttention, neglectedDomains } from './attention'
import { addDays, dayKeyOf, hourOf, lastNDays, weekStartOf } from './date'

// ===== shared insights =====

/** Average meals on the last N workdays that have a check-in. */
export function workdayMealAverage(state: AppState, today: string, n = 14): number | null {
  const days = lastNDays(n, today).filter(d => !state.settings.schedule[dayKeyOf(d)].off)
  const cs = days.map(d => state.checkins[d]).filter(Boolean)
  if (cs.length < 2) return null
  return Math.round((cs.reduce((s, c) => s + c!.meals, 0) / cs.length) * 10) / 10
}

export function currentWeekPriorities(state: AppState, today: string): string[] {
  const ws = weekStartOf(today)
  const review = state.weeklyReviews.find(r => r.weekStart === ws)
  return review?.priorities ?? []
}

function domainName(state: AppState, id: string): string {
  return state.domains.find(d => d.id === id)?.name ?? id
}

// ===== Today priorities =====

export interface TodayPriority {
  domainId: string
  domainName: string
  text: string
}

export interface TodayPlan {
  priorities: TodayPriority[]
  avoid: string[]
}

const domainActions: Record<string, { high: string; low: string }> = {
  body: { high: 'Eat properly + workout.', low: 'Eat real meals. No forced workout.' },
  relationships: { high: 'Protect real time with your people.', low: 'Protect the evening — connect, even briefly.' },
  mind: { high: 'Read or reflect for 20 minutes.', low: '10 minutes of reading or a mental reset.' },
  french: { high: '20 minutes of French.', low: '10–15 minutes of French.' },
  career: { high: '60 minutes on applications or development.', low: 'Do the leasing job well. That counts.' },
  realestate: { high: 'One real estate study block.', low: 'Skip studying today — save it for an off day.' },
  money: { high: 'Check savings progress, update numbers.', low: 'Nothing needed today.' },
  creative: { high: 'Film or document something.', low: 'Capture one clip or idea if it comes naturally.' },
  style: { high: 'Handle a grooming/style item.', low: 'Nothing needed today.' },
  projects: { high: 'One focused project block.', low: 'Capture ideas only. No project work.' }
}

export function todayPlan(state: AppState, today: string): TodayPlan {
  const info = dayInfo(state, today)
  const cap = capacityFor(state, today)
  const attention = computeAttention(state, today)
  const neglected = neglectedDomains(attention)
  const protectedIds = currentWeekPriorities(state, today)
  const mealAvg = workdayMealAverage(state, today)
  const maintenanceGoals = state.goals.filter(g => g.status === 'maintenance')

  const maxItems = cap.tier === 'low' ? 4 : cap.tier === 'medium' ? 4 : 5
  const picked: TodayPriority[] = []
  const used = new Set<string>()
  const pick = (domainId: string, text?: string) => {
    if (used.has(domainId) || picked.length >= maxItems) return
    used.add(domainId)
    const action = domainActions[domainId]
    picked.push({
      domainId,
      domainName: domainName(state, domainId),
      text: text ?? (action ? (cap.tier === 'low' ? action.low : action.high) : 'Give this a turn today.')
    })
  }

  if (info.isWorkDay) {
    // Work days: survival + one or two small investments.
    if (state.settings.goalDirection === 'gain' && mealAvg != null && mealAvg < 2.5) {
      pick('body', `Eat a real lunch. Your workday average is ${mealAvg} meals — you're trying to gain weight.`)
    } else {
      pick('body', cap.tier === 'low' ? 'Eat real meals today.' : 'Eat properly. Light exercise only if it fits.')
    }
    pick('career', 'Do the leasing job well.')
    // one small investment from protected priorities or neglect
    for (const id of protectedIds) {
      if (picked.length >= maxItems - 1) break
      if (id !== 'career' && id !== 'body') pick(id)
    }
    for (const n of neglected) {
      if (picked.length >= maxItems - 1) break
      if (n.domainId !== 'projects') pick(n.domainId)
    }
    pick('relationships', 'Go home, recover, connect.')
  } else {
    // Off days: give the neglected things their turn.
    for (const id of protectedIds) pick(id)
    for (const n of neglected) {
      if (n.domainId === 'projects' && maintenanceGoals.length > 0) continue
      pick(n.domainId)
    }
    // sensible defaults if there's still room
    pick('body')
    pick('career')
    pick('french')
    pick('relationships')
  }

  const avoid: string[] = []
  const accora = state.goals.find(g => g.id === 'g-accora')
  if (accora?.status === 'maintenance') {
    if (info.isWorkDay) avoid.push('Accora Brain development — it\'s in maintenance mode')
    else if (!protectedIds.includes('projects')) avoid.push('Sinking the whole day into Accora Brain — maintenance mode')
  }
  if (cap.tier === 'low') {
    avoid.push('A full workout late at night')
    avoid.push('Unnecessary productivity — recovery is the win today')
  } else if (!info.isWorkDay) {
    avoid.push('Filling every hour. Leave room.')
  }
  if (info.earlyStart) avoid.push('Staying up late — tomorrow needs the sleep' )

  return { priorities: picked, avoid }
}

// ===== "WHAT SHOULD I DO?" engine =====

export interface Recommendation {
  context: string
  steps: string[]
  not: string[]
}

export function whatShouldIDo(state: AppState, now: Date): Recommendation {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const hour = now.getHours() + now.getMinutes() / 60
  const info = dayInfo(state, today)
  const cap = capacityFor(state, today)
  const c = state.checkins[today]
  const attention = computeAttention(state, today)
  const neglected = neglectedDomains(attention)
  const protectedIds = currentWeekPriorities(state, today)
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const energy = c?.energy ?? null
  const meals = c?.meals ?? 0
  const mealAvg = workdayMealAverage(state, today)
  const accoraMaintenance = state.goals.find(g => g.id === 'g-accora')?.status === 'maintenance'

  const steps: string[] = []
  const not: string[] = []
  let context: string

  const shiftStart = info.isWorkDay ? hourOf(info.shift.start) : null
  const shiftEnd = info.isWorkDay ? hourOf(info.shift.end) : null
  // long bus commute home after late shifts
  const homeTime = shiftEnd != null ? shiftEnd + 1.5 : null

  const energyBit = energy != null ? ` Your energy is ${energy}/10` : ''
  const mealsBit = meals === 0 ? (energy != null ? ' and you haven\'t logged a meal yet.' : ' You haven\'t logged a meal yet.')
    : meals === 1 ? (energy != null ? ' and you\'ve only logged one meal.' : ' You\'ve only logged one meal.')
    : energy != null ? '.' : ''

  const smallInvestment = (): string | null => {
    const pool = [...protectedIds.filter(id => !['body', 'career', 'relationships'].includes(id)),
      ...neglected.map(n => n.domainId)]
    for (const id of pool) {
      if (id === 'french') return '10 minutes of French if you want to'
      if (id === 'mind') return 'Read a few pages before bed'
      if (id === 'creative') return 'Jot down one content idea'
      if (id === 'realestate') return 'No studying tonight — plan a block for your next off day'
    }
    return null
  }

  if (info.isWorkDay && shiftStart != null && hour < shiftStart - 0.75) {
    // Before work
    context = `It's ${timeStr} before a ${info.label} shift.${energyBit}${mealsBit}`
    steps.push('Eat a real breakfast.')
    if (!info.earlyStart && cap.tier !== 'low') steps.push('Pushups or light movement if there\'s time.')
    steps.push('Shower, get ready, leave with margin for the commute.')
    if (protectedIds.includes('french') || neglected.some(n => n.domainId === 'french'))
      steps.push('French on the commute — Duolingo or a podcast.')
    not.push('Starting a project block you can\'t finish before work.')
  } else if (info.isWorkDay && shiftEnd != null && hour >= shiftStart! - 0.75 && hour < shiftEnd) {
    // During work
    context = `It's ${timeStr} — you're in a ${info.label} workday. Demand is ${info.demand}.`
    steps.push('Do the leasing job well. That is the priority right now.')
    steps.push(meals < 1 && hour > 12 ? 'You haven\'t logged a meal — eat a real lunch.' : 'Eat a real lunch.')
    steps.push('Hydrate. Your steps take care of themselves here.')
    not.push('Squeezing side projects into work hours.')
  } else if (info.isWorkDay && homeTime != null && hour >= shiftEnd!) {
    // After work
    const late = hour >= 20 || info.demand === 'high'
    context = `It's ${timeStr} after a ${info.label} workday.${energyBit}${mealsBit}`
    if (meals < 3) steps.push('Eat.')
    steps.push('Shower.')
    steps.push('Spend time with your partner.')
    const inv = smallInvestment()
    if (!late || (energy != null && energy >= 6)) {
      if (inv) steps.push(inv + '.')
    } else if (inv && inv.includes('French')) {
      steps.push(inv + '.')
    }
    steps.push(info.earlyStart || dayInfo(state, addDays(today, 1)).earlyStart ? 'Sleep early — tomorrow starts early.' : 'Sleep.')
    if (accoraMaintenance) not.push('Working on Accora Brain tonight.')
    not.push('A full workout at this hour.')
    if ((energy != null && energy <= 4) || cap.tier === 'low')
      not.push('Any "catching up". Eat, shower, connect, sleep — that\'s a successful day.')
  } else {
    // Off day
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    const negNames = neglected.slice(0, 3).map(n => n.name)
    const negText = negNames.length
      ? ` ${negNames.join(', ')} ${negNames.length === 1 ? 'has' : 'have'} been neglected this week.`
      : ''
    context = `It's ${dayName} and you're off. Capacity is ${cap.tier}.${negText}${energyBit}${energyBit ? '.' : ''}`

    if (hour < 11 && meals === 0) steps.push('Eat breakfast.')
    if (cap.tier !== 'low') {
      const usedSlots = new Set<string>()
      const slot = (id: string, text: string) => {
        if (usedSlots.has(id) || steps.length >= 5) return
        usedSlots.add(id); steps.push(text)
      }
      const ordered = [...protectedIds, ...neglected.map(n => n.domainId), 'body', 'career', 'french', 'relationships']
      for (const id of ordered) {
        if (id === 'body') slot('body', hour < 17 ? 'Workout.' : 'Eat a proper dinner; train tomorrow.')
        if (id === 'career') slot('career', hour < 18 ? 'Job applications for 60 minutes.' : 'Queue up job applications for tomorrow.')
        if (id === 'french') slot('french', 'French for 20 minutes.')
        if (id === 'creative') slot('creative', 'One creative block — film or edit something.')
        if (id === 'mind') slot('mind', 'Read for 20 minutes.')
        if (id === 'realestate') slot('realestate', 'One real estate study block.')
        if (id === 'relationships') slot('relationships', 'Spend the evening socially.')
        if (id === 'money') slot('money', 'Update your savings numbers (2 minutes).')
        if (id === 'style') slot('style', 'Handle one grooming/style item.')
      }
      if (steps.length === 0) steps.push('Pick one neglected area and give it a real turn.')
    } else {
      steps.push('Eat properly.')
      steps.push('Rest — your capacity is low even though you\'re off.')
      steps.push('Gentle walk or stretch if it feels good.')
      steps.push('Connect with someone you care about.')
    }
    if (accoraMaintenance) not.push('Accora Brain stays in maintenance mode.')
    if (hour >= 20) not.push('Starting anything big this late.')
    not.push('Trying to fix every domain in one day.')
  }

  // weight-gain nudge
  if (state.settings.goalDirection === 'gain' && mealAvg != null && mealAvg < 2 && !steps.some(s => s.toLowerCase().includes('eat'))) {
    steps.unshift(`Eat — your workday average is ${mealAvg} meals and you're trying to gain weight.`)
  }

  return { context, steps: steps.slice(0, 6), not: not.slice(0, 3) }
}
