import { useState } from 'react'
import { setState, uid, updateSettings, useAppState } from '../store'
import { todayISO, formatShort, fromISO } from '../logic/date'
import { Card, Sheet, Switch } from '../components/ui'
import type { WishlistItem } from '../types'

function daysHeld(item: WishlistItem, today: string): number {
  return Math.max(0, Math.round((fromISO(today).getTime() - fromISO(item.addedAt).getTime()) / 86400000))
}

export default function Wishlist() {
  const state = useAppState()
  const today = todayISO()
  const [adding, setAdding] = useState(false)
  const minimal = state.settings.money.minimalSpendMonth

  const waiting = state.wishlist.filter(w => w.status === 'waiting' || w.status === 'ready')
  const settled = state.wishlist.filter(w => w.status === 'bought' || w.status === 'released')

  const patch = (id: string, p: Partial<WishlistItem>) =>
    setState(s => ({ ...s, wishlist: s.wishlist.map(w => w.id === id ? { ...w, ...p } : w) }))

  return (
    <div>
      <div className="brand">WANT LIST</div>
      <h1 className="screen-title">Tools can wait</h1>
      <p className="screen-sub">
        Tools motivate you — that's real, not a weakness. The trick is buying the right one at the right time.
      </p>

      <Card title="This month">
        <div className="row" style={{ borderTop: 'none' }}>
          <div>
            <div className="row-label">Minimal spending month</div>
            <div className="row-sub">Today's plan will tell you to hold off</div>
          </div>
          <Switch on={minimal} label="Minimal spending month"
            onChange={v => updateSettings({ money: { ...state.settings.money, minimalSpendMonth: v } })} />
        </div>
      </Card>

      <button className="btn btn-accent btn-block" style={{ marginBottom: 14 }} onClick={() => setAdding(true)}>
        + Add something you want
      </button>

      {waiting.map(w => {
        const held = daysHeld(w, today)
        const pct = w.price > 0 ? Math.min(100, Math.round((w.saved / w.price) * 100)) : 0
        return (
          <Card key={w.id} title={w.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span className="big-stat">${w.saved.toLocaleString()}</span>
              <span className="faint">of ${w.price.toLocaleString()}</span>
            </div>
            <div className="capacity-bar"><div style={{ width: `${pct}%`, background: 'var(--good)' }} /></div>
            <p className="faint" style={{ marginTop: 8 }}>
              {pct}% saved · on the list {held} day{held === 1 ? '' : 's'}
            </p>
            {w.reason && <p className="note-quote" style={{ marginTop: 10 }}>{w.reason}</p>}
            {held >= 30 && w.saved < w.price && (
              <p className="muted" style={{ marginTop: 10 }}>
                You've wanted this for a month and still don't have it. That's information — either start putting money aside for it, or let it go.
              </p>
            )}
            <div className="grid-2" style={{ marginTop: 12 }}>
              <button className="btn btn-sm" onClick={() => {
                const add = Number(prompt(`Add how much toward ${w.name}?`, '25'))
                if (add && !Number.isNaN(add)) patch(w.id, { saved: Math.max(0, w.saved + add) })
              }}>
                Put money aside
              </button>
              <button className="btn btn-sm" onClick={() => patch(w.id, { status: 'released' })}>
                Let it go
              </button>
            </div>
            {w.saved >= w.price && (
              <button className="btn btn-accent btn-block" style={{ marginTop: 8 }}
                onClick={() => patch(w.id, { status: 'bought' })}>
                Fully saved — buy it
              </button>
            )}
          </Card>
        )
      })}

      {waiting.length === 0 && <p className="empty">Nothing on the want list. That's a good place to be.</p>}

      {settled.length > 0 && (
        <Card title="Settled">
          {settled.map(w => (
            <div key={w.id} className="row">
              <div>
                <div className="row-label">{w.name}</div>
                <div className="row-sub">{w.status === 'bought' ? 'Bought' : 'Let go'} · added {formatShort(w.addedAt)}</div>
              </div>
              <button className="btn btn-sm btn-danger" aria-label={`Remove ${w.name}`}
                onClick={() => setState(s => ({ ...s, wishlist: s.wishlist.filter(x => x.id !== w.id) }))}>×</button>
            </div>
          ))}
        </Card>
      )}

      {adding && <AddWish today={today} onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddWish({ today, onClose }: { today: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [reason, setReason] = useState('')

  const save = () => {
    const item: WishlistItem = {
      id: uid(), name: name.trim(), price: Number(price) || 0, saved: 0,
      reason: reason.trim(), status: 'waiting', addedAt: today
    }
    setState(s => ({ ...s, wishlist: [item, ...s.wishlist] }))
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2>Add to the want list</h2>
      <p className="muted" style={{ margin: '6px 0 14px' }}>
        Writing it down is not the same as buying it. Most things look different in a week.
      </p>
      <div className="field">
        <label htmlFor="w-name">What is it?</label>
        <input id="w-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Second monitor" />
      </div>
      <div className="field">
        <label htmlFor="w-price">Price</label>
        <input id="w-price" type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="w-reason">What would it actually unlock?</label>
        <textarea id="w-reason" value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Be honest. If you can't answer this, that's your answer." />
      </div>
      <div className="grid-2">
        <button className="btn btn-accent" disabled={!name.trim()} onClick={save}>Add</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  )
}
