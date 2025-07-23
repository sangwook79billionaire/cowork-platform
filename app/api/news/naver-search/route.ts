import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface NaverNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
}

export async function POST(request: NextRequest) {
  let keywords = ['노인 건강', '시니어 건강'];
  
  try {
    const requestData = await request.json();
    keywords = requestData.keywords || keywords;
    
    console.log('🔍 네이버 뉴스 검색 시작:', keywords);
    
    // 네이버 뉴스 검색 URL
    const searchQuery = encodeURIComponent(keywords.join(' '));
    const searchUrl = `https://search.naver.com/search.naver?ssc=tab.news.all&where=news&sm=tab_jum&query=${searchQuery}`;
    
    console.log('🌐 네이버 뉴스 검색 URL:', searchUrl);
    
    // HTTP 요청으로 페이지 가져오기
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const articles: NaverNewsArticle[] = [];
    
    // 네이버 뉴스 기사 요소들 찾기
    $('.sds-comps-vertical-layout.sds-comps-full-layout.AJXJAbKYw_DYV0IDSE8f').each((index, element) => {
      try {
        // 제목 추출
        const title = $(element).find('.sds-comps-text-type-headline1').text().trim();
        
        // 요약 내용 추출
        const summary = $(element).find('.sds-comps-text-type-body1').text().trim();
        
        // 링크 추출
        const link = $(element).find('a[href*="news.naver.com"], a[href*="chosun.com"], a[href*="joongang.co.kr"], a[href*="donga.com"]').attr('href') || '';
        
        // 언론사 추출
        const source = $(element).find('.sds-comps-profile-info-title-text').text().trim();
        
        // 발행일 추출
        const publishedAt = $(element).find('.sds-comps-profile-info-subtext').text().trim();
        
        if (title && summary && link) {
          articles.push({
            title,
            summary,
            link,
            source,
            publishedAt
          });
        }
      } catch (error) {
        console.error('기사 추출 중 오류:', error);
      }
    });
    
    console.log('📊 추출된 기사 수:', articles.length);
    
    // 중복 제거 및 정리
    const uniqueArticles = articles.filter((article, index, self) => {
      const firstIndex = self.findIndex(a => a.title === article.title);
      return firstIndex === index;
    });
    
    console.log('✅ 중복 제거 후 기사 수:', uniqueArticles.length);
    
    // 만약 실제 기사를 찾지 못했다면 모의 데이터 제공
    if (uniqueArticles.length === 0) {
      console.log('⚠️ 실제 기사를 찾지 못해 모의 데이터를 제공합니다.');
      const mockArticles: NaverNewsArticle[] = [
        {
          title: '[모의] 노인 건강관리 중요성 증가',
          summary: '고령화 사회에서 노인 건강관리의 중요성이 더욱 부각되고 있습니다. 전문가들은 정기적인 건강검진과 적절한 운동의 필요성을 강조하고 있습니다.',
          link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=001&aid=0001234567',
          source: '연합뉴스',
          publishedAt: '1일 전'
        },
        {
          title: '[모의] 시니어 건강을 위한 운동 가이드',
          summary: '노인들의 건강을 위한 맞춤형 운동 프로그램이 인기를 끌고 있습니다. 전문가들은 무리하지 않는 선에서 꾸준한 운동을 권장합니다.',
          link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=005&aid=0001234568',
          source: '국민일보',
          publishedAt: '2일 전'
        },
        {
          title: '[모의] 노인 건강증진 정책 확대',
          summary: '정부가 노인 건강증진을 위한 다양한 정책을 확대하고 있습니다. 지역사회 건강관리 프로그램과 무료 건강검진 서비스가 확대됩니다.',
          link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=011&aid=0001234569',
          source: '서울경제',
          publishedAt: '3일 전'
        }
      ];
      
      return NextResponse.json({
        success: true,
        articles: mockArticles,
        totalCount: mockArticles.length,
        keywords,
        isMock: true
      });
    }
    
    return NextResponse.json({
      success: true,
      articles: uniqueArticles,
      totalCount: uniqueArticles.length,
      keywords,
      isMock: false
    });
    
  } catch (error) {
    console.error('❌ 네이버 뉴스 검색 오류:', error);
    
    // 오류 발생 시에도 모의 데이터 제공
    const fallbackArticles: NaverNewsArticle[] = [
      {
        title: '[오류 대체] 노인 건강관리 중요성',
        summary: '고령화 사회에서 노인 건강관리의 중요성이 더욱 부각되고 있습니다.',
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=001&aid=0001234567',
        source: '연합뉴스',
        publishedAt: '1일 전'
      },
      {
        title: '[오류 대체] 시니어 건강 운동 가이드',
        summary: '노인들의 건강을 위한 맞춤형 운동 프로그램이 인기를 끌고 있습니다.',
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=005&aid=0001234568',
        source: '국민일보',
        publishedAt: '2일 전'
      }
    ];
    
    return NextResponse.json({
      success: true,
      articles: fallbackArticles,
      totalCount: fallbackArticles.length,
      keywords: keywords || ['노인 건강', '시니어 건강'],
      isMock: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 