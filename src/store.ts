import { useSyncExternalStore } from 'react'
import type {
  AppState, DailyCheckin, Goal, LifeDomain, Routine, UserSettings, WorkSchedule
} from './types'
import { todayISO } from './logic/date'

const STORAGE_KEY = 'matt-os-state-v1'

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
  targetWeight: null,
  weightUnit: 'lbs',
  goalDirection: 'gain',
  money: {
    savingsGoal: null,
    currentSavings: null,
    monthlyTarget: null,
    extraIncomeGoal: null,
    extraIncomeEarned: null,
    note: ''
  }
}

export const defaultDomains: LifeDomain[] = [
  { id: 'body', name: 'Body', color: '#6fb98f', builtin: true, weeklyTarget: 6 },
  { id: 'relationships', name: 'Relationships', color: '#d98a9c', builtin: true, weeklyTarget: 4 },
  { id: 'mind', name: 'Mind', color: '#9d8fd9', builtin: true, weeklyTarget: 3.5 },
  { id: 'french', name: 'French', color: '#7aa7d9', builtin: true, weeklyTarget: 4.5 },
  { id: 'career', name: 'Career', color: '#e8b45f', builtin: true, weeklyTarget: 5 },
  { id: 'realestate', name: 'Real Estate', color: '#c98f5f', builtin: true, weeklyTarget: 2 },
  { id: 'money', name: 'Money', color: '#8fc9b8', builtin: true, weeklyTarget: 1.5 },
  { id: 'creative', name: 'Creative', color: '#d9b48f', builtin: true, weeklyTarget: 2.5 },
  { id: 'style', name: 'Style', color: '#b8a7c9', builtin: true, weeklyTarget: 1.5 },
  { id: 'projects', name: 'Projects', color: '#8fa7b8', builtin: true, weeklyTarget: 2 }
]

const seedGoals: Omit<Goal, 'createdAt'>[] = [
  { id: 'g-accora', name: 'Accora Brain', domainId: 'projects', description: 'Leasing software. Stable — capture ideas and bugs, occasional sessions only.', status: 'maintenance', priority: 3, nextAction: 'Capture ideas only. No daily development.', lastWorkedOn: null, targetDate: null },
  { id: 'g-french', name: 'French', domainId: 'french', description: 'Duolingo consistency plus real exposure: listening, speaking, reading.', status: 'active', priority: 1, nextAction: '15–20 minutes today', lastWorkedOn: null, targetDate: null },
  { id: 'g-realestate', name: 'Ontario Real Estate Licence', domainId: 'realestate', description: 'Licensing education and studying.', status: 'active', priority: 2, nextAction: 'One study block this week', lastWorkedOn: null, targetDate: null },
  { id: 'g-jobapps', name: 'Job Applications', domainId: 'career', description: 'Keep building options beyond the contract leasing job.', status: 'active', priority: 1, nextAction: 'Apply to 2 roles on the next off day', lastWorkedOn: null, targetDate: null },
  { id: 'g-filming', name: 'Filming / Documentation', domainId: 'creative', description: 'Document this period of life. Property walks, commutes, the journey. Never film clients or private conversations.', status: 'active', priority: 2, nextAction: 'Capture one clip this week', lastWorkedOn: null, targetDate: null },
  { id: 'g-content', name: 'Content', domainId: 'creative', description: 'Turn footage and ideas into published pieces.', status: 'active', priority: 3, nextAction: 'Pick one clip worth editing', lastWorkedOn: null, targetDate: null },
  { id: 'g-reading', name: 'Reading', domainId: 'mind', description: 'Regular reading habit.', status: 'active', priority: 2, nextAction: '15 minutes before bed', lastWorkedOn: null, targetDate: null },
  { id: 'g-fitness', name: 'Fitness', domainId: 'body', description: 'Exercise regularly; recover properly on work days.', status: 'active', priority: 1, nextAction: 'Workout on the next off day', lastWorkedOn: null, targetDate: null },
  { id: 'g-weight', name: 'Weight Gain', domainId: 'body', description: 'Eat consistently — real meals, especially on work days.', status: 'active', priority: 1, nextAction: 'Eat a real lunch every workday', lastWorkedOn: null, targetDate: null },
  { id: 'g-savings', name: 'Savings', domainId: 'money', description: 'Keep the financial direction visible.', status: 'active', priority: 2, nextAction: 'Set savings goal in Money', lastWorkedOn: null, targetDate: null },
  { id: 'g-style', name: 'Style / Grooming', domainId: 'style', description: 'Haircuts, grooming, outfits, appearance.', status: 'active', priority: 3, nextAction: 'Book next haircut', lastWorkedOn: null, targetDate: null }
]

