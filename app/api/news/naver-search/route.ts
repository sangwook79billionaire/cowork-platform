import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface NaverNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keywords = ['노인 건강', '시니어 건강'] } = await request.json();
    
    console.log('🔍 네이버 뉴스 검색 시작:', keywords);
    
    // Puppeteer 브라우저 실행
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 네이버 뉴스 검색 페이지로 이동
    const searchQuery = encodeURIComponent(keywords.join(' '));
    const searchUrl = `https://search.naver.com/search.naver?ssc=tab.news.all&where=news&sm=tab_jum&query=${searchQuery}`;
    
    console.log('🌐 네이버 뉴스 검색 URL:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // 스크롤하여 더 많은 뉴스 로드 (3번 반복)
    for (let i = 0; i < 3; i++) {
      console.log(`📜 스크롤 ${i + 1}/3 실행`);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
    }
    
    // 뉴스 기사 추출
    const articles = await page.evaluate(() => {
      const newsElements = document.querySelectorAll('.sds-comps-vertical-layout.sds-comps-full-layout.AJXJAbKYw_DYV0IDSE8f');
      const extractedArticles: any[] = [];
      
      newsElements.forEach((element) => {
        try {
          // 제목 추출
          const titleElement = element.querySelector('.sds-comps-text-type-headline1');
          const title = titleElement?.textContent?.trim() || '';
          
          // 요약 내용 추출
          const summaryElement = element.querySelector('.sds-comps-text-type-body1');
          const summary = summaryElement?.textContent?.trim() || '';
          
          // 링크 추출
          const linkElement = element.querySelector('a[href*="news.naver.com"], a[href*="chosun.com"], a[href*="joongang.co.kr"], a[href*="donga.com"]');
          const link = linkElement?.getAttribute('href') || '';
          
          // 언론사 추출
          const sourceElement = element.querySelector('.sds-comps-profile-info-title-text');
          const source = sourceElement?.textContent?.trim() || '';
          
          // 발행일 추출
          const dateElement = element.querySelector('.sds-comps-profile-info-subtext');
          const publishedAt = dateElement?.textContent?.trim() || '';
          
          if (title && summary && link) {
            extractedArticles.push({
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
      
      return extractedArticles;
    });
    
    console.log('📊 추출된 기사 수:', articles.length);
    
    // 중복 제거 및 정리
    const uniqueArticles = articles.filter((article, index, self) => {
      const firstIndex = self.findIndex(a => a.title === article.title);
      return firstIndex === index;
    });
    
    console.log('✅ 중복 제거 후 기사 수:', uniqueArticles.length);
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      articles: uniqueArticles,
      totalCount: uniqueArticles.length,
      keywords
    });
    
  } catch (error) {
    console.error('❌ 네이버 뉴스 검색 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '네이버 뉴스 검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 