import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 이 API는 항상 동적으로 실행되어야 함
export const dynamic = 'force-dynamic';

// Firebase Admin 초기화
if (!getApps().length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    initializeApp({
      credential: cert(serviceAccount as any)
    });
    console.log('✅ Firebase Admin 초기화 성공');
  } catch (error) {
    console.error('❌ Firebase Admin 초기화 실패:', error);
  }
}

const db = getFirestore();

interface CrawlHistoryItem {
  id: string;
  crawledAt: string;
  date: string;
  totalArticles: number;
  newArticles: number;
  duplicateArticles: number;
  sections: number;
  status: 'success' | 'error' | 'running';
  reason?: string;
  runId?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 크롤링 이력 조회 시작');
    
    // request.url 대신 searchParams를 직접 사용
    const limit = parseInt(request.nextUrl?.searchParams.get('limit') || '50');
    const status = request.nextUrl?.searchParams.get('status') || null;
    const date = request.nextUrl?.searchParams.get('date') || null;
    
    let query = db.collection('crawlHistory').orderBy('crawledAt', 'desc');
    
    // 상태별 필터링
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    // 날짜별 필터링
    if (date) {
      query = query.where('date', '==', date);
    }
    
    // 제한된 개수만 조회
    query = query.limit(limit);
    
    const snapshot = await query.get();
    
    const history: CrawlHistoryItem[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      history.push({
        id: doc.id,
        crawledAt: data.crawledAt,
        date: data.date,
        totalArticles: data.totalArticles || 0,
        newArticles: data.newArticles || 0,
        duplicateArticles: data.duplicateArticles || 0,
        sections: data.sections || 0,
        status: data.status,
        reason: data.reason,
        runId: data.runId,
        error: data.error
      });
    });
    
    // 통계 계산
    const totalRuns = history.length;
    const successRuns = history.filter(item => item.status === 'success').length;
    const errorRuns = history.filter(item => item.status === 'error').length;
    const runningRuns = history.filter(item => item.status === 'running').length;
    
    const totalArticles = history.reduce((sum, item) => sum + item.totalArticles, 0);
    const totalNewArticles = history.reduce((sum, item) => sum + item.newArticles, 0);
    const totalDuplicateArticles = history.reduce((sum, item) => sum + item.duplicateArticles, 0);
    
    const response = {
      success: true,
      history,
      statistics: {
        totalRuns,
        successRuns,
        errorRuns,
        runningRuns,
        successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0,
        totalArticles,
        totalNewArticles,
        totalDuplicateArticles
      },
      pagination: {
        limit,
        total: history.length,
        hasMore: history.length === limit
      }
    };
    
    console.log(`✅ 크롤링 이력 조회 완료: ${history.length}개 항목`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 크롤링 이력 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '크롤링 이력 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 