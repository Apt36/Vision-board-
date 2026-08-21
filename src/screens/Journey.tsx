import { useMemo } from 'react'
import { useAppState } from '../store'
import { todayISO, formatShort, weekStartOf, addDays } from '../logic/date'
import { careStreak, progressDays, weekCoverage } from '../logic/plan'
import { challengeState } from '../logic/streaks'
import { windowState } from '../logic/channels'
import { Card } from '../components/ui'
import { ProgressRing } from '../components/celebrate'
import type { Route } from '../App'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Journey({ go }: { go: (r: Route) => void }) {
  const state = useAppState()
  const today = todayISO()
  const streak = careStreak(state, today)
  const coverage = useMemo(() => weekCoverage(state, today), [state, today])
  const recent = useMemo(() => progressDays(state, 7, today), [state, today])
  const cs = challengeState(state, today)
  const win = windowState(state, today)
  const weekStart = weekStartOf(today)

  const touchedCount = coverage.filter(c => c.touched).length
  const coverageLine = touchedCount === coverage.length
    ? 'Every area touched this week. That is the whole idea — nothing starves. 🏆'
    : touchedCount >= coverage.length / 2
      ? `${touchedCount} of ${coverage.length} areas touched so far this week. The rest get their turn as the week goes on.`
      : `${touchedCount} of ${coverage.length} areas so far. Early in the week — your daily plans will walk you through the rest.`

  return (
    <div>
      <div className="brand">YOUR JOURNEY</div>
      <h1 className="screen-title">Journey</h1>
      <p className="screen-sub">Proof that you're showing up — one day at a time.</p>

      <section className="journey-hero card">
        <div className="journey-streak">
          <span className="journey-flame">🔥</span>
          <div>
            <div className="journey-streak-num">{streak} day{streak === 1 ? '' : 's'}</div>
            <div className="stat-label">showing-up streak</div>
          </div>
        </div>
        <div className="journey-days">
          {recent.map(d => (
            <div key={d.date} className="journey-day">
              <span className={`journey-dot ${d.on ? 'on' : ''}`}>{d.on ? '✓' : ''}</span>
              <span className="journey-day-label">{formatShort(d.date).split(' ')[1]}</span>
            </div>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 4 }}>
          A day counts when you do anything at all — one habit is enough. Showing up is the win.
        </p>
      </section>

      <Card title={`This week · ${formatShort(weekStart)}–${formatShort(addDays(weekStart, 6))}`}>
        <p className="muted" style={{ marginBottom: 12 }}>{coverageLine}</p>
        <div className="cover-head" aria-hidden="true">
          <span />
          <span className="cover-days">
            {DAY_LETTERS.map((l, i) => <span key={i} className="cover-day-letter">{l}</span>)}
          </span>
        </div>
        {coverage.map(area => (
          <div key={area.channel.id} className={`cover-row ${area.touched ? '' : 'waiting'}`}>
            <span className="cover-name">
              <span className="cover-emoji">{area.emoji}</span> {area.name}
              {area.isTodaysFocus && <span className="cover-today">today's focus</span>}
            </span>
            <span className="cover-days">
              {area.days.map((on, i) => (
                <span key={i} className={`cover-dot ${on ? 'on' : ''}`}
                  style={on ? { background: area.channel.color, borderColor: area.channel.color } : undefined} />
              ))}
            </span>
          </div>
        ))}
      </Card>

      <Card title="The bigger picture">
        <div className="window-hero" style={{ gap: 16 }}>
          <ProgressRing percent={win.percent} size={84}>
            <span className="plan-hero-count">{win.day}<span className="plan-hero-of">/{win.days}</span></span>
          </ProgressRing>
          <div>
            <div style={{ fontWeight: 650, marginBottom: 4 }}>Chapter {win.number} · day {win.day} of {win.days}</div>
            <p className="muted">
              {state.window.intention || 'Sixty days of steady turns. Small and daily beats heroic and rare.'}
            </p>
          </div>
        </div>
        <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => go('window')}>
          Chapter details ›
        </button>
      </Card>

      {cs.active && (
        <button className="card monk-card" onClick={() => go('monk')} style={{ width: '100%' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>MONK · NO VICES</div>
            <div className="big-stat">Day {cs.day}<span className="faint" style={{ fontSize: '1rem' }}> / {cs.targetDays}</span></div>
          </div>
          <div className="monk-ring" style={{ ['--pct' as string]: `${cs.percent}%` }}>
            <span>{cs.percent}%</span>
          </div>
        </button>
      )}

      <Card title="Weekly reset">
        <p className="muted" style={{ marginBottom: 10 }}>
          Once a week, look back and pick 3–5 priorities. They shape every daily plan that follows.
        </p>
        <button className="btn btn-accent btn-block" onClick={() => go('week')}>
          Open the weekly reset ›
        </button>
      </Card>
    </div>
  )
}
