import { useSyncExternalStore } from 'react'
import type {
  AppState, Cadence, Challenge, Channel, Commitment, DailyCheckin, LifeDomain,
  Room, Routine, UserSettings, Window60, WorkSchedule
} from './types'
import { todayISO } from './logic/date'
import { todaysAssignment } from './logic/channels'

const STORAGE_KEY = 'matt-os-state-v1'
const VERSION = 3

// ===== Defaults / seed =====

const defaultSchedule: WorkSchedule = {
  sat: { off: false, start: '09:00', end: '17:00' },
  sun: { off: false, start: '09:00', end: '17:00' },
  mon: { off: false, start: '11:00', end: '19:00' },
  tue: { off: false, start: '11:00', end: '19:00' },
  wed: { off: false, start: '11:00', end: '19:00' },
  thu: { off: true, start: '09:00', end: '17:00' },
  fri: { off: true, start: '09:00', end: '17:00' }
}

const defaultSettings: UserSettings = {
  name: 'Matt',
  schedule: defaultSchedule,
  currentJob: 'Leasing Consultant (contract)',
  startWeight: 113,
  targetWeight: 138,
  weightUnit: 'lbs',
  goalDirection: 'gain',
  money: {
    savingsGoal: null,
    currentSavings: null,
    monthlyTarget: null,
    extraIncomeGoal: null,
    extraIncomeEarned: null,
    minimalSpendMonth: true,
    note: ''
  }
}

export const defaultDomains: LifeDomain[] = [
  { id: 'body', name: 'Body', color: '#6fb98f', builtin: true, weeklyTarget: 6 },
  { id: 'relationships', name: 'Relationships', color: '#d98a9c', builtin: true, weeklyTarget: 4 },
  { id: 'mind', name: 'Mind', color: '#9d8fd9', builtin: true, weeklyTarget: 4 },
  { id: 'french', name: 'French', color: '#7aa7d9', builtin: true, weeklyTarget: 4.5 },
  { id: 'career', name: 'Career', color: '#e8b45f', builtin: true, weeklyTarget: 5 },
  { id: 'realestate', name: 'Real Estate', color: '#c98f5f', builtin: true, weeklyTarget: 2 },
  { id: 'money', name: 'Money', color: '#8fc9b8', builtin: true, weeklyTarget: 1.5 },
  { id: 'creative', name: 'Creative', color: '#d9b48f', builtin: true, weeklyTarget: 3.5 },
  { id: 'style', name: 'Style', color: '#b8a7c9', builtin: true, weeklyTarget: 2.5 },
  { id: 'projects', name: 'Projects', color: '#8fa7b8', builtin: true, weeklyTarget: 1.5 },
  { id: 'home', name: 'Home', color: '#8fbfa7', builtin: true, weeklyTarget: 2 }
]

export const CADENCE_DAYS: Record<Cadence, number | null> = {
  daily: 1, weekly: 7, biweekly: 14, monthly: 30, 'as-needed': null
}

type RoomSeed = Omit<Room, 'lastEntered' | 'createdAt'>

