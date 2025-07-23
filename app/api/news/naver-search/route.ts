import { NextRequest, NextResponse } from 'next/server';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

interface NaverNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
}

export async function POST(request: NextRequest) {
  let keywords = ['노인 건강', '시니어 건강'];
  let driver: WebDriver | null = null;
  
  try {
    const requestData = await request.json();
    keywords = requestData.keywords || keywords;
    
    console.log('🔍 네이버 뉴스 검색 시작:', keywords);
    
    // Selenium WebDriver 설정
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    // 네이버 뉴스 검색 페이지로 이동
    const searchQuery = encodeURIComponent(keywords.join(' '));
    const searchUrl = `https://search.naver.com/search.naver?ssc=tab.news.all&where=news&sm=tab_jum&query=${searchQuery}`;
    
    console.log('🌐 네이버 뉴스 검색 URL:', searchUrl);
    await driver.get(searchUrl);
    
    // 페이지 로딩 대기
    await driver.wait(until.elementLocated(By.css('.sds-comps-vertical-layout')), 10000);
    
    // 스크롤하여 더 많은 뉴스 로드 (3번 반복)
    for (let i = 0; i < 3; i++) {
      console.log(`📜 스크롤 ${i + 1}/3 실행`);
      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
    }
    
    // 뉴스 기사 요소들 찾기
    const newsElements = await driver.findElements(By.css('.sds-comps-vertical-layout.sds-comps-full-layout.AJXJAbKYw_DYV0IDSE8f'));
    
    console.log('📊 찾은 뉴스 요소 수:', newsElements.length);
    
    const articles: NaverNewsArticle[] = [];
    
    // 각 뉴스 요소에서 정보 추출
    for (const element of newsElements) {
      try {
        // 제목 추출
        const titleElement = await element.findElement(By.css('.sds-comps-text-type-headline1'));
        const title = await titleElement.getText();
        
        // 요약 내용 추출
        const summaryElement = await element.findElement(By.css('.sds-comps-text-type-body1'));
        const summary = await summaryElement.getText();
        
        // 링크 추출
        const linkElement = await element.findElement(By.css('a[href*="news.naver.com"], a[href*="chosun.com"], a[href*="joongang.co.kr"], a[href*="donga.com"]'));
        const link = await linkElement.getAttribute('href');
        
        // 언론사 추출
        const sourceElement = await element.findElement(By.css('.sds-comps-profile-info-title-text'));
        const source = await sourceElement.getText();
        
        // 발행일 추출
        const dateElement = await element.findElement(By.css('.sds-comps-profile-info-subtext'));
        const publishedAt = await dateElement.getText();
        
        if (title && summary && link) {
          articles.push({
            title: title.trim(),
            summary: summary.trim(),
            link: link.trim(),
            source: source.trim(),
            publishedAt: publishedAt.trim()
          });
        }
      } catch (error) {
        console.error('기사 추출 중 오류:', error);
      }
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
        articles: uniqueArticles,
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
  } finally {
    // WebDriver 정리
    if (driver) {
      try {
        await driver.quit();
        console.log('🔧 WebDriver 정리 완료');
      } catch (error) {
        console.error('WebDriver 정리 중 오류:', error);
      }
    }
  }
} 