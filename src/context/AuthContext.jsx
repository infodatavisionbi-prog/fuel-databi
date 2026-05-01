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
  // Restore profile from cache synchronously — zero network, instant
  const [profile, setProfile] = useState(readCache)
  const [session, setSession] = useState(null)
  // Skip loading screen entirely when we already have a cached profile
  const [loading, setLoading] = useState(!readCache())

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
    const hasCache = !!readCache()

    // Safety valve: never block the UI more than 12 seconds
    const failsafe = hasCache ? null : setTimeout(() => setLoading(false), 12000)

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session)

        if (!session) {
          // Logged out — clear any stale cache
          setProfile(null)
          localStorage.removeItem(PROFILE_CACHE)
          return
        }

        // If cache exists, make sure it belongs to THIS user
        const cached = readCache()
        if (cached && cached.id !== session.user.id) {
          setProfile(null)
          localStorage.removeItem(PROFILE_CACHE)
        }

        if (hasCache) {
          // Cache is valid — refresh DB in background, don't block UI
          loadProfile(session.user.id).catch(console.error)
        } else {
          // No cache — must fetch before releasing loading state
          await loadProfile(session.user.id).catch((err) => {
            console.error('loadProfile error:', err)
          })
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
        if (failsafe) clearTimeout(failsafe)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // INITIAL_SESSION is handled by getSession() above — skip to avoid double load
        if (_event === 'INITIAL_SESSION') return
        try {
          setSession(session)
          if (session) {
            // TOKEN_REFRESHED: JWT rotated but profile hasn't changed, no DB round-trip needed
            if (_event !== 'TOKEN_REFRESHED') {
              await loadProfile(session.user.id)
            }
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
      options: { data: { full_name: fullName, company_name: companyName } },
    })
    if (error) throw error
    return data
  }

  const logout = async () => {
    const sid = sessionStorage.getItem('fuel.sess')
    if (sid) {
      supabase.from('user_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sid).then(() => {})
      sessionStorage.removeItem('fuel.sess')
    }
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
