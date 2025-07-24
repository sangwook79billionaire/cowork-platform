import { NextRequest, NextResponse } from 'next/server';
import { newsDatabase } from '@/lib/newsDatabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articleId = params.id;

    if (!articleId) {
      return NextResponse.json(
        { error: '기사 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 임시로 하드코딩된 사용자 ID 사용 (실제로는 세션에서 가져와야 함)
    const userId = 'temp-user-id';

    // 기사 삭제
    await newsDatabase.deleteArticle(articleId, userId);

    return NextResponse.json({
      success: true,
      message: '기사가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('기사 삭제 API 오류:', error);
    return NextResponse.json(
      { 
        error: '기사 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 