import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { NewsArticle } from './newsService';

// 저장된 뉴스 기사 타입
export interface SavedArticle extends NewsArticle {
  userId: string;
  savedAt: Date;
  fullContent?: string;
  tags?: string[];
  notes?: string;
}

// 뉴스 데이터베이스 서비스 클래스
export class NewsDatabase {
  private collectionName = 'savedArticles';

  // 기사 저장
  async saveArticle(article: NewsArticle, userId: string, fullContent?: string): Promise<string> {
    try {
      const savedArticle: Omit<SavedArticle, 'id'> = {
        ...article,
        userId,
        savedAt: new Date(),
        fullContent,
        tags: [],
        notes: ''
      };

      const docRef = await addDoc(collection(db, this.collectionName), savedArticle);
      return docRef.id;
    } catch (error) {
      console.error('기사 저장 오류:', error);
      throw error;
    }
  }

  // 사용자의 저장된 기사 목록 가져오기
  async getSavedArticles(userId: string): Promise<SavedArticle[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('savedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const articles: SavedArticle[] = [];

      querySnapshot.forEach((doc) => {
        articles.push({
          id: doc.id,
          ...doc.data()
        } as SavedArticle);
      });

      return articles;
    } catch (error) {
      console.error('저장된 기사 가져오기 오류:', error);
      throw error;
    }
    }

  // 특정 기사 가져오기
  async getArticle(articleId: string): Promise<SavedArticle | null> {
    try {
      const docRef = doc(db, this.collectionName, articleId);
      const docSnap = await getDocs(collection(db, this.collectionName));
      
      const article = docSnap.docs.find(doc => doc.id === articleId);
      if (article) {
        return {
          id: article.id,
          ...article.data()
        } as SavedArticle;
      }
      
      return null;
    } catch (error) {
      console.error('기사 가져오기 오류:', error);
      throw error;
    }
  }

  // 기사 삭제
  async deleteArticle(articleId: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, articleId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('기사 삭제 오류:', error);
      throw error;
    }
  }

  // 기사 업데이트 (태그, 노트 등)
  async updateArticle(articleId: string, updates: Partial<SavedArticle>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, articleId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('기사 업데이트 오류:', error);
      throw error;
    }
  }

  // 태그로 기사 검색
  async searchByTags(userId: string, tags: string[]): Promise<SavedArticle[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('tags', 'array-contains-any', tags)
      );

      const querySnapshot = await getDocs(q);
      const articles: SavedArticle[] = [];

      querySnapshot.forEach((doc) => {
        articles.push({
          id: doc.id,
          ...doc.data()
        } as SavedArticle);
      });

      return articles;
    } catch (error) {
      console.error('태그 검색 오류:', error);
      throw error;
    }
  }

  // 키워드로 기사 검색
  async searchByKeyword(userId: string, keyword: string): Promise<SavedArticle[]> {
    try {
      const allArticles = await this.getSavedArticles(userId);
      
      return allArticles.filter(article => 
        article.title.toLowerCase().includes(keyword.toLowerCase()) ||
        article.description.toLowerCase().includes(keyword.toLowerCase()) ||
        article.notes?.toLowerCase().includes(keyword.toLowerCase())
      );
    } catch (error) {
      console.error('키워드 검색 오류:', error);
      throw error;
    }
  }

  // 중복 기사 확인
  async checkDuplicate(userId: string, articleUrl: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('url', '==', articleUrl)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('중복 확인 오류:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const newsDatabase = new NewsDatabase(); 