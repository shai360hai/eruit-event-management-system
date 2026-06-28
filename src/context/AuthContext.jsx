import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const ADMIN_EMAIL = 'shai360hai@gmail.com'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setLoading(false)
    })

    // Listen for auth changes (including after OAuth redirect)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
      // Clean URL after successful login
      if (event === 'SIGNED_IN' && window.location.search.includes('code=')) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.email === ADMIN_EMAIL, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
