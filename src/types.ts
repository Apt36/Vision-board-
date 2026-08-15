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
  startWeight: number | null
  targetWeight: number | null
  weightUnit: 'lbs' | 'kg'
  goalDirection: 'gain' | 'maintain' | 'lose'
  money: {
    savingsGoal: number | null
    currentSavings: number | null
    monthlyTarget: number | null
    extraIncomeGoal: number | null
    extraIncomeEarned: number | null
    minimalSpendMonth: boolean
    note: string
  }
}

// ===== Rooms — the spine of the app =====

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'as-needed'
export type RoomStatus = 'active' | 'maintenance' | 'paused'

/** Optional deeper feature a room opens into. */
export type RoomFeature =
  | 'body' | 'french' | 'content' | 'library' | 'art' | 'vinyl'
  | 'money' | 'wishlist' | 'career' | 'therapy' | 'monk'

export interface Room {
  id: string
  name: string
  domainId: string
  /** Why this room exists — shown when you enter it. */
  intention: string
  cadence: Cadence
  status: RoomStatus
  /** Pressing things get surfaced harder. */
  urgent: boolean
  nextAction: string
  feature: RoomFeature | null
  lastEntered: string | null // YYYY-MM-DD
  createdAt: string
}

export interface RoomSession {
  id: string
  roomId: string
  date: string
  minutes: number
  note: string
  filmed: boolean
}

export interface RoomCapture {
  id: string
  roomId: string
  kind: 'idea' | 'blocker' | 'note'
  text: string
  date: string
  done: boolean
}

// ===== Daily commitments (anchors with streaks) =====

export interface Commitment {
  id: string
  label: string
  roomId: string | null
  /** How many times a day it counts as complete (teeth/skincare = 2). */
  target: number
  slot: 'morning' | 'day' | 'evening'
  active: boolean
}

/** date -> commitmentId -> times done */
export type CommitmentLog = Record<string, Record<string, number>>

// ===== Challenge (Monk mode) =====

export interface Challenge {
  id: string
  name: string
  vices: string[]
  targetDays: number
  startDate: string | null
  active: boolean
  bestRun: number
}

/** date -> true = clean day, false = slip */
export type ChallengeLog = Record<string, boolean>

// ===== Collections =====

export type CollectionKind = 'art' | 'vinyl' | 'library'
export type CollectionStatus = 'wanted' | 'acquired' | 'framed' | 'reading' | 'finished'

export interface CollectionItem {
  id: string
  collection: CollectionKind
  title: string
  maker: string // artist / author
  status: CollectionStatus
  notes: string
  cost: number | null
  date: string
}

// ===== Wishlist / restraint =====

export interface WishlistItem {
  id: string
  name: string
  price: number
  saved: number
  reason: string
  status: 'waiting' | 'ready' | 'bought' | 'released'
  addedAt: string
}

// ===== Content pipeline =====

export type ContentKind = 'footage' | 'clip' | 'idea' | 'published'

export interface ContentItem {
  id: string
  kind: ContentKind
  title: string
  roomId: string | null
  notes: string
  date: string
  editId: string | null // which edit session consumed it
}

export interface EditSession {
  id: string
  date: string
  title: string
  minutes: number
  clipIds: string[]
  published: boolean
  note: string
}

// ===== Daily check-in =====

export type FrenchType = 'duolingo' | 'speaking' | 'listening' | 'reading' | 'writing'

export interface DailyCheckin {
  date: string
  sleepHours: number | null
  energy: number | null
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  pushups: number
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

// ===== Supporting =====

export interface LifeDomain {
  id: string
  name: string
  color: string
  builtin: boolean
  weeklyTarget: number
}

export interface WeeklyReview {
  weekStart: string
  priorities: string[]
  reflection: string
  completedAt: string
}

export interface RoutineAnchor { id: string; label: string }
export interface Routine {
  morning: RoutineAnchor[]
  workday: RoutineAnchor[]
  evening: RoutineAnchor[]
}

export interface WeightEntry { date: string; weight: number }

export type JobAppStatus = 'applied' | 'interview' | 'follow-up' | 'offer' | 'rejected' | 'closed'
export interface JobApplication {
  id: string; company: string; role: string; date: string; status: JobAppStatus; notes: string
}

export interface TherapySession {
  id: string; date: string; reflection: string; nextSession: string | null; topics: string
}

export interface ActivityEvent {
  date: string; domainId: string; weight: number; label: string
}

export interface AppState {
  version: number
  settings: UserSettings
  domains: LifeDomain[]
  rooms: Room[]
  roomSessions: RoomSession[]
  roomCaptures: RoomCapture[]
  commitments: Commitment[]
  commitmentLog: CommitmentLog
  challenge: Challenge
  challengeLog: ChallengeLog
  collection: CollectionItem[]
  wishlist: WishlistItem[]
  content: ContentItem[]
  edits: EditSession[]
  checkins: Record<string, DailyCheckin>
  weeklyReviews: WeeklyReview[]
  routine: Routine
  weights: WeightEntry[]
  jobApps: JobApplication[]
  therapy: TherapySession[]
  activity: ActivityEvent[]
  anchorChecks: Record<string, string[]>
  channels: Channel[]
  window: Window60
  windowReviews: WindowReview[]
  assignments: Record<string, Assignment>
}

// ===== Channels — the network of focus =====

export interface Channel {
  id: string
  name: string
  tagline: string
  color: string
  roomIds: string[]
  /** 1–5. Higher = deserves turns more often. */
  weight: number
  order: number
}

/** A 60-day window of progression. */
export interface Window60 {
  number: number
  startDate: string
  days: number
  intention: string
  active: boolean
}

export interface WindowReview {
  windowNumber: number
  date: string
  kept: string
  dropped: string
  next: string
}

/** What the app tells him to do today. */
export interface Assignment {
  date: string
  channelId: string
  roomIds: string[]
  accepted: boolean
}
