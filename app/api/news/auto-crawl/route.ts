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

interface NateNewsArticle {
  rank: number;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string;
  section: string;
  crawledAt: string;
}

interface NateNewsSection {
  section: string;
  sectionName: string;
  articles: NateNewsArticle[];
}

interface AutoCrawlResponse {
  success: boolean;
  message: string;
  crawledAt: string;
  totalArticles: number;
  sections: number;
  newArticles: number;
  duplicateArticles: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 자동 크롤링 시작');
    
    const body = await request.json();
    const { sections: requestedSections, limit: requestedLimit } = body;
    
    // 오늘 날짜 가져오기
    const today = new Date();
    const dateString = today.getFullYear().toString() + 
                      String(today.getMonth() + 1).padStart(2, '0') + 
                      String(today.getDate()).padStart(2, '0');
    const crawledAt = today.toISOString();
    
    console.log('🔍 크롤링 날짜:', dateString);
    console.log('🔍 요청된 섹션:', requestedSections || '전체');
    console.log('🔍 요청된 제한:', requestedLimit || '기본값');
    
    // 각 섹션별 URL 정의
    const allSections = [
      { code: 'sisa', name: '시사', url: `https://news.nate.com/rank/interest?sc=sisa&p=day&date=${dateString}` },
      { code: 'spo', name: '스포츠', url: `https://news.nate.com/rank/interest?sc=spo&p=day&date=${dateString}` },
      { code: 'ent', name: '연예', url: `https://news.nate.com/rank/interest?sc=ent&p=day&date=${dateString}` },
      { code: 'pol', name: '정치', url: `https://news.nate.com/rank/interest?sc=pol&p=day&date=${dateString}` },
      { code: 'eco', name: '경제', url: `https://news.nate.com/rank/interest?sc=eco&p=day&date=${dateString}` },
      { code: 'soc', name: '사회', url: `https://news.nate.com/rank/interest?sc=soc&p=day&date=${dateString}` },
      { code: 'int', name: '세계', url: `https://news.nate.com/rank/interest?sc=int&p=day&date=${dateString}` },
      { code: 'its', name: '과학', url: `https://news.nate.com/rank/interest?sc=its&p=day&date=${dateString}` }
    ];
    
    // 요청된 섹션이 있으면 필터링, 없으면 전체
    const crawlSections = requestedSections && requestedSections.length > 0
      ? allSections.filter(section => requestedSections.includes(section.code))
      : allSections;

    const resultSections: NateNewsSection[] = [];
    let totalArticles = 0;
    let newArticles = 0;
    let duplicateArticles = 0;

