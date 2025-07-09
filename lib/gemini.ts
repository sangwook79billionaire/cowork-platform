import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 키 확인
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.');
}

// Gemini AI 인스턴스 생성
export const genAI = new GoogleGenerativeAI(apiKey);

// 텍스트 생성 모델
export const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// 글 생성 함수
export async function generatePost(topic: string, style: string = '일반적인', length: string = '중간') {
  try {
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
  } catch (error) {
    console.error('글 생성 중 오류 발생:', error);
    throw new Error('글 생성에 실패했습니다.');
  }
}

// 글 요약 함수
export async function summarizeText(text: string) {
  try {
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
  } catch (error) {
    console.error('글 요약 중 오류 발생:', error);
    throw new Error('글 요약에 실패했습니다.');
  }
}

// 글 개선 함수
export async function improveText(text: string, improvementType: '문법' | '스타일' | '가독성' = '가독성') {
  try {
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
  } catch (error) {
    console.error('글 개선 중 오류 발생:', error);
    throw new Error('글 개선에 실패했습니다.');
  }
}

// 키워드 추출 함수
export async function extractKeywords(text: string, count: number = 5) {
  try {
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
  } catch (error) {
    console.error('키워드 추출 중 오류 발생:', error);
    throw new Error('키워드 추출에 실패했습니다.');
  }
} 