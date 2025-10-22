import { NextRequest, NextResponse } from 'next/server'
import type { Review } from '@/types'

// In-memory storage for demo purposes
let reviews: Review[] = []

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const placeId = searchParams.get('place_id')

    if (!placeId) {
      return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
    }

    const placeReviews = reviews.filter((r) => r.place_id === placeId)
    return NextResponse.json({ reviews: placeReviews })
  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { place_id, place_name, rating, content } = body

    if (!place_id || !place_name || !rating || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const review: Review = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      place_id,
      place_name,
      user_id: 'demo_user',
      user_nickname: '테스트 사용자',
      rating,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    reviews.push(review)
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }
}
