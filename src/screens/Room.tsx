import { useState } from 'react'
import { enterRoom, setState, uid, useAppState } from '../store'
import { todayISO, formatShort } from '../logic/date'
import { daysSince, roomSessionStats } from '../logic/rooms'
import { Card, Sheet, Stepper, Switch } from '../components/ui'
import type { RoomCapture, RoomStatus } from '../types'
import type { Route } from '../App'

const FEATURE_ROUTE: Record<string, { route: Route; label: string }> = {
  body: { route: 'body', label: 'Open Body' },
  french: { route: 'french', label: 'Open French' },
  content: { route: 'capture', label: 'Open Capture' },
  library: { route: 'collections', label: 'Open Library' },
  art: { route: 'collections', label: 'Open Art collection' },
  vinyl: { route: 'collections', label: 'Open Vinyl collection' },
  money: { route: 'money', label: 'Open Money' },
  wishlist: { route: 'wishlist', label: 'Open Wishlist' },
  career: { route: 'career', label: 'Open Career' },
  therapy: { route: 'mind', label: 'Open Mind & Therapy' },
  monk: { route: 'monk', label: 'Open Monk mode' }
}

export default function Room({ roomId, go, back }: {
  roomId: string; go: (r: Route) => void; back: () => void
}) {
  const state = useAppState()
  const today = todayISO()
  const room = state.rooms.find(r => r.id === roomId)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [minutes, setMinutes] = useState(20)
  const [note, setNote] = useState('')
  const [filmed, setFilmed] = useState(false)
  const [captureText, setCaptureText] = useState('')
  const [captureKind, setCaptureKind] = useState<RoomCapture['kind']>('idea')
  const [editingNext, setEditingNext] = useState(false)
  const [nextDraft, setNextDraft] = useState('')

  if (!room) {
    return (
      <div>
        <p className="empty">This room no longer exists.</p>
        <button className="btn btn-block" onClick={back}>Back to rooms</button>
      </div>
    )
  }

  const domain = state.domains.find(d => d.id === room.domainId)
  const stats = roomSessionStats(state, room.id)
  const since = daysSince(room.lastEntered, today)
  const captures = state.roomCaptures.filter(c => c.roomId === room.id && !c.done)
  const footage = state.content.filter(c => c.roomId === room.id)
  const feature = room.feature ? FEATURE_ROUTE[room.feature] : null

  const commit = () => {
    enterRoom(room.id, minutes, note, filmed)
    setSessionOpen(false); setNote(''); setFilmed(false); setMinutes(20)
  }

  const addCapture = () => {
    if (!captureText.trim()) return
    const c: RoomCapture = {
      id: uid(), roomId: room.id, kind: captureKind, text: captureText.trim(), date: today, done: false
    }
    setState(s => ({ ...s, roomCaptures: [c, ...s.roomCaptures] }))
    setCaptureText('')
  }

  const saveNext = () => {
    setState(s => ({ ...s, rooms: s.rooms.map(r => r.id === room.id ? { ...r, nextAction: nextDraft } : r) }))
    setEditingNext(false)
  }

  const setStatus = (status: RoomStatus) => {
    setState(s => ({ ...s, rooms: s.rooms.map(r => r.id === room.id ? { ...r, status } : r) }))
  }

  return (
    <div>
      <button className="btn btn-sm" style={{ marginBottom: 12 }} onClick={back}>← Rooms</button>

      <div className="brand" style={{ color: domain?.color }}>{domain?.name?.toUpperCase()}</div>
      <h1 className="screen-title">{room.name}</h1>
      {room.urgent && <span className="pill pill-work" style={{ marginTop: 6 }}>PRESSING</span>}
      {room.status === 'maintenance' && <span className="pill pill-dim" style={{ marginTop: 6 }}>MAINTENANCE MODE</span>}

      <Card className="room-intention">
        <p className="steering" style={{ color: 'var(--text)' }}>{room.intention}</p>
      </Card>

      <Card title="Next action">
        {editingNext ? (
          <>
            <textarea value={nextDraft} onChange={e => setNextDraft(e.target.value)} />
            <div className="grid-2" style={{ marginTop: 8 }}>
              <button className="btn btn-accent" onClick={saveNext}>Save</button>
              <button className="btn" onClick={() => setEditingNext(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div className="row" style={{ borderTop: 'none' }}>
            <span className="row-label">{room.nextAction || 'Nothing set.'}</span>
            <button className="btn btn-sm" onClick={() => { setNextDraft(room.nextAction); setEditingNext(true) }}>
              Edit
            </button>
          </div>
        )}
      </Card>

      <button className="big-btn" onClick={() => setSessionOpen(true)}>
        {since === 0 ? 'LOG ANOTHER SESSION' : 'ENTER THIS ROOM'}
      </button>

      <Card title="This room so far">
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <div><div className="big-stat">{stats.count}</div><div className="stat-label">sessions</div></div>
          <div><div className="big-stat">{Math.round(stats.minutes / 60 * 10) / 10}</div><div className="stat-label">hours</div></div>
          <div><div className="big-stat">{stats.filmed}</div><div className="stat-label">filmed</div></div>
          <div>
            <div className="big-stat">{since == null ? '—' : since}</div>
            <div className="stat-label">{since == null ? 'never' : 'days since'}</div>
          </div>
        </div>
      </Card>

      {feature && (
        <button className="btn btn-block" style={{ marginBottom: 14 }} onClick={() => go(feature.route)}>
          {feature.label} →
        </button>
      )}

      <Card title="Capture">
        <p className="muted" style={{ marginBottom: 10 }}>
          Ideas and blockers for this room only. Get them out of your head.
        </p>
        <div className="chip-row" style={{ marginBottom: 8 }}>
          {(['idea', 'blocker', 'note'] as const).map(k => (
            <button key={k} className={`chip ${captureKind === k ? 'on' : ''}`} onClick={() => setCaptureKind(k)}>{k}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder={`New ${captureKind}…`} value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCapture()} />
          <button className="btn" onClick={addCapture} disabled={!captureText.trim()}>Add</button>
        </div>
        {captures.map(c => (
          <div key={c.id} className="row">
            <div>
              <div className="row-label">{c.text}</div>
              <div className="row-sub">{c.kind} · {formatShort(c.date)}</div>
            </div>
            <button className="btn btn-sm" aria-label={`Clear ${c.text}`}
              onClick={() => setState(s => ({
                ...s, roomCaptures: s.roomCaptures.map(x => x.id === c.id ? { ...x, done: true } : x)
              }))}>✓</button>
          </div>
        ))}
      </Card>

      {footage.length > 0 && (
        <Card title={`Footage from this room (${footage.length})`}>
          {footage.slice(0, 8).map(f => (
            <div key={f.id} className="row">
              <span className="row-label">{f.title}</span>
              <span className="row-sub">{f.editId ? 'used' : 'unedited'} · {formatShort(f.date)}</span>
            </div>
          ))}
        </Card>
      )}

      {stats.sessions.length > 0 && (
        <Card title="Sessions">
          {stats.sessions.slice(0, 12).map(s => (
            <div key={s.id} className="row">
              <div>
                <div className="row-label">{s.note || 'Session'}</div>
                <div className="row-sub">{formatShort(s.date)} · {s.minutes} min{s.filmed ? ' · filmed' : ''}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title="Room settings">
        <div className="row" style={{ borderTop: 'none' }}>
          <div>
            <div className="row-label">Maintenance mode</div>
            <div className="row-sub">Stops this room asking for turns</div>
          </div>
          <Switch on={room.status === 'maintenance'} label="Maintenance mode"
            onChange={v => setStatus(v ? 'maintenance' : 'active')} />
        </div>
        <div className="row">
          <div>
            <div className="row-label">Pressing</div>
            <div className="row-sub">Surface this harder than everything else</div>
          </div>
          <Switch on={room.urgent} label="Pressing"
            onChange={v => setState(s => ({ ...s, rooms: s.rooms.map(r => r.id === room.id ? { ...r, urgent: v } : r) }))} />
        </div>
      </Card>

      {sessionOpen && (
        <Sheet onClose={() => setSessionOpen(false)}>
          <h2>{room.name}</h2>
          <p className="muted" style={{ margin: '6px 0 14px' }}>What happened in here?</p>
          <div className="field">
            <label>Minutes</label>
            <Stepper value={minutes} min={5} max={240} step={5} onChange={setMinutes} format={v => `${v}m`} />
          </div>
          <div className="field">
            <label htmlFor="s-note">Note</label>
            <textarea id="s-note" value={note} onChange={e => setNote(e.target.value)}
              placeholder="What you did, what you noticed." />
          </div>
          <div className="row" style={{ borderTop: 'none' }}>
            <div>
              <div className="row-label">Filmed it</div>
              <div className="row-sub">Adds footage to the edit queue</div>
            </div>
            <Switch on={filmed} onChange={setFilmed} label="Filmed it" />
          </div>
          <div className="grid-2" style={{ marginTop: 14 }}>
            <button className="btn btn-accent" onClick={commit}>Log session</button>
            <button className="btn" onClick={() => setSessionOpen(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
