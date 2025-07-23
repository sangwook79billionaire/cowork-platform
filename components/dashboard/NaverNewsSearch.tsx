'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, DocumentTextIcon, CalendarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface NaverNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
}

interface NaverNewsSearchProps {
  onSaveToDatabase?: (articles: NaverNewsArticle[]) => void;
}

export default function NaverNewsSearch({ onSaveToDatabase }: NaverNewsSearchProps) {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NaverNewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<string>('노인 건강, 시니어 건강');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!keywords.trim()) {
      toast.error('키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await fetch('/api/news/naver-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywordArray
        }),
      });

      const data = await response.json();

      if (data.success) {
        setArticles(data.articles);
        setSearchHistory(prev => [keywords, ...prev.slice(0, 4)]); // 최근 5개 저장
        toast.success(`${data.totalCount}개의 뉴스를 찾았습니다.`);
        
        // DB에 저장 (임시 비활성화)
        // if (data.articles.length > 0) {
        //   await saveToDatabase(data.articles, keywordArray);
        // }
      } else {
        toast.error(data.error || '뉴스 검색 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('네이버 뉴스 검색 오류:', error);
      toast.error('네이버 뉴스 검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async (articles: NaverNewsArticle[], keywords: string[]) => {
    try {
      const response = await fetch('/api/news/naver-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles,
          keywords,
          userId: user?.uid
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.savedCount}개의 기사를 데이터베이스에 저장했습니다.`);
      } else {
        toast.error(data.error || '데이터베이스 저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('DB 저장 오류:', error);
      toast.error('데이터베이스 저장 중 오류가 발생했습니다.');
    }
  };

  const handleQuickSearch = (keyword: string) => {
    setKeywords(keyword);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // "1일 전", "2시간 전" 등의 형식을 현재 날짜로 변환
    const now = new Date();
    const match = dateString.match(/(\d+)(일|시간|분) 전/);
    
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      const result = new Date(now);
      if (unit === '일') {
        result.setDate(result.getDate() - value);
      } else if (unit === '시간') {
        result.setHours(result.getHours() - value);
      } else if (unit === '분') {
        result.setMinutes(result.getMinutes() - value);
      }
      
      return result.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return dateString;
  };

  return (
    <div className="space-y-6">
      {/* 검색 헤더 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">네이버 뉴스 검색</h2>
        </div>
        
        <div className="space-y-4">
          {/* 키워드 입력 */}
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              검색 키워드
            </label>
            <textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="키워드를 쉼표로 구분하여 입력하세요 (예: 노인 건강, 시니어 건강)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          {/* 빠른 검색 버튼 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickSearch('노인 건강')}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              노인 건강
            </button>
            <button
              onClick={() => handleQuickSearch('시니어 건강')}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
            >
              시니어 건강
            </button>
            <button
              onClick={() => handleQuickSearch('노인 복지')}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
            >
              노인 복지
            </button>
          </div>
          
          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>검색 중...</span>
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span>뉴스 검색</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 검색 결과 */}
      {articles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <DocumentTextIcon className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              검색 결과 ({articles.length}개)
            </h3>
          </div>
          
          <div className="space-y-4">
            {articles.map((article, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h4>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                      {article.summary}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {article.source && (
                        <div className="flex items-center space-x-1">
                          <GlobeAltIcon className="h-3 w-3" />
                          <span>{article.source}</span>
                        </div>
                      )}
                      
                      {article.publishedAt && (
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{formatDate(article.publishedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                  >
                    기사 보기 →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검색 히스토리 */}
      {searchHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 검색어</h3>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((keyword, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(keyword)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 