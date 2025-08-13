import { NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai-providers';

export async function GET() {
  try {
    // AI Provider 초기화
    AIProviderFactory.initialize();
    
    // 사용 가능한 Provider 정보
    const availableProviders = AIProviderFactory.getAvailableProviders();
    const defaultProvider = AIProviderFactory.getDefaultProvider();
    const availableModels = AIProviderFactory.getAvailableModels();
    
    // 환경변수 상태 확인 (민감한 정보는 제외)
    const envStatus = {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY
    };
    
    return NextResponse.json({
      success: true,
      ai: {
        availableProviders,
        defaultProvider: defaultProvider ? 'available' : 'none',
        availableModels,
        totalProviders: availableProviders.length
      },
      environment: envStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ AI 상태 확인 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'AI 상태 확인 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 