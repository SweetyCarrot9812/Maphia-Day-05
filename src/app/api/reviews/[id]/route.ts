import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/server'

// PATCH /api/reviews/[id] - 리뷰 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { rating, content } = body

    // Validation
    if (!rating || !content) {
      return NextResponse.json({ error: '평점과 내용을 입력하세요' }, { status: 400 })
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

    // 리뷰 소유자 확인
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single() as any

    if (!existingReview) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 })
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json({ error: '본인의 리뷰만 수정할 수 있습니다' }, { status: 403 })
    }

    // 리뷰 수정
    const { data: review, error } = await supabase
      .from('reviews')
      .update({ rating, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single() as any

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: '리뷰 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Review PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '리뷰 수정 중 오류 발생' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews/[id] - 리뷰 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createServerClient()

    // 사용자 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 리뷰 소유자 확인
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single() as any

    if (!existingReview) {
      return NextResponse.json({ error: '리뷰를 찾을 수 없습니다' }, { status: 404 })
    }

    if (existingReview.user_id !== user.id) {
      return NextResponse.json({ error: '본인의 리뷰만 삭제할 수 있습니다' }, { status: 403 })
    }

    // 리뷰 삭제
    const { error } = await supabase.from('reviews').delete().eq('id', id) as any

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: '리뷰 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ message: '리뷰가 삭제되었습니다' })
  } catch (error) {
    console.error('Review DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '리뷰 삭제 중 오류 발생' },
      { status: 500 }
    )
  }
}
