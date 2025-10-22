import { NextRequest, NextResponse } from 'next/server'
import type { Place } from '@/types'

// Naver Search Local API
// https://developers.naver.com/docs/serviceapi/search/local/local.md

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const display = searchParams.get('display') || '10'
    const start = searchParams.get('start') || '1'

    if (!query) {
      return NextResponse.json({ error: '검색어를 입력하세요' }, { status: 400 })
    }

    const clientId = process.env.NAVER_SEARCH_CLIENT_ID
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Naver Search API credentials not found')
      return NextResponse.json(
        { error: 'Naver Search API 키가 설정되지 않았습니다' },
        { status: 500 }
      )
    }

    // Naver Search Local API 호출
    const naverApiUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
      query
    )}&display=${display}&start=${start}`

    const response = await fetch(naverApiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Naver API error:', errorText)
      return NextResponse.json({ error: '검색 API 요청 실패' }, { status: response.status })
    }

    const data = await response.json()

    // Naver API 응답을 Place 형식으로 변환
    const places: Place[] = data.items.map((item: any, index: number) => ({
      id: `${item.link}_${index}`, // Naver API는 고유 ID를 제공하지 않음
      name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      address: item.address,
      roadAddress: item.roadAddress || item.address,
      category: item.category,
      telephone: item.telephone || '',
      lat: parseFloat(item.mapy) / 10000000, // Naver API는 10^7을 곱한 값 반환
      lng: parseFloat(item.mapx) / 10000000,
    }))

    return NextResponse.json({
      places,
      total: data.total,
      start: data.start,
      display: data.display,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
