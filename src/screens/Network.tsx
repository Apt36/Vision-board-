import { useMemo } from 'react'
import { useAppState } from '../store'
import { todayISO } from '../logic/date'
import { channelStates, starvedFirst } from '../logic/channels'
import { channelEmoji, friendlyName, weekCoverage } from '../logic/plan'

export default function Network({ openChannel }: { openChannel: (id: string) => void }) {
  const state = useAppState()
  const today = todayISO()
  const states = useMemo(() => channelStates(state, today), [state, today])
  const coverage = useMemo(() => weekCoverage(state, today), [state, today])
  const ordered = starvedFirst(states)
  const touched = coverage.filter(c => c.touched).length
  const focusId = state.assignments[today]?.channelId ?? null

  return (
    <div>
      <div className="brand">YOUR BOARD</div>
      <h1 className="screen-title">Your vision board</h1>
      <p className="screen-sub">
        Eight areas of your life. Your daily plan focuses on whichever has waited longest —
        so over a week, everything here gets its turn. You never have to do it all in one day.
      </p>

      <div className="board-summary">
        <strong>{touched} of {coverage.length}</strong> areas visited this week
      </div>

      {ordered.map(s => {
        const isFocus = s.channel.id === focusId
        const label = s.daysSince == null ? 'Not visited yet'
          : s.daysSince === 0 ? 'Visited today ✓'
          : `Last visit ${s.daysSince} day${s.daysSince === 1 ? '' : 's'} ago`
        const waiting = s.pressure >= 1
        return (
          <button key={s.channel.id} className="channel-card" onClick={() => openChannel(s.channel.id)}>
            <span className="channel-stripe" style={{ background: s.channel.color }} />
            <span className="channel-body">
              <span className="channel-head">
                <span className="channel-name">
                  {channelEmoji(s.channel.id)} {friendlyName(s.channel.name)}
                </span>
                <span className={`channel-state ${isFocus ? 'focus' : waiting ? 'owed' : ''}`}>
                  {isFocus ? "TODAY'S FOCUS" : waiting ? 'UP SOON' : 'DOING GREAT'}
                </span>
              </span>
              <span className="channel-tag">{s.channel.tagline}</span>
              <span className="meter">
                <span className="meter-fill" style={{
                  width: `${Math.max(3, s.health)}%`, background: s.channel.color
                }} />
              </span>
              <span className="channel-meta">
                {label} · {s.rooms.length} goal{s.rooms.length === 1 ? '' : 's'} inside
              </span>
            </span>
          </button>
        )
      })}

      <p className="faint" style={{ textAlign: 'center', marginTop: 6 }}>
        The bar shows how recently an area got attention — it refills every time you visit.
      </p>
    </div>
  )
}
