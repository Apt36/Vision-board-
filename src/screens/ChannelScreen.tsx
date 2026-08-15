import { useMemo } from 'react'
import { setState, useAppState } from '../store'
import { todayISO, formatShort } from '../logic/date'
import { channelStates, windowState } from '../logic/channels'
import { daysSince } from '../logic/rooms'
import { Card } from '../components/ui'

export default function ChannelScreen({ channelId, openRoom, back }: {
  channelId: string; openRoom: (id: string) => void; back: () => void
}) {
  const state = useAppState()
  const today = todayISO()
  const win = windowState(state, today)
  const cs = useMemo(
    () => channelStates(state, today).find(c => c.channel.id === channelId),
    [state, today, channelId]
  )

  if (!cs) {
    return (
      <div>
        <p className="empty">That channel no longer exists.</p>
        <button className="btn btn-block" onClick={back}>Back to the network</button>
      </div>
    )
  }

  const { channel } = cs
  const sessions = state.roomSessions
    .filter(s => channel.roomIds.includes(s.roomId) && s.date >= win.startDate)
    .slice(0, 10)
  const minutes = state.roomSessions
    .filter(s => channel.roomIds.includes(s.roomId) && s.date >= win.startDate)
    .reduce((n, s) => n + s.minutes, 0)

  const setWeight = (weight: number) =>
    setState(s => ({
      ...s, channels: s.channels.map(c => c.id === channel.id ? { ...c, weight } : c)
    }))

  return (
    <div>
      <button className="btn btn-sm" style={{ marginBottom: 12 }} onClick={back}>← Network</button>

      <div className="brand" style={{ color: channel.color }}>CHANNEL</div>
      <h1 className="screen-title">{channel.name}</h1>
      <p className="screen-sub">{channel.tagline}</p>

      <Card title="This window">
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <div><div className="big-stat">{cs.sessionsThisWindow}</div><div className="stat-label">sessions</div></div>
          <div><div className="big-stat">{Math.round(minutes / 60 * 10) / 10}</div><div className="stat-label">hours</div></div>
          <div>
            <div className="big-stat">{cs.daysSince ?? '—'}</div>
            <div className="stat-label">{cs.daysSince == null ? 'never' : 'days since'}</div>
          </div>
          <div><div className="big-stat">{cs.health}%</div><div className="stat-label">fed</div></div>
        </div>
        <span className="meter" style={{ marginTop: 14 }}>
          <span className="meter-fill" style={{ width: `${Math.max(3, cs.health)}%`, background: channel.color }} />
        </span>
      </Card>

      <Card title="Priority">
        <p className="muted" style={{ marginBottom: 10 }}>
          How often this channel should get a turn. Higher means it comes round sooner —
          currently about every {Math.round(cs.targetGap * 10) / 10} days.
        </p>
        <div className="chip-row">
          {[1, 2, 3, 4, 5].map(w => (
            <button key={w} className={`chip ${channel.weight === w ? 'on' : ''}`} onClick={() => setWeight(w)}>
              {w}
            </button>
          ))}
        </div>
      </Card>

      <Card title={`Rooms (${cs.rooms.length})`}>
        {cs.rooms.map(r => {
          const since = daysSince(r.lastEntered, today)
          return (
            <button key={r.id} className="row" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => openRoom(r.id)}>
              <div>
                <div className="row-label" style={{ fontWeight: 600 }}>
                  {r.name}{r.urgent && <span className="faint"> · pressing</span>}
                </div>
                <div className="row-sub">{r.nextAction || r.intention.slice(0, 60)}</div>
                <div className="faint">
                  {since == null ? 'Not entered yet' : since === 0 ? 'Entered today' : `${since}d ago`}
                </div>
              </div>
              <span className="faint">›</span>
            </button>
          )
        })}
      </Card>

      {sessions.length > 0 && (
        <Card title="Recent sessions">
          {sessions.map(s => {
            const room = state.rooms.find(r => r.id === s.roomId)
            return (
              <div key={s.id} className="row">
                <div>
                  <div className="row-label">{s.note || room?.name}</div>
                  <div className="row-sub">
                    {room?.name} · {formatShort(s.date)} · {s.minutes} min{s.filmed ? ' · filmed' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
