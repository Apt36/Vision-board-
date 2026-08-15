import { useState } from 'react'
import { logActivity, setState, uid, useAppState } from '../store'
import { todayISO, formatShort } from '../logic/date'
import { Card, Chip, Sheet } from '../components/ui'
import type { CollectionItem, CollectionKind, CollectionStatus } from '../types'

const TABS: { id: CollectionKind; label: string; domain: string; blurb: string; makerLabel: string; flow: CollectionStatus[] }[] = [
  { id: 'art', label: 'Art & Frames', domain: 'creative', makerLabel: 'Artist',
    blurb: 'Find it. Acquire it. Frame it. A runway, not a shopping spree.',
    flow: ['wanted', 'acquired', 'framed'] },
  { id: 'vinyl', label: 'Vinyl', domain: 'creative', makerLabel: 'Artist',
    blurb: 'Same slow runway. Deliberate beats impulsive.',
    flow: ['wanted', 'acquired'] },
  { id: 'library', label: 'Library', domain: 'mind', makerLabel: 'Author',
    blurb: 'Building the personal library. A lot of Black history. Get back in touch with reading.',
    flow: ['wanted', 'reading', 'finished'] }
]

const STATUS_LABEL: Record<CollectionStatus, string> = {
  wanted: 'Want', acquired: 'Have', framed: 'Framed', reading: 'Reading', finished: 'Finished'
}

export default function Collections() {
  const state = useAppState()
  const today = todayISO()
  const [tab, setTab] = useState<CollectionKind>('art')
  const [adding, setAdding] = useState(false)
  const cfg = TABS.find(t => t.id === tab)!
  const items = state.collection.filter(i => i.collection === tab)

  const advance = (item: CollectionItem) => {
    const idx = cfg.flow.indexOf(item.status)
    const next = cfg.flow[Math.min(cfg.flow.length - 1, idx + 1)]
    if (next === item.status) return
    setState(s => ({
      ...s, collection: s.collection.map(x => x.id === item.id ? { ...x, status: next } : x)
    }))
    logActivity(cfg.domain, 0.7, `${cfg.label}: ${item.title} → ${STATUS_LABEL[next]}`)
  }

  return (
    <div>
      <div className="brand">COLLECTIONS</div>
      <h1 className="screen-title">The long game</h1>
      <p className="screen-sub">Things you build slowly, on purpose, over years.</p>

      <div className="chip-row" style={{ marginBottom: 14 }}>
        {TABS.map(t => (
          <Chip key={t.id} on={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Chip>
        ))}
      </div>

      <Card>
        <p className="note-quote">{cfg.blurb}</p>
      </Card>

      <div style={{ display: 'flex', gap: 22, marginBottom: 14, flexWrap: 'wrap' }}>
        {cfg.flow.map(st => (
          <div key={st}>
            <div className="big-stat">{items.filter(i => i.status === st).length}</div>
            <div className="stat-label">{STATUS_LABEL[st]}</div>
          </div>
        ))}
      </div>

      <button className="btn btn-accent btn-block" style={{ marginBottom: 14 }} onClick={() => setAdding(true)}>
        + Add to {cfg.label}
      </button>

      {cfg.flow.map(st => {
        const group = items.filter(i => i.status === st)
        if (group.length === 0) return null
        return (
          <Card key={st} title={`${STATUS_LABEL[st]} (${group.length})`}>
            {group.map(item => (
              <div key={item.id} className="row">
                <div style={{ flex: 1 }}>
                  <div className="row-label" style={{ fontWeight: 600 }}>{item.title}</div>
                  <div className="row-sub">
                    {item.maker && `${item.maker} · `}{formatShort(item.date)}
                    {item.cost != null && ` · $${item.cost}`}
                  </div>
                  {item.notes && <div className="faint">{item.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {cfg.flow.indexOf(st) < cfg.flow.length - 1 && (
                    <button className="btn btn-sm" onClick={() => advance(item)}>
                      → {STATUS_LABEL[cfg.flow[cfg.flow.indexOf(st) + 1]]}
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" aria-label={`Delete ${item.title}`}
                    onClick={() => setState(s => ({ ...s, collection: s.collection.filter(c => c.id !== item.id) }))}>×</button>
                </div>
              </div>
            ))}
          </Card>
        )
      })}

      {items.length === 0 && (
        <p className="empty">Nothing here yet. Start with one thing you actually want.</p>
      )}

      {adding && (
        <AddItem kind={tab} makerLabel={cfg.makerLabel} onClose={() => setAdding(false)} today={today} />
      )}
    </div>
  )
}

function AddItem({ kind, makerLabel, onClose, today }: {
  kind: CollectionKind; makerLabel: string; onClose: () => void; today: string
}) {
  const [title, setTitle] = useState('')
  const [maker, setMaker] = useState('')
  const [notes, setNotes] = useState('')

  const save = () => {
    const item: CollectionItem = {
      id: uid(), collection: kind, title: title.trim(), maker: maker.trim(),
      status: 'wanted', notes: notes.trim(), cost: null, date: today
    }
    setState(s => ({ ...s, collection: [item, ...s.collection] }))
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2>Add to the list</h2>
      <p className="muted" style={{ margin: '6px 0 14px' }}>
        Everything starts on the want list. Wanting it and having it are different stages.
      </p>
      <div className="field">
        <label htmlFor="ci-title">Title</label>
        <input id="ci-title" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ci-maker">{makerLabel}</label>
        <input id="ci-maker" value={maker} onChange={e => setMaker(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ci-notes">Why this one?</label>
        <textarea id="ci-notes" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="grid-2">
        <button className="btn btn-accent" disabled={!title.trim()} onClick={save}>Add</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  )
}
