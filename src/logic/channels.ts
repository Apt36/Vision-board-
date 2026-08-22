import type { AppState, Channel, Room } from '../types'
import { addDays, fromISO, todayISO } from './date'
import { capacityFor, dayInfo } from './capacity'

// ===== The 60-day window =====

export interface WindowState {
  number: number
  day: number        // 1-based
  days: number
  daysLeft: number
  percent: number
  startDate: string
  endDate: string
  active: boolean
  isReviewDay: boolean
}

export function windowState(state: AppState, today = todayISO()): WindowState {
  const w = state.window
  const start = w.startDate ?? today
  const elapsed = Math.round((fromISO(today).getTime() - fromISO(start).getTime()) / 86400000)
  const day = Math.max(1, Math.min(w.days, elapsed + 1))
  return {
    number: w.number,
    day,
    days: w.days,
    daysLeft: Math.max(0, w.days - day),
    percent: Math.round((day / w.days) * 100),
    startDate: start,
    endDate: addDays(start, w.days - 1),
    active: w.active,
    isReviewDay: elapsed + 1 >= w.days
  }
}

// ===== Channel pressure — the equity engine =====

export interface ChannelState {
  channel: Channel
  rooms: Room[]
  lastTouched: string | null
  daysSince: number | null
  sessionsThisWindow: number
  /** Days a channel of this weight should go between turns. */
  targetGap: number
  /** >= 1 means it is owed a turn. Higher = more starved. */
  pressure: number
  /** 0-100, how well-fed this channel is. */
  health: number
}

/** Weight 5 -> a turn roughly every 1.4 days; weight 1 -> every 7. */
function targetGapFor(weight: number): number {
  return 7 / Math.max(1, weight)
}

export function channelStates(state: AppState, today = todayISO()): ChannelState[] {
  const win = windowState(state, today)

  return state.channels.map(channel => {
    const rooms = channel.roomIds
      .map(id => state.rooms.find(r => r.id === id))
      .filter((r): r is Room => !!r)
    const active = rooms.filter(r => r.status === 'active')

    const sessions = state.roomSessions.filter(s => channel.roomIds.includes(s.roomId))
    const inWindow = sessions.filter(s => s.date >= win.startDate)
    const dates = sessions.map(s => s.date).sort()
    const lastTouched = dates.length ? dates[dates.length - 1] : null
    const daysSince = lastTouched
      ? Math.round((fromISO(today).getTime() - fromISO(lastTouched).getTime()) / 86400000)
      : null

    const targetGap = targetGapFor(channel.weight)
    // Never touched -> treat as two gaps overdue so it surfaces, but not infinitely.
    const elapsed = daysSince ?? targetGap * 2
    const pressure = elapsed / targetGap

    return {
      channel, rooms: active, lastTouched, daysSince,
      sessionsThisWindow: inWindow.length,
      targetGap,
      pressure,
      health: Math.max(0, Math.min(100, Math.round((1 - Math.min(1, elapsed / (targetGap * 2))) * 100)))
    }
  })
}

// ===== The season dial =====

/** Rooms the current window leans toward. Empty = no dial set, pure rotation. */
export function seasonFocusIds(state: AppState): string[] {
  return state.window.focusRoomIds ?? []
}

export function isSeasonFocus(state: AppState, roomId: string): boolean {
  return seasonFocusIds(state).includes(roomId)
}

/**
 * How much the dial tilts a channel's pressure. A channel holding focus rooms
 * gets picked more often; everyone else still rotates — a season never mutes.
 */
export function seasonBoost(state: AppState, channel: Channel): number {
  return channel.roomIds.some(id => isSeasonFocus(state, id)) ? 1.5 : 1
}

// ===== Today's assignment =====

export interface AssignedRoom { room: Room; minutes: number }

export interface DailyAssignment {
  channel: Channel
  channelState: ChannelState
  rooms: AssignedRoom[]
  /** A second channel that gets a token keep-alive, when there's room. */
  keepAlive: { channel: Channel; room: Room } | null
  why: string
  totalMinutes: number
}

/**
 * Picks the channel that is most starved and fits today's capacity, then the
 * specific rooms inside it. This is the app telling him what to do, rather than
 * listing what he could do.
 */
