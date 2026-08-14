import { useEffect, useRef, useState } from 'react'
import { emptyCheckin, saveCheckin, useAppState } from '../store'
import { todayISO, formatLong } from '../logic/date'
import { dayInfo } from '../logic/capacity'
import { Card, Chip, Stepper, SwitchRow } from '../components/ui'
import type { DailyCheckin, FrenchType } from '../types'

const FRENCH_TYPES: { id: FrenchType; label: string }[] = [
  { id: 'duolingo', label: 'Duolingo' },
  { id: 'listening', label: 'Listening' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'reading', label: 'Reading' },
  { id: 'writing', label: 'Writing' }
]

export default function CheckIn() {
  const state = useAppState()
  const today = todayISO()
  const existing = state.checkins[today]
  const [c, setC] = useState<DailyCheckin>(() => existing ?? emptyCheckin(today))
  const [savedTick, setSavedTick] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)
  const info = dayInfo(state, today)

  // Autosave (debounced) on every change after first edit.
  const update = (patch: Partial<DailyCheckin>) => {
    setC(prev => {
      const next = { ...prev, ...patch }
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        saveCheckin(next)
        setSavedTick(true)
        window.setTimeout(() => setSavedTick(false), 1500)
      }, 350)
      return next
    })
  }
  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const toggleFrenchType = (t: FrenchType) => {
    const types = c.french.types.includes(t)
      ? c.french.types.filter(x => x !== t)
      : [...c.french.types, t]
    update({ french: { ...c.french, types, practiced: types.length > 0 || c.french.practiced } })
  }

  return (
    <div>
      <div className="brand">CHECK-IN</div>
      <h1 className="screen-title">{formatLong(today)}</h1>
      <p className="screen-sub">
        {info.isWorkDay ? `Work day · ${info.label}` : 'Off day'} · saves automatically
        {savedTick && <span className="checkin-saved"> · saved ✓</span>}
        {existing && !savedTick && <span className="faint"> · loaded today's check-in</span>}
      </p>

      <Card title="Sleep & energy">
        <div className="row" style={{ borderTop: 'none' }}>
          <div className="row-label">Sleep last night</div>
          <Stepper
            value={c.sleepHours ?? 7}
            min={0} max={14} step={0.5}
            format={v => `${v}h`}
            onChange={v => update({ sleepHours: v })}
          />
        </div>
        {c.sleepHours == null && <p className="faint">Tap − / + to log sleep.</p>}
        <div style={{ marginTop: 14 }}>
          <label htmlFor="energy">Energy: <strong>{c.energy ?? '–'}</strong>/10</label>
          <input
            id="energy" type="range" min={1} max={10} step={1}
            value={c.energy ?? 5}
            onChange={e => update({ energy: Number(e.target.value) })}
          />
        </div>
      </Card>

      <Card title="Body">
        <div className="row" style={{ borderTop: 'none' }}>
          <div>
            <div className="row-label">Meals today</div>
            <div className="row-sub">Real meals — you're gaining weight</div>
          </div>
          <Stepper value={c.meals} min={0} max={8} onChange={v => update({ meals: v })} />
        </div>
        <SwitchRow label="Exercise" sub="Any deliberate movement counts" on={c.exercised} onChange={v => update({ exercised: v })} />
        {c.exercised && (
          <div className="field" style={{ marginTop: 10 }}>
            <input
              placeholder="What did you do? (optional)"
              value={c.exerciseNote}
              onChange={e => update({ exerciseNote: e.target.value })}
            />
          </div>
        )}
        <div className="row">
          <div className="row-label">Steps <span className="faint">(optional)</span></div>
          <input
            type="number" inputMode="numeric" placeholder="—" style={{ width: 110, textAlign: 'right' }}
            value={c.steps ?? ''}
            onChange={e => update({ steps: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
        <div className="row">
          <div className="row-label">Weight <span className="faint">(optional, {state.settings.weightUnit})</span></div>
          <input
            type="number" inputMode="decimal" placeholder="—" style={{ width: 110, textAlign: 'right' }}
            value={c.weight ?? ''}
            onChange={e => update({ weight: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
      </Card>

      <Card title="French">
        <SwitchRow
          label="Practiced French" sub={c.french.minutes ? `${c.french.minutes} min` : undefined}
          on={c.french.practiced}
          onChange={v => update({ french: { ...c.french, practiced: v, types: v ? c.french.types : [], minutes: v ? c.french.minutes : 0 } })}
        />
        {c.french.practiced && (
          <>
            <div className="row">
              <div className="row-label">Minutes</div>
              <Stepper value={c.french.minutes} min={0} max={180} step={5} onChange={v => update({ french: { ...c.french, minutes: v } })} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="chip-row">
                {FRENCH_TYPES.map(t => (
                  <Chip key={t.id} on={c.french.types.includes(t.id)} onClick={() => toggleFrenchType(t.id)}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      <Card title="Mind & work">
        <SwitchRow label="Reading" on={c.reading} onChange={v => update({ reading: v })} />
        <SwitchRow label="Reflection / mental reset" on={c.mind} onChange={v => update({ mind: v })} />
        <SwitchRow label="Career work" sub="Applications, studying, development" on={c.career} onChange={v => update({ career: v })} />
        <SwitchRow label="Creative work" sub="Filming, editing, music, content" on={c.creative} onChange={v => update({ creative: v })} />
      </Card>

      <Card title="Connection">
        <p className="muted" style={{ marginBottom: 10 }}>Deliberate time with people — not a quota.</p>
        <div className="chip-row">
          <Chip on={c.connection.partner} onClick={() => update({ connection: { ...c.connection, partner: !c.connection.partner } })}>Partner</Chip>
          <Chip on={c.connection.family} onClick={() => update({ connection: { ...c.connection, family: !c.connection.family } })}>Family</Chip>
          <Chip on={c.connection.friends} onClick={() => update({ connection: { ...c.connection, friends: !c.connection.friends } })}>Friends</Chip>
        </div>
      </Card>

      <Card title="Notes">
        <textarea
          placeholder="Anything worth remembering about today…"
          value={c.notes}
          onChange={e => update({ notes: e.target.value })}
        />
      </Card>

      <p className="faint" style={{ textAlign: 'center', marginBottom: 8 }}>
        Everything saves as you go. Close the app whenever.
      </p>
    </div>
  )
}