    // 각 섹션별로 크롤링 및 저장
    for (const section of crawlSections) {
      try {
        console.log(`🔍 ${section.name} 섹션 크롤링 시작:`, section.url);
        
        // fetch로 HTML 가져오기
        const response = await fetch(section.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // EUC-KR 인코딩을 UTF-8로 변환
        let html: string;
        try {
          const buffer = await response.arrayBuffer();
          const decoder = new TextDecoder('euc-kr');
          html = decoder.decode(buffer);
          console.log(`✅ ${section.name} EUC-KR → UTF-8 변환 성공`);
        } catch (encodingError) {
          console.warn(`⚠️ ${section.name} EUC-KR 변환 실패, 원본 텍스트 사용:`, encodingError);
          html = await response.text();
        }

        // HTML에서 뉴스 추출
        const articles: NateNewsArticle[] = [];
        const patterns = [
          /<li class="r(\d+)">\s*<a[^>]*href="([^"]*)"[^>]*>\s*<span class="cnt">(\d+)<\/span>\s*<h2 class="context">([^<]+)<\/h2>/g,
          /<a[^>]*href="([^"]*)"[^>]*>\s*<h2[^>]*>([^<]+)<\/h2>/g,
          /<span[^>]*class="[^"]*rank[^"]*"[^>]*>(\d+)<\/span>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/g,
          /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/g
        ];
        
        let foundArticles = false;
        
        for (const pattern of patterns) {
          if (foundArticles) break;
          
          let match;
          let count = 0;
          pattern.lastIndex = 0;
          
          while ((match = pattern.exec(html)) !== null && count < 5) {
            let rank, link, title;
            
            if (pattern === patterns[0]) {
              rank = parseInt(match[3]);
              link = match[2];
              title = match[4].trim();
            } else if (pattern === patterns[1]) {
              rank = count + 1;
              link = match[1];
              title = match[2].trim();
            } else if (pattern === patterns[2]) {
              rank = parseInt(match[1]);
              link = match[2];
              title = match[3].trim();
            } else {
              rank = count + 1;
              link = match[1];
              title = match[2].trim();
            }
            
            // 유효한 데이터인지 확인
            if (title && link && title.length > 5 && !title.includes('광고') && !title.includes('배너')) {
              // 링크 정규화
              let fullLink = link;
              if (link.startsWith('//')) {
                fullLink = `https:${link}`;
              } else if (link.startsWith('/')) {
                fullLink = `https://news.nate.com${link}`;
              } else if (!link.startsWith('http')) {
                fullLink = `https://news.nate.com/${link}`;
              }
              
              // 중복 제거
              const isDuplicate = articles.some(article => article.title === title);
              if (!isDuplicate) {
                articles.push({
                  rank,
                  title,
                  link: fullLink,
                  source: '네이트 뉴스',
                  summary: title,
                  publishedAt: dateString,
                  section: section.code,
                  crawledAt
                });
                count++;
              }
            }
          }
          
          if (articles.length > 0) {
            foundArticles = true;
            console.log(`✅ ${section.name} 패턴 ${patterns.indexOf(pattern) + 1}으로 ${articles.length}개 기사 발견`);
            break;
          }
        }

        // Firebase에 저장
        for (const article of articles) {
          try {
            // 중복 체크 (같은 제목과 섹션)
            const duplicateQuery = db.collection('nateNews')
              .where('title', '==', article.title)
              .where('section', '==', article.section)
              .where('publishedAt', '==', article.publishedAt)
              .limit(1);
            
            const duplicateDocs = await duplicateQuery.get();
            
            if (duplicateDocs.empty) {
              // 새 기사 저장
              await db.collection('nateNews').add(article);
              newArticles++;
              console.log(`✅ 새 기사 저장: ${article.title}`);
            } else {
              duplicateArticles++;
              console.log(`⚠️ 중복 기사 건너뜀: ${article.title}`);
            }
          } catch (saveError) {
            console.error(`❌ 기사 저장 실패: ${article.title}`, saveError);
          }
        }

        resultSections.push({
          section: section.code,
          sectionName: section.name,
          articles
        });

        totalArticles += articles.length;
        console.log(`✅ ${section.name} 섹션: ${articles.length}개 기사 크롤링 및 저장 완료`);

      } catch (error) {
        console.error(`❌ ${section.name} 섹션 크롤링 오류:`, error);
        
        // 오류 발생 시 빈 배열로 추가
        resultSections.push({
          section: section.code,
          sectionName: section.name,
          articles: []
        });
      }
    }

    // 크롤링 이력 저장
    try {
      await db.collection('crawlHistory').add({
        crawledAt,
        date: dateString,
        totalArticles,
        newArticles,
        duplicateArticles,
        sections: crawlSections.length,
        status: 'success'
      });
      console.log('✅ 크롤링 이력 저장 완료');
    } catch (historyError) {
      console.error('❌ 크롤링 이력 저장 실패:', historyError);
    }

    const response: AutoCrawlResponse = {
      success: true,
      message: '자동 크롤링이 성공적으로 완료되었습니다.',
      crawledAt,
      totalArticles,
      sections: crawlSections.length,
      newArticles,
      duplicateArticles
    };

    console.log(`🎉 자동 크롤링 완료: ${totalArticles}개 기사, ${newArticles}개 새 기사, ${duplicateArticles}개 중복`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ 자동 크롤링 오류:', error);
    
    // 오류 이력 저장
    try {
      await db.collection('crawlHistory').add({
        crawledAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        totalArticles: 0,
        newArticles: 0,
        duplicateArticles: 0,
        sections: 0,
        status: 'error',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } catch (historyError) {
      console.error('❌ 오류 이력 저장 실패:', historyError);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: '자동 크롤링 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 