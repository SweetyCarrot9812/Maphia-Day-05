declare global {
  const naver: {
    maps: {
      Map: any
      LatLng: any
      LatLngBounds: any
      Marker: any
      InfoWindow: any
      Event: any
      Position: any
      Size: any
      Point: any
      Animation: any
    }
  }

  interface Window {
    naver: {
      maps: {
        Map: any
        LatLng: any
        LatLngBounds: any
        Marker: any
        InfoWindow: any
        Event: any
        Position: any
        Size: any
        Point: any
        Animation: any
      }
    }
  }
}

export {}
