import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const withTimeout = (promise, ms = 10000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout conectando con Supabase')), ms)
      }),
    ])
  }

  const loadProfile = useCallback(async (userId) => {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const user = userData.user
      const metadata = user?.user_metadata || {}
      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user?.email || '',
          full_name: metadata.full_name || '',
          company_name: metadata.company_name || '',
          role: 'user',
          is_active: true,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      data = createdProfile
    }

    if (!data.is_active) {
      await supabase.auth.signOut()
      setProfile(null)
      setSession(null)
      return null
    }

    setProfile(data)
    supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {})

    return data
  }, [])

  useEffect(() => {
    withTimeout(supabase.auth.getSession())
      .then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          return loadProfile(session.user.id)
        }
        return null
      })
      .catch(async (error) => {
        console.error('Auth init error:', error)
        await supabase.auth.signOut().catch(() => {})
        setSession(null)
        setProfile(null)
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
          }
        } catch (error) {
          console.error('Auth state error:', error)
          await supabase.auth.signOut().catch(() => {})
          setSession(null)
          setProfile(null)
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
