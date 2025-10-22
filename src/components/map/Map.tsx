'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { useSearchStore } from '@/stores/searchStore'

interface MapProps {
  className?: string
}

export function Map({ className = 'w-full h-full' }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<naver.maps.Marker[]>([])
  const { map, center, zoom, setMap, setLoading, currentLocation } = useMapStore()
  const { results, selectedPlace } = useSearchStore()

  useEffect(() => {
    if (!mapRef.current || map) return

    // Naver Maps가 로드되었는지 확인
    if (typeof naver === 'undefined' || !naver.maps) {
      console.error('Naver Maps SDK가 로드되지 않았습니다.')
      setLoading(false)
      return
    }

    // 지도 초기화
    const mapInstance = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: naver.maps.Position.TOP_LEFT,
      },
      scaleControl: true,
      logoControl: false,
      mapDataControl: false,
    })

    setMap(mapInstance)

    // 지도 이벤트 리스너
    naver.maps.Event.addListener(mapInstance, 'zoom_changed', () => {
      const currentZoom = mapInstance.getZoom()
      useMapStore.setState({ zoom: currentZoom })
    })

    naver.maps.Event.addListener(mapInstance, 'center_changed', () => {
      const currentCenter = mapInstance.getCenter()
      useMapStore.setState({
        center: { lat: currentCenter.y, lng: currentCenter.x },
      })
    })

    return () => {
      // Cleanup
      mapInstance.destroy()
    }
  }, [map, center.lat, center.lng, zoom, setMap, setLoading])

  // 현재 위치 마커 표시
  useEffect(() => {
    if (!map || !currentLocation) return

    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(currentLocation.lat, currentLocation.lng),
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
        anchor: new naver.maps.Point(10, 10),
      },
      zIndex: 1000,
    })

    return () => {
      marker.setMap(null)
    }
  }, [map, currentLocation])

  // 검색 결과 마커 표시
  useEffect(() => {
    if (!map) return

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // 검색 결과가 없으면 종료
    if (results.length === 0) return

    // 새 마커 생성
    const newMarkers = results.map((place, index) => {
      const isSelected = selectedPlace?.id === place.id

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(place.lat, place.lng),
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
          anchor: new naver.maps.Point(16, 40),
        },
        zIndex: isSelected ? 100 : 10,
      })

      // 마커 클릭 이벤트
      naver.maps.Event.addListener(marker, 'click', () => {
        useSearchStore.setState({ selectedPlace: place })
        map.panTo(new naver.maps.LatLng(place.lat, place.lng))
      })

      return marker
    })

    markersRef.current = newMarkers

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [map, results, selectedPlace])

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
