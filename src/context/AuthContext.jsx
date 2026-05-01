import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)
const PROFILE_CACHE = 'fuel.profile'

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(() => {
    // Restore profile from cache synchronously — no network, instant
    try {
      const raw = localStorage.getItem(PROFILE_CACHE)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  // Start as "loading" only if there is NO cached profile to show
  const [loading, setLoading]   = useState(() => !localStorage.getItem(PROFILE_CACHE))

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      setProfile(null)
      localStorage.removeItem(PROFILE_CACHE)
      return null
    }

    if (!data.is_active) {
      localStorage.removeItem(PROFILE_CACHE)
      await supabase.auth.signOut()
      setProfile(null)
      setSession(null)
      return null
    }

    localStorage.setItem(PROFILE_CACHE, JSON.stringify(data))
    setProfile(data)
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {})
    return data
  }, [])

  useEffect(() => {
    // Verify session in background — does not block the UI
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          // Make sure cached profile belongs to this user
          const raw = localStorage.getItem(PROFILE_CACHE)
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              if (parsed.id !== session.user.id) {
                setProfile(null)
                localStorage.removeItem(PROFILE_CACHE)
              }
            } catch {
              localStorage.removeItem(PROFILE_CACHE)
            }
          }
          // Refresh from DB in background
          loadProfile(session.user.id).catch(console.error)
        } else {
          // No valid session — clear stale cache
          setProfile(null)
          localStorage.removeItem(PROFILE_CACHE)
        }
      })
      .catch((error) => {
        console.error('Auth init error:', error)
        setSession(null)
        setProfile(null)
        localStorage.removeItem(PROFILE_CACHE)
        supabase.auth.signOut().catch(() => {})
      })
      .finally(() => {
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session)
          if (session) {
            await loadProfile(session.user.id)
          } else {
            setProfile(null)
            localStorage.removeItem(PROFILE_CACHE)
          }
        } catch (error) {
          console.error('Auth state error:', error)
          supabase.auth.signOut().catch(() => {})
          setSession(null)
          setProfile(null)
          localStorage.removeItem(PROFILE_CACHE)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const register = async ({ email, password, fullName, companyName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName },
      },
    })
    if (error) throw error
    return data
  }

  const logout = async () => {
    localStorage.removeItem(PROFILE_CACHE)
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      session, profile, loading,
      login, register, logout,
      isAdmin, loadProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
