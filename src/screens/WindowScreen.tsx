import { useMemo, useState } from 'react'
import { setState, uid, useAppState } from '../store'
import { todayISO, formatShort, addDays } from '../logic/date'
import { channelStates, windowState } from '../logic/channels'
import { friendlyName } from '../logic/plan'
import { challengeState } from '../logic/streaks'
import { Card } from '../components/ui'

const MAX_FOCUS = 4

export default function WindowScreen() {
  const state = useAppState()
  const today = todayISO()
  const win = windowState(state, today)
  const states = useMemo(() => channelStates(state, today), [state, today])
  const cs = challengeState(state, today)
  const [intention, setIntention] = useState(state.window.intention)
  const [saved, setSaved] = useState(false)
  const [review, setReview] = useState({ kept: '', dropped: '', next: '' })

  const sessions = state.roomSessions.filter(s => s.date >= win.startDate)
  const minutes = sessions.reduce((n, s) => n + s.minutes, 0)
  const filmed = sessions.filter(s => s.filmed).length
  const edits = state.edits.filter(e => e.date >= win.startDate)
  const checkins = Object.values(state.checkins).filter(c => c.date >= win.startDate)
  const weights = state.weights.filter(w => w.date >= win.startDate)
  const gained = weights.length >= 2
    ? Math.round((weights[weights.length - 1].weight - weights[0].weight) * 10) / 10
    : null

  const saveIntention = () => {
    setState(s => ({ ...s, window: { ...s.window, intention } }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const focusIds = state.window.focusRoomIds ?? []
  const toggleFocus = (id: string) => {
    setState(s => {
      const cur = s.window.focusRoomIds ?? []
      const next = cur.includes(id) ? cur.filter(x => x !== id)
        : cur.length >= MAX_FOCUS ? cur : [...cur, id]
      return { ...s, window: { ...s.window, focusRoomIds: next } }
    })
  }

  const dialGroups = useMemo(() => {
    const channels = [...state.channels].sort((a, b) => a.order - b.order)
    const grouped = channels.map(ch => ({
      key: ch.id, name: friendlyName(ch.name), color: ch.color,
      rooms: ch.roomIds
        .map(id => state.rooms.find(r => r.id === id))
        .filter(r => r && r.status === 'active') as { id: string; name: string }[]
    }))
    const inChannel = new Set(channels.flatMap(c => c.roomIds))
    const loose = state.rooms.filter(r => r.status === 'active' && !inChannel.has(r.id))
    if (loose.length) grouped.push({ key: 'loose', name: 'More', color: 'var(--text-dim)', rooms: loose })
    return grouped.filter(g => g.rooms.length > 0)
  }, [state.channels, state.rooms])

  const closeWindow = () => {
    setState(s => ({
      ...s,
      windowReviews: [
        { windowNumber: s.window.number, date: today, ...review },
        ...s.windowReviews
      ],
      window: {
        ...s.window,
        number: s.window.number + 1,
        startDate: today,
        intention: review.next || s.window.intention,
        active: true
      }
    }))
    setReview({ kept: '', dropped: '', next: '' })
  }

  return (
    <div>
      <div className="brand">THE WINDOW</div>
      <h1 className="screen-title">Window {String(win.number).padStart(2, '0')}</h1>
      <p className="screen-sub">
        {formatShort(win.startDate)} – {formatShort(win.endDate)} · you already did one of these
      </p>

      <Card>
        <div className="window-hero">
          <div className="window-ring" style={{ ['--pct' as string]: `${win.percent}%` }}>
            <span className="window-day">{win.day}</span>
            <span className="window-of">of {win.days}</span>
          </div>
          <div>
            <div className="big-stat">{win.daysLeft}</div>
            <div className="stat-label">days left</div>
            <p className="faint" style={{ marginTop: 10, maxWidth: 190 }}>
              {win.day <= 3 ? 'The beginning is the easy part to romanticise. Just start.'
                : win.day < 20 ? 'Early. Keep the anchors boring and the channels fed.'
                : win.day < 45 ? 'Deep in it. This is where the second window beats the first.'
                : win.isReviewDay ? 'The window is up. Time to review it.'
                : 'The last stretch. Finish it properly.'}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Intention for this window">
        <textarea value={intention} onChange={e => { setIntention(e.target.value); setSaved(false) }} />
        <button className="btn btn-accent btn-block" style={{ marginTop: 10 }} onClick={saveIntention}>
          {saved ? '✓ Saved' : 'Save intention'}
        </button>
      </Card>

      <Card title="The season dial">
        <p className="muted" style={{ marginBottom: 12 }}>
          Every window is a season. Turn the dial toward up to {MAX_FOCUS} rooms — they get first
          claim on your days for these 60 days. Everything else keeps simmering in the
          rotation; a season shifts weight, it never mutes anything.
        </p>
        {dialGroups.map(g => (
          <div key={g.key} style={{ marginBottom: 12 }}>
            <div className="stat-label" style={{ color: g.color, marginBottom: 6 }}>{g.name}</div>
            <div className="chip-row">
              {g.rooms.map(r => (
                <button key={r.id} className={`chip ${focusIds.includes(r.id) ? 'on' : ''}`}
                  onClick={() => toggleFocus(r.id)}>
                  {focusIds.includes(r.id) ? '◉ ' : ''}{r.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="faint">
          {focusIds.length === 0
            ? 'No dial set — pure rotation, every room takes equal turns.'
            : focusIds.length >= MAX_FOCUS
              ? `${MAX_FOCUS} of ${MAX_FOCUS} — that's the cap. A season with ten focuses isn't a season.`
              : `${focusIds.length} of ${MAX_FOCUS} dial slots used. Saved automatically.`}
        </p>
      </Card>

      <Card title="What this window has held">
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 6 }}>
          <div><div className="big-stat">{sessions.length}</div><div className="stat-label">sessions</div></div>
          <div><div className="big-stat">{Math.round(minutes / 60 * 10) / 10}</div><div className="stat-label">hours</div></div>
          <div><div className="big-stat">{filmed}</div><div className="stat-label">filmed</div></div>
          <div><div className="big-stat">{edits.length}</div><div className="stat-label">edits</div></div>
          <div><div className="big-stat">{checkins.length}</div><div className="stat-label">check-ins</div></div>
          {gained != null && (
            <div>
              <div className="big-stat" style={{ color: gained > 0 ? 'var(--good)' : undefined }}>
                {gained > 0 ? `+${gained}` : gained}
              </div>
              <div className="stat-label">{state.settings.weightUnit} gained</div>
            </div>
          )}
          {cs.active && <div><div className="big-stat">{cs.day}</div><div className="stat-label">monk day</div></div>}
        </div>
      </Card>

      <Card title="Channel equity">
        <p className="muted" style={{ marginBottom: 12 }}>
          Sessions per channel this window. Equal-ish is the goal, weighted by what matters more.
        </p>
        {[...states].sort((a, b) => b.sessionsThisWindow - a.sessionsThisWindow).map(s => {
          const max = Math.max(1, ...states.map(x => x.sessionsThisWindow))
          return (
            <div key={s.channel.id} className="equity-row">
              <span className="equity-name">{s.channel.name}</span>
              <span className="meter">
                <span className="meter-fill" style={{
                  width: `${Math.max(2, (s.sessionsThisWindow / max) * 100)}%`,
                  background: s.channel.color
                }} />
              </span>
              <span className="equity-val">{s.sessionsThisWindow}</span>
            </div>
          )
        })}
      </Card>

      {win.isReviewDay ? (
        <Card title="Close the window">
          <p className="muted" style={{ marginBottom: 12 }}>
            Sixty days are up. Write it down, then start the next one.
          </p>
          <div className="field">
            <label htmlFor="rv-kept">What did you keep?</label>
            <textarea id="rv-kept" value={review.kept} onChange={e => setReview({ ...review, kept: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="rv-drop">What fell away — and was that right?</label>
            <textarea id="rv-drop" value={review.dropped} onChange={e => setReview({ ...review, dropped: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="rv-next">Intention for the next window</label>
            <textarea id="rv-next" value={review.next} onChange={e => setReview({ ...review, next: e.target.value })} />
          </div>
          <button className="btn btn-accent btn-block" onClick={closeWindow}>
            Close Window {String(win.number).padStart(2, '0')} · start {String(win.number + 1).padStart(2, '0')}
          </button>
          <p className="faint" style={{ marginTop: 10 }}>
            The season dial carries into the next window — re-turn it above if the season is changing.
          </p>
        </Card>
      ) : (
        <Card title="Review">
          <p className="muted">
            The review opens on day {win.days}, which lands on {formatShort(addDays(win.startDate, win.days - 1))}.
            Nothing to do until then except feed the channels.
          </p>
        </Card>
      )}

      {state.windowReviews.length > 0 && (
        <Card title="Past windows">
          {state.windowReviews.map(r => (
            <div key={r.windowNumber} className="row" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="row-label" style={{ fontWeight: 600 }}>
                  Window {String(r.windowNumber).padStart(2, '0')}
                </div>
                <div className="row-sub">closed {formatShort(r.date)}</div>
                {r.kept && <div className="faint">Kept: {r.kept}</div>}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
