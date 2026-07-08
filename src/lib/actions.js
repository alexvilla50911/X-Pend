import { db } from './db'
import { pushIncome, pushExpense, queueDelete } from './sync'

export async function addIncome(data) {
  const uuid = crypto.randomUUID()
  const record = { ...data, uuid, synced: false }
  const id = await db.incomes.add(record)
  pushIncome({ id, ...record })
  return id
}

export async function deleteIncome(id) {
  const record = await db.incomes.get(id)
  await db.incomes.delete(id)
  if (record?.uuid) queueDelete('incomes', record.uuid)
}

export async function addExpense(data) {
  const uuid = crypto.randomUUID()
  const record = { ...data, uuid, synced: false }
  const id = await db.expenses.add(record)
  pushExpense({ id, ...record })
  return id
}

export async function deleteExpense(id) {
  const record = await db.expenses.get(id)
  await db.expenses.delete(id)
  if (record?.uuid) queueDelete('expenses', record.uuid)
}
