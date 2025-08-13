import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface NateNewsArticle {
  rank: number;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string;
  section: string;
}

interface NateNewsSection {
  section: string;
  sectionName: string;
  articles: NateNewsArticle[];
}

interface NateNewsResponse {
  success: boolean;
  date: string;
  sections: NateNewsSection[];
  totalArticles: number;
}

export async function GET() {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // 오늘 날짜 가져오기
    const today = new Date();
    const dateString = today.getFullYear().toString() + 
                      String(today.getMonth() + 1).padStart(2, '0') + 
                      String(today.getDate()).padStart(2, '0');
    
    console.log('🔍 크롤링 날짜:', dateString);
    
    // 각 섹션별 URL 정의
    const sections = [
      { code: 'sisa', name: '시사', url: `https://news.nate.com/rank/interest?sc=sisa&p=day&date=${dateString}` },
      { code: 'spo', name: '스포츠', url: `https://news.nate.com/rank/interest?sc=spo&p=day&date=${dateString}` },
      { code: 'ent', name: '연예', url: `https://news.nate.com/rank/interest?sc=ent&p=day&date=${dateString}` },
      { code: 'pol', name: '정치', url: `https://news.nate.com/rank/interest?sc=pol&p=day&date=${dateString}` },
      { code: 'eco', name: '경제', url: `https://news.nate.com/rank/interest?sc=eco&p=day&date=${dateString}` },
      { code: 'soc', name: '사회', url: `https://news.nate.com/rank/interest?sc=soc&p=day&date=${dateString}` },
      { code: 'int', name: '세계', url: `https://news.nate.com/rank/interest?sc=int&p=day&date=${dateString}` },
      { code: 'its', name: '과학', url: `https://news.nate.com/rank/interest?sc=its&p=day&date=${dateString}` }
    ];

    const allSections: NateNewsSection[] = [];

    // 각 섹션별로 크롤링
    for (const section of sections) {
      try {
        console.log(`🔍 ${section.name} 섹션 크롤링 시작:`, section.url);
        
        await page.goto(section.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // 페이지 로딩 대기
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 해당 섹션의 TOP 5 뉴스 크롤링
        const articles = await page.evaluate((sectionCode) => {
          const articles: NateNewsArticle[] = [];
          
          // 랭킹 뉴스 목록에서 TOP 5 추출
          const newsItems = document.querySelectorAll('.rk_list li.r1, .rk_list li.r2, .rk_list li.r3, .rk_list li.r4, .rk_list li.r5');
          
          newsItems.forEach((item, index) => {
            if (index < 5) { // TOP 5만
              const titleElement = item.querySelector('h2.context');
              const linkElement = item.querySelector('a');
              const rankElement = item.querySelector('.cnt');
              
              if (titleElement && linkElement) {
                const title = titleElement.textContent?.trim() || '';
                const link = linkElement.getAttribute('href') || '';
                const rank = parseInt(rankElement?.textContent || String(index + 1));
                
                // 링크가 상대 경로인 경우 절대 경로로 변환
                const fullLink = link.startsWith('//') ? `https:${link}` : 
                                link.startsWith('/') ? `https://news.nate.com${link}` : link;
                
                articles.push({
                  rank,
                  title,
                  link: fullLink,
                  source: '네이트 뉴스',
                  summary: title, // 제목을 요약으로 사용
                  publishedAt: new Date().toISOString().split('T')[0], // 오늘 날짜
                  section: sectionCode
                });
              }
            }
          });
          
          return articles;
        }, section.code);

        console.log(`✅ ${section.name} 섹션: ${articles.length}개 기사 크롤링 완료`);
        
        allSections.push({
          section: section.code,
          sectionName: section.name,
          articles
        });

      } catch (error) {
        console.error(`❌ ${section.name} 섹션 크롤링 오류:`, error);
        // 오류가 발생해도 빈 배열로 추가
        allSections.push({
          section: section.code,
          sectionName: section.name,
          articles: []
        });
      }
    }

    await browser.close();

    // 전체 결과 정리
    const totalArticles = allSections.reduce((sum, section) => sum + section.articles.length, 0);
    
    const response: NateNewsResponse = {
      success: true,
      date: dateString,
      sections: allSections,
      totalArticles
    };

    console.log(`🎉 전체 크롤링 완료: ${totalArticles}개 기사, ${allSections.length}개 섹션`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ 네이트 뉴스 크롤링 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '네이트 뉴스 크롤링 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 