// Core Types

export interface User {
  id: string
  email: string
  nickname: string
  created_at: string
}

export interface Place {
  id: string
  name: string
  address: string
  roadAddress: string
  category: string
  telephone: string
  lat: number
  lng: number
  distance?: number
  reviewCount?: number
  avgRating?: number
}

export interface Review {
  id: string
  place_id: string
  place_name: string
  user_id: string
  user_nickname: string
  rating: number
  content: string
  created_at: string
  updated_at: string
}

// Database Types
export type Tables = {
  users: User
  reviews: Review
}
