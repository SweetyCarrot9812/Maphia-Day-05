import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const clientId = process.env.NAVER_SEARCH_CLIENT_ID
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Naver Search API credentials not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=10`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Naver Search API Error:', errorData)
      return NextResponse.json(
        { error: 'Failed to fetch search results from Naver' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform Naver API response to match frontend expectations
    const places = (data.items || []).map((item: any) => ({
      id: `${item.title}-${item.mapx}-${item.mapy}`,
      name: item.title.replace(/<\/?b>/g, ''), // Remove <b> tags
      address: item.address || '',
      roadAddress: item.roadAddress || item.address || '',
      category: item.category || '',
      telephone: item.telephone || '',
      lat: parseFloat((item.mapy / 10000000).toFixed(7)),
      lng: parseFloat((item.mapx / 10000000).toFixed(7)),
    }))

    return NextResponse.json({ places })
  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
