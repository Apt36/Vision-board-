import { useRef, useState } from 'react'
import { exportData, importData, resetData, setState, uid, updateSettings, useAppState } from '../store'
import { DAY_NAMES, formatTime, hourOf } from '../logic/date'
import { Card, Switch } from '../components/ui'
import type { DayKey, Shift } from '../types'

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export default function Settings() {
  const state = useAppState()
  const s = state.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [newDomain, setNewDomain] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const setShift = (day: DayKey, patch: Partial<Shift>) => {
    updateSettings({ schedule: { ...s.schedule, [day]: { ...s.schedule[day], ...patch } } })
  }

  const addDomain = () => {
    const name = newDomain.trim()
    if (!name) return
    setState(st => ({
      ...st,
      domains: [...st.domains, {
        id: uid(), name, color: '#8fa7b8', builtin: false, weeklyTarget: 2
      }]
    }))
    setNewDomain('')
  }

  const removeDomain = (id: string) => {
    setState(st => ({ ...st, domains: st.domains.filter(d => d.id !== id) }))
  }

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `matt-os-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importData(String(reader.result))
      setImportMsg(ok ? '✓ Data imported.' : 'That file doesn\'t look like a Matt OS backup.')
    }
    reader.readAsText(file)
  }

  const wakeHint = (shift: Shift) => {
    if (shift.off) return null
    const start = hourOf(shift.start)
    return start <= 9.5 ? '~5 AM wake-up · high demand' : '~6:45–7 AM wake-up · high demand'
  }

  return (
    <div>
      <div className="brand">SETTINGS</div>
      <h1 className="screen-title">Settings</h1>
      <p className="screen-sub">Schedule, domains, data.</p>

      <Card title="Work schedule">
        <p className="muted" style={{ marginBottom: 10 }}>
          Capacity and recommendations follow this. Update it when your schedule changes.
        </p>
        {DAY_ORDER.map(day => {
          const shift = s.schedule[day]
          return (
            <div key={day} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div className="row" style={{ borderTop: 'none', minHeight: 0 }}>
                <div>
                  <div className="row-label" style={{ fontWeight: 600 }}>{DAY_NAMES[day]}</div>
                  <div className="row-sub">
                    {shift.off ? 'Off day' : `${formatTime(shift.start)} – ${formatTime(shift.end)}`}
                    {!shift.off && <span className="faint"> · {wakeHint(shift)}</span>}
                  </div>
                </div>
                <Switch on={!shift.off} onChange={v => setShift(day, { off: !v })} label={`${DAY_NAMES[day]} work day`} />
              </div>
              {!shift.off && (
                <div className="grid-2" style={{ marginTop: 8 }}>
                  <input type="time" aria-label={`${DAY_NAMES[day]} start`} value={shift.start} onChange={e => setShift(day, { start: e.target.value })} />
                  <input type="time" aria-label={`${DAY_NAMES[day]} end`} value={shift.end} onChange={e => setShift(day, { end: e.target.value })} />
                </div>
              )}
            </div>
          )
        })}
      </Card>

      <Card title="Profile">
        <div className="field">
          <label htmlFor="set-name">Name</label>
          <input id="set-name" value={s.name} onChange={e => updateSettings({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="set-job">Current job</label>
          <input id="set-job" value={s.currentJob} onChange={e => updateSettings({ currentJob: e.target.value })} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="set-unit">Weight unit</label>
            <select id="set-unit" value={s.weightUnit} onChange={e => updateSettings({ weightUnit: e.target.value as 'lbs' | 'kg' })}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-dir">Body goal</label>
            <select id="set-dir" value={s.goalDirection} onChange={e => updateSettings({ goalDirection: e.target.value as 'gain' | 'maintain' | 'lose' })}>
              <option value="gain">Gain weight</option>
              <option value="maintain">Maintain</option>
              <option value="lose">Lose weight</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Life domains">
        {state.domains.map(d => (
          <div key={d.id} className="row">
            <span className="row-label">
              <span style={{ color: d.color }}>●</span> {d.name}
              {d.builtin && <span className="faint"> · built-in</span>}
            </span>
            {!d.builtin && (
              <button className="btn btn-sm btn-danger" aria-label={`Remove ${d.name}`} onClick={() => removeDomain(d.id)}>×</button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input placeholder="Add custom domain…" value={newDomain} onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDomain()} />
          <button className="btn" onClick={addDomain} disabled={!newDomain.trim()}>Add</button>
        </div>
      </Card>

      <Card title="Data">
        <p className="muted" style={{ marginBottom: 10 }}>
          Everything lives on this device. Export a backup now and then.
        </p>
        <div className="grid-2">
          <button className="btn" onClick={doExport}>Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import backup</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
        {importMsg && <p className="muted" style={{ marginTop: 8 }}>{importMsg}</p>}
        <hr className="divider" />
        {confirmReset ? (
          <div className="grid-2">
            <button className="btn btn-danger" onClick={() => { resetData(); setConfirmReset(false) }}>
              Yes, erase everything
            </button>
            <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-danger btn-block" onClick={() => setConfirmReset(true)}>
            Reset all data…
          </button>
        )}
      </Card>
    </div>
  )
}
