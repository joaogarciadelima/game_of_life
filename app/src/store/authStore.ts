import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, hasSupabase } from '../lib/supabase'

export interface AuthProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  isGuest: boolean
}

interface AuthState {
  profile: AuthProfile | null
  loading: boolean
  error: string | null
  initialized: boolean
  init: () => Promise<void>
  signInGoogle: () => Promise<void>
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>
  signInGuest: (displayName: string) => void
  signOut: () => Promise<void>
}

const guestFromLocal = (): AuthProfile | null => {
  try {
    const raw = localStorage.getItem('guest_profile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveGuest = (profile: AuthProfile | null) => {
  if (profile) localStorage.setItem('guest_profile', JSON.stringify(profile))
  else localStorage.removeItem('guest_profile')
}

const profileFromUser = (u: User): AuthProfile => ({
  id: u.id,
  displayName:
    (u.user_metadata?.display_name as string) ||
    (u.user_metadata?.full_name as string) ||
    u.email?.split('@')[0] ||
    'Jogador',
  avatarUrl: (u.user_metadata?.avatar_url as string) ?? null,
  isGuest: false,
})

export const useAuth = create<AuthState>((set) => ({
  profile: null,
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (!hasSupabase || !supabase) {
      // Modo offline \u2014 restaura convidado se houver
      const guest = guestFromLocal()
      set({ profile: guest, initialized: true })
      return
    }
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      set({ profile: profileFromUser(data.session.user), initialized: true })
    } else {
      const guest = guestFromLocal()
      set({ profile: guest, initialized: true })
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        saveGuest(null)
        set({ profile: profileFromUser(session.user) })
      } else {
        const guest = guestFromLocal()
        set({ profile: guest })
      }
    })
  },

  signInGoogle: async () => {
    if (!supabase) return
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) set({ error: error.message })
    set({ loading: false })
  },

  signInEmail: async (email, password) => {
    if (!supabase) return
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message })
    set({ loading: false })
  },

  signUpEmail: async (email, password, displayName) => {
    if (!supabase) return
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) set({ error: error.message })
    else set({ error: 'Confira seu email para confirmar a conta.' })
    set({ loading: false })
  },

  signInGuest: (displayName) => {
    const profile: AuthProfile = {
      id: `guest_${Math.random().toString(36).slice(2, 10)}`,
      displayName: displayName.trim() || 'Convidado',
      avatarUrl: null,
      isGuest: true,
    }
    saveGuest(profile)
    set({ profile })
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut()
    saveGuest(null)
    set({ profile: null })
  },
}))