const roomSeeds: RoomSeed[] = [
  { id: 'r-movement', name: 'Movement', domainId: 'body', cadence: 'daily', status: 'active', urgent: false, feature: 'body',
    intention: 'No gym. The apartment is the gym. 60 pushups every morning, then build from there.',
    nextAction: '60 pushups' },
  { id: 'r-eat', name: 'Eat & Gain', domainId: 'body', cadence: 'daily', status: 'active', urgent: true, feature: 'body',
    intention: 'Breakfast is handled. Lunch and dinner are the ones to master. You cannot grow on one meal.',
    nextAction: 'Eat a real lunch AND dinner' },
  { id: 'r-license', name: "Driver's Licence", domainId: 'career', cadence: 'weekly', status: 'active', urgent: true, feature: null,
    intention: 'Winter is coming and you walk everywhere. This is the pressing one.',
    nextAction: 'Book the test / study one section' },
  { id: 'r-french', name: 'French', domainId: 'french', cadence: 'daily', status: 'active', urgent: false, feature: 'french',
    intention: 'Duolingo daily, then real exposure. Small and every day beats heroic and rare.',
    nextAction: 'Duolingo + 10 min listening' },
  { id: 'r-vlog', name: 'Vlog', domainId: 'creative', cadence: 'daily', status: 'active', urgent: false, feature: 'content',
    intention: 'A by-product of the project. It tracks the progression in real time and shows what it looks like.',
    nextAction: 'Film one honest moment' },
  { id: 'r-editing', name: 'Editing', domainId: 'creative', cadence: 'weekly', status: 'active', urgent: false, feature: 'content',
    intention: 'The craft you are building. Your own life is the raw material — two birds with one stone.',
    nextAction: 'Cut one short piece from this week' },
  { id: 'r-dslr', name: 'DSLR Series', domainId: 'creative', cadence: 'weekly', status: 'active', urgent: false, feature: 'content',
    intention: 'It is collecting dust. Learn it on camera — the learning itself is the series.',
    nextAction: 'One setting, one session, filmed' },
  { id: 'r-podcast', name: 'Podcast', domainId: 'creative', cadence: 'biweekly', status: 'active', urgent: false, feature: 'content',
    intention: 'Usually after therapy, while your head is clear. Build the rhythm instead of waiting for the mood.',
    nextAction: 'Record the next episode after therapy' },
  { id: 'r-therapy', name: 'Therapy', domainId: 'mind', cadence: 'biweekly', status: 'active', urgent: false, feature: 'therapy',
    intention: 'A pulse check. It keeps you afloat, confident, clear and in movement.',
    nextAction: 'Note what to bring to the next session' },
  { id: 'r-grooming', name: 'Haircut & Grooming', domainId: 'style', cadence: 'biweekly', status: 'active', urgent: false, feature: null,
    intention: 'Bi-weekly. The other pulse check — it changes how you carry yourself.',
    nextAction: 'Book the next cut' },
  { id: 'r-maintenance', name: 'Skin & Teeth', domainId: 'style', cadence: 'daily', status: 'active', urgent: false, feature: null,
    intention: 'Twice a day, both. You are investing in the smile — that is a long game, not a sprint.',
    nextAction: 'Morning and night, no skipping' },
  { id: 'r-reading', name: 'Reading & Library', domainId: 'mind', cadence: 'daily', status: 'active', urgent: false, feature: 'library',
    intention: 'Building a personal library, a lot of Black history. You are losing touch with this — get it back.',
    nextAction: 'Read 15 minutes' },
  { id: 'r-frames', name: 'Frames & Art', domainId: 'creative', cadence: 'monthly', status: 'active', urgent: false, feature: 'art',
    intention: 'Find it. Acquire it. Frame it. A recurring runway that becomes a collection.',
    nextAction: 'Find one piece worth framing' },
  { id: 'r-vinyl', name: 'Vinyl', domainId: 'creative', cadence: 'monthly', status: 'active', urgent: false, feature: 'vinyl',
    intention: 'Same slow runway as the art. Deliberate, not impulsive.',
    nextAction: 'Add one record to the want list' },
  { id: 'r-money', name: 'Finances & Saving', domainId: 'money', cadence: 'weekly', status: 'active', urgent: false, feature: 'money',
    intention: 'A minimal-spending month. Tools motivate you — but the right tool at the wrong time is just a purchase.',
    nextAction: 'Check the numbers, buy nothing' },
  { id: 'r-rentals', name: 'Rentals & Commission', domainId: 'career', cadence: 'weekly', status: 'active', urgent: false, feature: 'career',
    intention: 'Part-time income. Do the job well and the commission follows.',
    nextAction: 'Follow up on an active lead' },
  { id: 'r-realtor', name: 'Realtor & Housing', domainId: 'realestate', cadence: 'weekly', status: 'active', urgent: false, feature: 'career',
    intention: 'Make strides in housing. Licence or another route — the point is to start building.',
    nextAction: 'One study block or one call' },
  { id: 'r-people', name: 'Family, Partner & Friends', domainId: 'relationships', cadence: 'daily', status: 'active', urgent: false, feature: null,
    intention: 'Not a quota and never a system. Just do not let these be the thing that gets pushed aside.',
    nextAction: 'Reach out to one person' },
  { id: 'r-style', name: 'Style & Dress', domainId: 'style', cadence: 'monthly', status: 'active', urgent: false, feature: null,
    intention: 'Be intentional about how you dress. A uniform you trust is one less decision a day.',
    nextAction: 'Plan one solid outfit rotation' },
  { id: 'r-doctor', name: 'Doctor', domainId: 'body', cadence: 'monthly', status: 'active', urgent: false, feature: null,
    intention: 'Every 60 days. Keep it booked — it is maintenance, not an emergency.',
    nextAction: 'Confirm the next appointment' },
  { id: 'r-identity', name: 'Matt', domainId: 'mind', cadence: 'weekly', status: 'active', urgent: false, feature: null,
    intention: 'True persona and identity. The project underneath all the other projects. You are the project.',
    nextAction: 'Sit with it. Write one honest paragraph.' },
  { id: 'r-monk', name: 'Monk', domainId: 'mind', cadence: 'daily', status: 'active', urgent: false, feature: 'monk',
    intention: '60 days, no vices. You will be tempted. You are thinking bigger picture — and discipline is the whole point.',
    nextAction: 'Stay clean today' },
  { id: 'r-plants', name: 'Plants', domainId: 'home', cadence: 'weekly', status: 'active', urgent: false, feature: null,
    intention: 'Living things in your space that only do well if you show up. Low effort, high signal — a room that tells the truth about how the rest of the weeks are going.',
    nextAction: 'Water, turn, check the leaves' },
  { id: 'r-accora', name: 'Accora Brain', domainId: 'projects', cadence: 'as-needed', status: 'maintenance', urgent: false, feature: null,
    intention: 'Stable. Capture ideas and bugs only. You have poured enough of yourself into it for now.',
    nextAction: 'Capture ideas. Do not develop.' }
]

