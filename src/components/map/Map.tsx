'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { useSearchStore } from '@/stores/searchStore'

interface MapProps {
  className?: string
}

export function Map({ className = 'w-full h-full' }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<naver.maps.Marker[]>([])
  const [naverLoaded, setNaverLoaded] = useState(false)
  const { map, center, zoom, setMap, setLoading, currentLocation } = useMapStore()
  const { results, selectedPlace } = useSearchStore()

  // Naver Maps SDK 로드 감지
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkNaver = () => {
      if (typeof window.naver !== 'undefined' && window.naver.maps) {
        setNaverLoaded(true)
        return true
      }
      return false
    }

    if (checkNaver()) return

    console.log('Waiting for Naver Maps SDK...')
    const interval = setInterval(() => {
      if (checkNaver()) {
        clearInterval(interval)
      }
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      console.error('Naver Maps SDK load timeout')
      setLoading(false)
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [setLoading])

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || map || !naverLoaded) return

    console.log('Initializing map...')

    try {
      const mapInstance = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: window.naver.maps.Position.TOP_LEFT,
        },
        scaleControl: true,
        logoControl: false,
        mapDataControl: false,
      })

      setMap(mapInstance)

      // 지도 이벤트 리스너
      window.naver.maps.Event.addListener(mapInstance, 'zoom_changed', () => {
        const currentZoom = mapInstance.getZoom()
        useMapStore.setState({ zoom: currentZoom })
      })

      window.naver.maps.Event.addListener(mapInstance, 'center_changed', () => {
        const currentCenter = mapInstance.getCenter()
        useMapStore.setState({
          center: { lat: currentCenter.y, lng: currentCenter.x },
        })
      })

      console.log('Map initialized successfully!')
    } catch (error) {
      console.error('Failed to initialize map:', error)
      setLoading(false)
    }
  }, [naverLoaded, map, setMap, setLoading, center.lat, center.lng, zoom])

  // 현재 위치 마커 표시
  useEffect(() => {
    if (!map || !currentLocation || !naverLoaded) return

    const marker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(currentLocation.lat, currentLocation.lng),
      map,
      title: '현재 위치',
      icon: {
        content: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        anchor: new window.naver.maps.Point(10, 10),
      },
      zIndex: 1000,
    })

    return () => {
      marker.setMap(null)
    }
  }, [map, currentLocation, naverLoaded])

  // 검색 결과 마커 표시
  useEffect(() => {
    if (!map || !naverLoaded) return

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // 검색 결과가 없으면 종료
    if (results.length === 0) return

    // 새 마커 생성
    const newMarkers = results.map((place, index) => {
      const isSelected = selectedPlace?.id === place.id

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(place.lat, place.lng),
        map,
        title: place.name,
        icon: {
          content: `
            <div style="
              position: relative;
              width: 32px;
              height: 40px;
              cursor: pointer;
            ">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 32px;
                height: 32px;
                background: ${isSelected ? '#2563eb' : '#ef4444'};
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>
              <div style="
                position: absolute;
                top: 6px;
                left: 50%;
                transform: translateX(-50%) rotate(0deg);
                color: white;
                font-size: 12px;
                font-weight: bold;
                z-index: 1;
              ">${index + 1}</div>
            </div>
          `,
          anchor: new window.naver.maps.Point(16, 40),
        },
        zIndex: isSelected ? 100 : 10,
      })

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, 'click', () => {
        useSearchStore.setState({ selectedPlace: place })
        map.panTo(new window.naver.maps.LatLng(place.lat, place.lng))
      })

      return marker
    })

    markersRef.current = newMarkers

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [map, results, selectedPlace, naverLoaded])

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
