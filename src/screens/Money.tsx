import { useState } from 'react'
import { logActivity, updateSettings, useAppState } from '../store'
import { Card } from '../components/ui'

export default function Money() {
  const state = useAppState()
  const m = state.settings.money
  const [form, setForm] = useState({
    savingsGoal: m.savingsGoal?.toString() ?? '',
    currentSavings: m.currentSavings?.toString() ?? '',
    monthlyTarget: m.monthlyTarget?.toString() ?? '',
    extraIncomeGoal: m.extraIncomeGoal?.toString() ?? '',
    extraIncomeEarned: m.extraIncomeEarned?.toString() ?? '',
    note: m.note
  })
  const [saved, setSaved] = useState(false)

  const num = (s: string) => (s.trim() === '' ? null : Number(s) || null)

  const save = () => {
    updateSettings({
      money: {
        savingsGoal: num(form.savingsGoal),
        currentSavings: num(form.currentSavings),
        monthlyTarget: num(form.monthlyTarget),
        extraIncomeGoal: num(form.extraIncomeGoal),
        extraIncomeEarned: num(form.extraIncomeEarned),
        minimalSpendMonth: m.minimalSpendMonth,
        note: form.note
      }
    })
    logActivity('money', 1, 'Updated money numbers')
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  const savingsPct = m.savingsGoal && m.currentSavings != null
    ? Math.min(100, Math.round((m.currentSavings / m.savingsGoal) * 100)) : null
  const extraPct = m.extraIncomeGoal && m.extraIncomeEarned != null
    ? Math.min(100, Math.round((m.extraIncomeEarned / m.extraIncomeGoal) * 100)) : null

  const field = (key: keyof typeof form, label: string, placeholder = '$') => (
    <div className="field">
      <label htmlFor={`money-${key}`}>{label}</label>
      <input id={`money-${key}`} type={key === 'note' ? 'text' : 'number'} inputMode={key === 'note' ? 'text' : 'decimal'}
        placeholder={placeholder} value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })} />
    </div>
  )

  return (
    <div>
      <div className="brand">MONEY</div>
      <h1 className="screen-title">Direction, not budgeting</h1>
      <p className="screen-sub">Keep the financial picture visible. That's all this needs to do.</p>

      <Card title="Savings">
        {savingsPct != null ? (
          <>
            <div className="big-stat">${m.currentSavings!.toLocaleString()} <span className="faint" style={{ fontSize: '0.95rem' }}>of ${m.savingsGoal!.toLocaleString()}</span></div>
            <div className="capacity-bar"><div style={{ width: `${savingsPct}%`, background: 'var(--good)' }} /></div>
            <p className="faint" style={{ marginTop: 8 }}>{savingsPct}% of goal{m.monthlyTarget ? ` · target $${m.monthlyTarget.toLocaleString()}/month` : ''}</p>
          </>
        ) : (
          <p className="empty">Set your savings numbers below and progress shows here.</p>
        )}
      </Card>

      <Card title="Income outside the job">
        {extraPct != null ? (
          <>
            <div className="big-stat">${m.extraIncomeEarned!.toLocaleString()} <span className="faint" style={{ fontSize: '0.95rem' }}>of ${m.extraIncomeGoal!.toLocaleString()} goal</span></div>
            <div className="capacity-bar"><div style={{ width: `${extraPct}%`, background: 'var(--accent)' }} /></div>
          </>
        ) : (
          <p className="empty">Set an extra-income goal below to keep it on the radar.</p>
        )}
      </Card>

      <Card title="Update numbers">
        <div className="grid-2">
          {field('currentSavings', 'Current savings')}
          {field('savingsGoal', 'Savings goal')}
        </div>
        <div className="grid-2">
          {field('monthlyTarget', 'Monthly savings target')}
          {field('extraIncomeGoal', 'Extra income goal')}
        </div>
        {field('extraIncomeEarned', 'Extra income earned so far')}
        {field('note', 'Note to self', 'e.g. why this matters')}
        <button className="btn btn-accent btn-block" onClick={save}>{saved ? '✓ Saved' : 'Save'}</button>
      </Card>

      {m.note && (
        <Card title="Note to self">
          <p className="note-quote">{m.note}</p>
        </Card>
      )}
    </div>
  )
}
