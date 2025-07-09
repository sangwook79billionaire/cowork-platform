import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 키 확인
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
}

// Gemini AI 인스턴스 생성
const genAI = new GoogleGenerativeAI(apiKey);
const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: NextRequest) {
  try {
    const { action, topic, style, length, content, improvementType, count } = await request.json();

    let result: string | string[];

    switch (action) {
      case 'generate':
        if (!topic) {
          return NextResponse.json({ error: '주제가 필요합니다.' }, { status: 400 });
        }
        result = await generatePost(topic, style || '일반적인', length || '중간');
        break;

      case 'summarize':
        if (!content) {
          return NextResponse.json({ error: '요약할 내용이 필요합니다.' }, { status: 400 });
        }
        result = await summarizeText(content);
        break;

      case 'improve':
        if (!content) {
          return NextResponse.json({ error: '개선할 내용이 필요합니다.' }, { status: 400 });
        }
        result = await improveText(content, improvementType || '가독성');
        break;

      case 'extractKeywords':
        if (!content) {
          return NextResponse.json({ error: '키워드를 추출할 내용이 필요합니다.' }, { status: 400 });
        }
        result = await extractKeywords(content, count || 5);
        break;

      default:
        return NextResponse.json({ error: '유효하지 않은 액션입니다.' }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Gemini API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function generatePost(topic: string, style: string, length: string): Promise<string> {
  const prompt = `
다음 주제에 대해 ${style}한 스타일로 ${length} 길이의 글을 작성해주세요.

주제: ${topic}

요구사항:
- 자연스럽고 읽기 쉬운 문체로 작성
- 한국어로 작성
- 적절한 단락 구분
- 실용적이고 유용한 내용 포함

글을 작성해주세요:
`;

  const result = await textModel.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function summarizeText(text: string): Promise<string> {
  const prompt = `
다음 글을 간결하게 요약해주세요:

${text}

요약 요구사항:
- 핵심 내용만 추출
- 3-5문장으로 요약
- 명확하고 이해하기 쉽게 작성
`;

  const result = await textModel.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function improveText(text: string, improvementType: string): Promise<string> {
  const prompt = `
다음 글의 ${improvementType}을 개선해주세요:

${text}

개선 요구사항:
- 원문의 의미는 유지
- ${improvementType} 측면에서 개선
- 자연스럽고 읽기 쉽게 수정
- 한국어 문법에 맞게 작성
`;

  const result = await textModel.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function extractKeywords(text: string, count: number): Promise<string[]> {
  const prompt = `
다음 글에서 가장 중요한 키워드 ${count}개를 추출해주세요:

${text}

요구사항:
- 핵심 개념이나 주제와 관련된 키워드
- 쉼표로 구분하여 나열
- 한국어 키워드로 추출
`;

  const result = await textModel.generateContent(prompt);
  const response = await result.response;
  return response.text().split(',').map(keyword => keyword.trim());
} 