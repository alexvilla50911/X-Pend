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
