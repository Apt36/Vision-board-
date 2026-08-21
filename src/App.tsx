import { useEffect, useState } from 'react'
import Today from './screens/Today'
import Journey from './screens/Journey'
import CheckIn from './screens/CheckIn'
import Rooms from './screens/Rooms'
import Network from './screens/Network'
import ChannelScreen from './screens/ChannelScreen'
import WindowScreen from './screens/WindowScreen'
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
  | 'today' | 'journey' | 'network' | 'rooms' | 'capture' | 'week' | 'more' | 'checkin' | 'window'
  | 'monk' | 'collections' | 'wishlist'
  | 'body' | 'career' | 'french' | 'money' | 'mind' | 'routines' | 'settings'

const ROUTES: Route[] = [
  'today', 'journey', 'network', 'rooms', 'capture', 'week', 'more', 'checkin', 'window',
  'monk', 'collections', 'wishlist',
  'body', 'career', 'french', 'money', 'mind', 'routines', 'settings'
]

interface Loc { route: Route; roomId: string | null; channelId: string | null }

function parseHash(): Loc {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [head, param] = raw.split('/')
  if (head === 'room' && param) return { route: 'rooms', roomId: decodeURIComponent(param), channelId: null }
  if (head === 'channel' && param) return { route: 'network', roomId: null, channelId: decodeURIComponent(param) }
  return { route: (ROUTES as string[]).includes(head) ? (head as Route) : 'today', roomId: null, channelId: null }
}

const TABS: { route: Route; label: string; icon: JSX.Element }[] = [
  {
    route: 'today', label: 'Today',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11.5L12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 10v9.5h12V10" strokeLinecap="round" strokeLinejoin="round" /></svg>
  },
  {
    route: 'journey', label: 'Journey',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19l4.5-6 4 3.5L20 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M15.5 6H20v4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  },
  {
    route: 'network', label: 'Board',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>
  },
  {
    route: 'more', label: 'You',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1.6-3.2 4.3-4.8 7.5-4.8s5.9 1.6 7.5 4.8" strokeLinecap="round" /></svg>
  }
]

const SUBSCREEN_PARENT: Partial<Record<Route, Route>> = {
  monk: 'journey', collections: 'more', wishlist: 'more', body: 'more', career: 'more',
  french: 'more', money: 'more', mind: 'more', routines: 'more', settings: 'more',
  capture: 'more', week: 'journey',
  checkin: 'today', window: 'journey', rooms: 'network'
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
  const openChannel = (id: string) => navigate(`/channel/${encodeURIComponent(id)}`)

  let screen: JSX.Element
  if (loc.roomId) {
    screen = <RoomScreen roomId={loc.roomId} go={go} back={() => go('rooms')} />
  } else if (loc.channelId) {
    screen = <ChannelScreen channelId={loc.channelId} openRoom={openRoom} back={() => go('network')} />
  } else {
    const screens: Record<Route, JSX.Element> = {
      today: <Today go={go} openRoom={openRoom} />,
      journey: <Journey go={go} />,
      network: <Network openChannel={openChannel} />,
      rooms: <Rooms open={openRoom} />,
      window: <WindowScreen />,
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

  const activeTab = (loc.roomId || loc.channelId) ? 'network' : (SUBSCREEN_PARENT[loc.route] ?? loc.route)
  const parent = (!loc.roomId && !loc.channelId) ? SUBSCREEN_PARENT[loc.route] : undefined

  return (
    <>
      <main className="app">
        {parent && (
          <button className="btn btn-sm" style={{ marginBottom: 12 }} onClick={() => go(parent)}>
            ← {parent === 'today' ? 'Today' : parent === 'journey' ? 'Journey' : parent === 'network' ? 'Board' : 'You'}
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
