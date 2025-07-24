import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';

export interface FirebaseNewsArticle {
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
  keywords: string;
  collectedAt: string;
  category?: string;
  language?: string;
  isSaved?: boolean;
  savedBy?: string[];
  viewCount?: number;
}

export interface FirebaseNewsSearchResult {
  articles: FirebaseNewsArticle[];
  totalResults: number;
  searchKeywords: string;
  lastUpdated: string;
}

export class FirebaseNewsService {
  /**
   * 키워드로 뉴스 검색
   */
  async searchNews(keywords: string, language: string = 'ko'): Promise<FirebaseNewsSearchResult> {
    try {
      console.log('=== Firebase 뉴스 검색 시작 ===');
      console.log('검색 키워드:', keywords);
      
      // Firestore 쿼리 구성
      const newsRef = collection(db, 'news');
      const q = query(
        newsRef,
        where('keywords', '==', keywords),
        where('language', '==', language),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const articles: FirebaseNewsArticle[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        articles.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          content: data.content,
          url: data.url,
          publishedAt: data.publishedAt,
          source: data.source,
          keywords: data.keywords,
          collectedAt: data.collectedAt,
          category: data.category,
          language: data.language,
          isSaved: data.isSaved || false,
          savedBy: data.savedBy || [],
          viewCount: data.viewCount || 0
        });
      });
      
      console.log(`✅ Firebase에서 ${articles.length}개의 뉴스를 찾았습니다.`);
      
      return {
        articles,
        totalResults: articles.length,
        searchKeywords: keywords,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Firebase 뉴스 검색 오류:', error);
      return {
        articles: [],
        totalResults: 0,
        searchKeywords: keywords,
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  /**
   * 최신 뉴스 조회
   */
  async getLatestNews(limitCount: number = 20): Promise<FirebaseNewsArticle[]> {
    try {
      const newsRef = collection(db, 'news');
      const q = query(
        newsRef,
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const articles: FirebaseNewsArticle[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        articles.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          content: data.content,
          url: data.url,
          publishedAt: data.publishedAt,
          source: data.source,
          keywords: data.keywords,
          collectedAt: data.collectedAt,
          category: data.category,
          language: data.language,
          isSaved: data.isSaved || false,
          savedBy: data.savedBy || [],
          viewCount: data.viewCount || 0
        });
      });
      
      return articles;
      
    } catch (error) {
      console.error('❌ 최신 뉴스 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 카테고리별 뉴스 조회
   */
  async getNewsByCategory(category: string, limitCount: number = 20): Promise<FirebaseNewsArticle[]> {
    try {
      const newsRef = collection(db, 'news');
      const q = query(
        newsRef,
        where('category', '==', category),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const articles: FirebaseNewsArticle[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        articles.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          content: data.content,
          url: data.url,
          publishedAt: data.publishedAt,
          source: data.source,
          keywords: data.keywords,
          collectedAt: data.collectedAt,
          category: data.category,
          language: data.language,
          isSaved: data.isSaved || false,
          savedBy: data.savedBy || [],
          viewCount: data.viewCount || 0
        });
      });
      
      return articles;
      
    } catch (error) {
      console.error('❌ 카테고리별 뉴스 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 특정 뉴스 기사 조회
   */
  async getNewsById(articleId: string): Promise<FirebaseNewsArticle | null> {
    try {
      const docRef = doc(db, 'news', articleId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          content: data.content,
          url: data.url,
          publishedAt: data.publishedAt,
          source: data.source,
          keywords: data.keywords,
          collectedAt: data.collectedAt,
          category: data.category,
          language: data.language,
          isSaved: data.isSaved || false,
          savedBy: data.savedBy || [],
          viewCount: data.viewCount || 0
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ 뉴스 기사 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 검색 기록 저장
   */
  async saveSearchHistory(userId: string, keywords: string, resultCount: number): Promise<void> {
    try {
      const searchHistoryRef = collection(db, 'search_history');
      await addDoc(searchHistoryRef, {
        userId,
        keywords,
        language: 'ko',
        searchedAt: new Date().toISOString(),
        resultCount
      });
      
      console.log('✅ 검색 기록 저장 완료');
      
    } catch (error) {
      console.error('❌ 검색 기록 저장 오류:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
export const firebaseNewsService = new FirebaseNewsService(); 