const commitmentSeeds: Commitment[] = [
  { id: 'c-pushups', label: '60 pushups', roomId: 'r-movement', target: 1, slot: 'morning', active: true },
  { id: 'c-breakfast', label: 'Breakfast', roomId: 'r-eat', target: 1, slot: 'morning', active: true },
  { id: 'c-skin-am', label: 'Skincare', roomId: 'r-maintenance', target: 2, slot: 'morning', active: true },
  { id: 'c-teeth', label: 'Teeth & oral', roomId: 'r-maintenance', target: 2, slot: 'morning', active: true },
  { id: 'c-lunch', label: 'Lunch', roomId: 'r-eat', target: 1, slot: 'day', active: true },
  { id: 'c-duo', label: 'Duolingo', roomId: 'r-french', target: 1, slot: 'day', active: true },
  { id: 'c-film', label: 'Film something', roomId: 'r-vlog', target: 1, slot: 'day', active: true },
  { id: 'c-dinner', label: 'Dinner', roomId: 'r-eat', target: 1, slot: 'evening', active: true },
  { id: 'c-read', label: 'Read', roomId: 'r-reading', target: 1, slot: 'evening', active: true },
  { id: 'c-clean', label: 'No vices', roomId: 'r-monk', target: 1, slot: 'evening', active: true }
]

const defaultChallenge: Challenge = {
  id: 'monk',
  name: 'Monk — 60 Days No Vices',
  vices: [],
  targetDays: 60,
  startDate: null,
  active: false,
  bestRun: 0
}


