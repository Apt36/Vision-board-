import { useEffect, useState } from 'react'
import Today from './screens/Today'
import CheckIn from './screens/CheckIn'
import Rooms from './screens/Rooms'
import RoomScreen from './screens/Room'
import Capture from './screens/Capture'
import Week from './screens/Week'
import More from './screens/More'
import Monk from './screens/Monk'
import Collections from './screens/Collections'
import Wishlist from './screens/Wishlist'
import Body from './screens/Body'
import Career from './screens/Career'
import French from './screens/French'
import Money from './screens/Money'
import Mind from './screens/Mind'
import Routines from './screens/Routines'
import Settings from './screens/Settings'

export type Route =
  | 'today' | 'rooms' | 'capture' | 'week' | 'more' | 'checkin'
  | 'monk' | 'collections' | 'wishlist'
  | 'body' | 'career' | 'french' | 'money' | 'mind' | 'routines' | 'settings'

const ROUTES: Route[] = [
  'today', 'rooms', 'capture', 'week', 'more', 'checkin',
  'monk', 'collections', 'wishlist',
  'body', 'career', 'french', 'money', 'mind', 'routines', 'settings'
]

interface Loc { route: Route; roomId: string | null }

function parseHash(): Loc {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [head, param] = raw.split('/')
  if (head === 'room' && param) return { route: 'rooms', roomId: decodeURIComponent(param) }
  return { route: (ROUTES as string[]).includes(head) ? (head as Route) : 'today', roomId: null }
}

const TABS: { route: Route; label: string; icon: JSX.Element }[] = [
  {
    route: 'today', label: 'Today',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>
  },
  {
    route: 'rooms', label: 'Rooms',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>
  },
  {
    route: 'capture', label: 'Capture',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2.5" y="6.5" width="13" height="11" rx="3" /><path d="M15.5 11l5-3v8l-5-3z" strokeLinejoin="round" /></svg>
  },
  {
    route: 'week', label: 'Week',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M8 3v4M16 3v4" strokeLinecap="round" /></svg>
  },
  {
    route: 'more', label: 'Life',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3z" strokeLinejoin="round" /></svg>
  }
]

const SUBSCREEN_PARENT: Partial<Record<Route, Route>> = {
  monk: 'more', collections: 'more', wishlist: 'more', body: 'more', career: 'more',
  french: 'more', money: 'more', mind: 'more', routines: 'more', settings: 'more',
  checkin: 'today'
}

export default function App() {
  const [loc, setLoc] = useState<Loc>(parseHash)

  useEffect(() => {
    const onHash = () => setLoc(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (hash: string) => {
    window.location.hash = hash
    setLoc(parseHash())
    window.scrollTo(0, 0)
  }
  const go = (r: Route) => navigate(`/${r}`)
  const openRoom = (id: string) => navigate(`/room/${encodeURIComponent(id)}`)

  let screen: JSX.Element
  if (loc.roomId) {
    screen = <RoomScreen roomId={loc.roomId} go={go} back={() => go('rooms')} />
  } else {
    const screens: Record<Route, JSX.Element> = {
      today: <Today go={go} openRoom={openRoom} />,
      rooms: <Rooms open={openRoom} />,
      capture: <Capture />,
      week: <Week />,
      more: <More go={go} />,
      checkin: <CheckIn />,
      monk: <Monk />,
      collections: <Collections />,
      wishlist: <Wishlist />,
      body: <Body />,
      career: <Career />,
      french: <French />,
      money: <Money />,
      mind: <Mind />,
      routines: <Routines />,
      settings: <Settings />
    }
    screen = screens[loc.route]
  }

  const activeTab = loc.roomId ? 'rooms' : (SUBSCREEN_PARENT[loc.route] ?? loc.route)
  const parent = !loc.roomId ? SUBSCREEN_PARENT[loc.route] : undefined

  return (
    <>
      <main className="app">
        {parent && (
          <button className="btn btn-sm" style={{ marginBottom: 12 }} onClick={() => go(parent)}>
            ← {parent === 'today' ? 'Today' : 'Life'}
          </button>
        )}
        {screen}
      </main>
      <nav className="nav" aria-label="Main navigation">
        <div className="nav-inner">
          {TABS.map(t => (
            <button key={t.route}
              className={activeTab === t.route ? 'active' : ''}
              aria-current={activeTab === t.route ? 'page' : undefined}
              onClick={() => go(t.route)}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
