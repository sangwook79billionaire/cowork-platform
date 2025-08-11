import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('받은 데이터:', body);
    
    const { title, link, source, published_at, content, saved_at, userId, authorName } = body;

    console.log('필수 필드 검증:', {
      title: !!title,
      link: !!link,
      source: !!source,
      titleValue: title,
      linkValue: link,
      sourceValue: source
    });

    // 더 자세한 검증
    const missingFields = [];
    if (!title || title.trim() === '') missingFields.push('title');
    if (!source || source.trim() === '') missingFields.push('source');

    // link는 필수가 아니지만, 있으면 유효한 URL인지 확인
    let validLink = link;
    if (!link || link.trim() === '') {
      validLink = 'https://news.google.com';
    } else if (!link.startsWith('http')) {
      validLink = `https://${link}`;
    }

    if (missingFields.length > 0) {
      console.log('필수 필드 누락:', { title, link, source, missingFields });
      return NextResponse.json(
        { 
          error: `유효한 기사 정보가 필요합니다. 누락된 필드: ${missingFields.join(', ')}`,
          details: { title, link, source }
        },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: '데이터베이스 연결 오류입니다.' },
        { status: 500 }
      );
    }

    // 기사 저장
    const savedArticleData = {
      title,
      link: validLink,
      source,
      published_at,
      content: content || '',
      saved_at: saved_at || new Date().toISOString(),
      userId: userId || 'temp-user-id',
      authorName: authorName || '익명',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('savedArticles').add(savedArticleData);

    return NextResponse.json({
      success: true,
      data: {
        savedArticleId: docRef.id,
        message: '기사가 성공적으로 저장되었습니다.'
      }
    });

  } catch (error) {
    console.error('기사 저장 API 오류:', error);
    return NextResponse.json(
      { 
        error: '기사 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: '데이터베이스 연결 오류입니다.' },
        { status: 500 }
      );
    }

    // 저장된 기사 목록 가져오기
    const querySnapshot = await db.collection('savedArticles')
      .orderBy('saved_at', 'desc')
      .limit(100)
      .get();
    
    const savedArticles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      data: {
        articles: savedArticles,
        totalCount: savedArticles.length
      }
    });

  } catch (error) {
    console.error('저장된 기사 목록 가져오기 오류:', error);
    return NextResponse.json(
      { 
        error: '저장된 기사 목록을 가져오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 