import { NextRequest, NextResponse } from 'next/server';
import { generateContentFromNews } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { keyword, newsContent } = await request.json();

    if (!keyword) {
      return NextResponse.json(
        { error: '키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('🔍 콘텐츠 생성 시작:', { keyword, hasNewsContent: !!newsContent });

    // OpenAI API를 사용하여 콘텐츠 생성
    const content = await generateContentFromNews(keyword, newsContent);

    console.log('✅ 콘텐츠 생성 완료:', { 
      topic: content.topic,
      blogTitle: content.blog.title,
      shortsTitle: content.shorts.title
    });

    return NextResponse.json({
      success: true,
      data: content
    });

  } catch (error) {
    console.error('❌ 콘텐츠 생성 오류:', error);
    
    return NextResponse.json(
      { 
        error: '콘텐츠 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