// ===== Channels — the network of focus =====
// Colours are the validated dark categorical palette (8 slots, one per channel):
// worst adjacent CVD dE 8.4, normal-vision floor 19.3, all >= 3:1 on the surface.
// Channel identity is always carried by its name as well as its colour.
const channelSeeds: Channel[] = [
  { id: 'ch-body', name: 'THE BODY', tagline: 'Build the frame. Eat, move, recover.',
    color: '#199e70', weight: 5, order: 1,
    roomIds: ['r-movement', 'r-eat', 'r-doctor'] },
  { id: 'ch-build', name: 'THE BUILD', tagline: 'Options, licence, income. The future you are owed.',
    color: '#3987e5', weight: 5, order: 2,
    roomIds: ['r-license', 'r-realtor', 'r-rentals', 'r-money', 'r-accora'] },
  { id: 'ch-truce', name: 'TRUCE', tagline: 'The channel. Film it, cut it, publish it.',
    color: '#d95926', weight: 4, order: 3,
    roomIds: ['r-vlog', 'r-editing', 'r-dslr', 'r-podcast'] },
  { id: 'ch-mind', name: 'THE MIND', tagline: 'Read, reflect, stay clean, stay honest.',
    color: '#9085e9', weight: 4, order: 4,
    roomIds: ['r-reading', 'r-therapy', 'r-identity', 'r-monk'] },
  { id: 'ch-people', name: 'THE PEOPLE', tagline: 'The ones who are still there when the projects stall.',
    color: '#d55181', weight: 4, order: 5,
    roomIds: ['r-people'] },
  { id: 'ch-tongue', name: 'THE TONGUE', tagline: 'French. Small and every day.',
    color: '#c98500', weight: 3, order: 6,
    roomIds: ['r-french'] },
  { id: 'ch-surface', name: 'THE SURFACE', tagline: 'How you show up. Grooming, skin, teeth, dress.',
    color: '#e66767', weight: 2, order: 7,
    roomIds: ['r-grooming', 'r-maintenance', 'r-style'] },
  { id: 'ch-home', name: 'THE HOME', tagline: 'The space you live in. Plants, art, records.',
    color: '#008300', weight: 2, order: 8,
    roomIds: ['r-plants', 'r-frames', 'r-vinyl'] }
]

const defaultWindow: Window60 = {
  number: 2, startDate: null as unknown as string, days: 60,
  intention: 'Second window. Nurture everything — let nothing starve.',
  active: false
}

const defaultRoutine: Routine = {
  morning: [
    { id: 'm1', label: 'Wake' }, { id: 'm2', label: 'Water' },
    { id: 'm3', label: '60 pushups' }, { id: 'm4', label: 'Breakfast' },
    { id: 'm5', label: 'Skincare + teeth' }, { id: 'm6', label: 'Shower & get ready' }
  ],
  workday: [
    { id: 'w1', label: 'Work' }, { id: 'w2', label: 'Real lunch' },
    { id: 'w3', label: 'Hydration' }, { id: 'w4', label: 'Steps' }
  ],
  evening: [
    { id: 'e1', label: 'Dinner' }, { id: 'e2', label: 'People' },
    { id: 'e3', label: 'One room OR recovery' }, { id: 'e4', label: 'Skincare + teeth' },
    { id: 'e5', label: 'Sleep' }
  ]
}

export function emptyCheckin(date: string): DailyCheckin {
  return {
    date, sleepHours: null, energy: null,
    breakfast: false, lunch: false, dinner: false, pushups: 0,
    exercised: false, exerciseNote: '', steps: null, weight: null,
    french: { practiced: false, minutes: 0, types: [] },
    reading: false, career: false,
    connection: { partner: false, family: false, friends: false },
    creative: false, mind: false, notes: '',
    updatedAt: new Date().toISOString()
  }
}

export function mealCount(c: DailyCheckin): number {
  return (c.breakfast ? 1 : 0) + (c.lunch ? 1 : 0) + (c.dinner ? 1 : 0)
}

function initialState(): AppState {
  const now = new Date().toISOString()
  return {
    version: VERSION,
    settings: defaultSettings,
    domains: defaultDomains,
    rooms: roomSeeds.map(r => ({ ...r, lastEntered: null, createdAt: now })),
    roomSessions: [],
    roomCaptures: [],
    commitments: commitmentSeeds,
    commitmentLog: {},
    challenge: defaultChallenge,
    challengeLog: {},
    collection: [],
    wishlist: [{
      id: 'w-camera', name: 'Camera', price: 600, saved: 0,
      reason: 'For the vlog and the DSLR series. Not yet — the phone still works.',
      status: 'waiting', addedAt: now.slice(0, 10)
    }],
    content: [],
    edits: [],
    checkins: {},
    weeklyReviews: [],
    routine: defaultRoutine,
    weights: [],
    jobApps: [],
    therapy: [],
    activity: [],
    anchorChecks: {},
    planLog: {},
    channels: channelSeeds,
    window: { ...defaultWindow, startDate: todayISO(), active: true },
    windowReviews: [],
    assignments: {}
  }
}

