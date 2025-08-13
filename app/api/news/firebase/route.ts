import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // request.url 대신 searchParams를 직접 사용
    const keyword = request.nextUrl?.searchParams.get('keyword') || null;
    const limit = parseInt(request.nextUrl?.searchParams.get('limit') || '50');

    console.log(`🔍 Firebase에서 뉴스 가져오기: keyword=${keyword}, limit=${limit}`);

    if (!db) {
      throw new Error('Firebase Admin SDK가 초기화되지 않았습니다.');
    }

    // 올바른 컬렉션명 사용: news_articles
    let query = db.collection('news_articles').orderBy('collected_at', 'desc').limit(limit);

    // 키워드 필터링 (한글 키워드 처리 개선)
    if (keyword && keyword.trim() !== '') {
      try {
        console.log(`🔍 키워드 필터링 적용: "${keyword}"`);
        query = query.where('keyword', '==', keyword.trim());
      } catch (error) {
        console.error('키워드 필터링 오류:', error);
        // 키워드 필터링 실패 시 전체 조회로 fallback
        query = db.collection('news_articles').orderBy('collected_at', 'desc').limit(limit);
      }
    }

    const snapshot = await query.get();
    const articles = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Firebase에서 ${articles.length}개의 뉴스를 가져왔습니다. (키워드: ${keyword || '전체'})`);

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