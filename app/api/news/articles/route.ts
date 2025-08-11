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

    const articlesRef = db.collection('news_articles');
    const snapshot = await articlesRef.orderBy('collected_at', 'desc').get();
    
    const articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('기사 목록 가져오기 오류:', error);
    return NextResponse.json(
      { error: '기사 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 