const defaultRoutine: Routine = {
  morning: [
    { id: 'm1', label: 'Wake' },
    { id: 'm2', label: 'Water' },
    { id: 'm3', label: 'Pushups / light exercise (if appropriate)' },
    { id: 'm4', label: 'Breakfast' },
    { id: 'm5', label: 'Shower' },
    { id: 'm6', label: 'Get ready' }
  ],
  workday: [
    { id: 'w1', label: 'Work' },
    { id: 'w2', label: 'Real lunch' },
    { id: 'w3', label: 'Hydration' },
    { id: 'w4', label: 'Steps' }
  ],
  evening: [
    { id: 'e1', label: 'Dinner' },
    { id: 'e2', label: 'Relationship / social time' },
    { id: 'e3', label: 'Small personal investment OR recovery' },
    { id: 'e4', label: 'Sleep' }
  ]
}

export function emptyCheckin(date: string): DailyCheckin {
  return {
    date,
    sleepHours: null,
    energy: null,
    meals: 0,
    exercised: false,
    exerciseNote: '',
    steps: null,
    weight: null,
    french: { practiced: false, minutes: 0, types: [] },
    reading: false,
    career: false,
    connection: { partner: false, family: false, friends: false },
    creative: false,
    mind: false,
    notes: '',
    updatedAt: new Date().toISOString()
  }
}

function initialState(): AppState {
  const now = new Date().toISOString()
  return {
    version: 1,
    settings: defaultSettings,
    domains: defaultDomains,
    checkins: {},
    goals: seedGoals.map(g => ({ ...g, createdAt: now })),
    projectNotes: [],
    weeklyReviews: [],
    routine: defaultRoutine,
    weights: [],
    jobApps: [],
    therapy: [],
    content: [],
    activity: [],
    anchorChecks: {}
  }
}

// ===== Store =====

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as AppState
    // shallow-merge future-proofing: ensure new top-level keys exist
    return { ...initialState(), ...parsed, settings: { ...defaultSettings, ...parsed.settings, money: { ...defaultSettings.money, ...parsed.settings?.money } } }
  } catch {
    return initialState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to persist Matt OS state', e)
  }
}

export function getState(): AppState {
  return state
}

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

export function logActivity(domainId: string, weight: number, label: string, date = todayISO()) {
  setState(s => ({
    ...s,
    activity: [...s.activity.filter(a => a.date >= addDaysGuard(date)), { date, domainId, weight, label }]
  }))
}

// keep activity log bounded to ~60 days
function addDaysGuard(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() - 60)
  return d.toISOString().slice(0, 10)
}

export function saveCheckin(c: DailyCheckin) {
  setState(s => {
    const next: AppState = {
      ...s,
      checkins: { ...s.checkins, [c.date]: { ...c, updatedAt: new Date().toISOString() } }
    }
    // weight entry sync
    if (c.weight != null && !Number.isNaN(c.weight)) {
      const rest = s.weights.filter(w => w.date !== c.date)
      next.weights = [...rest, { date: c.date, weight: c.weight }].sort((a, b) => a.date.localeCompare(b.date))
    }
    return next
  })
}

export function updateSettings(patch: Partial<UserSettings>) {
  setState(s => ({ ...s, settings: { ...s.settings, ...patch } }))
}

export function exportData(): string {
  return JSON.stringify(state, null, 2)
}

export function importData(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || !parsed.settings || !parsed.domains) return false
    setState(() => ({ ...initialState(), ...parsed }))
    return true
  } catch {
    return false
  }
}

export function resetData() {
  setState(() => initialState())
}
