'use client'

import { useSearchStore } from '@/stores/searchStore'
import { useMapStore } from '@/stores/mapStore'
import type { Place } from '@/types'
import { MapPin, Phone, Star } from 'lucide-react'

export function SearchResults() {
  const { results, selectedPlace, setSelectedPlace, error } = useSearchStore()
  const { panTo } = useMapStore()

  if (error) {
    return (
      <div className="absolute left-4 top-24 z-10 w-96 bg-white rounded-lg shadow-lg p-4">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place)
    panTo(place.lat, place.lng, 17)
  }

  return (
    <div className="absolute left-4 top-24 z-10 w-96 max-h-[calc(100vh-160px)] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          검색 결과 <span className="text-blue-600">{results.length}</span>개
        </h3>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {results.map((place) => (
          <button
            key={place.id}
            onClick={() => handlePlaceClick(place)}
            className={`
              w-full text-left p-4 border-b border-gray-100
              hover:bg-blue-50 transition-colors
              ${selectedPlace?.id === place.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
            `}
          >
            {/* Place Name */}
            <h4 className="font-semibold text-gray-900 mb-1">{place.name}</h4>

            {/* Category */}
            {place.category && (
              <p className="text-xs text-gray-500 mb-2">{place.category}</p>
            )}

            {/* Address */}
            <div className="flex items-start gap-1 mb-2">
              <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 line-clamp-1">{place.roadAddress || place.address}</p>
            </div>

            {/* Phone */}
            {place.telephone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-600">{place.telephone}</p>
              </div>
            )}

            {/* Review Info (if available) */}
            {place.reviewCount !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-gray-700">{place.avgRating?.toFixed(1) || '0.0'}</span>
                </div>
                <span className="text-xs text-gray-500">리뷰 {place.reviewCount}개</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Load More Button (준비만 해둠, 나중에 구현) */}
      {/* <div className="p-4 border-t border-gray-200">
        <button className="w-full py-2 text-sm text-blue-600 hover:text-blue-700">
          더보기
        </button>
      </div> */}
    </div>
  )
}
