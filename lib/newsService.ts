import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 뉴스 기사 타입 정의
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
    id?: string;
  };
  summary?: string;
  similarityScore?: number;
}

// 뉴스 검색 결과 타입
export interface NewsSearchResult {
  articles: NewsArticle[];
  totalResults: number;
  status: string;
}

// 뉴스 API 서비스 클래스
export class NewsService {
  private geminiAI: GoogleGenerativeAI;

  constructor() {
    this.geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  // 키워드로 뉴스 검색 (모의 데이터 사용)
  async searchNews(keywords: string, language: string = 'ko'): Promise<NewsArticle[]> {
    try {
      // 모의 뉴스 데이터 생성
      const mockArticles = this.generateMockArticles(keywords);
      return this.removeDuplicates(mockArticles);
    } catch (error) {
      console.error('뉴스 검색 오류:', error);
      throw error;
    }
  }

  // 모의 뉴스 데이터 생성
  private generateMockArticles(keywords: string): NewsArticle[] {
    const sources = ['한국일보', '조선일보', '중앙일보', '동아일보', '경향신문'];
    const mockArticles: NewsArticle[] = [];

    for (let i = 1; i <= 10; i++) {
      const source = sources[Math.floor(Math.random() * sources.length)];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));

      mockArticles.push({
        id: `mock-${i}`,
        title: `${keywords} 관련 뉴스 제목 ${i}`,
        description: `${keywords}에 대한 상세한 내용을 담은 뉴스 기사입니다. 이 기사는 ${keywords}와 관련된 최신 정보를 제공합니다.`,
        content: `${keywords}에 대한 포괄적인 분석과 함께 최신 동향을 다루는 기사입니다. 전문가들의 의견과 함께 ${keywords}의 미래 전망도 함께 살펴봅니다.`,
        url: `https://example.com/news/${i}`,
        publishedAt: date.toISOString(),
        source: {
          name: source,
          id: source.toLowerCase()
        }
      });
    }

    return mockArticles;
  }

  // 중복 기사 제거 (제목 유사성 기반)
  private removeDuplicates(articles: any[]): NewsArticle[] {
    const uniqueArticles: NewsArticle[] = [];
    const seenTitles = new Set<string>();

    for (const article of articles) {
      const normalizedTitle = this.normalizeTitle(article.title);
      
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueArticles.push({
          id: article.url, // URL을 고유 ID로 사용
          title: article.title,
          description: article.description || '',
          content: article.content || '',
          url: article.url,
          publishedAt: article.publishedAt,
          source: {
            name: article.source.name,
            id: article.source.id
          }
        });
      }
    }

    return uniqueArticles;
  }

  // 제목 정규화 (중복 검출용)
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 연속 공백을 하나로
      .trim();
  }

  // AI를 사용한 뉴스 요약
  async summarizeArticle(article: NewsArticle): Promise<string> {
    try {
      const model = this.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
다음 뉴스 기사를 3-4문장으로 요약해주세요. 핵심 정보만 포함하고 간결하게 작성해주세요:

제목: ${article.title}
내용: ${article.content || article.description}

요약:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('뉴스 요약 오류:', error);
      return article.description || '요약을 생성할 수 없습니다.';
    }
  }

  // 여러 기사 일괄 요약
  async summarizeArticles(articles: NewsArticle[]): Promise<NewsArticle[]> {
    const summarizedArticles: NewsArticle[] = [];
    
    for (const article of articles) {
      try {
        const summary = await this.summarizeArticle(article);
        summarizedArticles.push({
          ...article,
          summary
        });
      } catch (error) {
        console.error(`기사 요약 실패 (${article.title}):`, error);
        summarizedArticles.push(article);
      }
    }

    return summarizedArticles;
  }

  // 기사 전체 내용 가져오기 (웹 스크래핑)
  async fetchFullContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // 간단한 HTML 파싱 (실제로는 cheerio 사용 권장)
      const html = response.data;
      const contentMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                          html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                          html.match(/<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

      if (contentMatch) {
        return contentMatch[1].replace(/<[^>]*>/g, '').trim();
      }

      return '전체 내용을 가져올 수 없습니다.';
    } catch (error) {
      console.error('전체 내용 가져오기 오류:', error);
      return '전체 내용을 가져올 수 없습니다.';
    }
  }
}

// 싱글톤 인스턴스
export const newsService = new NewsService(); 