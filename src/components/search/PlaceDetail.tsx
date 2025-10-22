'use client'

import { useState } from 'react'
import { useSearchStore } from '@/stores/searchStore'
import type { Place } from '@/types'
import { X, MapPin, Phone, Star, MessageSquare } from 'lucide-react'
import { ReviewForm } from '@/components/review/ReviewForm'
import { ReviewList } from '@/components/review/ReviewList'
import { toast } from 'sonner'

export function PlaceDetail() {
  const { selectedPlace, setSelectedPlace } = useSearchStore()
  const [showReviewForm, setShowReviewForm] = useState(false)

  if (!selectedPlace) return null

  const handleWriteReview = () => {
    setShowReviewForm(true)
  }

  return (
    <>
      {/* Place Detail Panel */}
      <div className="absolute right-4 top-24 z-10 w-96 max-h-[calc(100vh-160px)] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{selectedPlace.name}</h3>
            {selectedPlace.category && (
              <p className="text-xs text-gray-500 mt-1">{selectedPlace.category}</p>
            )}
          </div>
          <button
            onClick={() => setSelectedPlace(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Place Info */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p>{selectedPlace.roadAddress || selectedPlace.address}</p>
                {selectedPlace.roadAddress && selectedPlace.address && (
                  <p className="text-gray-500 text-xs mt-0.5">{selectedPlace.address}</p>
                )}
              </div>
            </div>

            {selectedPlace.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a
                  href={`tel:${selectedPlace.telephone}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selectedPlace.telephone}
                </a>
              </div>
            )}
          </div>

          {/* Review Section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                리뷰
              </h4>
              <button
                onClick={handleWriteReview}
                className="
                  px-3 py-1 text-sm
                  bg-blue-600 text-white
                  rounded-lg
                  hover:bg-blue-700
                  transition-colors
                  font-medium
                "
              >
                리뷰 작성
              </button>
            </div>

            <ReviewList placeId={selectedPlace.id} />
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm
          placeId={selectedPlace.id}
          placeName={selectedPlace.name}
          onClose={() => setShowReviewForm(false)}
          onSuccess={() => {
            // 리뷰 작성 후 목록 새로고침은 ReviewList에서 자동으로 됨
          }}
        />
      )}
    </>
  )
}
