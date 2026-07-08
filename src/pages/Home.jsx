import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db } from '../lib/db'
import { addIncome, deleteIncome } from '../lib/actions'
import { expandExpenseByMonth, formatCurrency, formatDateShort, monthKey, monthLabel, todayISO } from '../lib/dates'
import Sheet from '../components/Sheet.jsx'

export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())

  const incomes = useLiveQuery(() => db.incomes.orderBy('date').reverse().toArray(), [])
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])

  if (!incomes || !expenses) return null

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const cashExpenses = expenses.filter((e) => e.method !== 'tarjeta')
  const totalCashExpense = cashExpenses.reduce((sum, e) => sum + e.amount, 0)
  const saldo = totalIncome - totalCashExpense

  const thisMonth = monthKey(todayISO())
  const monthIncome = incomes
    .filter((i) => monthKey(i.date) === thisMonth)
    .reduce((sum, i) => sum + i.amount, 0)
  const monthExpense = expenses
    .flatMap((e) => expandExpenseByMonth(e))
    .filter((c) => c.key === thisMonth)
    .reduce((sum, c) => sum + c.amount, 0)
  const monthCashExpense = cashExpenses
    .filter((e) => monthKey(e.date) === thisMonth)
    .reduce((sum, e) => sum + e.amount, 0)
  const monthSaldo = monthIncome - monthCashExpense

  async function handleSubmit(e) {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0) return
    await addIncome({ amount: value, note: note.trim(), date })
    setAmount('')
    setNote('')
    setDate(todayISO())
    setSheetOpen(false)
  }

  async function handleDelete(id) {
    await deleteIncome(id)
  }

  return (
    <div className="page">
      <h1 className="page-title">X-Pend</h1>

      <motion.div
        className="balance-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="balance-label">Saldo de {monthLabel(thisMonth)}</p>
        <p className="balance-amount">{formatCurrency(monthSaldo)}</p>
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => setSheetOpen(true)}>
          + Agregar dinero
        </button>
      </motion.div>
      <p className="empty-state" style={{ textAlign: 'left', padding: '8px 2px' }}>
        Acumulado de siempre: {formatCurrency(saldo)}
      </p>

      <div className="stat-row">
        <div className="stat">
          <p className="stat-label">Entró este mes</p>
          <p className="stat-value positive">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Gastaste este mes</p>
          <p className="stat-value negative">{formatCurrency(monthExpense)}</p>
        </div>
      </div>
      <p className="empty-state" style={{ textAlign: 'left', padding: '8px 2px' }}>
        {monthLabel(thisMonth)} · mes calendario, todos los métodos de pago
      </p>

      <div className="section-header">
        <h2>Ingresos recientes</h2>
      </div>
      <div className="list">
        {incomes.length === 0 && <p className="empty-state">Aún no registras ingresos</p>}
        {incomes.slice(0, 8).map((i) => (
          <div className="list-item" key={i.id}>
            <div className="list-item-main">
              <span className="list-item-title">{i.note || 'Ingreso'}</span>
              <span className="list-item-sub">{formatDateShort(i.date)}</span>
            </div>
            <span className="list-item-amount income">+{formatCurrency(i.amount)}</span>
            <button className="list-item-delete" onClick={() => handleDelete(i.id)} aria-label="Eliminar">
              ✕
            </button>
          </div>
        ))}
      </div>

      <Sheet open={sheetOpen} title="Agregar dinero" onClose={() => setSheetOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Cantidad</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label>Nota (opcional)</label>
            <input
              type="text"
              placeholder="Quincena, extra..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheetOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Guardar
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
