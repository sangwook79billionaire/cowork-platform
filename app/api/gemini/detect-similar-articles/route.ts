import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

interface Article {
  id: string;
  title: string;
  description: string;
  source: string;
  published_at: string;
}

interface SimilarArticlesRequest {
  articles: Article[];
}

interface SimilarArticlesResponse {
  success: boolean;
  removedCount: number;
  remainingArticles: Article[];
  removedArticleIds: string[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SimilarArticlesResponse>> {
  try {
    // API 키 확인
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === 'your_gemini_api_key') {
      return NextResponse.json({
        success: false,
        removedCount: 0,
        remainingArticles: [],
        removedArticleIds: [],
        error: 'Gemini API 키가 설정되지 않았습니다. 환경변수 GOOGLE_GEMINI_API_KEY를 설정해주세요.'
      });
    }

    const { articles }: SimilarArticlesRequest = await request.json();

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: false,
        removedCount: 0,
        remainingArticles: [],
        removedArticleIds: [],
        error: '분석할 기사가 없습니다.'
      });
    }

    console.log(`🔍 유사한 기사 분석 시작: ${articles.length}개 기사`);

    // Gemini 모델 초기화 - 올바른 모델명 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 기사들을 JSON 형태로 변환 (너무 큰 경우 처리)
    const articlesForAnalysis = articles.slice(0, 50); // 최대 50개만 분석
    const articlesJson = JSON.stringify(articlesForAnalysis, null, 2);

    const prompt = `
다음 뉴스 기사들 중에서 유사하거나 중복되는 기사들을 찾아서 제거해주세요.

기사 목록:
${articlesJson}

분석 기준:
1. 제목이 매우 유사하거나 동일한 내용을 다루는 기사
2. 같은 사건이나 뉴스를 다루는 기사
3. 출처가 다르지만 내용이 거의 동일한 기사
4. 시간차가 있지만 같은 주제를 다루는 기사

응답 형식:
{
  "similarGroups": [
    {
      "groupId": "group1",
      "articles": ["article_id1", "article_id2"],
      "reason": "유사한 이유 설명"
    }
  ],
  "uniqueArticles": ["article_id3", "article_id4"],
  "totalRemoved": 2,
  "totalRemaining": 3
}

각 그룹에서 가장 최신이거나 가장 상세한 기사 하나만 남기고 나머지는 제거해주세요.
반드시 유효한 JSON 형식으로만 응답해주세요.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini 응답:', text);

    // JSON 응답 파싱
    let analysisResult;
    try {
      // JSON 부분만 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 응답을 찾을 수 없습니다.');
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 응답:', text);
      return NextResponse.json({
        success: false,
        removedCount: 0,
        remainingArticles: articles,
        removedArticleIds: [],
        error: 'AI 응답을 파싱할 수 없습니다. Gemini API 응답 형식이 올바르지 않습니다.'
      });
    }

    // 제거할 기사 ID들 수집
    const removedIds = new Set<string>();
    const remainingIds = new Set<string>();

    // 유사한 그룹에서 제거할 기사들
    if (analysisResult.similarGroups) {
      analysisResult.similarGroups.forEach((group: any) => {
        if (group.articles && group.articles.length > 1) {
          // 첫 번째 기사만 남기고 나머지는 제거
          const [keepId, ...removeIds] = group.articles;
          remainingIds.add(keepId);
          removeIds.forEach((id: string) => removedIds.add(id));
        } else if (group.articles && group.articles.length === 1) {
          remainingIds.add(group.articles[0]);
        }
      });
    }

    // 고유한 기사들 추가
    if (analysisResult.uniqueArticles) {
      analysisResult.uniqueArticles.forEach((id: string) => {
        remainingIds.add(id);
      });
    }

    // 결과 구성
    const remainingArticles = articles.filter(article => remainingIds.has(article.id));
    const removedArticleIds = Array.from(removedIds);

    console.log(`✅ 유사한 기사 분석 완료: ${removedArticleIds.length}개 제거, ${remainingArticles.length}개 남음`);

    return NextResponse.json({
      success: true,
      removedCount: removedArticleIds.length,
      remainingArticles,
      removedArticleIds
    });

  } catch (error) {
    console.error('유사한 기사 분석 오류:', error);
    
    // 구체적인 오류 메시지 제공
    let errorMessage = '유사한 기사 분석 중 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Gemini API 키가 유효하지 않습니다. 올바른 API 키를 설정해주세요.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Gemini API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('network')) {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('404') || error.message.includes('models')) {
        errorMessage = 'Gemini API 모델을 찾을 수 없습니다. API 버전을 확인해주세요.';
      } else {
        errorMessage = `오류: ${error.message}`;
      }
    }
    
    return NextResponse.json({
      success: false,
      removedCount: 0,
      remainingArticles: [],
      removedArticleIds: [],
      error: errorMessage
    });
  }
} 