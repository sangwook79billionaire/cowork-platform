import { NextRequest, NextResponse } from 'next/server';
import { newsDatabase } from '@/lib/newsDatabase';
import { newsService } from '@/lib/newsService';

export async function POST(request: NextRequest) {
  try {
    const { article, includeFullContent = false } = await request.json();

    if (!article || !article.url) {
      return NextResponse.json(
        { error: '유효한 기사 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자 인증 확인 (실제 구현에서는 세션/토큰 확인 필요)
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: '로그인이 필요합니다.' },
    //     { status: 401 }
    //   );
    // }

    // 임시로 하드코딩된 사용자 ID 사용 (실제로는 세션에서 가져와야 함)
    const userId = 'temp-user-id';

    // 중복 확인
    const isDuplicate = await newsDatabase.checkDuplicate(userId, article.url);
    if (isDuplicate) {
      return NextResponse.json(
        { error: '이미 저장된 기사입니다.' },
        { status: 409 }
      );
    }

    // 전체 내용 가져오기 (선택사항)
    let fullContent: string | undefined;
    if (includeFullContent) {
      fullContent = await newsService.fetchFullContent(article.url);
    }

    // 기사 저장
    const savedArticleId = await newsDatabase.saveArticle(article, userId, fullContent);

    return NextResponse.json({
      success: true,
      data: {
        savedArticleId,
        message: '기사가 성공적으로 저장되었습니다.'
      }
    });

  } catch (error) {
    console.error('기사 저장 API 오류:', error);
    return NextResponse.json(
      { 
        error: '기사 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: '로그인이 필요합니다.' },
    //     { status: 401 }
    //   );
    // }

    // 임시로 하드코딩된 사용자 ID 사용
    const userId = 'temp-user-id';

    // 저장된 기사 목록 가져오기
    const savedArticles = await newsDatabase.getSavedArticles(userId);

    return NextResponse.json({
      success: true,
      data: {
        articles: savedArticles,
        totalCount: savedArticles.length
      }
    });

  } catch (error) {
    console.error('저장된 기사 목록 가져오기 오류:', error);
    return NextResponse.json(
      { 
        error: '저장된 기사 목록을 가져오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 