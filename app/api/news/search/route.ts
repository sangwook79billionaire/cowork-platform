import { NextRequest, NextResponse } from 'next/server';
import { generatePost, summarizeText, extractKeywords } from '@/lib/gemini';

interface NewsArticle {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string;
  keywords: string[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, sources, timeRange } = await request.json();

    if (!query) {
      return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
    }

    // NewsAPI.org를 사용한 뉴스 검색 (실제 구현에서는 API 키 필요)
    const newsArticles = await searchNews(query, sources, timeRange);
    
    // 각 기사에 대해 요약 및 키워드 추출
    const processedArticles: NewsArticle[] = [];
    
    for (const article of newsArticles) {
      try {
        // 기사 요약
        const summary = await summarizeText(article.content);
        
        // 키워드 추출
        const keywords = await extractKeywords(article.content, 5);
        
        processedArticles.push({
          ...article,
          summary,
          keywords
        });
      } catch (error) {
        console.error('기사 처리 중 오류:', error);
        // 오류가 발생해도 기사는 포함
        processedArticles.push({
          ...article,
          summary: '요약 처리 중 오류가 발생했습니다.',
          keywords: []
        });
      }
    }

    return NextResponse.json({
      articles: processedArticles,
      totalCount: processedArticles.length,
      query,
      sources,
      timeRange
    });

  } catch (error) {
    console.error('뉴스 검색 오류:', error);
    return NextResponse.json({ error: '뉴스 검색에 실패했습니다.' }, { status: 500 });
  }
}

// 뉴스 검색 함수 (실제 NewsAPI.org 사용)
async function searchNews(query: string, sources: string[] = [], timeRange: string = '1d'): Promise<any[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  
  if (!newsApiKey) {
    console.warn('NEWS_API_KEY가 설정되지 않았습니다. 모의 데이터를 사용합니다.');
    // 모의 데이터 반환
    return getMockArticles(query);
  }

  try {
    // NewsAPI.org API 호출
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 1); // 1일 전부터
    
    const params = new URLSearchParams({
      q: query,
      from: fromDate.toISOString().split('T')[0],
      sortBy: 'publishedAt',
      language: 'ko,en',
      apiKey: newsApiKey
    });

    if (sources.length > 0) {
      params.append('sources', sources.join(','));
    }

    const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
    
    if (!response.ok) {
      throw new Error(`NewsAPI 오류: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(`NewsAPI 오류: ${data.message}`);
    }

    return data.articles.map((article: any) => ({
      title: article.title,
      url: article.url,
      content: article.content || article.description,
      source: article.source.name,
      publishedAt: article.publishedAt
    }));

  } catch (error) {
    console.error('뉴스 API 호출 오류:', error);
    // 오류 발생 시 모의 데이터 반환
    return getMockArticles(query);
  }
}

// 모의 데이터 함수
function getMockArticles(query: string): any[] {
  const mockArticles = [
    {
      title: '시니어 건강 관리의 새로운 트렌드',
      url: 'https://example.com/article1',
      content: '최근 시니어들의 건강 관리에 대한 새로운 트렌드가 나타나고 있습니다. 전문가들은 정기적인 운동과 균형 잡힌 식단의 중요성을 강조하고 있습니다.',
      source: 'BBC News',
      publishedAt: new Date().toISOString()
    },
    {
      title: '50대 이상을 위한 건강한 라이프스타일',
      url: 'https://example.com/article2',
      content: '50대 이상의 성인들을 위한 건강한 라이프스타일 가이드가 발표되었습니다. 이 가이드는 신체적, 정신적 건강을 모두 고려한 종합적인 접근법을 제시합니다.',
      source: 'The Guardian',
      publishedAt: new Date().toISOString()
    },
    {
      title: '시니어 건강: 예방이 치료보다 중요하다',
      url: 'https://example.com/article3',
      content: '의료 전문가들이 시니어 건강에 있어 예방의 중요성을 강조하고 있습니다. 정기적인 건강 검진과 생활 습관 개선이 질병 예방에 핵심 역할을 한다고 밝혔습니다.',
      source: 'CNN Health',
      publishedAt: new Date().toISOString()
    }
  ];

  // 쿼리에 따라 필터링
  return mockArticles.filter(article => 
    article.title.toLowerCase().includes(query.toLowerCase()) ||
    article.content.toLowerCase().includes(query.toLowerCase())
  );
} 