'use client'

import { useState } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { Locate, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function CurrentLocationButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { getCurrentLocation } = useMapStore()

  const handleClick = async () => {
    setIsLoading(true)

    try {
      await getCurrentLocation()
      toast.success('현재 위치로 이동했습니다')
    } catch (error) {
      console.error('Current location error:', error)

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('위치 권한이 거부되었습니다')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('위치 정보를 사용할 수 없습니다')
            break
          case error.TIMEOUT:
            toast.error('위치 요청 시간이 초과되었습니다')
            break
          default:
            toast.error('위치를 가져올 수 없습니다')
        }
      } else {
        toast.error('위치를 가져올 수 없습니다')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="
        fixed bottom-6 right-6 z-10
        w-12 h-12
        bg-white rounded-full shadow-lg
        flex items-center justify-center
        hover:bg-gray-50
        active:bg-gray-100
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        border border-gray-200
      "
      aria-label="현재 위치로 이동"
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      ) : (
        <Locate className="w-5 h-5 text-blue-500" />
      )}
    </button>
  )
}
