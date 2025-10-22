'use client'

import { Map } from '@/components/map/Map'
import { CurrentLocationButton } from '@/components/map/CurrentLocationButton'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResults } from '@/components/search/SearchResults'
import { PlaceDetail } from '@/components/search/PlaceDetail'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-center px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-blue-600">NaviSpot</h1>
            <p className="text-sm text-gray-600 hidden sm:block">
              네이버 지도 기반 장소 검색 및 리뷰
            </p>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full px-4 flex justify-center">
        <SearchBar />
      </div>

      {/* Search Results */}
      <SearchResults />

      {/* Place Detail */}
      <PlaceDetail />

      {/* Map */}
      <main className="w-full h-full pt-[60px]">
        <Map className="w-full h-full" />
        <CurrentLocationButton />
      </main>

      {/* Status Badge (개발 중 표시) */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs space-y-1">
        <p className="text-gray-500">✅ Phase 0: 프로젝트 초기화</p>
        <p className="text-gray-500">✅ Phase 2: 지도 표시</p>
        <p className="text-gray-500">✅ Phase 3: 검색 기능</p>
        <p className="text-green-600 font-medium">🎉 Phase 4: 리뷰 기능 (완료!)</p>
      </div>
    </div>
  )
}
