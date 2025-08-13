import { NextRequest, NextResponse } from 'next/server';
import { firebaseNewsService } from '@/lib/firebaseNewsService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { keywords, language = 'ko' } = await request.json();
    
    console.log('=== Firebase 뉴스 검색 API ===');
    console.log('검색 키워드:', keywords);
    
    if (!keywords) {
      return NextResponse.json(
        { error: '검색 키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Firebase 뉴스 검색 요청:', { keywords, language });
    
    // Firebase에서 뉴스 검색
    const result = await firebaseNewsService.searchNews(keywords, language);
    
    if (result.articles.length === 0) {
      return NextResponse.json({
        articles: [],
        totalResults: 0,
        searchKeywords: keywords,
        message: '검색 결과가 없습니다. 뉴스 수집기를 실행해주세요.',
        lastUpdated: result.lastUpdated
      });
    }

    return NextResponse.json({
      articles: result.articles,
      totalResults: result.totalResults,
      searchKeywords: result.searchKeywords,
      lastUpdated: result.lastUpdated
    });
    
  } catch (error) {
    console.error('❌ Firebase 뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { error: '뉴스 검색에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // request.url 대신 searchParams를 직접 사용
    const keywords = request.nextUrl?.searchParams.get('keywords') || '';
    const language = request.nextUrl?.searchParams.get('language') || 'ko';
    
    console.log('=== Firebase 뉴스 검색 API (GET) ===');
    console.log('검색 키워드:', keywords);
    
    if (!keywords) {
      return NextResponse.json(
        { error: '검색 키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('Firebase 뉴스 검색 요청:', { keywords, language });
    
    // Firebase에서 뉴스 검색
    const result = await firebaseNewsService.searchNews(keywords, language);
    
    if (result.articles.length === 0) {
      return NextResponse.json({
        articles: [],
        totalResults: 0,
        searchKeywords: keywords,
        message: '검색 결과가 없습니다. 뉴스 수집기를 실행해주세요.',
        lastUpdated: result.lastUpdated
      });
    }

    return NextResponse.json({
      articles: result.articles,
      totalResults: result.totalResults,
      searchKeywords: result.searchKeywords,
      lastUpdated: result.lastUpdated
    });
    
  } catch (error) {
    console.error('❌ Firebase 뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { error: '뉴스 검색에 실패했습니다.' },
      { status: 500 }
    );
  }
} 