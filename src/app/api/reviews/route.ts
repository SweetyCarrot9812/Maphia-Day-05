import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

// GET /api/reviews?place_id=xxx - 특정 장소의 리뷰 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('place_id')

    if (!placeId) {
      return NextResponse.json({ error: 'place_id가 필요합니다' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false }) as any

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: '리뷰 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ reviews: reviews || [] })
  } catch (error) {
    console.error('Review GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '리뷰 조회 중 오류 발생' },
      { status: 500 }
    )
  }
}

// POST /api/reviews - 리뷰 작성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { place_id, place_name, rating, content } = body

    // Validation
    if (!place_id || !place_name || !rating || !content) {
      return NextResponse.json({ error: '필수 항목을 입력하세요' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: '평점은 1-5 사이여야 합니다' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: '리뷰 내용은 500자 이하여야 합니다' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // 사용자 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 사용자 프로필 조회
    const { data: userProfile } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', user.id)
      .single() as any

    if (!userProfile) {
      return NextResponse.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    // 리뷰 생성
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        place_id,
        place_name,
        user_id: user.id,
        rating,
        content,
      })
      .select()
      .single() as any

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: '리뷰 작성 실패' }, { status: 500 })
    }

    // user_nickname 추가 (응답용)
    const reviewWithNickname = {
      ...review,
      user_nickname: userProfile.nickname,
    }

    return NextResponse.json({ review: reviewWithNickname }, { status: 201 })
  } catch (error) {
    console.error('Review POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '리뷰 작성 중 오류 발생' },
      { status: 500 }
    )
  }
}
