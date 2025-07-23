import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

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
    
    // 네이버 뉴스 RSS 피드 URL
    const searchQuery = encodeURIComponent(keywords.join(' '));
    const rssUrl = `https://news.naver.com/main/rss/search.naver?query=${searchQuery}`;
    
    console.log('🌐 네이버 뉴스 RSS URL:', rssUrl);
    
    // RSS 피드 가져오기
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const xmlData = response.data;
    const parser = new XMLParser();
    const result = parser.parse(xmlData);
    
    console.log('📊 RSS 파싱 결과:', result);
    
    const articles: NaverNewsArticle[] = [];
    
    // RSS 피드에서 기사 추출
    if (result.rss && result.rss.channel && result.rss.channel.item) {
      const items = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];
      
      items.forEach((item: any, index: number) => {
        if (index < 10) { // 최대 10개 기사만
          const title = item.title || '';
          const description = item.description || '';
          const link = item.link || '';
          const pubDate = item.pubDate || '';
          
          // 언론사 추출 (link에서 추출)
          let source = '네이버 뉴스';
          if (link.includes('news.naver.com')) {
            const urlMatch = link.match(/oid=(\d+)/);
            if (urlMatch) {
              const oid = urlMatch[1];
              const sourceMap: { [key: string]: string } = {
                '001': '연합뉴스',
                '005': '국민일보',
                '011': '서울경제',
                '021': '문화일보',
                '022': '세계일보',
                '023': '조선일보',
                '025': '중앙일보',
                '028': '한겨레',
                '032': '경향신문',
                '081': '서울신문',
                '082': '동아일보',
                '087': '매일경제',
                '088': '한국일보',
                '092': '매일신문',
                '094': '부산일보',
                '096': '부산일보',
                '097': '경남일보',
                '098': '경남도민일보',
                '099': '경남신문',
                '100': '경남일보',
                '101': '경남도민일보',
                '102': '경남신문',
                '103': '경남일보',
                '104': '경남도민일보',
                '105': '경남신문',
                '106': '경남일보',
                '107': '경남도민일보',
                '108': '경남신문',
                '109': '경남일보',
                '110': '경남도민일보'
              };
              source = sourceMap[oid] || '네이버 뉴스';
            }
          }
          
          if (title && link) {
            articles.push({
              title: title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
              summary: description.replace(/<[^>]*>/g, ''), // HTML 태그 제거
              link,
              source,
              publishedAt: pubDate
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
  }
} 