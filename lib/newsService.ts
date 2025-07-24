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
  private apiKey: string;
  private geminiAI: GoogleGenerativeAI;

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';
    this.geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  // 키워드로 뉴스 검색
  async searchNews(keywords: string, language: string = 'ko'): Promise<NewsArticle[]> {
    try {
      const response = await axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          q: keywords,
          language: language,
          sortBy: 'publishedAt',
          pageSize: 50,
          apiKey: this.apiKey
        }
      });

      if (response.data.status === 'ok') {
        return this.removeDuplicates(response.data.articles);
      } else {
        throw new Error(`뉴스 API 오류: ${response.data.message}`);
      }
    } catch (error) {
      console.error('뉴스 검색 오류:', error);
      throw error;
    }
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