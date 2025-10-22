import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Review } from '@/types'

interface ReviewState {
  // State
  reviews: Review[]
  isLoading: boolean
  error: string | null

  // Actions
  setReviews: (reviews: Review[]) => void
  addReview: (review: Review) => void
  updateReview: (reviewId: string, updates: Partial<Review>) => void
  deleteReview: (reviewId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Async Actions
  fetchReviews: (placeId: string) => Promise<void>
  createReview: (data: {
    place_id: string
    place_name: string
    rating: number
    content: string
  }) => Promise<void>
  updateReviewById: (reviewId: string, data: { rating: number; content: string }) => Promise<void>
  deleteReviewById: (reviewId: string) => Promise<void>

  // Selectors
  getReviewsByPlace: (placeId: string) => Review[]
  getAverageRating: (placeId: string) => number
  getReviewCount: (placeId: string) => number
}

export const useReviewStore = create<ReviewState>()(
  devtools(
    (set, get) => ({
      // Initial State
      reviews: [],
      isLoading: false,
      error: null,

      // Setters
      setReviews: (reviews) => set({ reviews }),
      addReview: (review) =>
        set((state) => ({
          reviews: [review, ...state.reviews],
        })),
      updateReview: (reviewId, updates) =>
        set((state) => ({
          reviews: state.reviews.map((r) => (r.id === reviewId ? { ...r, ...updates } : r)),
        })),
      deleteReview: (reviewId) =>
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== reviewId),
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Fetch Reviews
      fetchReviews: async (placeId) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch(`/api/reviews?place_id=${placeId}`)

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const data = await res.json()
          set({ reviews: data.reviews || [], isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '리뷰 조회 실패'
          set({ error: message, isLoading: false, reviews: [] })
        }
      },

      // Create Review
      createReview: async (data) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const { review } = await res.json()
          get().addReview(review)
          set({ isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '리뷰 작성 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Update Review
      updateReviewById: async (reviewId, data) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch(`/api/reviews/${reviewId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          const { review } = await res.json()
          get().updateReview(reviewId, review)
          set({ isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '리뷰 수정 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Delete Review
      deleteReviewById: async (reviewId) => {
        set({ isLoading: true, error: null })

        try {
          const res = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE',
          })

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error)
          }

          get().deleteReview(reviewId)
          set({ isLoading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : '리뷰 삭제 실패'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Selectors
      getReviewsByPlace: (placeId) => {
        return get().reviews.filter((r) => r.place_id === placeId)
      },

      getAverageRating: (placeId) => {
        const placeReviews = get().getReviewsByPlace(placeId)
        if (placeReviews.length === 0) return 0

        const sum = placeReviews.reduce((acc, r) => acc + r.rating, 0)
        return Math.round((sum / placeReviews.length) * 10) / 10 // 소수점 1자리
      },

      getReviewCount: (placeId) => {
        return get().getReviewsByPlace(placeId).length
      },
    }),
    { name: 'ReviewStore' }
  )
)
