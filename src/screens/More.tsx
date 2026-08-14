import { useAppState } from '../store'
import { todayISO } from '../logic/date'
import { computeAttention } from '../logic/attention'
import { Card, RadarBars } from '../components/ui'
import type { Route } from '../App'

const SECTIONS: { route: Route; label: string; sub: string }[] = [
  { route: 'body', label: 'Body', sub: 'Weight, meals, exercise, sleep' },
  { route: 'career', label: 'Career', sub: 'Job, applications, real estate' },
  { route: 'french', label: 'French', sub: 'Streak, minutes, exposure' },
  { route: 'money', label: 'Money', sub: 'Savings, targets, extra income' },
  { route: 'creative', label: 'Creative', sub: 'Footage, clips, content' },
  { route: 'mind', label: 'Mind', sub: 'Therapy, reading, reflection' },
  { route: 'routines', label: 'Routines', sub: 'Core anchors' },
  { route: 'settings', label: 'Settings', sub: 'Schedule, domains, data' }
]

export default function More({ go }: { go: (r: Route) => void }) {
  const state = useAppState()
  const attention = computeAttention(state, todayISO())

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
              <div className="row-sub">{s.sub}</div>
            </div>
            <span className="faint">›</span>
          </button>
        ))}
      </Card>
    </div>
  )
}
