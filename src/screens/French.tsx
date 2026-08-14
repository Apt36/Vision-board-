import { useMemo } from 'react'
import { useAppState } from '../store'
import { todayISO, lastNDays, formatShort } from '../logic/date'
import { frenchStreak, weekStats } from '../logic/week'
import { Card } from '../components/ui'
import type { FrenchType } from '../types'

const TYPE_LABEL: Record<FrenchType, string> = {
  duolingo: 'Duolingo', listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing'
}

export default function French() {
  const state = useAppState()
  const today = todayISO()
  const streak = frenchStreak(state, today)
  const stats = weekStats(state, today)

  const last30 = useMemo(() => {
    const days = lastNDays(30, today)
    const entries = days
      .map(d => ({ date: d, c: state.checkins[d] }))
      .filter(x => x.c?.french.practiced)
    const minutes = entries.reduce((s, x) => s + (x.c!.french.minutes || 0), 0)
    const typeCounts: Partial<Record<FrenchType, number>> = {}
    for (const x of entries)
      for (const t of x.c!.french.types)
        typeCounts[t] = (typeCounts[t] || 0) + 1
    return { daysPracticed: entries.length, minutes, typeCounts, entries: entries.reverse().slice(0, 14) }
  }, [state.checkins, today])

  const realExposure = (last30.typeCounts.listening || 0) + (last30.typeCounts.speaking || 0) + (last30.typeCounts.reading || 0) + (last30.typeCounts.writing || 0)
  const duoOnly = (last30.typeCounts.duolingo || 0) > 0 && realExposure === 0 && last30.daysPracticed >= 3

  return (
    <div>
      <div className="brand">FRENCH</div>
      <h1 className="screen-title">Petit à petit</h1>
      <p className="screen-sub">Consistency over intensity. Log practice in the daily check-in.</p>

      <Card title="Right now">
        <div style={{ display: 'flex', gap: 24 }}>
          <div><div className="big-stat">{streak}</div><div className="stat-label">day streak</div></div>
          <div><div className="big-stat">{stats.frenchDays}</div><div className="stat-label">days this week</div></div>
          <div><div className="big-stat">{last30.minutes}</div><div className="stat-label">min / 30 days</div></div>
        </div>
      </Card>

      <Card title="Practice mix (30 days)">
        {last30.daysPracticed === 0 ? (
          <p className="empty">Nothing logged yet. Even 10 minutes on the bus counts — log it in the check-in.</p>
        ) : (
          <>
            {(Object.keys(TYPE_LABEL) as FrenchType[]).map(t => (
              <div key={t} className="row">
                <span className="row-label">{TYPE_LABEL[t]}</span>
                <span className="row-sub">{last30.typeCounts[t] || 0} day{(last30.typeCounts[t] || 0) === 1 ? '' : 's'}</span>
              </div>
            ))}
            {duoOnly && (
              <p className="note-quote" style={{ marginTop: 12 }}>
                It's all Duolingo lately. Add some real exposure — a French podcast on the commute, or reading a few paragraphs.
              </p>
            )}
          </>
        )}
      </Card>

      {last30.entries.length > 0 && (
        <Card title="Recent sessions">
          {last30.entries.map(x => (
            <div key={x.date} className="row">
              <div>
                <div className="row-label">{formatShort(x.date)}</div>
                <div className="row-sub">{x.c!.french.types.map(t => TYPE_LABEL[t]).join(', ') || 'Practice'}</div>
              </div>
              <span className="row-sub">{x.c!.french.minutes ? `${x.c!.french.minutes} min` : '✓'}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