// ===== Migration =====

/** v1 stored meals as a number and had goals instead of rooms. */
function migrate(parsed: any): AppState {
  const base = initialState()
  const next: AppState = {
    ...base,
    ...parsed,
    version: VERSION,
    settings: { ...base.settings, ...parsed.settings, money: { ...base.settings.money, ...parsed.settings?.money } },
    domains: parsed.domains?.length ? parsed.domains : base.domains,
    challenge: { ...base.challenge, ...parsed.challenge },
    routine: parsed.routine ?? base.routine
  }

  // rooms: seed, then carry over any user-created goals from v1
  if (!Array.isArray(parsed.rooms) || parsed.rooms.length === 0) {
    const now = new Date().toISOString()
    const carried: Room[] = (parsed.goals ?? [])
      .filter((g: any) => g && typeof g.id === 'string' && !g.id.startsWith('g-'))
      .map((g: any) => ({
        id: g.id, name: g.name, domainId: g.domainId ?? 'projects',
        intention: g.description ?? '', cadence: 'weekly' as Cadence,
        status: g.status === 'maintenance' ? 'maintenance' : 'active',
        urgent: false, nextAction: g.nextAction ?? '', feature: null,
        lastEntered: g.lastWorkedOn ?? null, createdAt: g.createdAt ?? now
      }))
    next.rooms = [...base.rooms, ...carried]
  }
  if (!Array.isArray(parsed.commitments) || parsed.commitments.length === 0) next.commitments = base.commitments
  next.commitmentLog = parsed.commitmentLog ?? {}
  next.challengeLog = parsed.challengeLog ?? {}
  next.roomSessions = parsed.roomSessions ?? []
  next.roomCaptures = parsed.roomCaptures ?? []
  next.collection = parsed.collection ?? []
  next.wishlist = parsed.wishlist ?? base.wishlist
  next.edits = parsed.edits ?? []

  // content: v1 items had no roomId/editId
  next.content = (parsed.content ?? []).map((c: any) => ({
    ...c, roomId: c.roomId ?? null, editId: c.editId ?? null
  }))

  // check-ins: v1 `meals: number` -> breakfast/lunch/dinner
  const checkins: Record<string, DailyCheckin> = {}
  for (const [date, raw] of Object.entries<any>(parsed.checkins ?? {})) {
    if (raw && typeof raw.meals === 'number' && raw.breakfast === undefined) {
      checkins[date] = {
        ...emptyCheckin(date), ...raw,
        breakfast: raw.meals >= 1, lunch: raw.meals >= 2, dinner: raw.meals >= 3,
        pushups: raw.pushups ?? 0
      }
      delete (checkins[date] as any).meals
    } else {
      checkins[date] = { ...emptyCheckin(date), ...raw }
    }
  }
  next.checkins = checkins

  // v3: channels, the 60-day window, the Plants room and the Home domain
  if (!Array.isArray(parsed.channels) || parsed.channels.length === 0) next.channels = channelSeeds
  if (!next.domains.some(d => d.id === 'home')) {
    next.domains = [...next.domains, { id: 'home', name: 'Home', color: '#8fbfa7', builtin: true, weeklyTarget: 2 }]
  }
  for (const seedRoom of base.rooms) {
    if (!next.rooms.some(r => r.id === seedRoom.id)) next.rooms = [...next.rooms, seedRoom]
  }
  next.window = parsed.window?.startDate
    ? { ...defaultWindow, ...parsed.window }
    : { ...defaultWindow, startDate: todayISO(), active: true }
  next.windowReviews = parsed.windowReviews ?? []
  next.assignments = parsed.assignments ?? {}
  next.planLog = parsed.planLog ?? {}

  delete (next as any).goals
  delete (next as any).projectNotes
  return next
}

// ===== Store =====

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    return migrate(JSON.parse(raw))
  } catch (e) {
    console.error('Failed to load Matt OS state; starting fresh', e)
    return initialState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

// Write the migrated shape back straight away, so an upgraded install isn't
// left holding v1 data until the first edit happens to trigger a save.
persist()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to persist Matt OS state', e)
  }
}

export function getState(): AppState { return state }

