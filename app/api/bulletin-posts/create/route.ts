import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { bulletinId, title, content, userId, authorName } = await request.json();

    if (!bulletinId || !title || !content) {
      return NextResponse.json(
        { error: '게시글 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: '데이터베이스 연결 오류입니다.' },
        { status: 500 }
      );
    }

    // 게시글 저장
    const postData = {
      bulletinId,
      title,
      content,
      userId: userId || 'temp-user-id',
      authorName: authorName || '익명',
      isPinned: false,
      isLocked: false,
      viewCount: 0,
      likeCount: 0,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('bulletinPosts').add(postData);

    return NextResponse.json({
      success: true,
      data: {
        postId: docRef.id,
        message: '게시글이 성공적으로 저장되었습니다.'
      }
    });

  } catch (error) {
    console.error('게시글 저장 API 오류:', error);
    return NextResponse.json(
      { 
        error: '게시글 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 