import { db } from './db'
import { supabase } from './supabase'

let userIdCache = null

supabase.auth.onAuthStateChange((_event, session) => {
  userIdCache = session?.user?.id ?? null
  if (userIdCache) {
    pullAll()
    flushPendingDeletes()
    flushUnsynced()
  }
})

export async function getUserId() {
  if (userIdCache !== null) return userIdCache
  const { data } = await supabase.auth.getSession()
  userIdCache = data.session?.user?.id ?? null
  return userIdCache
}

function toIncomeRow(userId, income) {
  return { id: income.uuid, user_id: userId, amount: income.amount, note: income.note || '', date: income.date }
}

function toExpenseRow(userId, expense) {
  return {
    id: expense.uuid,
    user_id: userId,
    amount: expense.amount,
    category: expense.category,
    method: expense.method,
    msi_months: expense.msiMonths ?? null,
    note: expense.note || '',
    date: expense.date,
  }
}

export async function pushIncome(income) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('incomes').upsert(toIncomeRow(userId, income))
  if (!error) await db.incomes.update(income.id, { synced: true })
}

export async function pushExpense(expense) {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('expenses').upsert(toExpenseRow(userId, expense))
  if (!error) await db.expenses.update(expense.id, { synced: true })
}

export async function queueDelete(table, uuid) {
  await db.pendingDeletes.add({ table, uuid })
  flushPendingDeletes()
}

export async function flushPendingDeletes() {
  const userId = await getUserId()
  if (!userId) return
  const pending = await db.pendingDeletes.toArray()
  for (const p of pending) {
    const { error } = await supabase.from(p.table).delete().eq('id', p.uuid)
    if (!error) await db.pendingDeletes.delete(p.id)
  }
}

export async function flushUnsynced() {
  const userId = await getUserId()
  if (!userId) return
  const incomes = await db.incomes.filter((i) => !i.synced).toArray()
  for (const income of incomes) await pushIncome(income)
  const expenses = await db.expenses.filter((e) => !e.synced).toArray()
  for (const expense of expenses) await pushExpense(expense)
}

export async function pullAll() {
  const userId = await getUserId()
  if (!userId) return
  const pendingUuids = new Set((await db.pendingDeletes.toArray()).map((p) => p.uuid))

  const { data: incomeRows } = await supabase.from('incomes').select('*')
  for (const row of incomeRows || []) {
    if (pendingUuids.has(row.id)) continue
    const existing = await db.incomes.where('uuid').equals(row.id).first()
    const record = { uuid: row.id, amount: row.amount, note: row.note || '', date: row.date, synced: true }
    if (existing) await db.incomes.update(existing.id, record)
    else await db.incomes.add(record)
  }

  const { data: expenseRows } = await supabase.from('expenses').select('*')
  for (const row of expenseRows || []) {
    if (pendingUuids.has(row.id)) continue
    const existing = await db.expenses.where('uuid').equals(row.id).first()
    const record = {
      uuid: row.id,
      amount: row.amount,
      category: row.category,
      method: row.method,
      msiMonths: row.msi_months,
      note: row.note || '',
      date: row.date,
      synced: true,
    }
    if (existing) await db.expenses.update(existing.id, record)
    else await db.expenses.add(record)
  }
}

window.addEventListener('online', () => {
  flushPendingDeletes()
  flushUnsynced()
})
