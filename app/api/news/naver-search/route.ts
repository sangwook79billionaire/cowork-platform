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
    
    // 네이버 뉴스 검색 페이지 URL
    const searchQuery = encodeURIComponent(keywords.join(' '));
    const searchUrl = `https://search.naver.com/search.naver?ssc=tab.news.all&where=news&sm=tab_jum&query=${searchQuery}`;
    
    console.log('🌐 네이버 뉴스 검색 URL:', searchUrl);
    
    // HTTP 요청으로 페이지 가져오기
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('📄 HTML 로드 완료');
    
    const articles: NaverNewsArticle[] = [];
    
    // 네이버 뉴스 검색 결과 파싱
    $('.news_wrap.api_ani_send').each((index, element) => {
      try {
        const $element = $(element);
        
        // 제목 추출
        const title = $element.find('.news_tit').text().trim();
        
        // 요약 내용 추출
        const summary = $element.find('.dsc_txt_wrap').text().trim();
        
        // 링크 추출
        const link = $element.find('.news_tit').attr('href') || '';
        
        // 언론사 추출
        const source = $element.find('.info_group a').first().text().trim();
        
        // 발행일 추출
        const publishedAt = $element.find('.info_group span').last().text().trim();
        
        if (title && summary && link) {
          articles.push({
            title,
            summary,
            link,
            source: source || '네이버 뉴스',
            publishedAt: publishedAt || '최근'
          });
        }
      } catch (error) {
        console.error('기사 파싱 중 오류:', error);
      }
    });
    
    // 대안: 다른 선택자로 시도
    if (articles.length === 0) {
      $('.sds-comps-vertical-layout').each((index, element) => {
        try {
          const $element = $(element);
          
          const title = $element.find('.sds-comps-text-type-headline1').text().trim();
          const summary = $element.find('.sds-comps-text-type-body1').text().trim();
          const link = $element.find('a').attr('href') || '';
          const source = $element.find('.sds-comps-profile-info-title-text').text().trim();
          const publishedAt = $element.find('.sds-comps-profile-info-subtext').text().trim();
          
          if (title && summary && link) {
            articles.push({
              title,
              summary,
              link,
              source: source || '네이버 뉴스',
              publishedAt: publishedAt || '최근'
            });
          }
        } catch (error) {
          console.error('대안 파싱 중 오류:', error);
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
        isMock: false
      });
    }
    
    // 실제 기사가 없으면 모의 데이터 제공
    console.log('⚠️ 실제 기사를 찾지 못해 모의 데이터를 제공합니다.');
    const mockArticles: NaverNewsArticle[] = [
      {
        title: `[모의] ${keywords.join(' ')} 관련 최신 동향`,
        summary: `${keywords.join(' ')}에 대한 최신 뉴스입니다. 전문가들은 이 분야의 중요성을 강조하고 있으며, 다양한 연구 결과와 정책 동향을 보여주고 있습니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=001&aid=0001234567',
        source: '연합뉴스',
        publishedAt: '1일 전'
      },
      {
        title: `[모의] ${keywords.join(' ')} 관리 방법과 주의사항`,
        summary: `${keywords.join(' ')}를 위한 전문적인 관리 방법과 주의사항에 대해 알아보겠습니다. 전문가들의 조언과 실제 사례를 통해 효과적인 관리 방안을 제시합니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=005&aid=0001234568',
        source: '국민일보',
        publishedAt: '2일 전'
      },
      {
        title: `[모의] ${keywords.join(' ')} 관련 정책 변화와 전망`,
        summary: `${keywords.join(' ')}와 관련된 정부 정책의 변화와 향후 전망에 대해 분석합니다. 새로운 제도와 지원 방안이 어떻게 변화하고 있는지 살펴봅니다.`,
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
    
  } catch (error) {
    console.error('❌ 네이버 뉴스 검색 오류:', error);
    
    // 오류 발생 시에도 기본 모의 데이터 제공
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