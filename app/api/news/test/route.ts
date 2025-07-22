import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const newsApiKey = process.env.NEWS_API_KEY || process.env.NewsAPI || process.env.NEWS_API;
    
    console.log('🧪 NewsAPI 테스트 시작');
    console.log('🔑 API 키 존재 여부:', !!newsApiKey);
    console.log('🔑 API 키 길이:', newsApiKey?.length || 0);
    
    if (!newsApiKey) {
      return NextResponse.json({
        success: false,
        error: 'NewsAPI 키가 설정되지 않았습니다.',
        availableKeys: {
          NEWS_API_KEY: !!process.env.NEWS_API_KEY,
          NewsAPI: !!process.env.NewsAPI,
          NEWS_API: !!process.env.NEWS_API
        }
      });
    }

    // 간단한 테스트 쿼리
    const testQuery = '코로나';
    const params = new URLSearchParams({
      q: testQuery,
      sortBy: 'publishedAt',
      language: 'ko',
      apiKey: newsApiKey,
      pageSize: '3'
    });

    const apiUrl = `https://newsapi.org/v2/everything?${params}`;
    console.log('🌐 테스트 API URL:', apiUrl.replace(newsApiKey, '***'));

    const response = await fetch(apiUrl);
    console.log('📡 응답 상태:', response.status);
    console.log('📡 응답 헤더:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 오류:', errorText);
      return NextResponse.json({
        success: false,
        error: `API 호출 실패: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('📊 응답 데이터:', {
      status: data.status,
      totalResults: data.totalResults,
      articlesCount: data.articles?.length || 0
    });

    if (data.status === 'error') {
      return NextResponse.json({
        success: false,
        error: `NewsAPI 오류: ${data.message}`,
        details: data
      });
    }

    // 성공적인 응답
    const articles = data.articles?.slice(0, 3).map((article: any) => ({
      title: article.title,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url
    })) || [];

    return NextResponse.json({
      success: true,
      message: 'NewsAPI.org 연결 성공!',
      testQuery,
      articlesFound: articles.length,
      articles,
      apiKeyMasked: `${newsApiKey.substring(0, 4)}...${newsApiKey.substring(newsApiKey.length - 4)}`
    });

  } catch (error: any) {
    console.error('❌ 테스트 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: '테스트 중 오류가 발생했습니다.',
      details: error.message
    });
  }
} 