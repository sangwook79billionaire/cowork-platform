import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { googleNewsRSSService, GoogleNewsArticle } from './googleNewsRSS';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
    id: string;
  };
}

export interface NewsSearchResult {
  articles: NewsArticle[];
  totalResults: number;
  searchKeywords: string;
}

export class NewsService {
  private geminiAI: GoogleGenerativeAI;

  constructor() {
    this.geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async searchNews(keywords: string, language: string = 'ko'): Promise<NewsArticle[]> {
    try {
      console.log('=== 뉴스 검색 시작 ===');
      console.log('검색 키워드:', keywords);
      
      // Google News RSS 사용
      console.log('Google News RSS를 사용하여 뉴스를 검색합니다.');
      const articles = await googleNewsRSSService.searchNews(keywords, language);
      
      console.log(`총 ${articles.length}개의 뉴스를 찾았습니다.`);
      return this.removeDuplicates(articles);
    } catch (error) {
      console.error('뉴스 검색 오류:', error);
      const mockArticles = this.generateMockArticles(keywords);
      return this.removeDuplicates(mockArticles);
    }
  }

  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const uniqueArticles: NewsArticle[] = [];

    for (const article of articles) {
      const normalizedTitle = this.normalizeTitle(article.title);
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        uniqueArticles.push(article);
      }
    }

    console.log(`중복 제거 후 ${uniqueArticles.length}개의 뉴스가 남았습니다.`);
    return uniqueArticles;
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async summarizeArticle(article: NewsArticle): Promise<string> {
    try {
      const model = this.geminiAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
다음 뉴스 기사를 한국어로 간결하게 요약해주세요. 
핵심 내용만 2-3문장으로 요약하고, 중요한 정보나 데이터가 있다면 포함해주세요.

제목: ${article.title}
내용: ${article.content}

요약:
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('기사 요약 오류:', error);
      return `요약을 생성할 수 없습니다: ${article.title}`;
    }
  }

  async summarizeArticles(articles: NewsArticle[]): Promise<NewsArticle[]> {
    console.log(`${articles.length}개의 기사를 요약합니다...`);
    
    const summarizedArticles = await Promise.all(
      articles.map(async (article) => {
        try {
          const summary = await this.summarizeArticle(article);
          return {
            ...article,
            content: summary
          };
        } catch (error) {
          console.error(`기사 요약 실패 (${article.id}):`, error);
          return article;
        }
      })
    );

    console.log('모든 기사 요약 완료');
    return summarizedArticles;
  }

  async fetchFullContent(article: NewsArticle): Promise<string> {
    try {
      if (!article.url || article.url === 'https://example.com/news1') {
        return article.content;
      }

      const response = await axios.get(article.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      // 간단한 HTML 파싱 (실제로는 더 정교한 파싱이 필요)
      const html = response.data;
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return textContent.substring(0, 2000) + (textContent.length > 2000 ? '...' : '');
    } catch (error) {
      console.error('전체 내용 가져오기 실패:', error);
      return article.content;
    }
  }

  private generateMockArticles(keywords: string): NewsArticle[] {
    const mockSources = [
      { name: '연합뉴스', id: 'yonhap' },
      { name: '뉴시스', id: 'newsis' },
      { name: '매일경제', id: 'mk' },
      { name: '한국경제', id: 'hankyung' },
      { name: '조선일보', id: 'chosun' }
    ];

    return [
      {
        id: 'mock-1',
        title: `${keywords} 관련 최신 동향 분석`,
        description: `${keywords} 분야에서 새로운 발전이 이루어지고 있습니다. 전문가들은 이번 변화가 산업 전반에 미칠 영향에 대해 주목하고 있습니다.`,
        content: `${keywords}와 관련된 최신 연구 결과가 발표되었습니다. 이번 연구는 기존의 한계를 극복하는 혁신적인 접근 방식을 제시하고 있어 학계의 큰 관심을 받고 있습니다.`,
        url: 'https://example.com/news1',
        publishedAt: new Date().toISOString(),
        source: mockSources[0]
      },
      {
        id: 'mock-2',
        title: `${keywords} 기술의 미래 전망`,
        description: `${keywords} 기술이 다양한 분야에서 활용되면서 새로운 가능성을 열어가고 있습니다. 특히 의료, 교육, 금융 분야에서의 적용 사례가 주목받고 있습니다.`,
        content: `${keywords} 기술의 발전으로 인해 우리의 일상생활이 크게 변화하고 있습니다. 전문가들은 향후 5년 내에 이 기술이 모든 산업 분야에 혁신을 가져올 것으로 전망하고 있습니다.`,
        url: 'https://example.com/news2',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: mockSources[1]
      },
      {
        id: 'mock-3',
        title: `${keywords} 관련 정책 변화`,
        description: `정부가 ${keywords} 분야에 대한 새로운 정책을 발표했습니다. 이번 정책은 산업 발전과 일자리 창출을 동시에 추구하는 방향으로 설계되었습니다.`,
        content: `${keywords} 관련 정책이 발표되면서 관련 기업들의 투자가 활발해지고 있습니다. 정부는 이번 정책을 통해 국내 산업의 경쟁력을 강화하고 글로벌 시장에서의 입지를 확고히 하고자 한다는 계획입니다.`,
        url: 'https://example.com/news3',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: mockSources[2]
      }
    ];
  }
}

export const newsService = new NewsService(); 