export function todaysAssignment(state: AppState, today = todayISO()): DailyAssignment | null {
  const states = channelStates(state, today)
  if (states.length === 0) return null

  const cap = capacityFor(state, today)
  const info = dayInfo(state, today)

  // A pinned assignment stays put for the day, so the plan doesn't move under him.
  const pinned = state.assignments[today]

  const budget = cap.tier === 'low' ? 25 : cap.tier === 'medium' ? 60 : 150
  const roomCount = cap.tier === 'low' ? 1 : cap.tier === 'medium' ? 2 : 3

  // Heavy channels are unfair to assign on a 9–5 with a two-hour commute.
  const heavy = new Set(['ch-build', 'ch-truce'])
  const eligible = states
    .filter(s => s.rooms.length > 0)
    .filter(s => (cap.tier === 'low' && info.isWorkDay ? !heavy.has(s.channel.id) : true))

  const pool = eligible.length ? eligible : states.filter(s => s.rooms.length > 0)
  if (pool.length === 0) return null

  const dialed = (s: ChannelState) => s.pressure * seasonBoost(state, s.channel)
  const chosen = pinned
    ? pool.find(s => s.channel.id === pinned.channelId) ?? pool[0]
    : [...pool].sort((a, b) => dialed(b) - dialed(a) || b.channel.weight - a.channel.weight)[0]

  // Inside the channel: season focus first, then urgent, then longest untouched.
  const ranked = [...chosen.rooms].sort((a, b) => {
    const af = isSeasonFocus(state, a.id), bf = isSeasonFocus(state, b.id)
    if (af !== bf) return af ? -1 : 1
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
    const av = a.lastEntered ?? '0000-00-00'
    const bv = b.lastEntered ?? '0000-00-00'
    return av.localeCompare(bv)
  })

  const picked = ranked.slice(0, roomCount)
  const per = Math.max(10, Math.round(budget / Math.max(1, picked.length) / 5) * 5)
  const rooms: AssignedRoom[] = picked.map(room => ({ room, minutes: per }))

  // One token keep-alive from the next most starved channel, on bigger days.
  let keepAlive: DailyAssignment['keepAlive'] = null
  if (cap.tier !== 'low') {
    const next = [...pool]
      .filter(s => s.channel.id !== chosen.channel.id)
      .sort((a, b) => b.pressure - a.pressure)[0]
    if (next && next.pressure >= 1) {
      const r = [...next.rooms].sort((a, b) =>
        (a.lastEntered ?? '0').localeCompare(b.lastEntered ?? '0'))[0]
      if (r) keepAlive = { channel: next.channel, room: r }
    }
  }

  const inSeason = seasonBoost(state, chosen.channel) > 1
  const why = chosen.daysSince == null
    ? `${chosen.channel.name} has not had a turn yet this window.`
    : chosen.daysSince === 0
      ? `${chosen.channel.name} already had a turn today — this is a bonus round.`
      : `${chosen.channel.name} has gone ${chosen.daysSince} day${chosen.daysSince === 1 ? '' : 's'} without a turn${inSeason ? ", and it's part of this season's dial" : ', the longest of any channel relative to how much it matters'}.`

  return {
    channel: chosen.channel,
    channelState: chosen,
    rooms,
    keepAlive,
    why,
    totalMinutes: rooms.reduce((n, r) => n + r.minutes, 0)
  }
}

/** Channels sorted by how starved they are — drives the network view. */
export function starvedFirst(states: ChannelState[]): ChannelState[] {
  return [...states].sort((a, b) => b.pressure - a.pressure)
}

export function networkBalance(states: ChannelState[]): { balanced: boolean; note: string } {
  if (states.length === 0) return { balanced: true, note: '' }
  const starved = states.filter(s => s.pressure >= 2).sort((a, b) => b.pressure - a.pressure)
  if (starved.length === 0) {
    return { balanced: true, note: 'The network is balanced. Everything is getting fed.' }
  }

  const names = starved.slice(0, 3).map(s => s.channel.name)
  const list = names.length === 1 ? names[0]
    : names.length === 2 ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

  // A channel can't be starving and well-fed at once — only name a contrast when
  // one genuinely exists. At the start of a window nothing has been fed yet.
  const fed = [...states]
    .filter(s => !starved.some(x => x.channel.id === s.channel.id))
    .sort((a, b) => a.pressure - b.pressure)[0]

  if (!fed) {
    return {
      balanced: false,
      note: starved.length === states.length
        ? 'Every channel is waiting for its first turn. That is just the start of a window, not a backlog. Take the one the app puts in front of you.'
        : `${list} ${names.length === 1 ? 'is' : 'are'} running dry. One turn each is enough — this is not a heroic day.`
    }
  }

  return {
    balanced: false,
    note: `${list} ${names.length === 1 ? 'is' : 'are'} running dry while ${fed.channel.name} stays fed. That's the imbalance to correct — one turn each, not a heroic day.`
  }
}
