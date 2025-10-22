import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface MapState {
  // State
  map: naver.maps.Map | null
  center: { lat: number; lng: number }
  zoom: number
  isLoading: boolean
  markers: naver.maps.Marker[]
  selectedMarker: naver.maps.Marker | null
  infoWindow: naver.maps.InfoWindow | null
  currentLocation: { lat: number; lng: number } | null

  // Actions
  setMap: (map: naver.maps.Map) => void
  setCenter: (lat: number, lng: number) => void
  setZoom: (zoom: number) => void
  setLoading: (loading: boolean) => void
  setCurrentLocation: (lat: number, lng: number) => void
  addMarkers: (markers: naver.maps.Marker[]) => void
  clearMarkers: () => void
  setSelectedMarker: (marker: naver.maps.Marker | null) => void
  showInfoWindow: (marker: naver.maps.Marker, content: string) => void
  closeInfoWindow: () => void

  // Complex Actions
  panTo: (lat: number, lng: number, zoom?: number) => void
  fitBounds: (places: { lat: number; lng: number }[]) => void
  getCurrentLocation: () => Promise<void>
}

export const useMapStore = create<MapState>()(
  devtools(
    (set, get) => ({
      // Initial State
      map: null,
      center: { lat: 37.5666103, lng: 126.9783882 }, // 서울 시청
      zoom: 15,
      isLoading: true,
      markers: [],
      selectedMarker: null,
      infoWindow: null,
      currentLocation: null,

      // Setters
      setMap: (map) => set({ map, isLoading: false }),
      setCenter: (lat, lng) => set({ center: { lat, lng } }),
      setZoom: (zoom) => set({ zoom }),
      setLoading: (isLoading) => set({ isLoading }),
      setCurrentLocation: (lat, lng) => set({ currentLocation: { lat, lng } }),

      // Marker Management
      addMarkers: (newMarkers) =>
        set((state) => ({
          markers: [...state.markers, ...newMarkers],
        })),

      clearMarkers: () => {
        const { markers } = get()
        markers.forEach((marker) => marker.setMap(null))
        set({ markers: [], selectedMarker: null })
      },

      setSelectedMarker: (marker) => {
        const { selectedMarker } = get()

        // 이전 선택 마커 z-index 복원
        if (selectedMarker) {
          selectedMarker.setZIndex(10)
        }

        // 새 마커 z-index 상승
        if (marker) {
          marker.setZIndex(100)
        }

        set({ selectedMarker: marker })
      },

      // InfoWindow Management
      showInfoWindow: (marker, content) => {
        const { map, infoWindow } = get()
        if (!map) return

        // 기존 InfoWindow 닫기
        if (infoWindow) {
          infoWindow.close()
        }

        const newInfoWindow = new naver.maps.InfoWindow({
          content,
          maxWidth: 320,
          anchorSkew: true,
        })

        newInfoWindow.open(map, marker)
        set({ infoWindow: newInfoWindow })
      },

      closeInfoWindow: () => {
        const { infoWindow } = get()
        if (infoWindow) {
          infoWindow.close()
          set({ infoWindow: null })
        }
      },

      // Complex Actions
      panTo: (lat, lng, zoom) => {
        const { map } = get()
        if (!map) return

        map.panTo(new naver.maps.LatLng(lat, lng))

        if (zoom !== undefined) {
          map.setZoom(zoom)
          set({ zoom })
        }

        set({ center: { lat, lng } })
      },

      fitBounds: (places) => {
        const { map } = get()
        if (!map || places.length === 0) return

        const bounds = new naver.maps.LatLngBounds()

        places.forEach((place) => {
          bounds.extend(new naver.maps.LatLng(place.lat, place.lng))
        })

        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        })
      },

      // Get Current Location
      getCurrentLocation: async () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'))
            return
          }

          set({ isLoading: true })

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              const { panTo } = get()

              set({
                currentLocation: { lat: latitude, lng: longitude },
                isLoading: false,
              })

              // 지도를 현재 위치로 이동
              panTo(latitude, longitude, 16)

              resolve()
            },
            (error) => {
              console.error('Geolocation error:', error)
              set({ isLoading: false })
              reject(error)
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            }
          )
        })
      },
    }),
    { name: 'MapStore' }
  )
)
