import type { AppState, Channel, Commitment, Room } from '../types'
import { addDays, todayISO, weekStartOf } from './date'
import { capacityFor } from './capacity'
import { todaysAssignment } from './channels'
import { isCommitmentDone } from './streaks'

// ===== The daily plan — a short, ordered path through the day =====
//
// The whole app boils down to this: every day you get a small set of steps.
// Bookend habit steps keep the anchors alive, one focus area (picked by the
// rotation engine) gets a real turn, and a check-in closes the day. Over a
// week the rotation walks the focus across every area of the board.

export type StepKind = 'habits' | 'focus' | 'keepalive' | 'checkin'

export interface PlanStep {
  id: string
  kind: StepKind
  title: string
  detail: string
  emoji: string
  /** The board area this step feeds, when it has one. */
  area: { name: string; color: string } | null
  room: Room | null
  /** Habit steps carry their anchors; ticking them all completes the step. */
  anchors: Commitment[]
  minutes: number | null
  done: boolean
}

export interface DayPlan {
  date: string
  focusChannel: Channel | null
  steps: PlanStep[]
  doneCount: number
  total: number
  percent: number
  complete: boolean
}

const CHANNEL_EMOJI: Record<string, string> = {
  'ch-body': '💪', 'ch-build': '🏗️', 'ch-truce': '🎬', 'ch-mind': '🧠',
  'ch-people': '❤️', 'ch-tongue': '🇫🇷', 'ch-surface': '✨', 'ch-home': '🪴'
}

export function channelEmoji(id: string): string {
  return CHANNEL_EMOJI[id] ?? '🎯'
}

/** "THE BODY" -> "The Body" — the all-caps codenames read as jargon. */
export function friendlyName(name: string): string {
  return name.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())
}

function channelOf(state: AppState, roomId: string): Channel | null {
  return state.channels.find(c => c.roomIds.includes(roomId)) ?? null
}

function roomDoneToday(state: AppState, roomId: string, date: string): boolean {
  return (state.planLog[date] ?? []).includes(`focus-${roomId}`)
    || state.roomSessions.some(s => s.roomId === roomId && s.date === date)
}

const HABIT_SLOTS = [
  { slot: 'morning' as const, id: 'habits-morning', title: 'Morning kickoff', emoji: '🌅' },
  { slot: 'day' as const, id: 'habits-day', title: 'Midday habits', emoji: '☀️' },
  { slot: 'evening' as const, id: 'habits-evening', title: 'Evening wind-down', emoji: '🌙' }
]

