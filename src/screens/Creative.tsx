import { useState } from 'react'
import { logActivity, setState, uid, useAppState } from '../store'
import { todayISO, formatShort } from '../logic/date'
import { Card, Chip } from '../components/ui'
import type { ContentItem, ContentKind } from '../types'

const KINDS: { id: ContentKind; label: string; verb: string }[] = [
  { id: 'footage', label: 'Footage', verb: 'captured' },
  { id: 'clip', label: 'Clips worth editing', verb: 'flagged' },
  { id: 'idea', label: 'Ideas', verb: 'noted' },
  { id: 'published', label: 'Published', verb: 'published' }
]

export default function Creative() {
  const state = useAppState()
  const [kind, setKind] = useState<ContentKind>('footage')
  const [title, setTitle] = useState('')

  const add = () => {
    if (!title.trim()) return
    const item: ContentItem = { id: uid(), kind, title: title.trim(), notes: '', date: todayISO() }
    setState(s => ({ ...s, content: [item, ...s.content] }))
    logActivity('creative', 0.7, `${kind}: ${item.title}`)
    setTitle('')
  }

  const remove = (id: string) => {
    setState(s => ({ ...s, content: s.content.filter(c => c.id !== id) }))
  }

  return (
    <div>
      <div className="brand">CREATIVE</div>
      <h1 className="screen-title">Document the journey</h1>
      <p className="screen-sub">
        Property walks, commutes, prepping units, the process. Never film clients or private conversations.
      </p>

      <Card title="Capture">
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {KINDS.map(k => (
            <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</Chip>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder={kind === 'footage' ? 'What did you film?' : kind === 'idea' ? 'Content idea…' : kind === 'clip' ? 'Which clip?' : 'What went out?'}
            value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button className="btn" onClick={add} disabled={!title.trim()}>Add</button>
        </div>
      </Card>

      {KINDS.map(k => {
        const items = state.content.filter(c => c.kind === k.id)
        if (items.length === 0) return null
        return (
          <Card key={k.id} title={`${k.label} (${items.length})`}>
            {items.slice(0, 15).map(item => (
              <div key={item.id} className="row">
                <div>
                  <div className="row-label">{item.title}</div>
                  <div className="row-sub">{k.verb} {formatShort(item.date)}</div>
                </div>
                <button className="btn btn-sm btn-danger" aria-label={`Delete ${item.title}`} onClick={() => remove(item.id)}>×</button>
              </div>
            ))}
          </Card>
        )
      })}

      {state.content.length === 0 && (
        <p className="empty">
          Nothing captured yet. Next off day, film one small thing —<br />a walk, a commute, a moment of the journey.
        </p>
      )}
    </div>
  )
}
