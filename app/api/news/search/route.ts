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
    const { keywords, fromDate, toDate, language, countries, limit = 10 } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: '키워드 배열이 필요합니다.' }, { status: 400 });
    }

    // NewsAPI.org를 사용한 뉴스 검색
    const newsArticles = await searchNews(keywords, fromDate, toDate, language, countries, limit);
    
    console.log('📊 검색된 기사 수:', newsArticles.length);
    
    // 검색 결과가 없으면 모의 데이터 제공
    if (newsArticles.length === 0) {
      console.log('🔄 검색 결과가 없어 모의 데이터를 제공합니다.');
      const mockArticles = getMockArticles(keywords, fromDate, toDate, limit);
      const processedMockArticles = mockArticles.map(article => ({
        ...article,
        summary: article.content?.substring(0, 200) + '...' || '요약을 사용할 수 없습니다.',
        keywords: keywords
      }));
      
      return NextResponse.json({
        articles: processedMockArticles,
        totalCount: processedMockArticles.length,
        keywords,
        fromDate,
        toDate,
        isMockData: true
      });
    }
    
    // 각 기사에 대해 요약 및 키워드 추출
    const processedArticles: NewsArticle[] = [];
    
    for (const article of newsArticles) {
      try {
        // 기사 요약 (임시로 간단한 요약 사용)
        const summary = article.content?.substring(0, 200) + '...' || '요약을 사용할 수 없습니다.';
        
        // 키워드 추출 (임시로 검색 키워드 사용)
        const extractedKeywords = keywords;
        
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
async function searchNews(keywords: string[], fromDate?: string, toDate?: string, language?: string, countries?: string[], limit: number = 10): Promise<any[]> {
  const newsApiKey = process.env.NEWS_API_KEY || process.env.NewsAPI || process.env.NEWS_API;
  
  console.log('🔍 뉴스 검색 시작:', { keywords, fromDate, toDate, limit });
  console.log('🔑 NewsAPI 키 존재 여부:', !!newsApiKey);
  console.log('🔑 NewsAPI 키 길이:', newsApiKey?.length || 0);
  
  if (!newsApiKey) {
    console.warn('NewsAPI 키가 설정되지 않았습니다. 모의 데이터를 사용합니다.');
    // 모의 데이터 반환
    const mockArticles = getMockArticles(keywords, fromDate, toDate, limit);
    console.log('📝 모의 데이터 반환:', mockArticles.length, '개 기사');
    return mockArticles;
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

    const apiUrl = `https://newsapi.org/v2/everything?${params}`;
    console.log('🌐 NewsAPI.org 호출 URL:', apiUrl.replace(newsApiKey, '***'));
    console.log('🔑 실제 API 키 (마스킹):', newsApiKey ? `${newsApiKey.substring(0, 4)}...${newsApiKey.substring(newsApiKey.length - 4)}` : '없음');

    const response = await fetch(apiUrl);
    
    console.log('📡 NewsAPI 응답 상태:', response.status);
    console.log('📡 NewsAPI 응답 헤더:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NewsAPI 오류 응답:', errorText);
      throw new Error(`NewsAPI 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('📊 NewsAPI 응답 데이터:', {
      status: data.status,
      totalResults: data.totalResults,
      articlesCount: data.articles?.length || 0,
      firstArticleTitle: data.articles?.[0]?.title || '없음'
    });
    
    if (data.status === 'error') {
      console.error('❌ NewsAPI API 오류:', data.message);
      throw new Error(`NewsAPI 오류: ${data.message}`);
    }

    const processedArticles = data.articles.map((article: any) => ({
      title: article.title,
      url: article.url,
      content: article.content || article.description,
      source: {
        name: article.source.name
      },
      publishedAt: article.publishedAt
    }));

    console.log('✅ 실제 뉴스 검색 완료:', processedArticles.length, '개 기사');
    return processedArticles;

  } catch (error: any) {
    console.error('❌ 뉴스 API 호출 오류:', error);
    console.error('❌ 오류 상세 정보:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'Unknown code',
      stack: error?.stack || 'No stack trace'
    });
    // 오류 발생 시 모의 데이터 반환
    console.log('🔄 모의 데이터로 대체');
    const mockArticles = getMockArticles(keywords, fromDate, toDate, limit);
    console.log('📝 생성된 모의 기사 수:', mockArticles.length);
    return mockArticles;
  }
}

// 모의 데이터 함수
function getMockArticles(keywords: string[], fromDate?: string, toDate?: string, limit: number = 10): any[] {
  console.log('🔄 모의 데이터 생성 중...');
  console.log('🔍 요청된 키워드:', keywords);
  console.log('📅 날짜 범위:', { fromDate, toDate });
  
  const mockArticles = [
    {
      title: '[MOCK] 최신 기술 트렌드 뉴스',
      url: 'https://example.com/article1',
      content: '최신 기술 트렌드에 대한 뉴스가 발표되었습니다. 특히 인공지능과 머신러닝 기술의 발전으로 다양한 산업 분야에서 혁신이 일어나고 있습니다. 전문가들은 이러한 기술 발전이 우리의 일상생활에 큰 변화를 가져올 것으로 전망하고 있습니다.',
      source: {
        name: 'Tech News'
      },
      publishedAt: new Date().toISOString()
    },
    {
      title: '[MOCK] 글로벌 경제 동향 분석',
      url: 'https://example.com/article2',
      content: '글로벌 경제 동향에 대한 분석 보고서가 발표되었습니다. 이 보고서는 세계 경제의 현재 상황과 미래 전망을 종합적으로 분석합니다. 주요 경제 강국들의 정책 변화와 시장 동향이 핵심 내용입니다.',
      source: {
        name: 'Economic Times'
      },
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2시간 전
    },
    {
      title: '[MOCK] 환경 보호 관련 최신 뉴스',
      url: 'https://example.com/article3',
      content: '환경 보호와 관련된 최신 뉴스가 발표되었습니다. 기후 변화 대응을 위한 새로운 정책과 기술이 소개되었습니다. 지속 가능한 발전을 위한 다양한 노력들이 진행되고 있다고 밝혔습니다.',
      source: {
        name: 'Environmental News'
      },
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3시간 전
    },
    {
      title: '[MOCK] 건강 관리 트렌드',
      url: 'https://example.com/article4',
      content: '건강 관리 분야의 최신 트렌드가 소개되었습니다. 디지털 헬스케어 기술의 발전으로 개인 맞춤형 건강 관리 서비스가 활성화되고 있습니다. 전문가들은 예방 의학의 중요성을 강조합니다.',
      source: {
        name: 'Health Today'
      },
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4시간 전
    },
    {
      title: '[MOCK] 교육 혁신 뉴스',
      url: 'https://example.com/article5',
      content: '교육 분야의 혁신적인 변화에 대한 뉴스가 발표되었습니다. 온라인 교육 플랫폼의 발전과 개인화 학습 시스템이 주목받고 있습니다. 미래 교육의 방향성에 대한 논의가 활발히 진행되고 있습니다.',
      source: {
        name: 'Education News'
      },
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5시간 전
    }
  ];

  console.log('📝 전체 모의 기사 수:', mockArticles.length);

  // 키워드에 따라 필터링
  const filteredArticles = mockArticles.filter(article => 
    keywords.some(keyword => 
      article.title.toLowerCase().includes(keyword.toLowerCase()) ||
      article.content.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  console.log('🔍 키워드 필터링 후 기사 수:', filteredArticles.length);

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
    console.log('📅 날짜 필터링 후 기사 수:', dateFilteredArticles.length);
  }

  // 제한 개수만큼 반환
  const result = dateFilteredArticles.slice(0, limit);
  console.log('✅ 최종 반환 기사 수:', result.length);
  return result;
} 