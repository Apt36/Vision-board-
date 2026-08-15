import { useMemo } from 'react'
import { useAppState } from '../store'
import { todayISO } from '../logic/date'
import { channelStates, networkBalance, starvedFirst, windowState } from '../logic/channels'
import { Card } from '../components/ui'

export default function Network({ openChannel }: { openChannel: (id: string) => void }) {
  const state = useAppState()
  const today = todayISO()
  const states = useMemo(() => channelStates(state, today), [state, today])
  const win = windowState(state, today)
  const balance = networkBalance(states)
  const ordered = starvedFirst(states)

  return (
    <div>
      <div className="brand">THE NETWORK</div>
      <h1 className="screen-title">Eight channels. One you.</h1>
      <p className="screen-sub">
        Nothing here competes for all of your attention — each one just needs its turn.
      </p>

      <Card title={`Window ${String(win.number).padStart(2, '0')} · Day ${win.day} of ${win.days}`}>
        <div className="capacity-bar" style={{ height: 10, marginTop: 0 }}>
          <div style={{ width: `${win.percent}%`, background: 'var(--accent)' }} />
        </div>
        <p className="faint" style={{ marginTop: 8 }}>{win.daysLeft} days left in this window</p>
      </Card>

      <Card title="Balance">
        <p className="steering">{balance.note}</p>
      </Card>

      <div className="card-title" style={{ marginLeft: 2 }}>Channels · most starved first</div>
      {ordered.map(s => {
        const state_ = s
        const label = s.daysSince == null ? 'No turn yet'
          : s.daysSince === 0 ? 'Fed today'
          : `${s.daysSince}d since a turn`
        const owed = s.pressure >= 1
        return (
          <button key={s.channel.id} className="channel-card" onClick={() => openChannel(s.channel.id)}>
            <span className="channel-stripe" style={{ background: s.channel.color }} />
            <span className="channel-body">
              <span className="channel-head">
                <span className="channel-name">{s.channel.name}</span>
                <span className={`channel-state ${owed ? 'owed' : ''}`}>
                  {owed ? 'NEEDS A TURN' : 'FED'}
                </span>
              </span>
              <span className="channel-tag">{s.channel.tagline}</span>
              <span className="meter">
                <span className="meter-fill" style={{
                  width: `${Math.max(3, state_.health)}%`, background: s.channel.color
                }} />
              </span>
              <span className="channel-meta">
                {label} · {s.sessionsThisWindow} session{s.sessionsThisWindow === 1 ? '' : 's'} this window · {s.rooms.length} room{s.rooms.length === 1 ? '' : 's'}
              </span>
            </span>
          </button>
        )
      })}

      <p className="faint" style={{ textAlign: 'center', marginTop: 6 }}>
        The bar is how well-fed a channel is, not how well you performed.
      </p>
    </div>
  )
}
