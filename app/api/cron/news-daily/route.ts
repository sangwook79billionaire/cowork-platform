import { NextRequest, NextResponse } from 'next/server';
import { generatePost, summarizeText, extractKeywords } from '@/lib/gemini';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NewsArticle {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string;
  keywords: string[];
  summary: string;
  category: string;
}

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron에서 호출되는 경우
    const { searchParams } = new URL(request.url);
    const timeSlot = searchParams.get('timeSlot') || 'morning';
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 검색 키워드 및 소스 설정
    const searchConfig = {
      morning: {
        queries: ['시니어 건강', '50대 건강', '시니어 라이프스타일'],
        sources: ['BBC News', 'The Guardian', 'CNN Health', 'Reuters Health'],
        category: 'morning'
      },
      evening: {
        queries: ['시니어 운동', '시니어 영양', '시니어 정신건강'],
        sources: ['BBC News', 'The Guardian', 'CNN Health', 'Reuters Health'],
        category: 'evening'
      }
    };

    const config = timeSlot === 'morning' ? searchConfig.morning : searchConfig.evening;
    const allArticles: NewsArticle[] = [];

    // 각 쿼리별로 뉴스 검색 및 처리
    for (const query of config.queries) {
      try {
        const articles = await searchNews(query, config.sources);
        
        for (const article of articles) {
          try {
            // 기사 요약
            const summary = await summarizeText(article.content);
            
            // 키워드 추출
            const keywords = await extractKeywords(article.content, 5);
            
            const processedArticle: NewsArticle = {
              ...article,
              summary,
              keywords,
              category: config.category
            };

            allArticles.push(processedArticle);

            // Firestore에 저장
            await addDoc(collection(db, 'newsArticles'), {
              ...processedArticle,
              userId,
              timeSlot,
              createdAt: serverTimestamp(),
              processedAt: serverTimestamp()
            });

          } catch (error) {
            console.error('기사 처리 중 오류:', error);
          }
        }
      } catch (error) {
        console.error(`쿼리 "${query}" 처리 중 오류:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      articlesProcessed: allArticles.length,
      timeSlot,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('뉴스 자동화 오류:', error);
    return NextResponse.json({ error: '뉴스 자동화에 실패했습니다.' }, { status: 500 });
  }
}

// 뉴스 검색 함수 (실제 NewsAPI.org 사용)
async function searchNews(query: string, sources: string[] = []): Promise<any[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  
  if (!newsApiKey) {
    console.warn('NEWS_API_KEY가 설정되지 않았습니다. 모의 데이터를 사용합니다.');
    return getMockArticles(query);
  }

  try {
    // NewsAPI.org API 호출
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 1);
    
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
    return getMockArticles(query);
  }
}

// 모의 데이터 함수
function getMockArticles(query: string): any[] {
  const mockArticles = [
    {
      title: '시니어 건강 관리의 새로운 트렌드',
      url: 'https://example.com/article1',
      content: '최근 시니어들의 건강 관리에 대한 새로운 트렌드가 나타나고 있습니다.',
      source: 'BBC News',
      publishedAt: new Date().toISOString()
    }
  ];

  return mockArticles.filter(article => 
    (article.title.toLowerCase().includes(query.toLowerCase()) ||
     article.content.toLowerCase().includes(query.toLowerCase()))
  );
} 