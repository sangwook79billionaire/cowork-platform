import { NextRequest, NextResponse } from 'next/server';
import { AIModelSelector } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Gemini AI 테스트 시작');
    
    const body = await request.json();
    const { prompt = '안녕하세요! 간단한 테스트입니다.' } = body;
    
    console.log('📝 테스트 프롬프트:', prompt);
    
    // Gemini AI로 테스트
    const response = await AIModelSelector.generateContent(
      prompt,
      'google', // Gemini AI 사용
      { model: 'gemini-pro' }
    );
    
    console.log('✅ Gemini AI 응답 성공:', {
      provider: response.provider,
      model: response.model,
      contentLength: response.content.length
    });
    
    return NextResponse.json({
      success: true,
      message: 'Gemini AI 테스트 성공!',
      response: {
        content: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage
      }
    });
    
  } catch (error) {
    console.error('❌ Gemini AI 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gemini AI 테스트 실패',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        troubleshooting: {
          checkApiKey: 'GEMINI_API_KEY 환경변수가 설정되어 있는지 확인',
          checkInternet: '인터넷 연결 상태 확인',
          checkQuota: 'Gemini API 할당량 확인 (월 15회 무료)',
          checkFormat: 'API 키 형식이 올바른지 확인'
        }
      },
      { status: 500 }
    );
  }
}

// GET: Gemini AI 상태 확인
export async function GET() {
  try {
    console.log('🔍 Gemini AI 상태 확인');
    
    const aiInfo = AIModelSelector.getProviderInfo();
    const geminiProvider = aiInfo.available.includes('google');
    
    if (geminiProvider) {
      return NextResponse.json({
        success: true,
        message: 'Gemini AI 사용 가능',
        provider: 'google',
        available: true,
        models: ['gemini-pro'],
        default: aiInfo.default === 'google'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Gemini AI 사용 불가',
        provider: 'google',
        available: false,
        reason: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.',
        setup: {
          step1: 'Google AI Studio에서 API 키 생성',
          step2: '.env.local 파일에 GEMINI_API_KEY 추가',
          step3: '서버 재시작'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Gemini AI 상태 확인 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gemini AI 상태 확인 실패',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 