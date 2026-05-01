import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)
const PROFILE_CACHE = 'fuel.profile'

function readCache() {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE)
    return raw ? JSON.parse(raw) : null
  } catch {
    localStorage.removeItem(PROFILE_CACHE)
    return null
  }
}

export function AuthProvider({ children }) {
  const cachedProfile = readCache()

  const [profile, setProfile] = useState(cachedProfile)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!cachedProfile)

  const clearProfile = useCallback(() => {
    setProfile(null)
    localStorage.removeItem(PROFILE_CACHE)
  }, [])

  const loadProfile = useCallback(async (userId) => {
    try {
      if (!userId) {
        clearProfile()
        return null
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error cargando profile:', error)
        clearProfile()
        return null
      }

      if (!data) {
        clearProfile()
        return null
      }

      if (!data.is_active) {
        clearProfile()
        await supabase.auth.signOut()
        setSession(null)
        return null
      }

      localStorage.setItem(PROFILE_CACHE, JSON.stringify(data))
      setProfile(data)

      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.warn('No se pudo actualizar last_seen_at:', error)
        })

      return data
    } catch (err) {
      console.error('Crash en loadProfile:', err)
      clearProfile()
      return null
    }
  }, [clearProfile])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        setLoading(true)

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Error getSession:', error)
          setSession(null)
          clearProfile()
          return
        }

        setSession(session)

        if (!session) {
          clearProfile()
          return
        }

        const cached = readCache()

        if (cached && cached.id !== session.user.id) {
          clearProfile()
        }

        const loadedProfile = await loadProfile(session.user.id)

        if (!mounted) return

        if (!loadedProfile) {
          clearProfile()
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (!mounted) return
        setSession(null)
        clearProfile()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'INITIAL_SESSION') return

      try {
        setLoading(true)
        setSession(newSession)

        if (!newSession) {
          clearProfile()
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          setLoading(false)
          return
        }

        const loadedProfile = await loadProfile(newSession.user.id)

        if (!loadedProfile) {
          clearProfile()
        }
      } catch (err) {
        console.error('Auth state error:', err)
        setSession(null)
        clearProfile()
      } finally {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile, clearProfile])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    if (data?.session?.user?.id) {
      setSession(data.session)
      await loadProfile(data.session.user.id)
    }

    return data
  }

  const register = async ({ email, password, fullName, companyName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    })

    if (error) throw error

    if (data?.session?.user?.id) {
      setSession(data.session)
      await loadProfile(data.session.user.id)
    }

    return data
  }

  const logout = async () => {
    try {
      const sid = sessionStorage.getItem('fuel.sess')

      if (sid) {
        supabase
          .from('user_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', sid)
          .then(() => {})
      }

      sessionStorage.removeItem('fuel.sess')
      clearProfile()
      setSession(null)

      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
      clearProfile()
      setSession(null)
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        login,
        register,
        logout,
        isAdmin,
        loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
