import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();
    
    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ 
        success: false, 
        error: '검색 키워드 배열이 필요합니다.' 
      }, { status: 400 });
    }

    console.log('🔍 게시판 검색 시작:', keywords);

    // Firestore에서 게시판 검색
    const bulletinsRef = collection(db, 'bulletins');
    const q = query(bulletinsRef, orderBy('level', 'asc'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    const bulletins: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      bulletins.push({
        id: doc.id,
        ...data
      });
    });

    // 키워드 매칭으로 필터링
    const matchedBulletins = bulletins.filter(bulletin => {
      const title = bulletin.title.toLowerCase();
      const description = (bulletin.description || '').toLowerCase();
      
      return keywords.some(keyword => 
        title.includes(keyword.toLowerCase()) || 
        description.includes(keyword.toLowerCase())
      );
    });

    console.log('✅ 게시판 검색 완료:', matchedBulletins.length, '개 발견');

    return NextResponse.json({
      success: true,
      bulletins: matchedBulletins,
      total: matchedBulletins.length
    });

  } catch (error) {
    console.error('❌ 게시판 검색 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '게시판 검색에 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
