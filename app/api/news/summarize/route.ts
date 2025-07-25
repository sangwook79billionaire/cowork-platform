import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SummarizeRequest {
  url: string;
  title: string;
}

interface SummarizeResponse {
  success: boolean;
  summary?: string;
  error?: string;
  originalText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url, title }: SummarizeRequest = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`🔍 기사 스크래핑 시작: ${url}`);

    // 웹 페이지 가져오기
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 메타 태그에서 본문 추출 시도
    let content = $('meta[name="description"]').attr('content') || '';
    
    // 본문이 없으면 주요 텍스트 추출
    if (!content) {
      // 일반적인 본문 선택자들
      const selectors = [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        'main',
        '.main-content',
        '#content',
        '.article-body',
        '.post-body'
      ];

      for (const selector of selectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          if (content.length > 100) break; // 충분한 텍스트가 있으면 중단
        }
      }

      // 여전히 본문이 없으면 p 태그들 수집
      if (!content || content.length < 100) {
        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
        content = paragraphs.join(' ').substring(0, 3000); // 3000자로 제한
      }
    }

    if (!content || content.length < 50) {
      return NextResponse.json(
        { success: false, error: '본문을 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    console.log(`✅ 본문 추출 완료: ${content.length}자`);

    // Gemini로 요약 생성
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
다음 뉴스 기사의 본문을 요약해주세요:

제목: ${title}
본문: ${content.substring(0, 4000)} // 4000자로 제한

요약 요구사항:
1. 핵심 내용을 3-4문장으로 요약
2. 주요 사실과 데이터 포함
3. 객관적이고 중립적인 톤 유지
4. 한국어로 작성

요약:
`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    console.log(`✅ 요약 완료: ${summary.length}자`);

    return NextResponse.json({
      success: true,
      summary: summary.trim(),
      originalText: content.substring(0, 500) + '...' // 원본 텍스트 일부
    });

  } catch (error) {
    console.error('요약 API 오류:', error);
    
    let errorMessage = '요약 중 오류가 발생했습니다.';
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = '웹사이트 로딩 시간이 초과되었습니다.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = '웹사이트에 접근할 수 없습니다.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 