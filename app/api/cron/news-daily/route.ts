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
    const includeAutoSummary = searchParams.get('includeAutoSummary') === 'true';

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

    // 자동 요약 기능이 포함된 경우 실행
    if (includeAutoSummary) {
      try {
        await runAutoSummary(timeSlot, userId);
      } catch (error) {
        console.error('자동 요약 실행 중 오류:', error);
      }
    }

    return NextResponse.json({
      success: true,
      articlesProcessed: allArticles.length,
      timeSlot,
      userId,
      includeAutoSummary,
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

// 자동 요약 실행 함수
async function runAutoSummary(timeSlot: string, userId: string) {
  // 기본 키워드 설정
  const defaultKeywords = [
    '노인 우울증',
    '근감소증', 
    '눈 건강 루테인',
    '관절염 예방 습관'
  ];

  const allResults: any[] = [];

  // 각 키워드별로 뉴스 검색 및 처리
  for (const keyword of defaultKeywords) {
    try {
      const articles = await searchNews(keyword);
      
      if (articles.length > 0) {
        const article = articles[0]; // 첫 번째 기사 사용
        
        // 기사 요약
        const summary = await summarizeText(article.content);
        
        // 쇼츠 스크립트 생성
        const shortsScript = await generateShortsScript(summary, keyword);
        
        const processedArticle = {
          ...article,
          summary,
          shortsScript,
          keyword
        };

        allResults.push(processedArticle);

        // Firestore에 저장
        await addDoc(collection(db, 'autoSummaries'), {
          ...processedArticle,
          userId,
          timeSlot,
          createdAt: serverTimestamp(),
          processedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`키워드 "${keyword}" 처리 중 오류:`, error);
    }
  }

  console.log(`자동 요약 완료: ${allResults.length}개 기사 처리`);
  return allResults;
}

// 쇼츠 스크립트 생성 함수
async function generateShortsScript(summary: string, keyword: string): Promise<string> {
  const prompt = `
다음 요약을 바탕으로 유튜브 쇼츠용 스크립트를 400자 내외로 작성해줘.

조건:
- 도입은 주목을 끄는 질문/경고
- 중간은 요약 정보
- 마지막은 실천 팁 또는 희망 메시지
- 마지막 줄은 '건강플러스 노트에 여러분의 건강을 지키세요.'
- 각 줄은 20자 이내로 끊어서 출력
- 50대 여성 친근한 어투로 작성

키워드: ${keyword}
요약: ${summary}
`;

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        topic: prompt,
        style: '친근하고 전문적인',
        length: '중간'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.result;
    } else {
      throw new Error('Gemini API 호출 실패');
    }
  } catch (error) {
    console.error('쇼츠 스크립트 생성 오류:', error);
    return `안녕하세요! 오늘은 ${keyword}에 대해 알아보겠습니다.\n\n${summary}\n\n건강한 생활을 위해 꾸준히 관리하세요.\n건강플러스 노트에 여러분의 건강을 지키세요.`;
  }
} 