'use client'

import { useEffect } from 'react'
import { useReviewStore } from '@/stores/reviewStore'
import { Star, Trash2, Edit, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewListProps {
  placeId: string
}

export function ReviewList({ placeId }: ReviewListProps) {
  const { reviews, isLoading, fetchReviews, deleteReviewById } = useReviewStore()

  useEffect(() => {
    if (placeId) {
      fetchReviews(placeId)
    }
  }, [placeId, fetchReviews])

  const handleDelete = async (reviewId: string) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return

    try {
      await deleteReviewById(reviewId)
      toast.success('리뷰가 삭제되었습니다')
    } catch (error) {
      // 에러는 store에서 처리됨
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">아직 리뷰가 없습니다</p>
        <p className="text-gray-400 text-xs mt-1">첫 리뷰를 작성해보세요!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isMyReview = false

        return (
          <div
            key={review.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{review.user_nickname}</span>
                  {isMyReview && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      내 리뷰
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(review.created_at)}
                    {review.created_at !== review.updated_at && ' (수정됨)'}
                  </span>
                </div>
              </div>

              {/* Actions (본인 리뷰만) */}
              {isMyReview && (
                <div className="flex gap-1">
                  {/* <button
                    onClick={() => {}}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="수정"
                  >
                    <Edit className="w-4 h-4" />
                  </button> */}
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{review.content}</p>
          </div>
        )
      })}
    </div>
  )
}
