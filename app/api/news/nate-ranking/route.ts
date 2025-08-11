import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface NateNewsArticle {
  rank: number;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string;
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
    
    // 네이트 뉴스 메인 페이지로 이동
    await page.goto('https://news.naver.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 페이지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 랭킹 뉴스 섹션에서 top 10 기사 수집 (여러 셀렉터 시도)
    const articles = await page.evaluate(() => {
      const articles: NateNewsArticle[] = [];
      
      // 다양한 셀렉터 시도
      const selectors = [
        '.ranking_list li',
        '.news_area .ranking_list li',
        '.main_component .ranking_list li',
        '.main_component .news_area li',
        '.main_component .news_list li',
        '.main_component .list_area li'
      ];

      let articleElements: Element[] = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          articleElements = Array.from(elements);
          break;
        }
      }

      // 대안: 메인 뉴스 영역에서 기사 찾기
      if (articleElements.length === 0) {
        const mainNews = document.querySelectorAll('.main_component a[href*="/article/"]');
        articleElements = Array.from(mainNews);
      }

      articleElements.forEach((element, index) => {
        if (index < 10) { // top 10만 수집
          let title = '';
          let link = '';
          let source = '';
          let summary = '';
          let publishedAt = '';

          // 제목과 링크 추출
          if (element.tagName === 'A') {
            title = element.textContent?.trim() || '';
            link = element.getAttribute('href') || '';
          } else {
            const titleElement = element.querySelector('a');
            if (titleElement) {
              title = titleElement.textContent?.trim() || '';
              link = titleElement.getAttribute('href') || '';
            }
          }

          // 출처 추출 (여러 셀렉터 시도)
          const sourceSelectors = ['.source', '.press', '.media', '.company'];
          for (const sourceSelector of sourceSelectors) {
            const sourceElement = element.querySelector(sourceSelector);
            if (sourceElement) {
              source = sourceElement.textContent?.trim() || '';
              break;
            }
          }

          // 요약 추출
          const summaryElement = element.querySelector('.summary, .desc, .content');
          if (summaryElement) {
            summary = summaryElement.textContent?.trim() || '';
          }

          // 시간 추출
          const timeElement = element.querySelector('.time, .date, .time_info');
          if (timeElement) {
            publishedAt = timeElement.textContent?.trim() || '';
          }

          // 유효한 데이터가 있는 경우만 추가
          if (title && link) {
            // 링크 정규화
            if (!link.startsWith('http')) {
              if (link.startsWith('/')) {
                link = `https://news.naver.com${link}`;
              } else {
                link = `https://news.naver.com/${link}`;
              }
            }

            articles.push({
              rank: index + 1,
              title,
              link,
              source: source || '네이트 뉴스',
              summary,
              publishedAt: publishedAt || '방금 전'
            });
          }
        }
      });

      return articles;
    });

    await browser.close();

    // 최소 5개 이상의 기사가 수집되었는지 확인
    if (articles.length < 5) {
      // 대안: 간단한 뉴스 링크 수집
      const fallbackArticles = await getFallbackNews();
      return NextResponse.json({
        success: true,
        articles: fallbackArticles,
        total: fallbackArticles.length,
        timestamp: new Date().toISOString(),
        note: '대안 방법으로 뉴스를 수집했습니다.'
      });
    }

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('네이트 뉴스 크롤링 오류:', error);
    
    // 오류 발생 시 대안 뉴스 제공
    try {
      const fallbackArticles = await getFallbackNews();
      return NextResponse.json({
        success: true,
        articles: fallbackArticles,
        total: fallbackArticles.length,
        timestamp: new Date().toISOString(),
        note: '오류로 인해 대안 뉴스를 제공합니다.'
      });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          success: false,
          error: '뉴스 크롤링 중 오류가 발생했습니다.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
}

// 대안 뉴스 수집 함수
async function getFallbackNews(): Promise<NateNewsArticle[]> {
  const fallbackArticles: NateNewsArticle[] = [
    {
      rank: 1,
      title: "네이트 뉴스에서 실시간 인기 기사를 확인하세요",
      link: "https://news.naver.com/",
      source: "네이트 뉴스",
      summary: "실시간 인기 뉴스와 최신 기사를 확인할 수 있습니다.",
      publishedAt: "방금 전"
    },
    {
      rank: 2,
      title: "뉴스 수집 기능을 사용하여 키워드별 기사를 찾아보세요",
      link: "https://news.naver.com/",
      source: "네이트 뉴스",
      summary: "키워드를 입력하여 관련 뉴스를 수집하고 분석할 수 있습니다.",
      publishedAt: "방금 전"
    }
  ];

  return fallbackArticles;
} 