import { useEffect, useState } from 'react'
import Today from './screens/Today'
import CheckIn from './screens/CheckIn'
import Goals from './screens/Goals'
import Week from './screens/Week'
import More from './screens/More'
import Body from './screens/Body'
import Career from './screens/Career'
import French from './screens/French'
import Money from './screens/Money'
import Creative from './screens/Creative'
import Mind from './screens/Mind'
import Routines from './screens/Routines'
import Settings from './screens/Settings'

export type Route =
  | 'today' | 'checkin' | 'goals' | 'week' | 'more'
  | 'body' | 'career' | 'french' | 'money' | 'creative' | 'mind' | 'routines' | 'settings'

const ROUTES: Route[] = ['today', 'checkin', 'goals', 'week', 'more', 'body', 'career', 'french', 'money', 'creative', 'mind', 'routines', 'settings']

function routeFromHash(): Route {
  const h = window.location.hash.replace('#/', '').replace('#', '') as Route
  return ROUTES.includes(h) ? h : 'today'
}

const TABS: { route: Route; label: string; icon: JSX.Element }[] = [
  {
    route: 'today', label: 'Today',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>
  },
  {
    route: 'checkin', label: 'Check-In',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  },
  {
    route: 'goals', label: 'Goals',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></svg>
  },
  {
    route: 'week', label: 'Week',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M8 3v4M16 3v4" strokeLinecap="round" /></svg>
  },
  {
    route: 'more', label: 'Life',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="18" r="2.4" /></svg>
  }
]

const SUBSCREEN_PARENT: Partial<Record<Route, Route>> = {
  body: 'more', career: 'more', french: 'more', money: 'more',
  creative: 'more', mind: 'more', routines: 'more', settings: 'more'
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = `/${r}`
    setRoute(r)
    window.scrollTo(0, 0)
  }

  const screens: Record<Route, JSX.Element> = {
    today: <Today go={go} />,
    checkin: <CheckIn />,
    goals: <Goals />,
    week: <Week />,
    more: <More go={go} />,
    body: <Body />,
    career: <Career />,
    french: <French />,
    money: <Money />,
    creative: <Creative />,
    mind: <Mind />,
    routines: <Routines />,
    settings: <Settings />
  }

  const activeTab = SUBSCREEN_PARENT[route] ?? route

  return (
    <>
      <main className="app">
        {SUBSCREEN_PARENT[route] && (
          <button className="btn btn-sm" style={{ marginBottom: 12 }} onClick={() => go('more')}>
            ← Life
          </button>
        )}
        {screens[route]}
      </main>
      <nav className="nav" aria-label="Main navigation">
        <div className="nav-inner">
          {TABS.map(t => (
            <button
              key={t.route}
              className={activeTab === t.route ? 'active' : ''}
              aria-current={activeTab === t.route ? 'page' : undefined}
              onClick={() => go(t.route)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
