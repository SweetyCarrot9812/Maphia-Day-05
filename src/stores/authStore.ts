import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/infrastructure/supabase/client'
import type { User } from '@/types'

interface AuthState {
  // State
  user: User | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async Actions
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, nickname: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isLoading: false,
      error: null,

      // Setters
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null })

        try {
          const supabase = createClient()

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          // 사용자 프로필 조회
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (userError) throw userError

          set({ user: userData, isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '로그인 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Signup
      signup: async (email, password, nickname) => {
        set({ isLoading: true, error: null })

        try {
          const supabase = createClient()

          // 1. Auth 사용자 생성
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { nickname },
            },
          })

          if (error) throw error
          if (!data.user) throw new Error('회원가입 실패')

          // 2. users 테이블에서 프로필 조회 (트리거로 자동 생성됨)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (userError) {
            // 프로필이 없으면 수동으로 생성
            const { data: newUserData, error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email,
                nickname,
              })
              .select()
              .single()

            if (insertError) throw insertError
            set({ user: newUserData, isLoading: false })
          } else {
            set({ user: userData, isLoading: false })
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : '회원가입 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Logout
      logout: async () => {
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
          set({ user: null, error: null })
        } catch (error) {
          console.error('Logout error:', error)
        }
      },

      // Check Session (자동 로그인)
      checkSession: async () => {
        const supabase = createClient()

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userData) {
            set({ user: userData })
          }
        } else {
          set({ user: null })
        }
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }), // user만 persist
    }
  )
)

// Selectors
export const selectIsAuthenticated = (state: AuthState) => state.user !== null
export const selectUserNickname = (state: AuthState) =>
  state.user?.nickname || '게스트'
