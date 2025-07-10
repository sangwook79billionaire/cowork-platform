import { NextRequest, NextResponse } from 'next/server';
import { generatePost } from '@/lib/gemini';

interface ShortsScript {
  title: string;
  opening: string;
  mainContent: string;
  closing: string;
  totalDuration: string;
  keywords: string[];
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const { newsArticle, targetDuration = '60', style = 'friendly' } = await request.json();

    if (!newsArticle) {
      return NextResponse.json({ error: '뉴스 기사가 필요합니다.' }, { status: 400 });
    }

    // 숏츠 스크립트 생성 프롬프트
    const prompt = `
다음 뉴스 기사를 바탕으로 ${targetDuration}초 분량의 숏츠 영상 스크립트를 생성해주세요.

뉴스 기사:
제목: ${newsArticle.title}
내용: ${newsArticle.content}
출처: ${newsArticle.source}
요약: ${newsArticle.summary}

스크립트 생성 원칙:
1. 하나의 핵심 메시지만 전달
2. 50대 여성의 친근한 어투 유지
3. 출처 매체명을 명확히 인용
4. 오프닝(흥미 유발) - 본론(핵심 정보) - 클로징(요약 및 행동 유도) 구조
5. 약 ${targetDuration}초 분량으로 작성
6. 시청자의 행동을 유도하는 마무리 포함

다음 JSON 형식으로 응답해주세요:
{
  "title": "스크립트 제목",
  "opening": "오프닝 부분 (15-20초)",
  "mainContent": "본론 부분 (30-40초)",
  "closing": "클로징 부분 (10-15초)",
  "totalDuration": "예상 재생 시간",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "source": "출처 매체명"
}

요구사항:
- 자연스럽고 친근한 톤
- 핵심 정보를 명확하게 전달
- 시청자의 참여를 유도하는 마무리
- 한국어로 작성
`;

    const result = await generatePost(prompt, '친근한', '중간');
    
    // JSON 응답 파싱 시도
    try {
      const parsedResult = JSON.parse(result) as ShortsScript;
      return NextResponse.json(parsedResult);
    } catch (parseError) {
      // JSON 파싱 실패 시 텍스트 응답 반환
      return NextResponse.json({
        title: '숏츠 스크립트',
        opening: '안녕하세요! 오늘은 흥미로운 소식을 전해드릴게요.',
        mainContent: result,
        closing: '이런 내용이었는데, 어떠셨나요? 좋아요와 공유 부탁드려요!',
        totalDuration: `${targetDuration}초`,
        keywords: ['시니어', '건강', '라이프스타일'],
        source: newsArticle.source,
        rawResponse: result
      });
    }

  } catch (error) {
    console.error('숏츠 스크립트 생성 오류:', error);
    return NextResponse.json({ error: '스크립트 생성에 실패했습니다.' }, { status: 500 });
  }
} 