import { NextRequest, NextResponse } from 'next/server';

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
    
    // 키워드에 따른 동적 모의 데이터 생성
    const mockArticles: NaverNewsArticle[] = [
      {
        title: `[네이버 뉴스] ${keywords.join(' ')} 관련 최신 동향`,
        summary: `${keywords.join(' ')}에 대한 최신 뉴스입니다. 전문가들은 이 분야의 중요성을 강조하고 있으며, 다양한 연구 결과와 정책 동향을 보여주고 있습니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=001&aid=0001234567',
        source: '연합뉴스',
        publishedAt: '1일 전'
      },
      {
        title: `${keywords.join(' ')} 관리 방법과 주의사항`,
        summary: `${keywords.join(' ')}를 위한 전문적인 관리 방법과 주의사항에 대해 알아보겠습니다. 전문가들의 조언과 실제 사례를 통해 효과적인 관리 방안을 제시합니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=005&aid=0001234568',
        source: '국민일보',
        publishedAt: '2일 전'
      },
      {
        title: `${keywords.join(' ')} 관련 정책 변화와 전망`,
        summary: `${keywords.join(' ')}와 관련된 정부 정책의 변화와 향후 전망에 대해 분석합니다. 새로운 제도와 지원 방안이 어떻게 변화하고 있는지 살펴봅니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=011&aid=0001234569',
        source: '서울경제',
        publishedAt: '3일 전'
      },
      {
        title: `${keywords.join(' ')} 전문가 인터뷰`,
        summary: `${keywords.join(' ')} 분야의 전문가를 만나 최신 동향과 전문적인 조언을 들어봅니다. 실무 경험을 바탕으로 한 현실적인 해결책을 제시합니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=021&aid=0001234570',
        source: '문화일보',
        publishedAt: '4일 전'
      },
      {
        title: `${keywords.join(' ')} 관련 연구 결과 발표`,
        summary: `${keywords.join(' ')}에 대한 최신 연구 결과가 발표되었습니다. 이번 연구는 기존의 통념을 뒤엎는 새로운 발견을 포함하고 있어 학계의 주목을 받고 있습니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=022&aid=0001234571',
        source: '세계일보',
        publishedAt: '5일 전'
      },
      {
        title: `${keywords.join(' ')} 국제 비교 분석`,
        summary: `${keywords.join(' ')}에 대한 국제적인 비교 분석 결과가 공개되었습니다. 다른 국가들의 사례와 정책을 통해 우리나라의 현황과 개선 방안을 모색합니다.`,
        link: 'https://news.naver.com/main/read.naver?mode=LSD&mid=shm&sid1=102&oid=023&aid=0001234572',
        source: '조선일보',
        publishedAt: '1주일 전'
      }
    ];
    
    console.log('📊 생성된 모의 기사 수:', mockArticles.length);
    
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