import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/newsService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { keywords, language = 'ko' } = await request.json();
    
    console.log('=== API 엔드포인트 환경 변수 확인 ===');
    console.log('Google News RSS 사용 - 별도 API 키 불필요');
    
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

    // 중복 제거
    const uniqueArticles = newsService.removeDuplicates(articles);
    
    console.log(`검색 완료: ${uniqueArticles.length}개의 뉴스`);

    return NextResponse.json({
      articles: uniqueArticles,
      totalResults: uniqueArticles.length,
      searchKeywords: keywords,
      message: '뉴스 검색이 완료되었습니다.'
    });

  } catch (error) {
    console.error('뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { error: '뉴스 검색에 실패했습니다.' },
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
    console.log('Google News RSS 사용 - 별도 API 키 불필요');
    
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

    // 중복 제거
    const uniqueArticles = newsService.removeDuplicates(articles);
    
    console.log(`검색 완료: ${uniqueArticles.length}개의 뉴스`);

    return NextResponse.json({
      articles: uniqueArticles,
      totalResults: uniqueArticles.length,
      searchKeywords: keywords,
      message: '뉴스 검색이 완료되었습니다.'
    });

  } catch (error) {
    console.error('뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { error: '뉴스 검색에 실패했습니다.' },
      { status: 500 }
    );
  }
} 