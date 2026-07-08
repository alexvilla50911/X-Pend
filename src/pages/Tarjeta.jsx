import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { db, CARD, CATEGORIES, MSI_OPTIONS } from '../lib/db'
import { addExpense, deleteExpense } from '../lib/actions'
import {
  cardCycleForISO,
  currentCardCycle,
  cycleIndex,
  formatCurrency,
  formatDateShort,
  isoFromCycleIndex,
  paymentDueLabel,
  todayISO,
} from '../lib/dates'
import Sheet from '../components/Sheet.jsx'

export default function Tarjeta() {
  const [cargoSheetOpen, setCargoSheetOpen] = useState(false)
  const [cargoAmount, setCargoAmount] = useState('')
  const [cargoCategory, setCargoCategory] = useState(CATEGORIES[0])
  const [cargoNote, setCargoNote] = useState('')
  const [cargoDate, setCargoDate] = useState(todayISO())

  const [msiExpanded, setMsiExpanded] = useState(false)
  const [msiSheetOpen, setMsiSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [msiMonths, setMsiMonths] = useState(MSI_OPTIONS[0])
  const [paidInstallments, setPaidInstallments] = useState('0')
  const [note, setNote] = useState('')

  const expenses = useLiveQuery(
    () => db.expenses.where('method').equals('tarjeta').reverse().sortBy('date'),
    [],
  )

  if (!expenses) return null

  const period = currentCardCycle(CARD.cutDay)
  const currentIdx = cycleIndex(period.end)

  // Periodo ya cerrado (el corte anterior): es lo que ya se facturó y toca pagar en la próxima fecha límite.
  const closedPeriodEnd = isoFromCycleIndex(currentIdx - 1, CARD.cutDay)
  const closedPeriod = cardCycleForISO(CARD.cutDay, closedPeriodEnd)
  const closedIdx = cycleIndex(closedPeriod.end)
  const dueLabel = paymentDueLabel(closedPeriod.end, CARD.payDay)

  // Cargos de contado nuevos: se cuentan en el periodo abierto (aún no se facturan).
  const singlePayments = expenses
    .filter((e) => !e.msiMonths && e.date >= period.start && e.date <= period.end)
    .map((e) => ({ ...e, contribution: e.amount }))
  const periodTotal = singlePayments.reduce((sum, e) => sum + e.contribution, 0)

  // Cuotas de MSI: la "cuota que toca" es la del corte ya cerrado, que es la que se paga ahora.
  const msiPayments = []
  let closedCargos = 0
  for (const e of expenses) {
    if (!e.msiMonths) {
      if (e.date >= closedPeriod.start && e.date <= closedPeriod.end) closedCargos += e.amount
      continue
    }
    const purchasePeriod = cardCycleForISO(CARD.cutDay, e.date)
    const position = closedIdx - cycleIndex(purchasePeriod.end)
    if (position >= 0 && position < e.msiMonths) {
      msiPayments.push({ ...e, contribution: e.amount / e.msiMonths, installment: position + 1 })
    }
  }
  const msiTotal = msiPayments.reduce((sum, e) => sum + e.contribution, 0)
  const closedTotal = closedCargos + msiTotal

  async function handleDelete(id) {
    await deleteExpense(id)
  }

  async function handleAddCargo(e) {
    e.preventDefault()
    const value = parseFloat(cargoAmount)
    if (!value || value <= 0) return
    await addExpense({
      amount: value,
      category: cargoCategory,
      method: 'tarjeta',
      msiMonths: null,
      note: cargoNote.trim(),
      date: cargoDate,
    })
    setCargoAmount('')
    setCargoNote('')
    setCargoCategory(CATEGORIES[0])
    setCargoDate(todayISO())
    setCargoSheetOpen(false)
  }

  async function handleAddExisting(e) {
    e.preventDefault()
    const value = parseFloat(amount)
    const paid = parseInt(paidInstallments, 10) || 0
    if (!value || value <= 0) return
    if (paid < 0 || paid >= msiMonths) return
    const purchaseIdx = closedIdx - paid
    await addExpense({
      amount: value,
      category,
      method: 'tarjeta',
      msiMonths,
      note: note.trim(),
      date: isoFromCycleIndex(purchaseIdx, CARD.cutDay),
    })
    setAmount('')
    setNote('')
    setCategory(CATEGORIES[0])
    setMsiMonths(MSI_OPTIONS[0])
    setPaidInstallments('0')
    setMsiSheetOpen(false)
  }

  return (
    <div className="page">
      <h1 className="page-title">Tarjeta</h1>

      <motion.div
        className="credit-card"
        initial={{ opacity: 0, rotateY: -15 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <p className="credit-card-bank">Crédito</p>
          <p className="credit-card-name">{CARD.name}</p>
        </div>
        <div>
          <p className="credit-card-amount">{formatCurrency(closedTotal)}</p>
          <p className="credit-card-cycle">
            Por pagar antes del {dueLabel} · corte {formatDateShort(closedPeriod.start)} - {formatDateShort(closedPeriod.end)}
          </p>
        </div>
      </motion.div>

      <div className="stat-row">
        <div className="stat">
          <p className="stat-label">Por pagar el {dueLabel}</p>
          <p className="stat-value negative">{formatCurrency(closedTotal)}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Gastado este periodo</p>
          <p className="stat-value negative">{formatCurrency(periodTotal)}</p>
        </div>
      </div>
      <p className="empty-state" style={{ textAlign: 'left', padding: '8px 2px' }}>
        Solo tarjeta {CARD.name} · "Gastado este periodo" es el corte en curso ({formatDateShort(period.start)} - {formatDateShort(period.end)}), no el mes calendario
      </p>

      <div className="section-header">
        <h2>Cargos de contado (este periodo)</h2>
        <button className="btn btn-secondary" onClick={() => setCargoSheetOpen(true)} style={{ padding: '8px 14px', fontSize: 13 }}>
          + Agregar cargo
        </button>
      </div>
      <div className="list">
        {singlePayments.length === 0 && <p className="empty-state">Sin cargos de contado en este periodo</p>}
        {singlePayments.map((e) => (
          <div className="list-item" key={e.id}>
            <div className="list-item-main">
              <span className="list-item-title">{e.category}</span>
              <span className="list-item-sub">
                {formatDateShort(e.date)}
                {e.note ? ` · ${e.note}` : ''}
              </span>
            </div>
            <span className="list-item-amount expense">-{formatCurrency(e.contribution)}</span>
            <button className="list-item-delete" onClick={() => handleDelete(e.id)} aria-label="Eliminar">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2>A meses sin intereses</h2>
        <button className="btn btn-secondary" onClick={() => setMsiSheetOpen(true)} style={{ padding: '8px 14px', fontSize: 13 }}>
          + Agregar compra a MSI
        </button>
      </div>

      <button
        type="button"
        className="msi-toggle"
        onClick={() => setMsiExpanded((v) => !v)}
      >
        <span>
          {msiPayments.length} activa{msiPayments.length === 1 ? '' : 's'} · {formatCurrency(msiTotal)}/mes
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
              {msiPayments.length === 0 && <p className="empty-state">No tienes compras a MSI activas</p>}
              {msiPayments.map((e) => (
                <div className="list-item" key={e.id}>
                  <div className="list-item-main">
                    <span className="list-item-title">{e.category}</span>
                    <span className="list-item-sub">
                      Cuota {e.installment}/{e.msiMonths} · Total {formatCurrency(e.amount)}
                      {e.note ? ` · ${e.note}` : ''}
                    </span>
                  </div>
                  <span className="list-item-amount expense">-{formatCurrency(e.contribution)}</span>
                  <button className="list-item-delete" onClick={() => handleDelete(e.id)} aria-label="Eliminar">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={cargoSheetOpen} title="Agregar cargo de contado" onClose={() => setCargoSheetOpen(false)}>
        <form onSubmit={handleAddCargo}>
          <div className="field">
            <label>Cantidad</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={cargoAmount}
              onChange={(e) => setCargoAmount(e.target.value)}
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
                  className={'pill' + (cargoCategory === c ? ' active' : '')}
                  onClick={() => setCargoCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Nota (opcional)</label>
            <input type="text" placeholder="Detalle..." value={cargoNote} onChange={(e) => setCargoNote(e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={cargoDate} onChange={(e) => setCargoDate(e.target.value)} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCargoSheetOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Guardar
            </button>
          </div>
        </form>
      </Sheet>

      <Sheet open={msiSheetOpen} title="Compra a MSI que ya traes" onClose={() => setMsiSheetOpen(false)}>
        <form onSubmit={handleAddExisting}>
          <div className="field">
            <label>Monto total de la compra</label>
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
            <label>Meses totales (MSI)</label>
            <div className="pill-row">
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
          <div className="field">
            <label>Cuotas ya pagadas (antes de la que toca pagar este {dueLabel})</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max={msiMonths - 1}
              value={paidInstallments}
              onChange={(e) => setPaidInstallments(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Nota (opcional)</label>
            <input type="text" placeholder="Ej. Laptop, viaje..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setMsiSheetOpen(false)}>
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
