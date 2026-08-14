import { useState } from 'react'
import { setState, uid, useAppState } from '../store'
import { todayISO } from '../logic/date'
import { Card } from '../components/ui'
import type { Routine, RoutineAnchor } from '../types'

const BLOCKS: { key: keyof Routine; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'workday', label: 'Workday' },
  { key: 'evening', label: 'Evening' }
]

export default function Routines() {
  const state = useAppState()
  const today = todayISO()
  const done = new Set(state.anchorChecks[today] ?? [])
  const [editMode, setEditMode] = useState(false)
  const [newLabels, setNewLabels] = useState<Record<string, string>>({})

  const toggleAnchor = (id: string) => {
    setState(s => {
      const cur = new Set(s.anchorChecks[today] ?? [])
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return { ...s, anchorChecks: { ...s.anchorChecks, [today]: [...cur] } }
    })
  }

  const addAnchor = (block: keyof Routine) => {
    const label = (newLabels[block] ?? '').trim()
    if (!label) return
    const anchor: RoutineAnchor = { id: uid(), label }
    setState(s => ({ ...s, routine: { ...s.routine, [block]: [...s.routine[block], anchor] } }))
    setNewLabels({ ...newLabels, [block]: '' })
  }

  const removeAnchor = (block: keyof Routine, id: string) => {
    setState(s => ({ ...s, routine: { ...s.routine, [block]: s.routine[block].filter(a => a.id !== id) } }))
  }

  const totalDone = BLOCKS.reduce((n, b) => n + state.routine[b.key].filter(a => done.has(a.id)).length, 0)
  const totalAnchors = BLOCKS.reduce((n, b) => n + state.routine[b.key].length, 0)

  return (
    <div>
      <div className="brand">ROUTINES</div>
      <h1 className="screen-title">Core anchors</h1>
      <p className="screen-sub">
        Not a giant morning routine — just the anchors that hold a day together. {totalDone}/{totalAnchors} today.
      </p>

      <button className="btn btn-sm" style={{ marginBottom: 14 }} onClick={() => setEditMode(!editMode)}>
        {editMode ? 'Done editing' : 'Edit anchors'}
      </button>

      {BLOCKS.map(block => (
        <Card key={block.key} title={block.label}>
          {state.routine[block.key].map(a => (
            <div key={a.id} className="row">
              {editMode ? (
                <>
                  <span className="row-label">{a.label}</span>
                  <button className="btn btn-sm btn-danger" aria-label={`Remove ${a.label}`} onClick={() => removeAnchor(block.key, a.id)}>×</button>
                </>
              ) : (
                <button className="row" style={{ width: '100%', border: 'none' }} onClick={() => toggleAnchor(a.id)}>
                  <span className="row-label" style={done.has(a.id) ? { color: 'var(--text-faint)', textDecoration: 'line-through' } : undefined}>
                    {a.label}
                  </span>
                  <span style={{ color: done.has(a.id) ? 'var(--good)' : 'var(--text-faint)', fontSize: '1.1rem' }}>
                    {done.has(a.id) ? '✓' : '○'}
                  </span>
                </button>
              )}
            </div>
          ))}
          {editMode && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input placeholder="New anchor…" value={newLabels[block.key] ?? ''}
                onChange={e => setNewLabels({ ...newLabels, [block.key]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addAnchor(block.key)} />
              <button className="btn" onClick={() => addAnchor(block.key)}>Add</button>
            </div>
          )}
        </Card>
      ))}

      <p className="faint" style={{ textAlign: 'center' }}>
        Anchors reset each day. Missing some is fine — they're handholds, not homework.
      </p>
    </div>
  )
}
