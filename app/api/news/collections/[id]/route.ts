import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: '데이터베이스 연결에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 수집 내역 삭제
    const collectionRef = db.collection('news_collections').doc(params.id);
    await collectionRef.delete();

    // 해당 수집의 기사들도 삭제
    const articlesRef = db.collection('news_articles');
    const snapshot = await articlesRef
      .where('collectionId', '==', params.id)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('수집 내역 삭제 오류:', error);
    return NextResponse.json(
      { error: '수집 내역 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 