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
    
    // 네이트 뉴스 랭킹 페이지로 이동
    await page.goto('https://news.nate.com/rank', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 페이지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 네이트 뉴스 랭킹에서 top 10 기사 수집
    const articles = await page.evaluate(() => {
      const articles: NateNewsArticle[] = [];
      
      // 네이트 뉴스 랭킹 페이지의 다양한 셀렉터 시도
      const selectors = [
        '.rankNews .rankNewsList li',
        '.rankNews .rankNewsList .rankNewsItem',
        '.rankNews .rankNewsList a',
        '.rankNews .rankNewsItem',
        '.rankNews .rankNewsList .item',
        '.rankNews .rankNewsList .newsItem',
        '.rankNews .rankNewsList .news',
        '.rankNews .rankNewsList .article',
        '.rankNews .rankNewsList .title',
        '.rankNews .rankNewsList .newsTitle',
        '.rankNews .rankNewsList .newsLink',
        '.rankNews .rankNewsList .newsItem a',
        '.rankNews .rankNewsList .newsTitle a',
        '.rankNews .rankNewsList .newsLink a'
      ];

      let articleElements: Element[] = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          articleElements = Array.from(elements);
          console.log(`셀렉터 "${selector}"에서 ${elements.length}개 요소 발견`);
          break;
        }
      }

      // 대안: 랭킹 관련 링크 찾기
      if (articleElements.length === 0) {
        const rankingLinks = document.querySelectorAll('a[href*="/view/"]');
        articleElements = Array.from(rankingLinks);
        console.log(`대안 방법으로 ${rankingLinks.length}개 링크 발견`);
      }

      // 추가 대안: 뉴스 관련 링크 찾기
      if (articleElements.length === 0) {
        const newsLinks = document.querySelectorAll('a[href*="news.nate.com"]');
        articleElements = Array.from(newsLinks);
        console.log(`뉴스 링크로 ${newsLinks.length}개 요소 발견`);
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

          // 출처 추출 (네이트 뉴스에 맞는 셀렉터)
          const sourceSelectors = [
            '.source', '.press', '.media', '.company', '.press_name',
            '.newsSource', '.newsPress', '.newsMedia', '.newsCompany',
            '.rankNewsSource', '.rankNewsPress', '.rankNewsMedia'
          ];
          for (const sourceSelector of sourceSelectors) {
            const sourceElement = element.querySelector(sourceSelector);
            if (sourceElement) {
              source = sourceElement.textContent?.trim() || '';
              break;
            }
          }

          // 요약 추출
          const summarySelectors = [
            '.summary', '.desc', '.content', '.article_summary',
            '.newsSummary', '.newsDesc', '.newsContent',
            '.rankNewsSummary', '.rankNewsDesc', '.rankNewsContent'
          ];
          for (const summarySelector of summarySelectors) {
            const summaryElement = element.querySelector(summarySelector);
            if (summaryElement) {
              summary = summaryElement.textContent?.trim() || '';
              break;
            }
          }

          // 시간 추출
          const timeSelectors = [
            '.time', '.date', '.time_info', '.article_time',
            '.newsTime', '.newsDate', '.newsTimeInfo',
            '.rankNewsTime', '.rankNewsDate', '.rankNewsTimeInfo'
          ];
          for (const timeSelector of timeSelectors) {
            const timeElement = element.querySelector(timeSelector);
            if (timeElement) {
              publishedAt = timeElement.textContent?.trim() || '';
              break;
            }
          }

          // 유효한 데이터가 있는 경우만 추가
          if (title && link) {
            // 링크 정규화 (네이트 뉴스 도메인)
            if (!link.startsWith('http')) {
              if (link.startsWith('/')) {
                link = `https://news.nate.com${link}`;
              } else {
                link = `https://news.nate.com/${link}`;
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

    console.log('🔍 크롤링 결과:', {
      articlesLength: articles.length,
      articles: articles.slice(0, 3) // 처음 3개만 로그
    });

    // 최소 5개 이상의 기사가 수집되었는지 확인
    if (articles.length < 5) {
      console.log('⚠️ 크롤링된 기사가 5개 미만, 대안 뉴스 사용');
      // 대안: 간단한 뉴스 링크 수집
      const fallbackArticles = await getFallbackNews();
      console.log('✅ 대안 뉴스 반환:', fallbackArticles.length, '개');
      return NextResponse.json({
        success: true,
        articles: fallbackArticles,
        total: fallbackArticles.length,
        timestamp: new Date().toISOString(),
        note: '대안 방법으로 뉴스를 수집했습니다.'
      });
    }

    console.log('✅ 크롤링 성공, 원본 뉴스 반환:', articles.length, '개');
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
      link: "https://news.nate.com/",
      source: "네이트 뉴스",
      summary: "실시간 인기 뉴스와 최신 기사를 확인할 수 있습니다.",
      publishedAt: "방금 전"
    },
    {
      rank: 2,
      title: "뉴스 수집 기능을 사용하여 키워드별 기사를 찾아보세요",
      link: "https://news.nate.com/",
      source: "네이트 뉴스",
      summary: "키워드를 입력하여 관련 뉴스를 수집하고 분석할 수 있습니다.",
      publishedAt: "방금 전"
    }
  ];

  return fallbackArticles;
} 