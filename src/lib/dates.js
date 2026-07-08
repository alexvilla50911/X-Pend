export function todayISO() {
  return toISO(new Date())
}

export function monthKey(isoDate) {
  return isoDate.slice(0, 7)
}

export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatDateShort(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
}

// Ciclo de corte de tarjeta: va del (cutDay + 1) de un mes al cutDay del siguiente.
export function currentCardCycle(cutDay, reference = new Date()) {
  const day = reference.getDate()
  let cycleEnd
  if (day <= cutDay) {
    cycleEnd = new Date(reference.getFullYear(), reference.getMonth(), cutDay)
  } else {
    cycleEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, cutDay)
  }
  const cycleStart = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() - 1, cutDay + 1)
  return { start: toISO(cycleStart), end: toISO(cycleEnd) }
}

// Igual que currentCardCycle pero a partir de una fecha ISO cualquiera (no solo "hoy").
export function cardCycleForISO(cutDay, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return currentCardCycle(cutDay, new Date(y, m - 1, d))
}

// Índice absoluto de un ciclo (para comparar "distancia" entre ciclos), a partir de su fecha de corte.
export function cycleIndex(cycleEndISO) {
  const [y, m] = cycleEndISO.split('-').map(Number)
  return y * 12 + (m - 1)
}

// Inverso de cycleIndex: reconstruye la fecha de corte (ISO) de un ciclo a partir de su índice.
export function isoFromCycleIndex(idx, cutDay) {
  const year = Math.floor(idx / 12)
  const month = idx % 12
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(cutDay).padStart(2, '0')}`
}

// Reparte una compra a MSI en sus meses calendario correspondientes (uno por cuota),
// para que los resúmenes mensuales sumen solo la mensualidad y no el total de la compra.
export function expandExpenseByMonth(expense) {
  if (!expense.msiMonths) {
    return [{ key: monthKey(expense.date), amount: expense.amount }]
  }
  const [y, m] = expense.date.split('-').map(Number)
  const startIdx = y * 12 + (m - 1)
  const monthly = expense.amount / expense.msiMonths
  const out = []
  for (let i = 0; i < expense.msiMonths; i++) {
    const idx = startIdx + i
    const yy = Math.floor(idx / 12)
    const mm = (idx % 12) + 1
    out.push({ key: `${yy}-${String(mm).padStart(2, '0')}`, amount: monthly })
  }
  return out
}

// En qué cuota va una compra a MSI ahorita mismo (contra el corte ya cerrado, que es
// el que se paga en la próxima fecha límite). Devuelve null si ya se liquidó.
export function msiInstallmentInfo(expense, cutDay) {
  if (!expense.msiMonths) return null
  const openPeriod = currentCardCycle(cutDay)
  const openIdx = cycleIndex(openPeriod.end)
  const closedPeriodEnd = isoFromCycleIndex(openIdx - 1, cutDay)
  const closedPeriod = cardCycleForISO(cutDay, closedPeriodEnd)
  const closedIdx = cycleIndex(closedPeriod.end)
  const purchasePeriod = cardCycleForISO(cutDay, expense.date)
  const position = closedIdx - cycleIndex(purchasePeriod.end)
  if (position < 0 || position >= expense.msiMonths) return null
  return { installment: position + 1, months: expense.msiMonths }
}

// Fecha límite de pago: cae el payDay del mes siguiente al corte que ya cerró.
export function paymentDueLabel(periodEndISO, payDay) {
  const [y, m] = periodEndISO.split('-').map(Number)
  const date = new Date(y, m, payDay)
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
