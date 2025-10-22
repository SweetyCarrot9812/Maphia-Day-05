import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Place } from '@/types'

interface SearchFilters {
  category: string | null
  sortBy: 'distance' | 'review' | 'rating'
}

interface SearchState {
  // State
  query: string
  results: Place[]
  selectedPlace: Place | null
  isLoading: boolean
  error: string | null
  filters: SearchFilters
  hasMore: boolean
  currentPage: number

  // Actions
  setQuery: (query: string) => void
  setResults: (results: Place[]) => void
  appendResults: (results: Place[]) => void
  setSelectedPlace: (place: Place | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  setHasMore: (hasMore: boolean) => void
  clearSearch: () => void

  // Async Actions
  search: (query: string) => Promise<void>
  loadMore: () => Promise<void>
}

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // Initial State
      query: '',
      results: [],
      selectedPlace: null,
      isLoading: false,
      error: null,
      filters: {
        category: null,
        sortBy: 'distance',
      },
      hasMore: false,
      currentPage: 1,

      // Setters
      setQuery: (query) => set({ query }),
      setResults: (results) => set({ results, currentPage: 1 }),
      appendResults: (newResults) =>
        set((state) => ({
          results: [...state.results, ...newResults],
          currentPage: state.currentPage + 1,
        })),
      setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),
      setHasMore: (hasMore) => set({ hasMore }),

      clearSearch: () =>
        set({
          query: '',
          results: [],
          selectedPlace: null,
          error: null,
          currentPage: 1,
          hasMore: false,
        }),

      // Search
      search: async (query) => {
        if (!query.trim()) {
          set({ results: [], error: null })
          return
        }

        set({ isLoading: true, error: null, query })

        try {
          const res = await fetch(
            `/api/search?query=${encodeURIComponent(query)}&display=10&start=1`
          )

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const data = await res.json()

          set({
            results: data.places,
            hasMore: data.places.length === 10,
            currentPage: 1,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '검색 실패'
          set({ error: message, isLoading: false, results: [] })
        }
      },

      // Load More (Pagination)
      loadMore: async () => {
        const { query, currentPage, isLoading } = get()
        if (isLoading) return

        set({ isLoading: true, error: null })

        try {
          const start = currentPage * 10 + 1

          const res = await fetch(
            `/api/search?query=${encodeURIComponent(query)}&display=10&start=${start}`
          )

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const data = await res.json()

          get().appendResults(data.places)

          set({
            hasMore: data.places.length === 10,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '더보기 실패'
          set({ error: message, isLoading: false })
        }
      },
    }),
    { name: 'SearchStore' }
  )
)
