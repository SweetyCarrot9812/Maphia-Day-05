declare global {
  interface Window {
    naver: typeof naver
  }
}

declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement | string, options: MapOptions)
    setCenter(latlng: LatLng): void
    getCenter(): LatLng
    setZoom(level: number, useEffect?: boolean): void
    getZoom(): number
    panTo(latlng: LatLng, transition?: any): void
    fitBounds(bounds: LatLngBounds, margin?: Margin): void
  }

  interface MapOptions {
    center: LatLng
    zoom: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    mapTypeControl?: boolean
  }

  interface Margin {
    top: number
    right: number
    bottom: number
    left: number
  }

  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): LatLngBounds
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
    setPosition(latlng: LatLng): void
    setZIndex(zIndex: number): void
    setAnimation(animation: Animation | null): void
    setIcon(icon: Icon): void
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    title?: string
    icon?: Icon
    zIndex?: number
  }

  interface Icon {
    url: string
    size: Size
    anchor: Point
    scaledSize?: Size
  }

  class Size {
    constructor(width: number, height: number)
  }

  class Point {
    constructor(x: number, y: number)
  }

  enum Animation {
    BOUNCE = 1,
    DROP = 2,
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions)
    open(map: Map, anchor: Marker | LatLng): void
    close(): void
  }

  interface InfoWindowOptions {
    content: string | HTMLElement
    maxWidth?: number
    anchorSkew?: boolean
  }

  class Event {
    static addListener(
      target: any,
      eventName: string,
      listener: Function
    ): void
  }
}

export {}
