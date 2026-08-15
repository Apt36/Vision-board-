import { useMemo, useState } from 'react'
import { setState, uid, useAppState } from '../store'
import { todayISO } from '../logic/date'
import { rankRooms, nextRoomDue, daysSince } from '../logic/rooms'
import { Card, Sheet } from '../components/ui'
import type { Cadence, Room } from '../types'

const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks',
  monthly: 'Monthly', 'as-needed': 'As needed'
}

export default function Rooms({ open }: { open: (roomId: string) => void }) {
  const state = useAppState()
  const today = todayISO()
  const [filter, setFilter] = useState<'due' | 'all' | 'maintenance'>('due')
  const [adding, setAdding] = useState(false)

  const ranked = useMemo(() => rankRooms(state, today), [state, today])
  const shown = filter === 'due' ? ranked.filter(c => c.overdue >= 1 || c.room.urgent)
    : filter === 'all' ? ranked
    : []
  const maintenance = state.rooms.filter(r => r.status !== 'active')

  return (
    <div>
      <div className="brand">ROOMS</div>
      <h1 className="screen-title">Where are you going today?</h1>
      <p className="screen-sub">
        Each room is one thing, with its own reason for existing. Enter one. Give it your attention. Leave.
      </p>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        <button className={`chip ${filter === 'due' ? 'on' : ''}`} onClick={() => setFilter('due')}>
          Needs a turn ({ranked.filter(c => c.overdue >= 1 || c.room.urgent).length})
        </button>
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          All ({ranked.length})
        </button>
        <button className={`chip ${filter === 'maintenance' ? 'on' : ''}`} onClick={() => setFilter('maintenance')}>
          Maintenance ({maintenance.length})
        </button>
      </div>

      {filter === 'maintenance' ? (
        <Card>
          {maintenance.length === 0 && <p className="empty">Nothing in maintenance mode.</p>}
          {maintenance.map(r => (
            <button key={r.id} className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => open(r.id)}>
              <div>
                <div className="row-label" style={{ fontWeight: 600 }}>{r.name}</div>
                <div className="row-sub">{r.intention.slice(0, 70)}…</div>
              </div>
              <span className="faint">›</span>
            </button>
          ))}
        </Card>
      ) : (
        <div className="room-grid">
          {shown.map(c => {
            const domain = state.domains.find(d => d.id === c.room.domainId)
            const since = daysSince(c.room.lastEntered, today)
            const due = nextRoomDue(c)
            return (
              <button key={c.room.id} className="room-card" onClick={() => open(c.room.id)}>
                <span className="room-dot" style={{ background: domain?.color }} />
                <span className="room-name">{c.room.name}</span>
                <span className="room-meta">
                  {since === 0 ? 'Entered today' : since == null ? 'Not entered yet' : `${since}d ago`}
                </span>
                <span className={`room-badge ${c.room.urgent ? 'urgent' : due === 'Overdue' ? 'over' : due === 'Due' ? 'due' : ''}`}>
                  {c.room.urgent ? 'PRESSING' : due === 'On track' ? CADENCE_LABEL[c.room.cadence] : due.toUpperCase()}
                </span>
              </button>
            )
          })}
          {shown.length === 0 && (
            <p className="empty" style={{ gridColumn: '1 / -1' }}>
              Every room has had its turn recently. That's the whole point — nothing is starving.
            </p>
          )}
        </div>
      )}

      <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>
        + New room
      </button>

      {adding && <RoomEditor onClose={() => setAdding(false)} />}
    </div>
  )
}

function RoomEditor({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const [r, setR] = useState<Omit<Room, 'createdAt' | 'lastEntered'>>({
    id: uid(), name: '', domainId: 'projects', intention: '', cadence: 'weekly',
    status: 'active', urgent: false, nextAction: '', feature: null
  })

  const save = () => {
    setState(s => ({
      ...s,
      rooms: [...s.rooms, { ...r, lastEntered: null, createdAt: new Date().toISOString() }]
    }))
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2>New room</h2>
      <div className="section-gap" />
      <div className="field">
        <label htmlFor="r-name">Name</label>
        <input id="r-name" value={r.name} onChange={e => setR({ ...r, name: e.target.value })} placeholder="e.g. Cooking" />
      </div>
      <div className="field">
        <label htmlFor="r-intent">Why does this room exist?</label>
        <textarea id="r-intent" value={r.intention} onChange={e => setR({ ...r, intention: e.target.value })}
          placeholder="The thing you'll want to remember when you walk in tired." />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="r-domain">Domain</label>
          <select id="r-domain" value={r.domainId} onChange={e => setR({ ...r, domainId: e.target.value })}>
            {state.domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-cadence">How often</label>
          <select id="r-cadence" value={r.cadence} onChange={e => setR({ ...r, cadence: e.target.value as Cadence })}>
            {Object.entries(CADENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="r-next">Next action</label>
        <input id="r-next" value={r.nextAction} onChange={e => setR({ ...r, nextAction: e.target.value })} />
      </div>
      <div className="grid-2">
        <button className="btn btn-accent" disabled={!r.name.trim()} onClick={save}>Create</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  )
}
