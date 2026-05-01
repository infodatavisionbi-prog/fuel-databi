import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import AuthScreen from './components/auth/AuthScreen.jsx'
import Layout from './components/layout/Layout.jsx'

function AppGate() {
  const { session, profile, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="loading-panel">
          <div className="brand-mark">fuel</div>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  // Session exists but no profile row — schema not applied or user created manually
  if (session && !profile) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <img src="/logo.png" alt="DataVision" style={{ width: '100%', maxWidth: 280, height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 24px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Perfil no encontrado</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Tu cuenta no tiene perfil en la base de datos. Asegurate de haber ejecutado el schema SQL en Supabase y de haberte registrado desde la app.
          </div>
          <button className="btn btn-secondary" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  return session ? <Layout /> : <AuthScreen />
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
