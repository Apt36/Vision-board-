import { useAppState } from '../store'
import { todayISO } from '../logic/date'
import { computeAttention } from '../logic/attention'
import { challengeState } from '../logic/streaks'
import { Card, RadarBars } from '../components/ui'
import type { Route } from '../App'

const SECTIONS: { route: Route; label: string; sub: string }[] = [
  { route: 'monk', label: 'Monk', sub: '60 days, no vices' },
  { route: 'body', label: 'Body', sub: 'Weight, meals, pushups, sleep' },
  { route: 'collections', label: 'Collections', sub: 'Art, vinyl, library' },
  { route: 'wishlist', label: 'Want list', sub: 'Tools, restraint, saving up' },
  { route: 'career', label: 'Career', sub: 'Licence, applications, rentals' },
  { route: 'french', label: 'French', sub: 'Streak, minutes, exposure' },
  { route: 'money', label: 'Money', sub: 'Savings, targets, extra income' },
  { route: 'mind', label: 'Mind', sub: 'Therapy, reading, reflection' },
  { route: 'routines', label: 'Routines', sub: 'Core anchors' },
  { route: 'settings', label: 'Settings', sub: 'Schedule, anchors, domains, data' }
]

export default function More({ go }: { go: (r: Route) => void }) {
  const state = useAppState()
  const today = todayISO()
  const attention = computeAttention(state, today)
  const cs = challengeState(state, today)

  return (
    <div>
      <div className="brand">LIFE</div>
      <h1 className="screen-title">All of it</h1>
      <p className="screen-sub">Work is important. But work is not the project. You are the project.</p>

      <Card title="Life Radar">
        <RadarBars items={attention} />
        <p className="faint" style={{ marginTop: 10 }}>Recent attention, not performance.</p>
      </Card>

      <Card>
        {SECTIONS.map(s => (
          <button key={s.route} className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => go(s.route)}>
            <div>
              <div className="row-label" style={{ fontWeight: 600 }}>{s.label}</div>
              <div className="row-sub">
                {s.route === 'monk' && cs.active ? `Day ${cs.day} of ${cs.targetDays}` : s.sub}
              </div>
            </div>
            <span className="faint">›</span>
          </button>
        ))}
      </Card>
    </div>
  )
}
