import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { db, CARD, CATEGORIES, METHODS, MSI_OPTIONS, methodLabel } from '../lib/db'
import { addExpense, deleteExpense } from '../lib/actions'
import { formatCurrency, formatDateShort, msiInstallmentInfo, todayISO } from '../lib/dates'
import Sheet from '../components/Sheet.jsx'

export default function Gastos() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState('Todas')
  const [msiExpanded, setMsiExpanded] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [method, setMethod] = useState('efectivo')
  const [msiMonths, setMsiMonths] = useState(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())

  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])

  if (!expenses) return null

  const filtered = filter === 'Todas' ? expenses : expenses.filter((e) => e.category === filter)
  const oneTime = filtered.filter((e) => !e.msiMonths)
  const msiExpenses = filtered
    .map((e) => ({ e, info: msiInstallmentInfo(e, CARD.cutDay) }))
    .filter(({ e }) => e.msiMonths)

  async function handleSubmit(e) {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0) return
    await addExpense({
      amount: value,
      category,
      method,
      msiMonths: method === 'tarjeta' ? msiMonths : null,
      note: note.trim(),
      date,
    })
    setAmount('')
    setNote('')
    setCategory(CATEGORIES[0])
    setMethod('efectivo')
    setMsiMonths(null)
    setDate(todayISO())
    setSheetOpen(false)
  }

  async function handleDelete(id) {
    await deleteExpense(id)
  }

  return (
    <div className="page">
      <h1 className="page-title">Gastos</h1>

      <button className="btn btn-primary btn-block" onClick={() => setSheetOpen(true)}>
        + Registrar gasto
      </button>

      <div className="section-header">
        <h2>Filtrar</h2>
      </div>
      <div className="pill-row">
        {['Todas', ...CATEGORIES].map((c) => (
          <button
            key={c}
            className={'pill' + (filter === c ? ' active' : '')}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="section-header">
        <h2>Historial</h2>
      </div>
      <div className="list">
        {oneTime.length === 0 && <p className="empty-state">No hay gastos registrados</p>}
        {oneTime.map((e) => (
          <div className="list-item" key={e.id}>
            <div className="list-item-main">
              <span className="list-item-title">{e.category}</span>
              <span className="list-item-sub">
                {formatDateShort(e.date)} · {methodLabel(e.method)}
                {e.note ? ` · ${e.note}` : ''}
              </span>
            </div>
            <span className="list-item-amount expense">-{formatCurrency(e.amount)}</span>
            <button className="list-item-delete" onClick={() => handleDelete(e.id)} aria-label="Eliminar">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2>Compras a meses sin intereses</h2>
      </div>
      <button type="button" className="msi-toggle" onClick={() => setMsiExpanded((v) => !v)}>
        <span>
          {msiExpenses.length} activa{msiExpenses.length === 1 ? '' : 's'}
        </span>
        <motion.span animate={{ rotate: msiExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {msiExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="list" style={{ marginTop: 10 }}>
              {msiExpenses.length === 0 && <p className="empty-state">No tienes compras a MSI</p>}
              {msiExpenses.map(({ e, info }) => (
                <div className="list-item" key={e.id}>
                  <div className="list-item-main">
                    <span className="list-item-title">{e.category}</span>
                    <span className="list-item-sub">
                      {info ? `Vas en el mes ${info.installment}/${info.months}` : `Liquidado (${e.msiMonths} meses)`}
                      {' · '}Total {formatCurrency(e.amount)}
                      {e.note ? ` · ${e.note}` : ''}
                    </span>
                  </div>
                  <span className="list-item-amount expense">
                    -{formatCurrency(info ? e.amount / e.msiMonths : 0)}
                  </span>
                  <button className="list-item-delete" onClick={() => handleDelete(e.id)} aria-label="Eliminar">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={sheetOpen} title="Registrar gasto" onClose={() => setSheetOpen(false)}>
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
            <label>Categoría</label>
            <div className="pill-row">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={'pill' + (category === c ? ' active' : '')}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Método de pago</label>
            <div className="pill-row">
              {METHODS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={'pill' + (method === m.id ? ' active' : '')}
                  onClick={() => {
                    setMethod(m.id)
                    if (m.id !== 'tarjeta') setMsiMonths(null)
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {method === 'tarjeta' && (
            <div className="field">
              <label>¿A meses sin intereses?</label>
              <div className="pill-row">
                <button
                  type="button"
                  className={'pill' + (msiMonths === null ? ' active' : '')}
                  onClick={() => setMsiMonths(null)}
                >
                  No
                </button>
                {MSI_OPTIONS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={'pill' + (msiMonths === n ? ' active' : '')}
                    onClick={() => setMsiMonths(n)}
                  >
                    {n} meses
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label>Nota (opcional)</label>
            <input type="text" placeholder="Detalle..." value={note} onChange={(e) => setNote(e.target.value)} />
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
