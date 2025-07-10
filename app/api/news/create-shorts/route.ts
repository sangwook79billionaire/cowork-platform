import { NextRequest, NextResponse } from 'next/server';
import { generatePost, summarizeText } from '@/lib/gemini';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ShortsRequest {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  articleSummary: string;
  keyword: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { articleId, articleTitle, articleContent, articleSummary, keyword, userId }: ShortsRequest = await request.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 1. 숏츠 스크립트 생성
    const shortsScript = await generateShortsScript(articleSummary, keyword);
    
    // 2. SEO 최적화된 제목 생성
    const seoTitle = await generateSEOTitle(articleTitle, keyword);
    
    // 3. 영상 설명 생성
    const videoDescription = await generateVideoDescription(articleSummary, keyword);

    const shortsData = {
      articleId,
      articleTitle,
      articleContent,
      articleSummary,
      keyword,
      shortsScript,
      seoTitle,
      videoDescription,
      userId,
      createdAt: serverTimestamp(),
      processedAt: serverTimestamp()
    };

    // Firestore에 저장
    await addDoc(collection(db, 'shortsContent'), shortsData);

    return NextResponse.json({
      success: true,
      shortsScript,
      seoTitle,
      videoDescription,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('숏츠 생성 오류:', error);
    return NextResponse.json({ error: '숏츠 생성에 실패했습니다.' }, { status: 500 });
  }
}

// 숏츠 스크립트 생성 함수
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

// SEO 최적화된 제목 생성 함수
async function generateSEOTitle(originalTitle: string, keyword: string): Promise<string> {
  const prompt = `
다음 기사 제목을 SEO 최적화된 유튜브 쇼츠 제목으로 변경해주세요.

조건:
- 50자 이내로 작성
- 키워드가 포함되어야 함
- 클릭을 유도하는 제목
- 시니어 건강 관련 키워드 포함
- 이모지 1-2개 포함

원본 제목: ${originalTitle}
키워드: ${keyword}
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
        style: '매력적이고 클릭을 유도하는',
        length: '짧음'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.result;
    } else {
      throw new Error('Gemini API 호출 실패');
    }
  } catch (error) {
    console.error('SEO 제목 생성 오류:', error);
    return `💪 ${keyword} 관리법 - 시니어 건강의 핵심`;
  }
}

// 영상 설명 생성 함수
async function generateVideoDescription(summary: string, keyword: string): Promise<string> {
  const prompt = `
다음 요약을 바탕으로 유튜브 영상 설명을 작성해주세요.

조건:
- 500자 이내로 작성
- 시청자 참여를 유도하는 문구 포함
- 관련 해시태그 5-8개 포함
- 구독 유도 문구 포함
- 시니어 건강 관련 키워드 포함

요약: ${summary}
키워드: ${keyword}

형식:
[영상 설명 내용]

#시니어건강 #노인건강 #건강관리 #웰빙 #시니어라이프 #건강팁 #예방의학 #건강플러스노트

구독과 좋아요 부탁드립니다! 💕
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
    console.error('영상 설명 생성 오류:', error);
    return `${summary}

#시니어건강 #노인건강 #건강관리 #웰빙 #시니어라이프 #건강팁 #예방의학 #건강플러스노트

구독과 좋아요 부탁드립니다! 💕`;
  }
} 