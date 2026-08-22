import { useEffect, useMemo, useRef, useState } from 'react'
import { bumpCommitment, completeFocusRoom, pinTodayAssignment, useAppState } from '../store'
import { todayISO, formatTime } from '../logic/date'
import { dayInfo } from '../logic/capacity'
import { buildDayPlan, careStreak, channelEmoji, friendlyName, PlanStep } from '../logic/plan'
import { whatShouldIDo } from '../logic/recommend'
import { commitmentStreak, isCommitmentDone } from '../logic/streaks'
import { Sheet } from '../components/ui'
import { Celebration, ProgressRing } from '../components/celebrate'
import type { Route } from '../App'

interface Cheer { emoji: string; title: string; message: string }

const PRAISE = ['Nice work!', 'Keep it going!', 'Look at you go!', 'That counts. It all counts.', 'One step at a time — and you just took one.']

function greeting(name: string): string {
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name}`
}

export default function Today({ go, openRoom }: { go: (r: Route) => void; openRoom: (id: string) => void }) {
  const state = useAppState()
  const today = todayISO()

  // Freeze today's plan the first time the screen opens.
  useEffect(() => { pinTodayAssignment(today) }, [today])

  const plan = useMemo(() => buildDayPlan(state, today), [state, today])
  const streak = careStreak(state, today)
  const info = dayInfo(state, today)
  const seasonRooms = (state.window.focusRoomIds ?? [])
    .map(id => state.rooms.find(r => r.id === id)?.name)
    .filter((n): n is string => !!n)

  const [openStepId, setOpenStepId] = useState<string | null>(null)
  const [cheer, setCheer] = useState<Cheer | null>(null)
  const [showRec, setShowRec] = useState(false)
  const [recAt, setRecAt] = useState<Date | null>(null)

  const openStep = plan.steps.find(s => s.id === openStepId) ?? null
  const nextStep = plan.steps.find(s => !s.done) ?? null
  const rec = recAt ? whatShouldIDo(state, recAt) : null

  const cheerFor = (step: PlanStep, dayNowComplete: boolean): Cheer => {
    if (dayNowComplete) {
      return {
        emoji: '🎉', title: 'Day complete!',
        message: `Every step, done. ${streak > 1 ? `That's a ${streak}-day streak — ` : ''}see you tomorrow.`
      }
    }
    if (step.kind === 'habits') return { emoji: step.emoji, title: 'Habits locked in ✓', message: PRAISE[plan.doneCount % PRAISE.length] }
    if (step.kind === 'keepalive') return { emoji: step.emoji, title: `${step.area?.name ?? 'That area'} stayed alive`, message: 'A small visit still counts. Nothing starves this week.' }
    if (step.kind === 'checkin') return { emoji: '📝', title: 'Checked in ✓', message: 'Day logged. That is how progress becomes visible.' }
    return { emoji: step.emoji, title: `Real progress on ${step.area?.name ?? 'your board'}`, message: PRAISE[plan.doneCount % PRAISE.length] }
  }

  // Habit and check-in steps complete through their own toggles — watch for the
  // moment one flips to done so the sheet closes and the win gets celebrated.
  const prevDoneRef = useRef<Set<string>>(new Set(plan.steps.filter(s => s.done).map(s => s.id)))
  useEffect(() => {
    const prev = prevDoneRef.current
    const nowDone = plan.steps.filter(s => s.done)
    const fresh = nowDone.find(s => !prev.has(s.id) && s.id === openStepId)
    prevDoneRef.current = new Set(nowDone.map(s => s.id))
    if (fresh) {
      setOpenStepId(null)
      setCheer(cheerFor(fresh, plan.complete))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.steps.map(s => (s.done ? '1' : '0')).join('')])

  const completeFocus = (step: PlanStep) => {
    if (!step.room) return
    const remaining = plan.steps.filter(s => !s.done && s.id !== step.id).length
    completeFocusRoom(step.room.id, step.minutes ?? 20, today)
    setOpenStepId(null)
    setCheer(cheerFor(step, remaining === 0))
  }

  const onStepTap = (step: PlanStep) => {
    if (step.kind === 'checkin') { go('checkin'); return }
    setOpenStepId(step.id)
  }

  return (
    <div>
      <header className="coach-head">
        <div>
          <div className="coach-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1 className="coach-greet">{greeting(state.settings.name)}</h1>
          <div className="coach-context">
            {info.isWorkDay ? `Work day · ${formatTime(info.shift.start)}–${formatTime(info.shift.end)}` : 'Day off — your time'}
          </div>
        </div>
        {streak > 0 && (
          <div className="streak-chip" title="Days in a row you showed up">
            <span className="streak-flame">🔥</span>
            <span className="streak-num">{streak}</span>
            <span className="streak-label">day{streak === 1 ? '' : 's'}</span>
          </div>
        )}
      </header>

      {plan.complete ? (
        <section className="day-done card">
          <div className="day-done-emoji">🏆</div>
          <h2>Day complete!</h2>
          <p className="muted">
            You did every step of today's plan. Rest is part of the plan too — you've earned the evening.
          </p>
          <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => go('journey')}>
            See your journey ›
          </button>
        </section>
      ) : (
        <section className="plan-hero card">
          <ProgressRing percent={plan.percent} size={92} color={plan.focusChannel?.color ?? 'var(--accent)'}>
            <span className="plan-hero-count">{plan.doneCount}<span className="plan-hero-of">/{plan.total}</span></span>
          </ProgressRing>
          <div className="plan-hero-text">
            <div className="plan-hero-title">Today's plan</div>
            <p className="plan-hero-msg">
              {plan.doneCount === 0
                ? `${plan.total} small steps today. Start anywhere — the first one is right below.`
                : `${plan.doneCount} down, ${plan.total - plan.doneCount} to go. You're rolling.`}
            </p>
            {plan.focusChannel && (
              <div className="plan-focus-chip" style={{ ['--ch' as string]: plan.focusChannel.color }}>
                Focus: {channelEmoji(plan.focusChannel.id)} {friendlyName(plan.focusChannel.name)}
              </div>
            )}
          </div>
        </section>
      )}

      <ol className="path">
        {plan.steps.map((step, i) => {
          const isNext = !plan.complete && step.id === nextStep?.id
          return (
            <li key={step.id} className={`path-item ${step.done ? 'done' : ''} ${isNext ? 'next' : ''}`}>
              <button className="path-step" onClick={() => onStepTap(step)}
                style={step.area ? { ['--ch' as string]: step.area.color } : undefined}>
                <span className={`path-node ${step.done ? 'on' : ''}`}>
                  {step.done ? '✓' : step.emoji}
                </span>
                <span className="path-body">
                  {isNext && <span className="path-next-tag">UP NEXT</span>}
                  {step.area && <span className="path-area" style={{ color: step.area.color }}>{step.area.name}{step.kind === 'keepalive' ? ' · quick visit' : ''}</span>}
                  <span className="path-title">{step.title}</span>
                  <span className="path-detail">{step.detail}</span>
                </span>
                {step.minutes != null && <span className="path-mins">{step.minutes} min</span>}
              </button>
            </li>
          )
        })}
      </ol>

      <p className="plan-why">
        {plan.focusChannel
          ? `Why this plan? ${friendlyName(plan.focusChannel.name)} has waited longest for your attention, so it's today's focus. The focus rotates daily — over a week, every area of your board gets its turn.`
          : 'Your plan rotates daily, so over a week every area of your board gets its turn.'}
        {seasonRooms.length > 0 && ` This season the dial leans toward ${seasonRooms.length === 1 ? seasonRooms[0] : `${seasonRooms.slice(0, -1).join(', ')} and ${seasonRooms[seasonRooms.length - 1]}`}.`}
      </p>
      <button className="btn btn-block" onClick={() => go('network')}>See your whole board ›</button>

      <button className="big-btn" onClick={() => { setRecAt(new Date()); setShowRec(true) }}>
        NOT SURE? ASK YOUR COACH
      </button>

      {openStep && openStep.kind === 'habits' && (
        <Sheet onClose={() => setOpenStepId(null)}>
          <h2>{openStep.emoji} {openStep.title}</h2>
          <p className="muted" style={{ margin: '6px 0 14px' }}>
            Tick each one off as you do it — the step completes itself.
          </p>
          {openStep.anchors.map(c => {
            const count = state.commitmentLog[today]?.[c.id] ?? 0
            const done = isCommitmentDone(state, c, today)
            const cstreak = commitmentStreak(state, c, today)
            return (
              <button key={c.id} className="anchor-row" onClick={() => bumpCommitment(c.id)}>
                <span className={`anchor-box ${done ? 'on' : count > 0 ? 'part' : ''}`}>
                  {done ? '✓' : c.target > 1 ? `${count}/${c.target}` : ''}
                </span>
                <span className={`anchor-label ${done ? 'done' : ''}`}>{c.label}</span>
                {cstreak > 1 && <span className="anchor-streak">🔥 {cstreak}d</span>}
              </button>
            )
          })}
          <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => setOpenStepId(null)}>Close</button>
        </Sheet>
      )}

      {openStep && (openStep.kind === 'focus' || openStep.kind === 'keepalive') && openStep.room && (
        <Sheet onClose={() => setOpenStepId(null)}>
          {openStep.area && (
            <div className="plan-focus-chip" style={{ ['--ch' as string]: openStep.area.color, marginBottom: 10 }}>
              {openStep.emoji} {openStep.area.name}
            </div>
          )}
          <h2>{openStep.title}</h2>
          <p className="muted" style={{ margin: '8px 0 12px' }}>{openStep.room.intention}</p>
          <div className="card-title">Today's mission</div>
          <p style={{ marginBottom: 4 }}>{openStep.detail}</p>
          <p className="faint" style={{ marginBottom: 16 }}>
            About {openStep.minutes} minutes. {openStep.kind === 'keepalive' ? 'Just keep it warm — done beats perfect.' : 'Done beats perfect.'}
          </p>
          <button className="btn btn-accent btn-block" onClick={() => completeFocus(openStep)}>
            ✓ I did this
          </button>
          <button className="btn btn-block" style={{ marginTop: 8 }}
            onClick={() => { setOpenStepId(null); openRoom(openStep.room!.id) }}>
            Open full page — log time & notes ›
          </button>
        </Sheet>
      )}

      {showRec && rec && (
        <Sheet onClose={() => setShowRec(false)}>
          <h2>Right now</h2>
          <p className="muted" style={{ margin: '8px 0 14px' }}>{rec.context}</p>
          <div className="card-title">Do this</div>
          <ol className="plist">
            {rec.steps.map((s, i) => <li key={i}><span className="num">{i + 1}</span><span>{s}</span></li>)}
          </ol>
          {rec.not.length > 0 && (
            <>
              <div className="card-title" style={{ marginTop: 14 }}>Skip tonight</div>
              <ul className="avoid-list">{rec.not.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </>
          )}
          <button className="btn btn-block" style={{ marginTop: 16 }} onClick={() => setShowRec(false)}>Got it</button>
        </Sheet>
      )}

      {cheer && (
        <Celebration emoji={cheer.emoji} title={cheer.title} message={cheer.message} onDone={() => setCheer(null)} />
      )}
    </div>
  )
}
