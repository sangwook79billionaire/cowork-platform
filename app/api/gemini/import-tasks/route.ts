import { NextRequest, NextResponse } from 'next/server';
import { generatePost } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { userDescription, existingTasks } = await request.json();

    if (!userDescription) {
      return NextResponse.json({ error: '사용자 설명이 필요합니다.' }, { status: 400 });
    }

    // Gemini API를 사용하여 사용자 설명을 분석하고 작업 설정을 생성
    const prompt = `
다음 사용자의 설명을 분석하여 반복 작업 설정을 생성해주세요.

사용자 설명: ${userDescription}

기존 작업들: ${JSON.stringify(existingTasks || [], null, 2)}

다음 형식으로 JSON 응답을 제공해주세요:
{
  "tasks": [
    {
      "title": "작업 제목",
      "description": "작업 설명",
      "topic": "AI가 생성할 글의 주제",
      "style": "일반적인|학술적인|창의적인|비즈니스|친근한|전문적인",
      "length": "짧은|중간|긴|매우 긴",
      "schedule": {
        "type": "daily|weekly|monthly",
        "time": "HH:MM",
        "daysOfWeek": [0-6] (주간인 경우),
        "dayOfMonth": 1-31 (월간인 경우)
      },
      "targetBulletinId": "게시판 ID (선택사항)"
    }
  ],
  "suggestions": [
    "추가 작업 제안 1",
    "추가 작업 제안 2"
  ]
}

요구사항:
- 실제로 유용한 반복 작업만 생성
- 한국어로 응답
- JSON 형식으로만 응답
`;

    const result = await generatePost(prompt, '전문적인', '긴');
    
    // JSON 응답 파싱 시도
    try {
      const parsedResult = JSON.parse(result);
      return NextResponse.json(parsedResult);
    } catch (parseError) {
      // JSON 파싱 실패 시 텍스트 응답 반환
      return NextResponse.json({
        tasks: [],
        suggestions: ['설정을 다시 확인해주세요.'],
        rawResponse: result
      });
    }

  } catch (error) {
    console.error('Task import failed:', error);
    return NextResponse.json({ error: '작업 가져오기에 실패했습니다.' }, { status: 500 });
  }
} 