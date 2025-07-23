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
    console.log('📄 XML 데이터 길이:', xmlData.length);
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '_text',
      parseAttributeValue: true
    });
    
    const result = parser.parse(xmlData);
    console.log('📊 RSS 파싱 결과 구조:', JSON.stringify(result, null, 2).substring(0, 1000));
    
    const articles: GoogleNewsArticle[] = [];
    
    // 다양한 RSS 구조 시도
    const possibleStructures = [
      // 구조 1: 표준 RSS
      () => {
        if (result.rss && result.rss.channel && result.rss.channel.item) {
          return Array.isArray(result.rss.channel.item) 
            ? result.rss.channel.item 
            : [result.rss.channel.item];
        }
        return null;
      },
      // 구조 2: Atom 피드
      () => {
        if (result.feed && result.feed.entry) {
          return Array.isArray(result.feed.entry) 
            ? result.feed.entry 
            : [result.feed.entry];
        }
        return null;
      }
    ];
    
    let entries: any[] = [];
    
    // 각 구조 시도
    for (const structureFn of possibleStructures) {
      const foundEntries = structureFn();
      if (foundEntries && foundEntries.length > 0) {
        entries = foundEntries;
        console.log('✅ RSS 구조 발견, 엔트리 수:', entries.length);
        break;
      }
    }
    
    if (entries.length === 0) {
      console.log('❌ RSS 구조를 찾을 수 없음, 모의 데이터 제공');
      const mockArticles: GoogleNewsArticle[] = [
        {
          title: '시니어 건강 관리의 중요성',
          summary: '노인 건강 관리에 대한 최신 정보와 팁을 제공합니다. 규칙적인 운동과 균형 잡힌 식단이 중요합니다.',
          link: 'https://example.com/senior-health-1',
          publishedAt: '2024-07-22',
          source: '건강뉴스',
          keyword: keywords.join(', ')
        },
        {
          title: '노인 운동 프로그램 가이드',
          summary: '시니어를 위한 안전하고 효과적인 운동 프로그램을 소개합니다. 관절 건강과 근력 강화에 중점을 둡니다.',
          link: 'https://example.com/senior-exercise',
          publishedAt: '2024-07-21',
          source: '시니어라이프',
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
    }
    
    // 엔트리에서 기사 추출
    entries.forEach((entry: any, index: number) => {
      if (index < 20) { // 최대 20개 기사
        console.log(`📝 엔트리 ${index + 1}:`, JSON.stringify(entry, null, 2));
        
        // 다양한 필드명 시도
        const title = entry.title?._text || entry.title || entry.name || '';
        const summary = entry.description?._text || entry.description || entry.content?._text || entry.content || entry.summary?._text || entry.summary || '';
        const link = entry.link?._text || entry.link || entry.url || entry.href || '';
        const publishedAt = entry.pubDate?._text || entry.pubDate || entry.published?._text || entry.published || entry.updated?._text || entry.updated || '';
        const source = entry.author?._text || entry.author || entry.source?._text || entry.source || '구글 뉴스';
        
        console.log(`📄 추출된 데이터 ${index + 1}:`, {
          title: title.substring(0, 50),
          summary: summary.substring(0, 50),
          link: link.substring(0, 50),
          publishedAt,
          source
        });
        
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