'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  NewspaperIcon,
  CalendarIcon,
  UserIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface GoogleNewsArticle {
  title: string;
  summary: string;
  link: string;
  publishedAt: string;
  source: string;
  keyword: string;
}

interface SearchResponse {
  success: boolean;
  articles: GoogleNewsArticle[];
  totalCount: number;
  keywords: string[];
  isMock: boolean;
  source: string;
  error?: string;
}

export default function GoogleNewsAlerts() {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<string>('노인 건강, 시니어 건강');
  const [rssUrl, setRssUrl] = useState<string>('https://www.google.co.kr/alerts/feeds/10135753313873372909/17318554124051815329');
  const [articles, setArticles] = useState<GoogleNewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isMock, setIsMock] = useState<boolean>(false);
  const [source, setSource] = useState<string>('');

  const handleSearch = async () => {
    if (!keywords.trim()) {
      toast.error('키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await fetch('/api/news/google-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywordArray,
          rssUrl: rssUrl.trim() || undefined
        }),
      });

      const data: SearchResponse = await response.json();
      
      if (data.success) {
        setArticles(data.articles);
        setIsMock(data.isMock);
        setSource(data.source);
        
        // 검색 히스토리에 추가
        if (!searchHistory.includes(keywords)) {
          setSearchHistory(prev => [keywords, ...prev.slice(0, 4)]);
        }
        
        toast.success(`${data.totalCount}개의 기사를 찾았습니다.`);
      } else {
        toast.error('검색 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('검색 오류:', error);
      toast.error('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleQuickSearch = (keyword: string) => {
    setKeywords(keyword);
  };

  const handleArticleClick = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <NewspaperIcon className="w-8 h-8 text-blue-600 mr-3" />
          구글 뉴스 알리미 검색
        </h1>
        <p className="text-gray-600">
          구글 뉴스 알리미 RSS 피드를 통해 최신 뉴스를 검색하고 요약합니다.
        </p>
      </div>

      {/* 검색 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색 키워드
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="키워드를 쉼표로 구분하여 입력하세요 (예: 노인 건강, 시니어 건강)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RSS 피드 URL (선택사항)
            </label>
            <input
              type="url"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="구글 뉴스 알리미 RSS URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleQuickSearch('노인 건강')}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200"
          >
            노인 건강
          </button>
          <button
            onClick={() => handleQuickSearch('시니어 건강')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200"
          >
            시니어 건강
          </button>
          <button
            onClick={() => handleQuickSearch('고령화')}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200"
          >
            고령화
          </button>
          <button
            onClick={() => handleQuickSearch('노인 복지')}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200"
          >
            노인 복지
          </button>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              검색 중...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
              구글 뉴스 검색
            </>
          )}
        </button>
      </div>

      {/* 검색 결과 */}
      {articles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              검색 결과 ({articles.length}개)
            </h2>
            <div className="flex items-center space-x-2">
              {isMock && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  모의 데이터
                </span>
              )}
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {source}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {articles.map((article, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleArticleClick(article.link)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-3 line-clamp-3">
                      {article.summary}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {article.source}
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {formatDate(article.publishedAt)}
                      </div>
                      <div className="flex items-center">
                        <LinkIcon className="w-4 h-4 mr-1" />
                        원문 보기
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검색 히스토리 */}
      {searchHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">최근 검색</h3>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((keyword, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(keyword)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
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