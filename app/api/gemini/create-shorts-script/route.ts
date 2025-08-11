import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { articleTitle, articleContent, articleSource, publishedAt } = await request.json();

    if (!articleTitle || !articleContent) {
      return NextResponse.json(
        { error: '기사 제목과 내용이 필요합니다.' },
        { status: 400 }
      );
    }

    // 가이드라인 게시판에서 숏폼 제작 가이드라인 가져오기
    const guidelines = await fetchGuidelines();

    const prompt = `
다음 뉴스 기사를 바탕으로 40초 내의 숏폼 영상 스크립트를 작성해주세요.

**뉴스 기사 정보:**
- 제목: ${articleTitle}
- 출처: ${articleSource}
- 발행일: ${publishedAt}
- 내용: ${articleContent}

**숏폼 제작 가이드라인:**
${guidelines}

**요구사항:**
1. 40초 내로 읽을 수 있는 분량 (약 120-150자)
2. 핵심 내용을 간결하고 임팩트 있게 전달
3. 시청자의 관심을 끌 수 있는 도입부
4. 명확한 결론이나 인사이트 제공
5. 자연스러운 한국어로 작성

**스크립트 형식:**
- 도입부 (10초)
- 본론 (25초)
- 결론 (5초)

스크립트만 작성해주세요. 설명이나 추가 텍스트는 포함하지 마세요.
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const script = response.text();

    return NextResponse.json({
      success: true,
      script: script.trim(),
    });

  } catch (error) {
    console.error('숏폼 스크립트 생성 오류:', error);
    return NextResponse.json(
      { 
        error: '스크립트 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 가이드라인 가져오기 함수
async function fetchGuidelines(): Promise<string> {
  try {
    // 기본 가이드라인 (실제로는 데이터베이스에서 가져와야 함)
    return `
1. **도입부 (10초)**
   - 시청자의 관심을 끄는 강력한 훅
   - 핵심 질문이나 충격적인 사실로 시작
   - "여러분은 알고 계셨나요?" 같은 호기심 유발 문구

2. **본론 (25초)**
   - 핵심 정보를 3-4개 포인트로 정리
   - 구체적인 숫자나 사례 포함
   - "그런데 놀라운 사실은..." 같은 전환어 활용

3. **결론 (5초)**
   - 명확한 인사이트나 행동 촉구
   - "이제 여러분도..." 같은 마무리
   - 다음 영상으로 이어질 수 있는 호기심 유발

**스타일 가이드:**
- 친근하고 대화하는 듯한 톤
- 짧고 임팩트 있는 문장
- 반복과 강조를 통한 기억점 생성
- 시청자와의 직접적인 소통
`;
  } catch (error) {
    console.error('가이드라인 가져오기 오류:', error);
    return '기본 숏폼 제작 가이드라인을 사용합니다.';
  }
} 