export function setState(updater: (s: AppState) => AppState) {
  state = updater(state)
  persist()
  listeners.forEach(l => l())
}

export function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ===== Actions =====

function trimActivity(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() - 60)
  return d.toISOString().slice(0, 10)
}

export function logActivity(domainId: string, weight: number, label: string, date = todayISO()) {
  setState(s => ({
    ...s,
    activity: [...s.activity.filter(a => a.date >= trimActivity(date)), { date, domainId, weight, label }]
  }))
}

export function saveCheckin(c: DailyCheckin) {
  setState(s => {
    const next: AppState = {
      ...s,
      checkins: { ...s.checkins, [c.date]: { ...c, updatedAt: new Date().toISOString() } }
    }
    if (c.weight != null && !Number.isNaN(c.weight)) {
      next.weights = [...s.weights.filter(w => w.date !== c.date), { date: c.date, weight: c.weight }]
        .sort((a, b) => a.date.localeCompare(b.date))
    }
    return next
  })
}

export function updateSettings(patch: Partial<UserSettings>) {
  setState(s => ({ ...s, settings: { ...s.settings, ...patch } }))
}

export function bumpCommitment(id: string, date = todayISO(), delta = 1) {
  setState(s => {
    const day = { ...(s.commitmentLog[date] ?? {}) }
    const c = s.commitments.find(x => x.id === id)
    const max = c?.target ?? 1
    const cur = day[id] ?? 0
    const nextVal = delta > 0 ? (cur >= max ? 0 : cur + 1) : Math.max(0, cur - 1)
    day[id] = nextVal
    return { ...s, commitmentLog: { ...s.commitmentLog, [date]: day } }
  })
}

export function enterRoom(roomId: string, minutes: number, note: string, filmed: boolean, date = todayISO()) {
  setState(s => {
    const room = s.rooms.find(r => r.id === roomId)
    const session = { id: uid(), roomId, date, minutes, note, filmed }
    const next: AppState = {
      ...s,
      roomSessions: [session, ...s.roomSessions],
      rooms: s.rooms.map(r => (r.id === roomId ? { ...r, lastEntered: date } : r))
    }
    if (filmed) {
      next.content = [{
        id: uid(), kind: 'footage',
        title: note.trim() || `${room?.name ?? 'Session'} — filmed`,
        roomId, notes: '', date, editId: null
      }, ...s.content]
    }
    if (room) {
      next.activity = [...s.activity.filter(a => a.date >= trimActivity(date)),
        { date, domainId: room.domainId, weight: Math.min(1.2, 0.6 + minutes / 60), label: `Room: ${room.name}` }]
    }
    return next
  })
}

/**
 * Freeze today's plan in place the first time Today is opened, so completing
 * steps (which feeds the rotation engine) never reshuffles the current day.
 */
export function pinTodayAssignment(date = todayISO()) {
  setState(s => {
    if (s.assignments[date]) return s
    const a = todaysAssignment(s, date)
    if (!a) return s
    const roomIds = [
      ...a.rooms.map(r => r.room.id),
      ...(a.keepAlive ? [a.keepAlive.room.id] : [])
    ]
    return {
      ...s,
      assignments: {
        ...s.assignments,
        [date]: { date, channelId: a.channel.id, roomIds, accepted: true }
      }
    }
  })
}

export function markPlanStep(date: string, stepId: string) {
  setState(s => {
    const day = s.planLog[date] ?? []
    if (day.includes(stepId)) return s
    return { ...s, planLog: { ...s.planLog, [date]: [...day, stepId] } }
  })
}

/** Completing a focus step also logs a session, so the area counts as fed. */
export function completeFocusRoom(roomId: string, minutes: number, date = todayISO()) {
  enterRoom(roomId, minutes, "Completed from today's plan", false, date)
  markPlanStep(date, `focus-${roomId}`)
}

export function setChallengeDay(date: string, clean: boolean) {
  setState(s => ({ ...s, challengeLog: { ...s.challengeLog, [date]: clean } }))
}

export function exportData(): string { return JSON.stringify(state, null, 2) }

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || !parsed.settings) return false
    setState(() => migrate(parsed))
    return true
  } catch { return false }
}

export function resetData() { setState(() => initialState()) }
