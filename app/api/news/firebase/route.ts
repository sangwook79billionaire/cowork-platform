import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🔍 Firebase에서 뉴스 가져오기: keyword=${keyword}, limit=${limit}`);

    if (!db) {
      throw new Error('Firebase Admin SDK가 초기화되지 않았습니다.');
    }

    let query = db.collection('news').orderBy('collected_at', 'desc').limit(limit);

    // 키워드 필터링
    if (keyword) {
      query = query.where('keyword', '==', keyword);
    }

    const snapshot = await query.get();
    const articles = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Firebase에서 ${articles.length}개의 뉴스를 가져왔습니다.`);

    return NextResponse.json({
      success: true,
      articles: articles,
      total: articles.length
    });

  } catch (error) {
    console.error('Firebase 뉴스 가져오기 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Firebase에서 뉴스를 가져오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 