import { NextRequest, NextResponse } from 'next/server';
import { generatePost, summarizeText } from '@/lib/gemini';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface NewsArticle {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string;
  summary: string;
  shortsScript: string;
  keyword: string;
}

interface AutoSummaryRequest {
  keywords: string[];
  timeSlot: 'morning' | 'evening';
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, timeSlot, userId }: AutoSummaryRequest = await request.json();

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ error: '키워드가 필요합니다.' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const allResults: NewsArticle[] = [];

    // 각 키워드별로 뉴스 검색 및 처리
    for (const keyword of keywords) {
      try {
        // 뉴스 검색 (최대 10개 기사)
        const articles = await searchNews(keyword, 10);
        
        if (articles.length > 0) {
          // 연관성 점수 계산 및 정렬
          const scoredArticles = await calculateRelevanceScores(articles, keyword);
          const topArticles = scoredArticles.slice(0, 5); // 상위 5개 선택
          
          // 각 기사 요약
          for (const article of topArticles) {
            const summary = await summarizeText(article.content);
            
            const processedArticle: NewsArticle = {
              ...article,
              summary,
              shortsScript: '', // 나중에 생성
              keyword,
              relevanceScore: article.relevanceScore
            };

            allResults.push(processedArticle);
          }
        }
      } catch (error) {
        console.error(`키워드 "${keyword}" 처리 중 오류:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      articlesProcessed: allResults.length,
      results: allResults,
      timeSlot,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('자동 요약 오류:', error);
    return NextResponse.json({ error: '자동 요약에 실패했습니다.' }, { status: 500 });
  }
}

// 뉴스 검색 함수
async function searchNews(keyword: string, maxResults: number = 10): Promise<any[]> {
  const newsApiKey = process.env.NEWS_API_KEY;
  
  if (!newsApiKey) {
    console.warn('NEWS_API_KEY가 설정되지 않았습니다. 모의 데이터를 사용합니다.');
    return getMockArticles(keyword);
  }

  try {
    // NewsAPI.org API 호출
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // 30일 전부터
    
    const params = new URLSearchParams({
      q: keyword,
      from: fromDate.toISOString().split('T')[0],
      sortBy: 'publishedAt',
      language: 'ko,en',
      pageSize: maxResults.toString(),
      apiKey: newsApiKey
    });

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
    return getMockArticles(keyword);
  }
}

// 연관성 점수 계산 함수
async function calculateRelevanceScores(articles: any[], keyword: string): Promise<any[]> {
  const scoredArticles = articles.map(article => {
    let score = 0;
    
    // 제목에 키워드 포함 여부 (가장 높은 가중치)
    if (article.title.toLowerCase().includes(keyword.toLowerCase())) {
      score += 50;
    }
    
    // 내용에 키워드 포함 여부
    const contentLower = article.content.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    const keywordCount = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
    score += keywordCount * 10;
    
    // 최신성 점수 (최근 7일 내: 20점, 14일 내: 10점)
    const publishedDate = new Date(article.publishedAt);
    const daysDiff = (new Date().getTime() - publishedDate.getTime()) / (1000 * 3600 * 24);
    if (daysDiff <= 7) score += 20;
    else if (daysDiff <= 14) score += 10;
    
    // 신뢰할 수 있는 소스 점수
    const trustedSources = ['BBC News', 'The Guardian', 'CNN', 'Reuters', 'Associated Press'];
    if (trustedSources.some(source => article.source.includes(source))) {
      score += 15;
    }
    
    // 내용 길이 점수 (적절한 길이: 500-2000자)
    const contentLength = article.content.length;
    if (contentLength >= 500 && contentLength <= 2000) {
      score += 10;
    }
    
    return {
      ...article,
      relevanceScore: score
    };
  });
  
  // 점수순으로 정렬
  return scoredArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
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

// 모의 데이터 함수
function getMockArticles(keyword: string): any[] {
  const mockArticles = [
    {
      title: `${keyword} 관련 최신 연구 결과`,
      url: 'https://example.com/article1',
      content: `${keyword}에 대한 최신 연구가 발표되었습니다. 전문가들은 정기적인 관리의 중요성을 강조하고 있으며, 예방이 치료보다 중요하다고 밝혔습니다.`,
      source: 'BBC News',
      publishedAt: new Date().toISOString()
    },
    {
      title: `${keyword} 예방법 가이드`,
      url: 'https://example.com/article2',
      content: `${keyword}을 예방하기 위한 실용적인 가이드가 발표되었습니다. 일상생활에서 실천할 수 있는 방법들을 소개하고 있습니다.`,
      source: 'The Guardian',
      publishedAt: new Date().toISOString()
    }
  ];

  return mockArticles.filter(article => 
    article.title.toLowerCase().includes(keyword.toLowerCase()) ||
    article.content.toLowerCase().includes(keyword.toLowerCase())
  );
} 