import { useState } from 'react'
import { setChallengeDay, setState, useAppState } from '../store'
import { todayISO, addDays, formatShort } from '../logic/date'
import { challengeState, encouragementFor } from '../logic/streaks'
import { Card, Chip } from '../components/ui'

const COMMON_VICES = ['Weed', 'Alcohol', 'Nicotine', 'Porn', 'Doomscrolling', 'Junk food', 'Late nights', 'Impulse buying']

export default function Monk() {
  const state = useAppState()
  const today = todayISO()
  const cs = challengeState(state, today)
  const ch = state.challenge
  const [vices, setVices] = useState<string[]>(ch.vices)
  const [custom, setCustom] = useState('')

  const start = () => {
    setState(s => ({
      ...s,
      challenge: { ...s.challenge, vices, startDate: today, active: true }
    }))
  }

  const stop = () => {
    setState(s => ({
      ...s,
      challenge: { ...s.challenge, active: false, bestRun: Math.max(s.challenge.bestRun, cs.bestRun) }
    }))
  }

  const toggleVice = (v: string) => {
    const next = vices.includes(v) ? vices.filter(x => x !== v) : [...vices, v]
    setVices(next)
    if (ch.active) setState(s => ({ ...s, challenge: { ...s.challenge, vices: next } }))
  }

  const addCustom = () => {
    if (!custom.trim()) return
    toggleVice(custom.trim())
    setCustom('')
  }

  const todayLogged = state.challengeLog[today]
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(today, -(13 - i))
    return { date: d, rec: state.challengeLog[d] }
  })

  if (!ch.active) {
    return (
      <div>
        <div className="brand">MONK</div>
        <h1 className="screen-title">60 days, no vices</h1>
        <p className="screen-sub">
          You'll be tempted. That's not a flaw in the plan — that's the whole point of it.
        </p>

        <Card title="What are you cutting?">
          <div className="chip-row">
            {[...new Set([...COMMON_VICES, ...vices])].map(v => (
              <Chip key={v} on={vices.includes(v)} onClick={() => toggleVice(v)}>{v}</Chip>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input placeholder="Something else…" value={custom} onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()} />
            <button className="btn" onClick={addCustom} disabled={!custom.trim()}>Add</button>
          </div>
        </Card>

        {ch.bestRun > 0 && (
          <Card title="Last time">
            <p className="muted">Your longest run so far was <strong>{ch.bestRun} days</strong>. That happened. It counts.</p>
          </Card>
        )}

        <button className="big-btn" disabled={vices.length === 0} onClick={start}>
          START DAY 1
        </button>
        {vices.length === 0 && <p className="faint" style={{ textAlign: 'center' }}>Pick at least one thing to cut.</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="brand">MONK</div>
      <h1 className="screen-title">Day {cs.day} of {cs.targetDays}</h1>
      <p className="screen-sub">{encouragementFor(cs)}</p>

      <Card>
        <div className="capacity-bar" style={{ height: 12 }}>
          <div style={{ width: `${cs.percent}%`, background: 'var(--accent)' }} />
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 16, flexWrap: 'wrap' }}>
          <div><div className="big-stat">{cs.day}</div><div className="stat-label">current run</div></div>
          <div><div className="big-stat">{cs.targetDays - cs.day}</div><div className="stat-label">days left</div></div>
          <div><div className="big-stat">{cs.bestRun}</div><div className="stat-label">best run</div></div>
          {cs.slips > 0 && <div><div className="big-stat">{cs.slips}</div><div className="stat-label">restarts</div></div>}
        </div>
      </Card>

      <Card title="Today">
        <p className="muted" style={{ marginBottom: 12 }}>
          {todayLogged === true ? 'Logged clean. Good.'
            : todayLogged === false ? 'You logged a slip today. Tomorrow is day one — that is not a punishment, it is just the count.'
            : 'How did today go? Honest answers only — this is for you, not for anyone else.'}
        </p>
        <div className="grid-2">
          <button className={`btn ${todayLogged === true ? 'btn-accent' : ''}`} onClick={() => setChallengeDay(today, true)}>
            Clean
          </button>
          <button className={`btn ${todayLogged === false ? 'btn-danger' : ''}`} onClick={() => setChallengeDay(today, false)}>
            Slipped
          </button>
        </div>
      </Card>

      <Card title="Last 14 days">
        <div className="dot-row">
          {last14.map(d => (
            <span key={d.date}
              className={`day-dot ${d.rec === true ? 'on' : d.rec === false ? 'slip' : ''}`}
              title={`${formatShort(d.date)}: ${d.rec === true ? 'clean' : d.rec === false ? 'slip' : 'not logged'}`} />
          ))}
        </div>
        <p className="faint" style={{ marginTop: 10 }}>
          {cs.cleanDays} day{cs.cleanDays === 1 ? '' : 's'} logged clean since {cs.runStart ? formatShort(cs.runStart) : 'the start'}.
        </p>
      </Card>

      <Card title="What you're cutting">
        <div className="chip-row">
          {[...new Set([...COMMON_VICES, ...vices])].map(v => (
            <Chip key={v} on={vices.includes(v)} onClick={() => toggleVice(v)}>{v}</Chip>
          ))}
        </div>
      </Card>

      <button className="btn btn-danger btn-block" onClick={stop}>End the challenge</button>
      <p className="faint" style={{ textAlign: 'center', marginTop: 8 }}>
        Ending it keeps your best run on record.
      </p>
    </div>
  )
}
