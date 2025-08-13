import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

interface SchedulerStatus {
  isActive: boolean;
  nextRun: string;
  lastRun: string;
  lastStatus: 'success' | 'error' | 'running' | 'never';
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  schedules: Array<{
    time: string;
    description: string;
    cron: string;
  }>;
}

interface ManualRunResponse {
  success: boolean;
  message: string;
  runId: string;
  startedAt: string;
}

// GET: 스케줄러 상태 조회
export async function GET() {
  try {
    console.log('📊 스케줄러 상태 조회 시작');
    
    // 마지막 실행 이력 조회
    const historyQuery = db.collection('crawlHistory')
      .orderBy('crawledAt', 'desc')
      .limit(1);
    
    const historyDocs = await historyQuery.get();
    const lastRun = historyDocs.empty ? null : historyDocs.docs[0].data();
    
    // 전체 실행 통계 조회
    const allHistoryQuery = db.collection('crawlHistory');
    const allHistoryDocs = await allHistoryQuery.get();
    
    let totalRuns = 0;
    let successRuns = 0;
    let errorRuns = 0;
    
    allHistoryDocs.forEach(doc => {
      const data = doc.data();
      totalRuns++;
      if (data.status === 'success') {
        successRuns++;
      } else if (data.status === 'error') {
        errorRuns++;
      }
    });
    
    // 다음 실행 시간 계산 (매일 오전 9시, 오후 6시)
    const now = new Date();
    const today9AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const today6PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
    
    let nextRun: Date;
    if (now < today9AM) {
      nextRun = today9AM;
    } else if (now < today6PM) {
      nextRun = today6PM;
    } else {
      // 내일 오전 9시
      nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
    }
    
    const status: SchedulerStatus = {
      isActive: true,
      nextRun: nextRun.toISOString(),
      lastRun: lastRun ? lastRun.crawledAt : 'never',
      lastStatus: lastRun ? lastRun.status : 'never',
      totalRuns,
      successRuns,
      errorRuns,
      schedules: [
        {
          time: '09:00',
          description: '오전 뉴스 크롤링',
          cron: '0 9 * * *'
        },
        {
          time: '18:00',
          description: '오후 뉴스 크롤링',
          cron: '0 18 * * *'
        }
      ]
    };
    
    console.log('✅ 스케줄러 상태 조회 완료:', status);
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('❌ 스케줄러 상태 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '스케줄러 상태 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// POST: 수동 실행
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 수동 크롤링 실행 시작');
    
    const body = await request.json();
    const { reason = 'manual' } = body;
    
    // 실행 이력에 시작 기록
    const runId = `manual_${Date.now()}`;
    const startedAt = new Date().toISOString();
    
    await db.collection('crawlHistory').add({
      runId,
      crawledAt: startedAt,
      date: new Date().toISOString().split('T')[0],
      totalArticles: 0,
      newArticles: 0,
      duplicateArticles: 0,
      sections: 0,
      status: 'running',
      reason,
      startedAt
    });
    
    // 실제 크롤링 실행 (비동기)
    fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/news/auto-crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'manual-run'}`
      },
      body: JSON.stringify({ runId, reason })
    }).catch(error => {
      console.error('❌ 백그라운드 크롤링 실행 실패:', error);
    });
    
    const response: ManualRunResponse = {
      success: true,
      message: '수동 크롤링이 시작되었습니다. 백그라운드에서 실행 중입니다.',
      runId,
      startedAt
    };
    
    console.log('✅ 수동 크롤링 실행 요청 완료:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 수동 크롤링 실행 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '수동 크롤링 실행 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// PUT: 스케줄러 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    console.log('⚙️ 스케줄러 설정 업데이트 시작');
    
    const body = await request.json();
    const { schedules, isActive } = body;
    
    // 설정 저장 (실제로는 환경변수나 설정 파일에 저장)
    const config = {
      isActive: isActive !== undefined ? isActive : true,
      schedules: schedules || [
        { time: '09:00', description: '오전 뉴스 크롤링', cron: '0 9 * * *' },
        { time: '18:00', description: '오후 뉴스 크롤링', cron: '0 18 * * *' }
      ],
      updatedAt: new Date().toISOString()
    };
    
    // 설정을 Firebase에 저장
    await db.collection('schedulerConfig').doc('autoCrawl').set(config);
    
    console.log('✅ 스케줄러 설정 업데이트 완료:', config);
    
    return NextResponse.json({
      success: true,
      message: '스케줄러 설정이 업데이트되었습니다.',
      config
    });
    
  } catch (error) {
    console.error('❌ 스케줄러 설정 업데이트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '스케줄러 설정 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 