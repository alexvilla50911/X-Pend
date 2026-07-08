import { NavLink } from 'react-router-dom'

const items = [
  {
    to: '/',
    label: 'Inicio',
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
  },
  {
    to: '/gastos',
    label: 'Gastos',
    icon: (
      <path d="M4 6h16M4 12h16M4 18h10" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    ),
  },
  {
    to: '/tarjeta',
    label: 'Tarjeta',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2.5" strokeWidth="1.8" fill="none" />
        <path d="M3 10.5h18" strokeWidth="1.8" />
      </>
    ),
  },
  {
    to: '/graficas',
    label: 'Gráficas',
    icon: (
      <path d="M4 20V10M11 20V4M18 20v-7" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    ),
  },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          <svg viewBox="0 0 24 24" stroke="currentColor">
            {item.icon}
          </svg>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
