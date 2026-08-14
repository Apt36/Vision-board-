// ===== Data models =====

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface Shift {
  off: boolean
  start: string // "09:00" 24h
  end: string   // "17:00"
}

export type WorkSchedule = Record<DayKey, Shift>

export interface UserSettings {
  name: string
  schedule: WorkSchedule
  currentJob: string
  targetWeight: number | null
  weightUnit: 'lbs' | 'kg'
  goalDirection: 'gain' | 'maintain' | 'lose'
  money: {
    savingsGoal: number | null
    currentSavings: number | null
    monthlyTarget: number | null
    extraIncomeGoal: number | null
    extraIncomeEarned: number | null
    note: string
  }
}

export type FrenchType = 'duolingo' | 'speaking' | 'listening' | 'reading' | 'writing'

export interface DailyCheckin {
  date: string // YYYY-MM-DD
  sleepHours: number | null
  energy: number | null // 1-10
  meals: number
  exercised: boolean
  exerciseNote: string
  steps: number | null
  weight: number | null
  french: { practiced: boolean; minutes: number; types: FrenchType[] }
  reading: boolean
  career: boolean
  connection: { partner: boolean; family: boolean; friends: boolean }
  creative: boolean
  mind: boolean
  notes: string
  updatedAt: string
}

export interface LifeDomain {
  id: string
  name: string
  color: string
  builtin: boolean
  /** expected "attention events" per week used to normalise the radar */
  weeklyTarget: number
}

export type GoalStatus = 'active' | 'maintenance' | 'paused' | 'done'

export interface Goal {
  id: string
  name: string
  domainId: string
  description: string
  status: GoalStatus
  priority: 1 | 2 | 3 // 1 = high
  nextAction: string
  lastWorkedOn: string | null // YYYY-MM-DD
  targetDate: string | null
  createdAt: string
}

export interface ProjectNote {
  id: string
  goalId: string
  kind: 'idea' | 'bug' | 'log'
  text: string
  date: string
}

export interface WeeklyReview {
  weekStart: string // Monday YYYY-MM-DD
  priorities: string[] // domainIds, 3-5 protected priorities
  reflection: string
  completedAt: string
}

export interface RoutineAnchor {
  id: string
  label: string
}

export interface Routine {
  morning: RoutineAnchor[]
  workday: RoutineAnchor[]
  evening: RoutineAnchor[]
}

export interface WeightEntry {
  date: string
  weight: number
}

export type JobAppStatus = 'applied' | 'interview' | 'follow-up' | 'offer' | 'rejected' | 'closed'

export interface JobApplication {
  id: string
  company: string
  role: string
  date: string
  status: JobAppStatus
  notes: string
}

export interface TherapySession {
  id: string
  date: string
  reflection: string
  nextSession: string | null
  topics: string
}

export type ContentKind = 'footage' | 'clip' | 'idea' | 'published'

export interface ContentItem {
  id: string
  kind: ContentKind
  title: string
  notes: string
  date: string
}

/** Generic attention event — lets non-checkin actions feed the Life Radar. */
export interface ActivityEvent {
  date: string
  domainId: string
  weight: number
  label: string
}

export interface AppState {
  version: number
  settings: UserSettings
  domains: LifeDomain[]
  checkins: Record<string, DailyCheckin>
  goals: Goal[]
  projectNotes: ProjectNote[]
  weeklyReviews: WeeklyReview[]
  routine: Routine
  weights: WeightEntry[]
  jobApps: JobApplication[]
  therapy: TherapySession[]
  content: ContentItem[]
  activity: ActivityEvent[]
  anchorChecks: Record<string, string[]> // date -> anchor ids done
}
