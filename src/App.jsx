import { HashRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav.jsx'
import Home from './pages/Home.jsx'
import Gastos from './pages/Gastos.jsx'
import Tarjeta from './pages/Tarjeta.jsx'
import Graficas from './pages/Graficas.jsx'
import Cuenta from './pages/Cuenta.jsx'
import './App.css'

export default function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/tarjeta" element={<Tarjeta />} />
            <Route path="/graficas" element={<Graficas />} />
            <Route path="/cuenta" element={<Cuenta />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </HashRouter>
  )
}
