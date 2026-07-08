import Dexie from 'dexie'

export const CATEGORIES = ['Comida', 'Salidas', 'Capricho', 'Pagos', 'Otro']

export const CARD = {
  name: 'BANAMEX ORO',
  cutDay: 21,
  payDay: 13,
}

export const METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'debito', label: 'Tarjeta de Débito' },
  { id: 'tarjeta', label: CARD.name },
]

export function methodLabel(method) {
  return METHODS.find((m) => m.id === method)?.label || method
}

export const MSI_OPTIONS = [3, 6, 9, 12, 18]

export const db = new Dexie('xpend')

db.version(1).stores({
  incomes: '++id, date',
  expenses: '++id, date, category, method',
})

db.version(2)
  .stores({
    incomes: '++id, date, uuid',
    expenses: '++id, date, category, method, uuid',
    pendingDeletes: '++id, uuid, table',
  })
  .upgrade(async (tx) => {
    await tx
      .table('incomes')
      .toCollection()
      .modify((rec) => {
        if (!rec.uuid) rec.uuid = crypto.randomUUID()
        if (rec.synced === undefined) rec.synced = false
      })
    await tx
      .table('expenses')
      .toCollection()
      .modify((rec) => {
        if (!rec.uuid) rec.uuid = crypto.randomUUID()
        if (rec.synced === undefined) rec.synced = false
      })
  })
