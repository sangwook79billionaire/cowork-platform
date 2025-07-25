import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export const dynamic = 'force-dynamic';

interface NewsArticle {
  title: string;
  link: string;
  source: string;
  published_at: string;
  description: string;
  keyword: string;
  collected_at: string;
}

interface NewsCollectionResult {
  total_collected: number;
  total_unique: number;
  keywords: string[];
  failed_keywords: string[];
  excel_file: string | null;
  firebase_uploaded: boolean;
  message: string;
}

// 키워드 처리 함수 - AND, OR, 정확한 구문 검색 지원
function processKeywords(inputKeywords: string[]): string[] {
  const processedKeywords: string[] = [];
  
  for (const keyword of inputKeywords) {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) continue;
    
    // 정확한 구문 검색 (큰따옴표로 감싸진 경우)
    if (trimmedKeyword.startsWith('"') && trimmedKeyword.endsWith('"')) {
      processedKeywords.push(trimmedKeyword);
      continue;
    }
    
    // OR 검색 처리
    if (trimmedKeyword.includes(' OR ')) {
      const orParts = trimmedKeyword.split(' OR ').map(part => part.trim());
      processedKeywords.push(...orParts);
      continue;
    }
    
    // AND 검색 처리 (공백으로 구분된 여러 단어)
    if (trimmedKeyword.includes(' ')) {
      // 공백으로 구분된 단어들을 하나의 검색어로 처리
      processedKeywords.push(trimmedKeyword);
      continue;
    }
    
    // 단일 키워드
    processedKeywords.push(trimmedKeyword);
  }
  
  return processedKeywords;
}

// Google News RSS에서 뉴스 수집
async function collectNewsFromRSS(keyword: string): Promise<NewsArticle[]> {
  try {
    // 키워드 전처리
    let searchKeyword = keyword;
    
    // 정확한 구문 검색인 경우 큰따옴표 제거하고 검색
    if (keyword.startsWith('"') && keyword.endsWith('"')) {
      searchKeyword = keyword.slice(1, -1);
    }
    
    const encodedKeyword = encodeURIComponent(searchKeyword);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;
    
    console.log(`🔍 Google News RSS 검색 시작: ${keyword}`);
    console.log(`📡 RSS URL: ${rssUrl}`);
    
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '_text',
      parseAttributeValue: true
    });

    const result = parser.parse(response.data);
    const articles: NewsArticle[] = [];

    // RSS 구조에서 아이템 추출
    let items: any[] = [];
    if (result.rss && result.rss.channel && result.rss.channel.item) {
      items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];
    }

    console.log(`📊 RSS 파싱 결과: ${items.length}개 아이템`);

    // 각 아이템을 뉴스 기사로 변환
    for (const item of items.slice(0, 100)) { // 최대 100개
      try {
        const article: NewsArticle = {
          title: item.title || '제목 없음',
          link: item.link || '',
          source: extractSourceFromTitle(item.title) || 'Unknown',
          published_at: item.pubDate || new Date().toISOString(),
          description: item.description || '',
          keyword: keyword, // 원본 키워드 저장
          collected_at: new Date().toISOString()
        };

        if (article.title && article.link) {
          articles.push(article);
        }
      } catch (error) {
        console.error('아이템 파싱 오류:', error);
      }
    }

    console.log(`✅ Google News RSS에서 ${articles.length}개의 뉴스를 수집했습니다.`);
    return articles;

  } catch (error) {
    console.error('RSS 수집 오류:', error);
    return [];
  }
}

// 제목에서 소스 추출
function extractSourceFromTitle(title: string): string {
  const sourceMatch = title.match(/\s*-\s*([^-]+)$/);
  return sourceMatch ? sourceMatch[1].trim() : 'Unknown';
}

// 중복 제거
function removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter(article => {
    const key = `${article.title}-${article.link}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: '키워드 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 키워드 전처리
    const processedKeywords = processKeywords(keywords);
    console.log(`🔍 뉴스 수집 시작: ${keywords.join(', ')}`);
    console.log(`📝 처리된 키워드: ${processedKeywords.join(', ')}`);

    const allArticles: NewsArticle[] = [];
    const failedKeywords: string[] = [];

    // 각 키워드별로 뉴스 수집
    for (const keyword of processedKeywords) {
      try {
        const articles = await collectNewsFromRSS(keyword);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`키워드 "${keyword}" 수집 실패:`, error);
        failedKeywords.push(keyword);
      }
    }

    // 중복 제거
    const uniqueArticles = removeDuplicates(allArticles);
    console.log(`🔄 중복 제거: ${allArticles.length} → ${uniqueArticles.length}`);

    // Firebase에 저장
    let firebaseUploaded = false;
    if (uniqueArticles.length > 0 && db) {
      try {
        const batch = db.batch();
        
        for (const article of uniqueArticles) {
          const docRef = db.collection('news').doc();
          batch.set(docRef, article);
        }
        
        await batch.commit();
        firebaseUploaded = true;
        console.log(`✅ Firebase 업로드 완료: ${uniqueArticles.length}개 문서`);
      } catch (error) {
        console.error('Firebase 업로드 오류:', error);
      }
    }

    const result: NewsCollectionResult = {
      total_collected: allArticles.length,
      total_unique: uniqueArticles.length,
      keywords: keywords, // 원본 키워드 반환
      failed_keywords: failedKeywords,
      excel_file: null, // Vercel에서는 파일 생성 불가
      firebase_uploaded: firebaseUploaded,
      message: '뉴스 수집이 완료되었습니다.'
    };

    console.log(`📊 수집 결과:
  - 총 수집: ${result.total_collected}개
  - 중복 제거 후: ${result.total_unique}개
  - 성공한 키워드: ${processedKeywords.length - failedKeywords.length}개
  - 실패한 키워드: ${failedKeywords.length}개
  - Firebase 업로드: ${firebaseUploaded ? '성공' : '실패'}
✅ 뉴스 수집 완료!`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('뉴스 수집 API 오류:', error);
    console.error('오류 스택:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: '뉴스 수집 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 