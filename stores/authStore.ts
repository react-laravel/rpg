import { create } from 'zustand'
import { ApiError, apiRequest } from '@/lib/api'

export interface RpgUser {
  id: number
  name: string
  email?: string | null
  is_admin: boolean
  permissions: string[]
}

interface AuthState {
  user: RpgUser | null
  isAuthenticated: boolean
  loading: boolean
  restoreSession: () => Promise<RpgUser | null>
  exchangeTicket: (ticket: string) => Promise<RpgUser>
  logout: () => Promise<void>
  beginLogin: () => void
}

function centralLoginUrl(): string {
  const accountUrl = (process.env.NEXT_PUBLIC_ACCOUNT_URL || 'https://next.dogeow.com').replace(
    /\/$/,
    ''
  )
  const returnTo = typeof window === 'undefined' ? 'https://rpg.dogeow.com/' : window.location.href
  return `${accountUrl}/auth/sso/rpg?return_to=${encodeURIComponent(returnTo)}`
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  restoreSession: async () => {
    set({ loading: true })
    try {
      const user = await apiRequest<RpgUser>('/user', 'GET', undefined, {
        suppressUnauthorizedRedirect: true,
      })
      set({ user, isAuthenticated: true, loading: false })
      return user
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        set({ user: null, isAuthenticated: false, loading: false })
        return null
      }
      set({ loading: false })
      throw error
    }
  },

  exchangeTicket: async ticket => {
    set({ loading: true })
    try {
      const user = await apiRequest<RpgUser>(
        '/auth/exchange',
        'POST',
        { ticket },
        { suppressUnauthorizedRedirect: true }
      )
      set({ user, isAuthenticated: true, loading: false })
      return user
    } catch (error) {
      set({ user: null, isAuthenticated: false, loading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', 'POST', undefined, {
        suppressUnauthorizedRedirect: true,
      })
    } finally {
      set({ user: null, isAuthenticated: false, loading: false })
    }
  },

  beginLogin: () => {
    if (typeof window !== 'undefined') window.location.assign(centralLoginUrl())
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('rpg:unauthorized', () => {
    const state = getSafeState()
    if (state.isAuthenticated) {
      useAuthStore.setState({ user: null, isAuthenticated: false, loading: false })
    }
    state.beginLogin()
  })
}

function getSafeState() {
  return useAuthStore.getState()
}

export default useAuthStore
