import { useState } from 'react'
import { logActivity, setState, uid, useAppState } from '../store'
import { todayISO, formatShort, weekStartOf } from '../logic/date'
import { unusedFootage } from '../logic/recommend'
import { Card, Chip, Sheet, Stepper } from '../components/ui'
import type { ContentItem, ContentKind, EditSession } from '../types'

const KINDS: { id: ContentKind; label: string; placeholder: string }[] = [
  { id: 'footage', label: 'Footage', placeholder: 'What did you film?' },
  { id: 'clip', label: 'Worth editing', placeholder: 'Which moment is worth cutting?' },
  { id: 'idea', label: 'Idea', placeholder: 'Content idea…' },
  { id: 'published', label: 'Published', placeholder: 'What went out?' }
]

export default function Capture() {
  const state = useAppState()
  const today = todayISO()
  const [kind, setKind] = useState<ContentKind>('footage')
  const [title, setTitle] = useState('')
  const [roomId, setRoomId] = useState<string>('')
  const [editOpen, setEditOpen] = useState(false)

  const unused = unusedFootage(state)
  const published = state.content.filter(c => c.kind === 'published')
  const thisWeek = state.content.filter(c => c.date >= weekStartOf(today))

  const add = () => {
    if (!title.trim()) return
    const item: ContentItem = {
      id: uid(), kind, title: title.trim(), roomId: roomId || null, notes: '', date: today, editId: null
    }
    setState(s => ({ ...s, content: [item, ...s.content] }))
    logActivity('creative', 0.7, `${kind}: ${item.title}`)
    setTitle('')
  }

  return (
    <div>
      <div className="brand">CAPTURE</div>
      <h1 className="screen-title">The thread</h1>
      <p className="screen-sub">
        Recording is what links every room together. Capture now, edit at the end of the week.
      </p>

      <Card title="Add">
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {KINDS.map(k => <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</Chip>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder={KINDS.find(k => k.id === kind)!.placeholder}
            value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn" onClick={add} disabled={!title.trim()}>Add</button>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="cap-room">Which room does this document?</label>
          <select id="cap-room" value={roomId} onChange={e => setRoomId(e.target.value)}>
            <option value="">Not tied to a room</option>
            {state.rooms.filter(r => r.status === 'active').map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Edit queue">
        <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
          <div><div className="big-stat">{unused.length}</div><div className="stat-label">unedited</div></div>
          <div><div className="big-stat">{thisWeek.length}</div><div className="stat-label">this week</div></div>
          <div><div className="big-stat">{published.length}</div><div className="stat-label">published</div></div>
        </div>
        {unused.length === 0 ? (
          <p className="empty">Nothing waiting. Film something and it lands here.</p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 10 }}>
              {unused.length} piece{unused.length === 1 ? '' : 's'} of raw material waiting to become practice.
            </p>
            <button className="btn btn-accent btn-block" onClick={() => setEditOpen(true)}>
              Start an edit session
            </button>
          </>
        )}
      </Card>

      {KINDS.map(k => {
        const items = state.content.filter(c => c.kind === k.id)
        if (items.length === 0) return null
        return (
          <Card key={k.id} title={`${k.label} (${items.length})`}>
            {items.slice(0, 12).map(item => {
              const room = state.rooms.find(r => r.id === item.roomId)
              return (
                <div key={item.id} className="row">
                  <div>
                    <div className="row-label">{item.title}</div>
                    <div className="row-sub">
                      {room ? `${room.name} · ` : ''}{formatShort(item.date)}
                      {item.editId ? ' · edited' : ''}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" aria-label={`Delete ${item.title}`}
                    onClick={() => setState(s => ({ ...s, content: s.content.filter(c => c.id !== item.id) }))}>×</button>
                </div>
              )
            })}
          </Card>
        )
      })}

      {state.edits.length > 0 && (
        <Card title="Edit sessions">
          {state.edits.slice(0, 10).map(e => (
            <div key={e.id} className="row">
              <div>
                <div className="row-label">{e.title}</div>
                <div className="row-sub">
                  {formatShort(e.date)} · {e.minutes} min · {e.clipIds.length} clip{e.clipIds.length === 1 ? '' : 's'}
                  {e.published ? ' · published' : ''}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editOpen && <EditSessionSheet onClose={() => setEditOpen(false)} />}
    </div>
  )
}

function EditSessionSheet({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const today = todayISO()
  const unused = unusedFootage(state)
  const [selected, setSelected] = useState<string[]>(unused.map(u => u.id))
  const [minutes, setMinutes] = useState(45)
  const [title, setTitle] = useState(`Week of ${formatShort(weekStartOf(today))}`)
  const [note, setNote] = useState('')
  const [published, setPublished] = useState(false)

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = () => {
    const session: EditSession = {
      id: uid(), date: today, title: title.trim() || 'Edit session',
      minutes, clipIds: selected, published, note
    }
    setState(s => ({
      ...s,
      edits: [session, ...s.edits],
      content: s.content.map(c => selected.includes(c.id) ? { ...c, editId: session.id } : c),
      rooms: s.rooms.map(r => r.id === 'r-editing' ? { ...r, lastEntered: today } : r),
      roomSessions: [
        { id: uid(), roomId: 'r-editing', date: today, minutes, note: title, filmed: false },
        ...s.roomSessions
      ]
    }))
    logActivity('creative', 1.2, 'Edit session')
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2>Edit session</h2>
      <p className="muted" style={{ margin: '6px 0 14px' }}>
        This is the practice. The footage is just the excuse to get reps in.
      </p>
      <div className="field">
        <label htmlFor="e-title">Title</label>
        <input id="e-title" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Minutes spent editing</label>
        <Stepper value={minutes} min={5} max={300} step={5} onChange={setMinutes} format={v => `${v}m`} />
      </div>
      <div className="card-title">Material used ({selected.length}/{unused.length})</div>
      <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
        {unused.map(u => {
          const room = state.rooms.find(r => r.id === u.roomId)
          return (
            <button key={u.id} className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => toggle(u.id)}>
              <div>
                <div className="row-label">{u.title}</div>
                <div className="row-sub">{room ? `${room.name} · ` : ''}{formatShort(u.date)}</div>
              </div>
              <span style={{ color: selected.includes(u.id) ? 'var(--good)' : 'var(--text-faint)' }}>
                {selected.includes(u.id) ? '✓' : '○'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="field">
        <label htmlFor="e-note">What did you learn?</label>
        <textarea id="e-note" value={note} onChange={e => setNote(e.target.value)}
          placeholder="One thing about the craft you know now that you didn't before." />
      </div>
      <div className="row" style={{ borderTop: 'none' }}>
        <span className="row-label">Published it</span>
        <button className={`switch ${published ? 'on' : ''}`} role="switch" aria-checked={published}
          aria-label="Published it" onClick={() => setPublished(!published)} />
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <button className="btn btn-accent" onClick={save}>Log edit session</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  )
}