export function buildDayPlan(state: AppState, date = todayISO()): DayPlan {
  const cap = capacityFor(state, date)
  const budget = cap.tier === 'low' ? 25 : cap.tier === 'medium' ? 60 : 150

  // The plan is pinned for the day (Today pins it on first open) so it never
  // shifts underfoot as steps get completed.
  const pinned = state.assignments[date]
  let focusChannel: Channel | null = null
  let focusRooms: Room[] = []
  let keepAliveRoom: Room | null = null

  if (pinned) {
    focusChannel = state.channels.find(c => c.id === pinned.channelId) ?? null
    for (const id of pinned.roomIds) {
      const room = state.rooms.find(r => r.id === id)
      if (!room) continue
      if (focusChannel && !focusChannel.roomIds.includes(id)) keepAliveRoom = room
      else focusRooms.push(room)
    }
  } else {
    const a = todaysAssignment(state, date)
    if (a) {
      focusChannel = a.channel
      focusRooms = a.rooms.map(r => r.room)
      keepAliveRoom = a.keepAlive?.room ?? null
    }
  }

  const perRoom = Math.max(10, Math.round(budget / Math.max(1, focusRooms.length) / 5) * 5)
  const steps: PlanStep[] = []

  const habitStep = (def: typeof HABIT_SLOTS[number]) => {
    const anchors = state.commitments.filter(c => c.active && c.slot === def.slot)
    if (anchors.length === 0) return null
    const done = anchors.every(c => isCommitmentDone(state, c, date))
    return {
      id: def.id, kind: 'habits' as StepKind, title: def.title,
      detail: anchors.map(a => a.label).join(' · '),
      emoji: def.emoji, area: null, room: null, anchors,
      minutes: null, done
    }
  }

  const morning = habitStep(HABIT_SLOTS[0])
  if (morning) steps.push(morning)

  for (const room of focusRooms) {
    const ch = focusChannel ?? channelOf(state, room.id)
    steps.push({
      id: `focus-${room.id}`, kind: 'focus', title: room.name,
      detail: room.nextAction || 'Give it a real turn today.',
      emoji: ch ? channelEmoji(ch.id) : '🎯',
      area: ch ? { name: friendlyName(ch.name), color: ch.color } : null,
      room, anchors: [], minutes: perRoom,
      done: roomDoneToday(state, room.id, date)
    })
  }

  const midday = habitStep(HABIT_SLOTS[1])
  if (midday) steps.push(midday)

  if (keepAliveRoom) {
    const ch = channelOf(state, keepAliveRoom.id)
    steps.push({
      id: `focus-${keepAliveRoom.id}`, kind: 'keepalive', title: keepAliveRoom.name,
      detail: keepAliveRoom.nextAction || 'Just a quick visit — five minutes counts.',
      emoji: ch ? channelEmoji(ch.id) : '🎯',
      area: ch ? { name: friendlyName(ch.name), color: ch.color } : null,
      room: keepAliveRoom, anchors: [], minutes: 10,
      done: roomDoneToday(state, keepAliveRoom.id, date)
    })
  }

  const evening = habitStep(HABIT_SLOTS[2])
  if (evening) steps.push(evening)

  steps.push({
    id: 'checkin', kind: 'checkin', title: '60-second check-in',
    detail: 'How did today go? Log it in under a minute.',
    emoji: '📝', area: null, room: null, anchors: [], minutes: 1,
    done: !!state.checkins[date]
  })

  const doneCount = steps.filter(s => s.done).length
  return {
    date, focusChannel, steps, doneCount,
    total: steps.length,
    percent: steps.length ? Math.round((doneCount / steps.length) * 100) : 0,
    complete: steps.length > 0 && doneCount === steps.length
  }
}

// ===== Streak — "days in a row you showed up" =====
//
// Deliberately generous: any real interaction counts. A streak that only
// counts perfect days punishes; this one just asks you to show up.

function hadProgress(state: AppState, d: string): boolean {
  if ((state.planLog[d] ?? []).length > 0) return true
  if (state.checkins[d]) return true
  if (state.roomSessions.some(s => s.date === d)) return true
  const log = state.commitmentLog[d]
  return !!log && Object.values(log).some(n => n > 0)
}

export function careStreak(state: AppState, today = todayISO()): number {
  let d = today
  if (!hadProgress(state, d)) d = addDays(d, -1)
  let n = 0
  while (hadProgress(state, d)) { n++; d = addDays(d, -1) }
  return n
}

// ===== Weekly coverage — is every area of the board getting its turn? =====

export interface AreaCoverage {
  channel: Channel
  emoji: string
  name: string
  /** Mon..Sun of the current week. */
  days: boolean[]
  touched: boolean
  isTodaysFocus: boolean
}

export function weekCoverage(state: AppState, today = todayISO()): AreaCoverage[] {
  const start = weekStartOf(today)
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const focusToday = state.assignments[today]?.channelId ?? null

  return [...state.channels]
    .sort((a, b) => a.order - b.order)
    .map(channel => {
      const days = dates.map(d =>
        d <= today && channel.roomIds.some(id => roomDoneToday(state, id, d))
      )
      return {
        channel,
        emoji: channelEmoji(channel.id),
        name: friendlyName(channel.name),
        days,
        touched: days.some(Boolean),
        isTodaysFocus: channel.id === focusToday
      }
    })
}

/** Whether each of the last `n` days had any progress — for the Journey view. */
export function progressDays(state: AppState, n: number, today = todayISO()): { date: string; on: boolean }[] {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, -(n - 1 - i))
    return { date, on: hadProgress(state, date) }
  })
}
