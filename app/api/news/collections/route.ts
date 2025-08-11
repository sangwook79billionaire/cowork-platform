import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: '데이터베이스 연결에 실패했습니다.' },
        { status: 500 }
      );
    }

    const collectionsRef = db.collection('news_collections');
    const snapshot = await collectionsRef.orderBy('collectedAt', 'desc').get();
    
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('수집 내역 가져오기 오류:', error);
    return NextResponse.json(
      { error: '수집 내역을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 