import { useState } from 'react'
import { logActivity, setState, uid, useAppState } from '../store'
import { todayISO, formatShort } from '../logic/date'
import { Card, Sheet } from '../components/ui'
import type { Goal, GoalStatus, ProjectNote } from '../types'

const STATUS_LABEL: Record<GoalStatus, string> = {
  active: 'Active', maintenance: 'Maintenance mode', paused: 'Paused', done: 'Done'
}

function emptyGoal(): Goal {
  return {
    id: uid(), name: '', domainId: 'projects', description: '', status: 'active',
    priority: 2, nextAction: '', lastWorkedOn: null, targetDate: null,
    createdAt: new Date().toISOString()
  }
}

export default function Goals() {
  const state = useAppState()
  const [editing, setEditing] = useState<Goal | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)

  const detailGoal = detail ? state.goals.find(g => g.id === detail) : null

  const save = (g: Goal) => {
    setState(s => ({
      ...s,
      goals: isNew ? [...s.goals, g] : s.goals.map(x => (x.id === g.id ? g : x))
    }))
    setEditing(null)
  }

  const remove = (id: string) => {
    setState(s => ({ ...s, goals: s.goals.filter(g => g.id !== id), projectNotes: s.projectNotes.filter(n => n.goalId !== id) }))
    setEditing(null)
    setDetail(null)
  }

  const workedOn = (g: Goal) => {
    const today = todayISO()
    setState(s => ({ ...s, goals: s.goals.map(x => (x.id === g.id ? { ...x, lastWorkedOn: today } : x)) }))
    logActivity(g.domainId, 0.9, `Worked on ${g.name}`)
  }

  const groups: { status: GoalStatus; goals: Goal[] }[] = (['active', 'maintenance', 'paused', 'done'] as GoalStatus[])
    .map(status => ({
      status,
      goals: state.goals.filter(g => g.status === status).sort((a, b) => a.priority - b.priority)
    }))
    .filter(g => g.goals.length > 0)

  return (
    <div>
      <div className="brand">GOALS &amp; PROJECTS</div>
      <h1 className="screen-title">Everything gets its turn</h1>
      <p className="screen-sub">Not everything gets today.</p>

      <button className="btn btn-accent btn-block" style={{ marginBottom: 14 }}
        onClick={() => { setEditing(emptyGoal()); setIsNew(true) }}>
        + Add goal or project
      </button>

      {groups.map(group => (
        <Card key={group.status} title={STATUS_LABEL[group.status]}>
          {group.goals.map(g => {
            const domain = state.domains.find(d => d.id === g.domainId)
            return (
              <div key={g.id} className="row" style={{ alignItems: 'flex-start', paddingTop: 8, paddingBottom: 8 }}>
                <button style={{ textAlign: 'left', flex: 1 }} onClick={() => setDetail(g.id)}>
                  <div className="row-label" style={{ fontWeight: 600 }}>
                    {g.name}
                    {g.priority === 1 && group.status === 'active' && <span className="faint"> · high priority</span>}
                  </div>
                  <div className="row-sub">
                    <span style={{ color: domain?.color }}>{domain?.name}</span>
                    {g.nextAction && <> · next: {g.nextAction}</>}
                  </div>
                  <div className="faint">
                    {g.lastWorkedOn ? `Last worked on ${formatShort(g.lastWorkedOn)}` : 'Not started yet'}
                    {g.targetDate && ` · target ${formatShort(g.targetDate)}`}
                  </div>
                </button>
                {group.status !== 'done' && (
                  <button className="btn btn-sm" onClick={() => workedOn(g)}>
                    {g.lastWorkedOn === todayISO() ? '✓ today' : 'Did it'}
                  </button>
                )}
              </div>
            )
          })}
        </Card>
      ))}

      {detailGoal && (
        <GoalDetail
          goal={detailGoal}
          notes={state.projectNotes.filter(n => n.goalId === detailGoal.id)}
          onEdit={() => { setEditing(detailGoal); setIsNew(false) }}
          onClose={() => setDetail(null)}
        />
      )}

      {editing && (
        <GoalEditor
          goal={editing}
          isNew={isNew}
          domains={state.domains}
          onSave={save}
          onDelete={() => remove(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function GoalDetail({ goal, notes, onEdit, onClose }: {
  goal: Goal; notes: ProjectNote[]; onEdit: () => void; onClose: () => void
}) {
  const [noteText, setNoteText] = useState('')
  const [noteKind, setNoteKind] = useState<ProjectNote['kind']>('idea')

  const addNote = () => {
    if (!noteText.trim()) return
    const n: ProjectNote = { id: uid(), goalId: goal.id, kind: noteKind, text: noteText.trim(), date: todayISO() }
    setState(s => ({ ...s, projectNotes: [n, ...s.projectNotes] }))
    setNoteText('')
  }

  return (
    <Sheet onClose={onClose}>
      <h2>{goal.name}</h2>
      <p className="muted" style={{ margin: '6px 0 12px' }}>{goal.description || 'No description.'}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className={`pill ${goal.status === 'maintenance' ? 'pill-work' : 'pill-dim'}`}>{STATUS_LABEL[goal.status].toUpperCase()}</span>
        {goal.nextAction && <span className="pill pill-dim">next: {goal.nextAction}</span>}
      </div>
      {goal.status === 'maintenance' && (
        <p className="note-quote" style={{ marginBottom: 14 }}>
          Maintenance mode: capture ideas and bugs here. Occasional sessions are fine — daily development is not the goal.
        </p>
      )}

      <div className="card-title">Capture</div>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        {(['idea', 'bug', 'log'] as const).map(k => (
          <button key={k} className={`chip ${noteKind === k ? 'on' : ''}`} onClick={() => setNoteKind(k)}>{k}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input placeholder={`New ${noteKind}…`} value={noteText} onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()} />
        <button className="btn" onClick={addNote}>Add</button>
      </div>

      {notes.length > 0 && (
        <>
          <div className="card-title">Captured</div>
          <ul className="plist" style={{ marginBottom: 14 }}>
            {notes.map(n => (
              <li key={n.id}>
                <span className="faint" style={{ minWidth: 38 }}>{n.kind}</span>
                <span>
                  {n.text}
                  <span className="faint"> · {formatShort(n.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="grid-2">
        <button className="btn" onClick={onEdit}>Edit</button>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  )
}

function GoalEditor({ goal, isNew, domains, onSave, onDelete, onClose }: {
  goal: Goal; isNew: boolean; domains: { id: string; name: string }[]
  onSave: (g: Goal) => void; onDelete: () => void; onClose: () => void
}) {
  const [g, setG] = useState<Goal>(goal)
  const set = (patch: Partial<Goal>) => setG(prev => ({ ...prev, ...patch }))

  return (
    <Sheet onClose={onClose}>
      <h2>{isNew ? 'New goal / project' : 'Edit'}</h2>
      <div className="section-gap" />
      <div className="field">
        <label htmlFor="g-name">Name</label>
        <input id="g-name" value={g.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Learn guitar" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="g-domain">Domain</label>
          <select id="g-domain" value={g.domainId} onChange={e => set({ domainId: e.target.value })}>
            {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="g-status">Status</label>
          <select id="g-status" value={g.status} onChange={e => set({ status: e.target.value as GoalStatus })}>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance mode</option>
            <option value="paused">Paused</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="g-desc">Description</label>
        <textarea id="g-desc" value={g.description} onChange={e => set({ description: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="g-next">Next action</label>
        <input id="g-next" value={g.nextAction} onChange={e => set({ nextAction: e.target.value })} placeholder="The very next concrete step" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="g-pri">Priority</label>
          <select id="g-pri" value={g.priority} onChange={e => set({ priority: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={1}>High</option>
            <option value={2}>Normal</option>
            <option value={3}>Low</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="g-date">Target date (optional)</label>
          <input id="g-date" type="date" value={g.targetDate ?? ''} onChange={e => set({ targetDate: e.target.value || null })} />
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 6 }}>
        <button className="btn btn-accent" disabled={!g.name.trim()} onClick={() => onSave(g)}>
          {isNew ? 'Add' : 'Save'}
        </button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
      {!isNew && (
        <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={onDelete}>
          Delete
        </button>
      )}
    </Sheet>
  )
}
