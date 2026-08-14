import { useMemo, useState } from 'react'
import { setState, updateSettings, useAppState } from '../store'
import { todayISO, lastNDays, formatShort } from '../logic/date'
import { workdayMealAverage } from '../logic/recommend'
import { weekStats } from '../logic/week'
import { Card, Sparkline } from '../components/ui'

export default function Body() {
  const state = useAppState()
  const today = todayISO()
  const unit = state.settings.weightUnit
  const weights = state.weights
  const latest = weights[weights.length - 1] ?? null
  const target = state.settings.targetWeight
  const [targetInput, setTargetInput] = useState(target?.toString() ?? '')
  const [logInput, setLogInput] = useState('')
  const mealAvg = workdayMealAverage(state, today)
  const stats = useMemo(() => weekStats(state, today), [state, today])

  // 7-day rolling average trend vs previous 7 days
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
      weights: [...s.weights.filter(w => w.date !== today), { date: today, weight: v }].sort((a, b) => a.date.localeCompare(b.date))
    }))
    setLogInput('')
  }

  return (
    <div>
      <div className="brand">BODY</div>
      <h1 className="screen-title">Fuel, movement, recovery</h1>
      <p className="screen-sub">Trends matter. Daily fluctuations don't.</p>

      <Card title="Weight">
        <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
          <div>
            <div className="stat-label">Current</div>
            <div className="big-stat">{latest ? `${latest.weight}` : '—'}<span className="faint" style={{ fontSize: '0.9rem' }}> {latest ? unit : ''}</span></div>
            {latest && <div className="faint">{formatShort(latest.date)}</div>}
          </div>
          <div>
            <div className="stat-label">Target</div>
            <div className="big-stat">{target ?? '—'}<span className="faint" style={{ fontSize: '0.9rem' }}> {target ? unit : ''}</span></div>
            {trend != null && (
              <div className="faint">{trend > 0 ? `+${trend}` : trend} {unit} vs last week</div>
            )}
          </div>
        </div>
        {weights.length >= 2 && <Sparkline points={weights.slice(-30).map(w => w.weight)} color="var(--good)" />}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="number" inputMode="decimal" placeholder={`Log today's weight (${unit})`}
            value={logInput} onChange={e => setLogInput(e.target.value)} />
          <button className="btn" onClick={logWeight} disabled={!logInput}>Log</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="number" inputMode="decimal" placeholder={`Target weight (${unit})`}
            value={targetInput} onChange={e => setTargetInput(e.target.value)} />
          <button className="btn" disabled={!targetInput}
            onClick={() => updateSettings({ targetWeight: Number(targetInput) || null })}>
            Set
          </button>
        </div>
      </Card>

      <Card title="Eating consistency">
        {mealAvg != null ? (
          <>
            <div className="big-stat">{mealAvg}</div>
            <div className="stat-label" style={{ marginBottom: 8 }}>avg meals per workday (14 days)</div>
            {state.settings.goalDirection === 'gain' && mealAvg < 2.5 && (
              <p className="note-quote">
                You're trying to gain weight, but your average workday has only had {mealAvg} meals.
                This becomes a daily priority until it climbs.
              </p>
            )}
            {state.settings.goalDirection === 'gain' && mealAvg >= 2.5 && (
              <p className="muted">Workday eating is holding up. Keep it boring and consistent.</p>
            )}
          </>
        ) : (
          <p className="empty">Log meals in the daily check-in for a few days and your workday eating pattern shows up here.</p>
        )}
      </Card>

      <Card title="This week">
        <div className="row" style={{ borderTop: 'none' }}><span className="row-label">Exercise</span><span>{stats.exerciseDays} day{stats.exerciseDays === 1 ? '' : 's'}</span></div>
        <div className="row"><span className="row-label">Average sleep</span><span>{stats.avgSleep != null ? `${stats.avgSleep}h` : '—'}</span></div>
        <div className="row"><span className="row-label">Average meals</span><span>{stats.avgMeals ?? '—'}</span></div>
      </Card>

      {weights.length > 0 && (
        <Card title="History">
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
