import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

interface GoogleNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
  keyword: string;
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const keywords = requestData.keywords || ['노인 건강'];
    
    console.log('🔍 구글 뉴스 알리미 검색 시작:', keywords);
    
    // 구글 뉴스 알리미 RSS 피드 URL (기본값)
    const defaultRssUrl = 'https://www.google.co.kr/alerts/feeds/10135753313873372909/17318554124051815329';
    
    // 사용자가 제공한 RSS URL이 있으면 사용, 없으면 기본값 사용
    const rssUrl = requestData.rssUrl || defaultRssUrl;
    
    console.log('🌐 구글 뉴스 알리미 RSS URL:', rssUrl);
    
    // RSS 피드 가져오기
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const xmlData = response.data;
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    const result = parser.parse(xmlData);
    console.log('📊 RSS 파싱 결과:', result);
    
    const articles: GoogleNewsArticle[] = [];
    
    // RSS 피드에서 기사 추출
    if (result.feed && result.feed.entry) {
      const entries = Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];
      
      entries.forEach((entry: any, index: number) => {
        if (index < 20) { // 최대 20개 기사
          const title = entry.title || '';
          const summary = entry.content || '';
          const link = entry.link?.['@_href'] || '';
          const publishedAt = entry.published || '';
          const source = entry.author?.name || '구글 뉴스';
          
          // 키워드 매칭 확인
          const titleLower = title.toLowerCase();
          const summaryLower = summary.toLowerCase();
          const keywordArray = keywords.map((k: string) => k.toLowerCase());
          
          const hasKeyword = keywordArray.some((keyword: string) => 
            titleLower.includes(keyword) || summaryLower.includes(keyword)
          );
          
          if (title && link && hasKeyword) {
            articles.push({
              title: title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
              summary: summary.replace(/<[^>]*>/g, '').substring(0, 200) + '...', // HTML 태그 제거 및 요약
              link,
              source,
              publishedAt,
              keyword: keywords.join(', ')
            });
          }
        }
      });
    }
    
    console.log('📊 추출된 기사 수:', articles.length);
    
    // 중복 제거
    const uniqueArticles = articles.filter((article, index, self) => {
      const firstIndex = self.findIndex(a => a.title === article.title);
      return firstIndex === index;
    });
    
    console.log('✅ 중복 제거 후 기사 수:', uniqueArticles.length);
    
    // 실제 기사가 있으면 반환
    if (uniqueArticles.length > 0) {
      return NextResponse.json({
        success: true,
        articles: uniqueArticles.slice(0, 10), // 최대 10개
        totalCount: uniqueArticles.length,
        keywords,
        isMock: false,
        source: 'Google News Alerts'
      });
    }
    
    // 실제 기사가 없으면 모의 데이터 제공
    console.log('⚠️ 실제 기사를 찾지 못해 모의 데이터를 제공합니다.');
    const mockArticles: GoogleNewsArticle[] = [
      {
        title: `[모의] ${keywords.join(' ')} 관련 최신 동향`,
        summary: `${keywords.join(' ')}에 대한 최신 뉴스입니다. 전문가들은 이 분야의 중요성을 강조하고 있으며, 다양한 연구 결과와 정책 동향을 보여주고 있습니다.`,
        link: 'https://news.google.com/articles/example1',
        source: 'Google News',
        publishedAt: new Date().toISOString(),
        keyword: keywords.join(', ')
      },
      {
        title: `[모의] ${keywords.join(' ')} 관리 방법과 주의사항`,
        summary: `${keywords.join(' ')}를 위한 전문적인 관리 방법과 주의사항에 대해 알아보겠습니다. 전문가들의 조언과 실제 사례를 통해 효과적인 관리 방안을 제시합니다.`,
        link: 'https://news.google.com/articles/example2',
        source: 'Google News',
        publishedAt: new Date().toISOString(),
        keyword: keywords.join(', ')
      }
    ];
    
    return NextResponse.json({
      success: true,
      articles: mockArticles,
      totalCount: mockArticles.length,
      keywords,
      isMock: true,
      source: 'Google News Alerts (Mock)'
    });
    
  } catch (error) {
    console.error('❌ 구글 뉴스 알리미 검색 오류:', error);
    
    // 오류 발생 시에도 기본 모의 데이터 제공
    const fallbackArticles: GoogleNewsArticle[] = [
      {
        title: '[오류 대체] 노인 건강관리 중요성',
        summary: '고령화 사회에서 노인 건강관리의 중요성이 더욱 부각되고 있습니다.',
        link: 'https://news.google.com/articles/fallback1',
        source: 'Google News',
        publishedAt: new Date().toISOString(),
        keyword: '노인 건강'
      },
      {
        title: '[오류 대체] 시니어 건강 운동 가이드',
        summary: '노인들의 건강을 위한 맞춤형 운동 프로그램이 인기를 끌고 있습니다.',
        link: 'https://news.google.com/articles/fallback2',
        source: 'Google News',
        publishedAt: new Date().toISOString(),
        keyword: '시니어 건강'
      }
    ];
    
    return NextResponse.json({
      success: true,
      articles: fallbackArticles,
      totalCount: fallbackArticles.length,
      keywords: ['노인 건강', '시니어 건강'],
      isMock: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'Google News Alerts (Error)'
    });
  }
} 