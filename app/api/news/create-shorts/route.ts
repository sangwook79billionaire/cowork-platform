import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { title, content, bulletinId, userId } = await request.json();

    if (!title || !content || !userId) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 게시판에 포스트 추가
    const postData = {
      title,
      content,
      authorId: userId,
      bulletinId: bulletinId || 'shorts-drafts',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      type: 'shorts-draft',
      status: 'draft'
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);

    return NextResponse.json({
      success: true,
      postId: docRef.id,
      message: '숏츠 스크립트 초안이 게시판에 저장되었습니다.'
    });

  } catch (error) {
    console.error('숏츠 초안 저장 오류:', error);
    return NextResponse.json(
      { error: '숏츠 초안 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
} 