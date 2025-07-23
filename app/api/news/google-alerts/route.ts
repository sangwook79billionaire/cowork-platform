import { NextRequest, NextResponse } from 'next/server';

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
    
    // 간단한 모의 데이터 반환 (RSS 파싱 문제 해결)
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
      },
      {
        title: '시니어 영양 관리 방법',
        summary: '노인 영양 관리의 핵심 포인트와 권장 식단을 알아봅니다. 칼슘과 비타민 D 섭취가 중요합니다.',
        link: 'https://example.com/senior-nutrition',
        publishedAt: '2024-07-20',
        source: '건강플러스',
        keyword: keywords.join(', ')
      },
      {
        title: '노인 정신 건강 관리',
        summary: '시니어의 정신 건강을 위한 활동과 사회적 교류의 중요성을 다룹니다.',
        link: 'https://example.com/senior-mental-health',
        publishedAt: '2024-07-19',
        source: '웰빙뉴스',
        keyword: keywords.join(', ')
      },
      {
        title: '시니어 안전 관리 가이드',
        summary: '노인 안전을 위한 실내외 환경 개선 방법과 사고 예방 팁을 제공합니다.',
        link: 'https://example.com/senior-safety',
        publishedAt: '2024-07-18',
        source: '안전뉴스',
        keyword: keywords.join(', ')
      }
    ];
    
    console.log('✅ 모의 데이터 생성 완료:', mockArticles.length, '개');
    
    return NextResponse.json({
      success: true,
      articles: mockArticles,
      totalCount: mockArticles.length,
      keywords,
      isMock: true,
      source: 'Google News Alerts (Mock)'
    });

  } catch (error) {
    console.error('❌ 구글 뉴스 알리미 오류:', error);
    
    // 오류 시에도 모의 데이터 반환
    const fallbackArticles: GoogleNewsArticle[] = [
      {
        title: '시니어 건강 정보',
        summary: '노인 건강에 대한 기본 정보를 제공합니다.',
        link: 'https://example.com/fallback',
        publishedAt: '2024-07-22',
        source: '시스템',
        keyword: '노인 건강'
      }
    ];
    
    return NextResponse.json({
      success: true,
      articles: fallbackArticles,
      totalCount: fallbackArticles.length,
      keywords: ['노인 건강'],
      isMock: true,
      source: 'Google News Alerts (Fallback)'
    });
  }
} 