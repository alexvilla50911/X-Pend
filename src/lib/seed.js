import { db, CARD } from './db'
import { cardCycleForISO, currentCardCycle, cycleIndex, isoFromCycleIndex } from './dates'

const SEED_KEY = 'xpend-seed-msi-2026-07'
const FIX_KEY = 'xpend-fix-msi-anchor-2026-07'

const ITEMS = [
  { amount: 527 * 3, category: 'Otro', msiMonths: 3, paid: 0, note: 'Proteína y creatina' },
  { amount: 287.75 * 3, category: 'Otro', msiMonths: 3, paid: 0, note: 'Rodilleras' },
  { amount: 504 * 24, category: 'Otro', msiMonths: 24, paid: 1, note: 'Apple Watch' },
]

const SEEDED_NOTES = ITEMS.map((i) => i.note)

// Las 3 compras de arriba se anclaron mal la primera vez (contra el periodo abierto
// en vez del corte que ya cerró). Este fix las borra y las vuelve a insertar bien ancladas.
export async function fixSeededMsiAnchor() {
  if (localStorage.getItem(FIX_KEY)) return
  localStorage.setItem(FIX_KEY, '1')

  const openPeriod = currentCardCycle(CARD.cutDay)
  const openIdx = cycleIndex(openPeriod.end)
  const closedPeriodEnd = isoFromCycleIndex(openIdx - 1, CARD.cutDay)
  const closedPeriod = cardCycleForISO(CARD.cutDay, closedPeriodEnd)
  const closedIdx = cycleIndex(closedPeriod.end)

  const existing = await db.expenses
    .where('method')
    .equals('tarjeta')
    .filter((e) => SEEDED_NOTES.includes(e.note))
    .toArray()
  await db.expenses.bulkDelete(existing.map((e) => e.id))

  await db.expenses.bulkAdd(
    ITEMS.map((item) => ({
      amount: item.amount,
      category: item.category,
      method: 'tarjeta',
      msiMonths: item.msiMonths,
      note: item.note,
      date: isoFromCycleIndex(closedIdx - item.paid, CARD.cutDay),
      uuid: crypto.randomUUID(),
      synced: false,
    })),
  )
}

export async function seedInitialMsi() {
  if (localStorage.getItem(SEED_KEY)) {
    await fixSeededMsiAnchor()
    return
  }
  localStorage.setItem(SEED_KEY, '1')
  localStorage.setItem(FIX_KEY, '1')

  const openPeriod = currentCardCycle(CARD.cutDay)
  const openIdx = cycleIndex(openPeriod.end)
  const closedPeriodEnd = isoFromCycleIndex(openIdx - 1, CARD.cutDay)
  const closedPeriod = cardCycleForISO(CARD.cutDay, closedPeriodEnd)
  const closedIdx = cycleIndex(closedPeriod.end)

  await db.expenses.bulkAdd(
    ITEMS.map((item) => ({
      amount: item.amount,
      category: item.category,
      method: 'tarjeta',
      msiMonths: item.msiMonths,
      note: item.note,
      date: isoFromCycleIndex(closedIdx - item.paid, CARD.cutDay),
      uuid: crypto.randomUUID(),
      synced: false,
    })),
  )
}
