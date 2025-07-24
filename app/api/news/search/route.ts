import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/newsService';

export async function POST(request: NextRequest) {
  try {
    const { keywords, language = 'ko', includeSummary = true } = await request.json();

    if (!keywords || typeof keywords !== 'string') {
      return NextResponse.json(
        { error: '키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 뉴스 검색
    const articles = await newsService.searchNews(keywords, language);

    // AI 요약 포함 여부에 따라 처리
    let processedArticles = articles;
    if (includeSummary) {
      processedArticles = await newsService.summarizeArticles(articles);
    }

    return NextResponse.json({
      success: true,
      data: {
        articles: processedArticles,
        totalResults: processedArticles.length,
        keywords,
        language
      }
    });

  } catch (error) {
    console.error('뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { 
        error: '뉴스 검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url || 'http://localhost');
    const keywords = searchParams.get('keywords');
    const language = searchParams.get('language') || 'ko';
    const includeSummary = searchParams.get('includeSummary') === 'true';

    if (!keywords) {
      return NextResponse.json(
        { error: '키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 뉴스 검색
    const articles = await newsService.searchNews(keywords, language);

    // AI 요약 포함 여부에 따라 처리
    let processedArticles = articles;
    if (includeSummary) {
      processedArticles = await newsService.summarizeArticles(articles);
    }

    return NextResponse.json({
      success: true,
      data: {
        articles: processedArticles,
        totalResults: processedArticles.length,
        keywords,
        language
      }
    });

  } catch (error) {
    console.error('뉴스 검색 API 오류:', error);
    return NextResponse.json(
      { 
        error: '뉴스 검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 