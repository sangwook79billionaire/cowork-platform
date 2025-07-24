import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/newsService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { keywords, language = 'ko' } = await request.json();
    
    console.log('=== API 엔드포인트 환경 변수 확인 ===');
    console.log('GEMINI_API_KEY 설정 여부:', !!process.env.GEMINI_API_KEY);
    
    if (!keywords) {
      return NextResponse.json(
        { error: '검색 키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('뉴스 검색 요청:', { keywords, language });
    
    // 뉴스 검색
    const articles = await newsService.searchNews(keywords, language);
    
    if (articles.length === 0) {
      return NextResponse.json({
        articles: [],
        totalResults: 0,
        searchKeywords: keywords,
        message: '검색 결과가 없습니다.'
      });
    }

    // AI 요약
    console.log('AI 요약 시작...');
    const summarizedArticles = await newsService.summarizeArticles(articles);
    
    console.log('요약 완료:', summarizedArticles.length, '개');

    return NextResponse.json({
      articles: summarizedArticles,
      totalResults: summarizedArticles.length,
      searchKeywords: keywords
    });
  } catch (error) {
    console.error('뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { error: '뉴스 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get('keywords');
    const language = searchParams.get('language') || 'ko';
    
    console.log('=== API 엔드포인트 환경 변수 확인 ===');
    console.log('GEMINI_API_KEY 설정 여부:', !!process.env.GEMINI_API_KEY);
    
    if (!keywords) {
      return NextResponse.json(
        { error: '검색 키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('뉴스 검색 요청 (GET):', { keywords, language });
    
    // 뉴스 검색
    const articles = await newsService.searchNews(keywords, language);
    
    if (articles.length === 0) {
      return NextResponse.json({
        articles: [],
        totalResults: 0,
        searchKeywords: keywords,
        message: '검색 결과가 없습니다.'
      });
    }

    // AI 요약
    console.log('AI 요약 시작...');
    const summarizedArticles = await newsService.summarizeArticles(articles);
    
    console.log('요약 완료:', summarizedArticles.length, '개');

    return NextResponse.json({
      articles: summarizedArticles,
      totalResults: summarizedArticles.length,
      searchKeywords: keywords
    });
  } catch (error) {
    console.error('뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { error: '뉴스 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 