import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import AuthScreen from './components/auth/AuthScreen.jsx'
import Layout from './components/layout/Layout.jsx'

function AppGate() {
  const { session, profile, loading } = useAuth()

  // Muestra loading mientras verifica sesión o carga el perfil
  if (loading || (session && !profile)) {
    return (
      <div className="auth-screen">
        <div className="loading-panel">
          <div className="brand-mark">fuel</div>
          <div className="spinner" />
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
