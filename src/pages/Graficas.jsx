import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { db, CATEGORIES } from '../lib/db'
import { expandExpenseByMonth, formatCurrency, monthKey, monthLabel, todayISO } from '../lib/dates'

const CATEGORY_COLORS = {
  Comida: '#f59e0b',
  Salidas: '#ec4899',
  Capricho: '#8b5cf6',
  Pagos: '#22c55e',
  Otro: '#38bdf8',
}

function lastNMonthKeys(n) {
  const keys = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#1b2438',
        border: '1px solid #253150',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ margin: '0 0 4px', color: '#94a3b8' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: 0, color: p.color, fontWeight: 700 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Graficas() {
  const incomes = useLiveQuery(() => db.incomes.toArray(), [])
  const expenses = useLiveQuery(() => db.expenses.toArray(), [])

  if (!incomes || !expenses) return null

  const months = lastNMonthKeys(6)
  const thisMonth = monthKey(todayISO())

  const expenseContribs = expenses.flatMap((e) =>
    expandExpenseByMonth(e).map((c) => ({ ...c, category: e.category })),
  )

  const monthlyData = months.map((key) => {
    const income = incomes.filter((i) => monthKey(i.date) === key).reduce((s, i) => s + i.amount, 0)
    const expense = expenseContribs.filter((c) => c.key === key).reduce((s, c) => s + c.amount, 0)
    return { key, label: monthLabel(key).split(' ')[0].slice(0, 3), income, expense }
  })

  const categoryData = CATEGORIES.map((cat) => ({
    name: cat,
    value: expenseContribs
      .filter((c) => c.category === cat && c.key <= thisMonth)
      .reduce((s, c) => s + c.amount, 0),
  })).filter((c) => c.value > 0)

  const bestIncomeMonth = [...monthlyData].sort((a, b) => b.income - a.income)[0]
  const worstExpenseMonth = [...monthlyData].sort((a, b) => b.expense - a.expense)[0]
  const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0]

  return (
    <div className="page">
      <h1 className="page-title">Gráficas</h1>

      <div className="highlight-row">
        <div className="highlight-box">
          <p className="label">Mejor mes de ingreso</p>
          <p className="value">{bestIncomeMonth?.income ? monthLabel(bestIncomeMonth.key) : '—'}</p>
          <p className="sub">{formatCurrency(bestIncomeMonth?.income || 0)}</p>
        </div>
        <div className="highlight-box">
          <p className="label">Mes de más gasto</p>
          <p className="value">{worstExpenseMonth?.expense ? monthLabel(worstExpenseMonth.key) : '—'}</p>
          <p className="sub">{formatCurrency(worstExpenseMonth?.expense || 0)}</p>
        </div>
      </div>

      {topCategory && (
        <div className="highlight-row">
          <div className="highlight-box">
            <p className="label">Categoría con más gasto</p>
            <p className="value">{topCategory.name}</p>
            <p className="sub">{formatCurrency(topCategory.value)}</p>
          </div>
        </div>
      )}

      <div className="chart-card">
        <h3>Ingresos vs Gastos (últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#253150" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={50} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey="income" name="Ingreso" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name="Gasto" fill="#f87171" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Gasto por categoría</h3>
        {categoryData.length === 0 ? (
          <p className="empty-state">Aún no hay gastos registrados</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<TooltipBox />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        {categoryData.length > 0 && (
          <div className="pill-row" style={{ padding: '0 12px 8px' }}>
            {categoryData.map((c) => (
              <span key={c.name} className="pill" style={{ borderColor: CATEGORY_COLORS[c.name] }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: CATEGORY_COLORS[c.name],
                    marginRight: 6,
                  }}
                />
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
