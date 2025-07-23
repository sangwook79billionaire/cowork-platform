import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { collection, addDoc, serverTimestamp } from 'firebase-admin/firestore';

interface NaverNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const { articles, keywords, userId } = await request.json();
    
    console.log('💾 네이버 뉴스 저장 시작:', { articlesCount: articles.length, keywords, userId });
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 기사가 없습니다.' },
        { status: 400 }
      );
    }
    
    // Firestore에 저장
    const savedArticles = [];
    
    for (const article of articles) {
      try {
        const docRef = await addDoc(collection(db, 'naverNews'), {
          title: article.title,
          summary: article.summary,
          link: article.link,
          publishedAt: article.publishedAt,
          source: article.source,
          keywords: keywords,
          userId: userId,
          createdAt: serverTimestamp(),
          type: 'naver-news'
        });
        
        savedArticles.push({
          id: docRef.id,
          ...article
        });
        
        console.log('✅ 기사 저장 완료:', article.title);
      } catch (error) {
        console.error('❌ 기사 저장 실패:', article.title, error);
      }
    }
    
    console.log('📊 총 저장된 기사 수:', savedArticles.length);
    
    return NextResponse.json({
      success: true,
      savedCount: savedArticles.length,
      articles: savedArticles
    });
    
  } catch (error) {
    console.error('❌ 네이버 뉴스 저장 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '네이버 뉴스 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 