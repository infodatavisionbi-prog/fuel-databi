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

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout Supabase')), ms)
    ),
  ])
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const clearProfile = useCallback(() => {
    setProfile(null)
    localStorage.removeItem(PROFILE_CACHE)
  }, [])

  const loadProfile = useCallback(async (userId) => {
    try {
      console.log('Cargando profile:', userId)

      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        6000
      )

      if (error) {
        console.error('Profile error:', error)
        clearProfile()
        return null
      }

      if (!data) {
        console.warn('Profile no encontrado')
        clearProfile()
        return null
      }

      if (!data.is_active) {
        console.warn('Usuario inactivo')
        clearProfile()
        await supabase.auth.signOut()
        setSession(null)
        return null
      }

      localStorage.setItem(PROFILE_CACHE, JSON.stringify(data))
      setProfile(data)

      // No bloquea nada
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.warn('last_seen_at error:', error)
        })

      return data
    } catch (err) {
      console.error('loadProfile timeout/crash:', err)
      clearProfile()
      return null
    }
  }, [clearProfile])

  useEffect(() => {
    let alive = true

    async function initAuth() {
      try {
        console.log('Init auth...')

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          6000
        )

        if (!alive) return

        if (error) {
          console.error('getSession error:', error)
          setSession(null)
          clearProfile()
          return
        }

        const currentSession = data?.session ?? null
        setSession(currentSession)

        if (!currentSession) {
          clearProfile()
          return
        }

        await loadProfile(currentSession.user.id)
      } catch (err) {
        console.error('initAuth timeout/crash:', err)
        if (!alive) return
        setSession(null)
        clearProfile()
      } finally {
        if (alive) {
          console.log('Auth loading false')
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth event:', event)

      if (event === 'INITIAL_SESSION') return

      setSession(newSession)

      if (!newSession) {
        clearProfile()
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN') {
        await loadProfile(newSession.user.id)
      }

      setLoading(false)
    })

    return () => {
      alive = false
      data?.subscription?.unsubscribe()
    }
  }, [loadProfile, clearProfile])

  const login = async (email, password) => {
    setLoading(true)

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        6000
      )

      if (error) throw error

      setSession(data.session)

      if (data?.session?.user?.id) {
        await loadProfile(data.session.user.id)
      }

      return data
    } finally {
      setLoading(false)
    }
  }

  const register = async ({ email, password, fullName, companyName }) => {
    setLoading(true)

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_name: companyName,
            },
          },
        }),
        6000
      )

      if (error) throw error

      setSession(data.session)

      if (data?.session?.user?.id) {
        await loadProfile(data.session.user.id)
      }

      return data
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    clearProfile()
    setSession(null)
    await supabase.auth.signOut()
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
