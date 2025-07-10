import { NextRequest, NextResponse } from 'next/server';
import { generatePost, summarizeText, extractKeywords } from '@/lib/gemini';

interface NewsArticle {
  title: string;
  url: string;
  content: string;
  source: {
    name: string;
  };
  publishedAt: string;
  keywords: string[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, fromDate, toDate, limit = 10 } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: '키워드 배열이 필요합니다.' }, { status: 400 });
    }

    // NewsAPI.org를 사용한 뉴스 검색
    const newsArticles = await searchNews(keywords, fromDate, toDate, limit);
    
    // 각 기사에 대해 요약 및 키워드 추출
    const processedArticles: NewsArticle[] = [];
    
    for (const article of newsArticles) {
      try {
        // 기사 요약
        const summary = await summarizeText(article.content);
        
        // 키워드 추출
        const extractedKeywords = await extractKeywords(article.content, 5);
        
        processedArticles.push({
          ...article,
          summary,
          keywords: extractedKeywords
        });
      } catch (error) {
        console.error('기사 처리 중 오류:', error);
        // 오류가 발생해도 기사는 포함
        processedArticles.push({
          ...article,
          summary: '요약 처리 중 오류가 발생했습니다.',
          keywords: keywords
        });
      }
    }

    return NextResponse.json({
      articles: processedArticles,
      totalCount: processedArticles.length,
      keywords,
      fromDate,
      toDate
    });

  } catch (error) {
    console.error('뉴스 검색 오류:', error);
    return NextResponse.json({ error: '뉴스 검색에 실패했습니다.' }, { status: 500 });
  }
}

// 뉴스 검색 함수 (실제 NewsAPI.org 사용)
async function searchNews(keywords: string[], fromDate?: string, toDate?: string, limit: number = 10): Promise<any[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  
  if (!newsApiKey) {
    console.warn('NEWS_API_KEY가 설정되지 않았습니다. 모의 데이터를 사용합니다.');
    // 모의 데이터 반환
    return getMockArticles(keywords, fromDate, toDate, limit);
  }

  try {
    // NewsAPI.org API 호출
    const query = keywords.join(' OR ');
    
    const params = new URLSearchParams({
      q: query,
      sortBy: 'publishedAt',
      language: 'ko,en',
      apiKey: newsApiKey,
      pageSize: limit.toString()
    });

    // 날짜 범위 설정
    if (fromDate) {
      params.append('from', fromDate.split('T')[0]);
    }
    if (toDate) {
      params.append('to', toDate.split('T')[0]);
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
      source: {
        name: article.source.name
      },
      publishedAt: article.publishedAt
    }));

  } catch (error) {
    console.error('뉴스 API 호출 오류:', error);
    // 오류 발생 시 모의 데이터 반환
    return getMockArticles(keywords, fromDate, toDate, limit);
  }
}

// 모의 데이터 함수
function getMockArticles(keywords: string[], fromDate?: string, toDate?: string, limit: number = 10): any[] {
  const mockArticles = [
    {
      title: '시니어 건강 관리의 새로운 트렌드',
      url: 'https://example.com/article1',
      content: '최근 시니어들의 건강 관리에 대한 새로운 트렌드가 나타나고 있습니다. 특히 디지털 헬스케어 기술의 발전으로 원격 건강 모니터링이 활성화되고 있으며, 개인 맞춤형 건강 관리 서비스가 주목받고 있습니다. 전문가들은 이러한 기술 발전이 시니어들의 삶의 질 향상에 크게 기여할 것으로 전망하고 있습니다.',
      source: {
        name: 'BBC News'
      },
      publishedAt: new Date().toISOString()
    },
    {
      title: '50대 이상을 위한 건강한 라이프스타일',
      url: 'https://example.com/article2',
      content: '50대 이상의 성인들을 위한 건강한 라이프스타일 가이드가 발표되었습니다. 이 가이드는 신체적, 정신적 건강을 모두 고려한 종합적인 접근법을 제시합니다. 정기적인 운동과 균형 잡힌 식단이 핵심이라고 강조합니다.',
      source: {
        name: 'The Guardian'
      },
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2시간 전
    },
    {
      title: '시니어 건강: 예방이 치료보다 중요하다',
      url: 'https://example.com/article3',
      content: '의료 전문가들이 시니어 건강에 있어 예방의 중요성을 강조하고 있습니다. 정기적인 건강 검진과 생활 습관 개선이 질병 예방에 핵심 역할을 한다고 밝혔습니다. 특히 조기 발견과 예방이 치료보다 효과적이라는 것이 연구의 핵심 내용입니다.',
      source: {
        name: 'CNN Health'
      },
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3시간 전
    },
    {
      title: '노인 건강을 위한 운동 프로그램',
      url: 'https://example.com/article4',
      content: '노인들의 건강 증진을 위한 새로운 운동 프로그램이 개발되었습니다. 이 프로그램은 관절 건강과 근력 강화에 중점을 두고 설계되었습니다. 전문가들은 정기적인 운동이 노화 과정을 늦추고 전반적인 건강 상태를 개선하는 데 도움이 된다고 강조합니다.',
      source: {
        name: 'Health Today'
      },
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4시간 전
    },
    {
      title: '시니어를 위한 영양 관리 가이드',
      url: 'https://example.com/article5',
      content: '시니어들의 건강한 노후를 위한 영양 관리 가이드가 발표되었습니다. 연령대별 맞춤 영양 섭취가 중요하다고 강조했습니다. 특히 단백질 섭취와 비타민 보충이 시니어 건강에 핵심적인 역할을 한다고 전문가들은 설명합니다.',
      source: {
        name: 'Medical News'
      },
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5시간 전
    }
  ];

  // 키워드에 따라 필터링
  const filteredArticles = mockArticles.filter(article => 
    keywords.some(keyword => 
      article.title.toLowerCase().includes(keyword.toLowerCase()) ||
      article.content.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  // 날짜 범위 필터링
  let dateFilteredArticles = filteredArticles;
  if (fromDate || toDate) {
    dateFilteredArticles = filteredArticles.filter(article => {
      const articleDate = new Date(article.publishedAt);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      
      if (from && articleDate < from) return false;
      if (to && articleDate > to) return false;
      return true;
    });
  }

  // 제한 개수만큼 반환
  return dateFilteredArticles.slice(0, limit);
} 