'use client'

import { useState } from 'react'
import { useReviewStore } from '@/stores/reviewStore'
import { Star, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewFormProps {
  placeId: string
  placeName: string
  onClose: () => void
  onSuccess?: () => void
}

export function ReviewForm({ placeId, placeName, onClose, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [hoveredRating, setHoveredRating] = useState(0)
  const { createReview, isLoading } = useReviewStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }

    if (!content.trim()) {
      toast.error('리뷰 내용을 입력하세요')
      return
    }

    if (content.length > 500) {
      toast.error('리뷰는 500자 이하로 작성해주세요')
      return
    }

    try {
      await createReview({
        place_id: placeId,
        place_name: placeName,
        rating,
        content: content.trim(),
      })

      toast.success('리뷰가 작성되었습니다')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Review submit error:', error)
      // 에러는 store에서 이미 처리됨
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">리뷰 작성</h2>
            <p className="text-sm text-gray-600 mt-1">{placeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              평점 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              리뷰 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="이 장소에 대한 리뷰를 작성해주세요 (최대 500자)"
              rows={6}
              className="
                w-full px-3 py-2
                border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                resize-none
              "
              disabled={isLoading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {content.length} / 500자
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 px-4 py-2
                bg-gray-100 text-gray-700
                rounded-lg
                hover:bg-gray-200
                transition-colors
                font-medium
              "
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="
                flex-1 px-4 py-2
                bg-blue-600 text-white
                rounded-lg
                hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                font-medium
              "
            >
              {isLoading ? '작성 중...' : '작성 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
