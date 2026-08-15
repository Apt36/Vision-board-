import { useMemo, useState } from 'react'
import { setState, updateSettings, useAppState } from '../store'
import { todayISO, lastNDays, formatShort } from '../logic/date'
import { workdayMealAverage, lunchDinnerRate } from '../logic/recommend'
import { weekStats } from '../logic/week'
import { Card, Sparkline } from '../components/ui'

export default function Body() {
  const state = useAppState()
  const today = todayISO()
  const unit = state.settings.weightUnit
  const weights = state.weights
  const latest = weights[weights.length - 1] ?? null
  const target = state.settings.targetWeight
  const start = state.settings.startWeight
  const [targetInput, setTargetInput] = useState(target?.toString() ?? '')
  const [logInput, setLogInput] = useState('')
  const mealAvg = workdayMealAverage(state, today)
  const ld = lunchDinnerRate(state, today)
  const stats = useMemo(() => weekStats(state, today), [state, today])

  const current = latest?.weight ?? start ?? null
  const gained = current != null && start != null ? Math.round((current - start) * 10) / 10 : null
  const toGo = current != null && target != null ? Math.round((target - current) * 10) / 10 : null
  const progress = current != null && start != null && target != null && target !== start
    ? Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)))
    : null

  const trend = useMemo(() => {
    if (weights.length < 4) return null
    const avg = (ws: typeof weights) => ws.reduce((s, w) => s + w.weight, 0) / ws.length
    const recentDays = new Set(lastNDays(7, today))
    const prevDays = new Set(lastNDays(14, today).slice(0, 7))
    const recent = weights.filter(w => recentDays.has(w.date))
    const prev = weights.filter(w => prevDays.has(w.date))
    if (recent.length < 2 || prev.length < 2) return null
    return Math.round((avg(recent) - avg(prev)) * 10) / 10
  }, [weights, today])

  const logWeight = () => {
    const v = Number(logInput)
    if (!v || Number.isNaN(v)) return
    setState(s => ({
      ...s,
      weights: [...s.weights.filter(w => w.date !== today), { date: today, weight: v }]
        .sort((a, b) => a.date.localeCompare(b.date))
    }))
    setLogInput('')
  }

  return (
    <div>
      <div className="brand">BODY</div>
      <h1 className="screen-title">Build the frame</h1>
      <p className="screen-sub">Trends matter. Daily fluctuations don't.</p>

      <Card title="The gain">
        <div style={{ display: 'flex', gap: 22, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="stat-label">Now</div>
            <div className="big-stat">{current ?? '—'}<span className="faint" style={{ fontSize: '0.9rem' }}> {current ? unit : ''}</span></div>
          </div>
          <div>
            <div className="stat-label">Target</div>
            <div className="big-stat">{target ?? '—'}</div>
          </div>
          <div>
            <div className="stat-label">Gained</div>
            <div className="big-stat" style={{ color: gained != null && gained > 0 ? 'var(--good)' : undefined }}>
              {gained == null ? '—' : gained > 0 ? `+${gained}` : gained}
            </div>
          </div>
          <div>
            <div className="stat-label">To go</div>
            <div className="big-stat">{toGo == null ? '—' : toGo}</div>
          </div>
        </div>
        {progress != null && (
          <>
            <div className="capacity-bar"><div style={{ width: `${progress}%`, background: 'var(--good)' }} /></div>
            <p className="faint" style={{ marginTop: 8 }}>
              {progress}% of the way from {start} to {target} {unit}
              {trend != null && ` · ${trend > 0 ? '+' : ''}${trend} ${unit} vs last week`}
            </p>
          </>
        )}
        {weights.length >= 2 && <Sparkline points={weights.slice(-30).map(w => w.weight)} color="var(--good)" />}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="number" inputMode="decimal" placeholder={`Log today's weight (${unit})`}
            value={logInput} onChange={e => setLogInput(e.target.value)} />
          <button className="btn" onClick={logWeight} disabled={!logInput}>Log</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="number" inputMode="decimal" placeholder={`Target (${unit})`}
            value={targetInput} onChange={e => setTargetInput(e.target.value)} />
          <button className="btn" disabled={!targetInput}
            onClick={() => updateSettings({ targetWeight: Number(targetInput) || null })}>Set</button>
        </div>
      </Card>

      <Card title="Lunch & dinner">
        {ld ? (
          <>
            <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
              <div><div className="big-stat">{ld.lunch}%</div><div className="stat-label">lunch</div></div>
              <div><div className="big-stat">{ld.dinner}%</div><div className="stat-label">dinner</div></div>
              <div><div className="big-stat">{mealAvg ?? '—'}</div><div className="stat-label">avg workday meals</div></div>
            </div>
            {ld.dinner < 70 || ld.lunch < 70 ? (
              <p className="note-quote">
                You cannot gain on the meals you're skipping. Breakfast is handled — the gap is
                {ld.lunch <= ld.dinner ? ' lunch' : ' dinner'}, at {Math.min(ld.lunch, ld.dinner)}% of the last {ld.days} days.
              </p>
            ) : (
              <p className="muted">All three meals are landing consistently. That's exactly what the gain needs — keep it boring.</p>
            )}
          </>
        ) : (
          <p className="empty">Log a few days of meals and the pattern shows up here.</p>
        )}
      </Card>

      <Card title="This week">
        <div className="row" style={{ borderTop: 'none' }}>
          <span className="row-label">Pushup days</span><span>{stats.pushupDays}</span>
        </div>
        <div className="row"><span className="row-label">Other exercise</span><span>{stats.exerciseDays} day{stats.exerciseDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Lunch / dinner</span><span>{stats.lunchDays} / {stats.dinnerDays}</span></div>
        <div className="row"><span className="row-label">Average sleep</span><span>{stats.avgSleep != null ? `${stats.avgSleep}h` : '—'}</span></div>
        <div className="row"><span className="row-label">Average meals</span><span>{stats.avgMeals ?? '—'}</span></div>
      </Card>

      <Card title="Steps">
        <p className="muted">
          You walk everywhere, so steps take care of themselves — but iPhone Health can't feed a web app.
          Log them in the daily check-in when you want them on record.
        </p>
      </Card>

      {weights.length > 0 && (
        <Card title="Weight history">
          {[...weights].reverse().slice(0, 14).map(w => (
            <div key={w.date} className="row">
              <span className="row-sub">{formatShort(w.date)}</span>
              <span>{w.weight} {unit}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
