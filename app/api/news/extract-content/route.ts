import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ 
        success: false, 
        error: 'URL이 필요합니다.' 
      }, { status: 400 });
    }

    console.log('🔍 기사 내용 추출 시작:', url);

    // 기사 URL에서 내용 가져오기
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // 간단한 HTML 파싱 함수
    const extractTextFromHTML = (html: string, selectors: string[]): string => {
      let content = '';
      
      for (const selector of selectors) {
        // 정규식을 사용하여 HTML 태그에서 텍스트 추출
        const regex = new RegExp(`<[^>]*class\\s*=\\s*["']([^"']*${selector.replace('.', '')}[^"']*)["'][^>]*>([\\s\\S]*?)<\\/[^>]*>`, 'gi');
        const matches = html.match(regex);
        
        if (matches) {
          matches.forEach(match => {
            // HTML 태그 제거하고 텍스트만 추출
            const text = match.replace(/<[^>]*>/g, '').trim();
            if (text && text.length > 10) {
              content += text + '\n\n';
            }
          });
          if (content) break;
        }
      }
      
      return content;
    };

    // 네이트 뉴스 기사 본문 추출
    let content = '';
    
    // 네이트 뉴스 기사 본문 선택자들
    const contentSelectors = [
      'article_body',
      'article_content',
      'content',
      'post_content'
    ];

    content = extractTextFromHTML(html, contentSelectors);

    // 본문을 찾지 못한 경우 p 태그에서 텍스트 추출
    if (!content) {
      const pTagRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      const pMatches = html.match(pTagRegex);
      
      if (pMatches) {
        pMatches.forEach(match => {
          const text = match.replace(/<[^>]*>/g, '').trim();
          if (text && text.length > 20) {
            content += text + '\n\n';
          }
        });
      }
    }

    // 본문이 여전히 없는 경우 제목과 요약 정보라도 반환
    if (!content) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      const metaMatch = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i);
      const metaDescription = metaMatch ? metaMatch[1] : '';
      
      content = `제목: ${title}\n\n설명: ${metaDescription}`;
    }

    // 내용 정리 (불필요한 공백 제거)
    content = content
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 연속된 빈 줄 제거
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로
      .trim();

    console.log('✅ 기사 내용 추출 완료:', content.length, '자');

    return NextResponse.json({
      success: true,
      content,
      length: content.length,
      url
    });

  } catch (error) {
    console.error('❌ 기사 내용 추출 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '기사 내용을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
