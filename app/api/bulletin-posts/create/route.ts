import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { title, content, bulletinId, source, link, type = 'news' } = await request.json();
    
    if (!title || !content || !bulletinId) {
      return NextResponse.json({ 
        success: false, 
        error: '제목, 내용, 게시판 ID가 필요합니다.' 
      }, { status: 400 });
    }

    console.log('🔍 게시판 포스트 생성 시작:', { title, bulletinId, type });

    // Firestore에 포스트 추가
    const postData = {
      title: title.trim(),
      content: content.trim(),
      bulletinId,
      source: source || '네이트 뉴스',
      link: link || '',
      type, // 'news', 'shorts-script' 등
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      order: 0
    };

    const docRef = await addDoc(collection(db, 'bulletinPosts'), postData);

    console.log('✅ 게시판 포스트 생성 완료:', docRef.id);

    return NextResponse.json({
      success: true,
      postId: docRef.id,
      message: '포스트가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ 게시판 포스트 생성 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '포스트 생성에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 