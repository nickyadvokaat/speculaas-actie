import { reactive } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { SellerProfile } from '../types'

interface AuthState {
  initialized: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: SellerProfile | null
  profileLoaded: boolean
  error: string | null
}

export const authState = reactive<AuthState>({
  initialized: false,
  loading: true,
  session: null,
  user: null,
  profile: null,
  profileLoaded: false,
  error: null,
})

let initializedPromise: Promise<void> | null = null

export function initializeAuth(): Promise<void> {
  if (!supabase) {
    authState.initialized = true
    authState.loading = false
    return Promise.resolve()
  }
  if (initializedPromise) return initializedPromise

  initializedPromise = (async () => {
    supabase.auth.onAuthStateChange((_event, session) => {
      authState.session = session
      authState.user = session?.user ?? null
      authState.profileLoaded = false
      authState.error = null
      if (session) {
        window.setTimeout(() => void refreshProfile(), 0)
      } else {
        authState.profile = null
        authState.profileLoaded = true
      }
    })

    const { data, error } = await supabase.auth.getSession()
    if (error) authState.error = error.message
    authState.session = data.session
    authState.user = data.session?.user ?? null
    if (data.session) await refreshProfile()
    else authState.profileLoaded = true
    authState.initialized = true
    authState.loading = false
  })()

  return initializedPromise
}

export async function refreshProfile(): Promise<void> {
  if (!supabase || !authState.user) {
    authState.profile = null
    authState.profileLoaded = true
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', authState.user.id)
    .maybeSingle()

  if (error) {
    authState.error = error.message
    authState.profileLoaded = true
    return
  }
  authState.profile = data
  authState.profileLoaded = true
}

export async function requestMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('De Supabase-configuratie ontbreekt.')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}?auth=profile`,
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

export async function signInForDevelopment(email: string, password: string): Promise<void> {
  if (!import.meta.env.DEV) {
    throw new Error('Wachtwoordaanmelding is alleen beschikbaar tijdens lokale ontwikkeling.')
  }
  if (!supabase) throw new Error('De Supabase-configuratie ontbreekt.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function updateDisplayName(displayName: string): Promise<void> {
  if (!supabase || !authState.user) {
    throw new Error('Meld je eerst aan om een ranglijstnaam in te stellen.')
  }
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', authState.user.id)
  if (error) throw error
  await refreshProfile()
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
