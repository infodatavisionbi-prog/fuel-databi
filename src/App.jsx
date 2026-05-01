import { Component } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import AuthScreen from './components/auth/AuthScreen.jsx'
import Layout from './components/layout/Layout.jsx'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f0f9ff', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ maxWidth: 480, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>Error al cargar la aplicación</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20, wordBreak: 'break-all' }}>
              {this.state.error.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 20px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppGate() {
  const { session, profile, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="loading-panel">
          <img src="/logo.png" alt="DataVision" style={{ width: 180, height: 'auto', objectFit: 'contain', marginBottom: 20 }} />
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
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppGate />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
