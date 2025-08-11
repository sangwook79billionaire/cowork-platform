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
    const snapshot = await collectionsRef
      .orderBy('collectedAt', 'desc')
      .get();
    
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    // 키워드 이력 추출
    const keywordHistory: { keyword: string; usedAt: string; collectionId: string; status: string }[] = [];
    
    collections.forEach(collection => {
      if (collection.keywords && Array.isArray(collection.keywords)) {
        collection.keywords.forEach((keyword: string) => {
          keywordHistory.push({
            keyword,
            usedAt: collection.collectedAt,
            collectionId: collection.id,
            status: collection.status || 'unknown'
          });
        });
      }
    });

    // 중복 제거 (같은 키워드의 최신 사용일만 유지)
    const uniqueKeywords = new Map<string, { keyword: string; usedAt: string; collectionId: string; status: string }>();
    
    keywordHistory.forEach(item => {
      if (!uniqueKeywords.has(item.keyword) || 
          new Date(item.usedAt) > new Date(uniqueKeywords.get(item.keyword)!.usedAt)) {
        uniqueKeywords.set(item.keyword, item);
      }
    });

    const sortedKeywords = Array.from(uniqueKeywords.values())
      .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());

    return NextResponse.json({ 
      keywords: sortedKeywords,
      totalCollections: collections.length
    });
  } catch (error) {
    console.error('키워드 이력 가져오기 오류:', error);
    return NextResponse.json(
      { error: '키워드 이력을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 