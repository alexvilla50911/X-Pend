import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pullAll } from '../lib/sync'

export default function Cuenta() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSendLink(e) {
    e.preventDefault()
    setSent(false)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setSent(true)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleSyncNow() {
    setSyncing(true)
    await pullAll()
    setSyncing(false)
  }

  if (loading) return null

  return (
    <div className="page">
      <h1 className="page-title">Cuenta</h1>

      {session ? (
        <div className="card">
          <p className="list-item-title">Respaldo activo</p>
          <p className="list-item-sub" style={{ marginTop: 4 }}>
            {session.user.email}
          </p>
          <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={handleSyncNow} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
          <button className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="list-item-sub" style={{ marginBottom: 16 }}>
            Inicia sesión con tu correo para respaldar tus datos en la nube. La app sigue
            funcionando sin conexión igual que siempre — esto es solo un respaldo.
          </p>
          <form onSubmit={handleSendLink}>
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit">
              Enviar link de acceso
            </button>
          </form>
          {sent && (
            <p className="empty-state" style={{ marginTop: 12 }}>
              Revisa tu correo y abre el link desde este mismo iPhone.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
