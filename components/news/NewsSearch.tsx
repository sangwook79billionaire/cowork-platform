'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  published_at: string;
  description: string;
  keyword: string;
  collected_at: string;
}

interface NewsCollectionResult {
  total_collected: number;
  total_unique: number;
  keywords: string[];
  failed_keywords: string[];
  excel_file: string | null;
  firebase_uploaded: boolean;
  message: string;
}

interface NewsSearchProps {
  onArticleSelect?: (article: NewsArticle) => void;
}

export default function NewsSearch({ onArticleSelect }: NewsSearchProps) {
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [collectionResult, setCollectionResult] = useState<NewsCollectionResult | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>('');

  // 뉴스 수집 (구글 RSS 기반)
  const handleNewsCollection = async () => {
    if (!keywords.trim()) {
      toast.error('검색 키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/news/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywords.trim().split(',').map(k => k.trim()).filter(k => k)
        }),
      });

      console.log('API 응답 상태:', response.status);
      console.log('API 응답 헤더:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 오류 응답:', errorText);
        toast.error(`API 오류: ${response.status} - ${errorText}`);
        return;
      }

      const result = await response.json();
      console.log('API 응답 결과:', result);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCollectionResult(result);
      
      if (result.total_unique > 0) {
        toast.success(`${result.total_unique}개의 뉴스를 수집했습니다.`);
        
        // Firebase에서 수집된 뉴스 가져오기
        await fetchCollectedNews();
      } else {
        toast.error('수집된 뉴스가 없습니다.');
      }
    } catch (error) {
      console.error('뉴스 수집 오류:', error);
      console.error('오류 상세:', error);
      
      if (error instanceof Error) {
        toast.error(`뉴스 수집 오류: ${error.message}`);
      } else {
        toast.error('뉴스 수집 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Firebase에서 수집된 뉴스 가져오기
  const fetchCollectedNews = async (filterByKeyword: string = '') => {
    try {
      // 필터링할 키워드 결정 (필터 키워드가 있으면 사용, 없으면 수집 키워드 사용)
      const keywordArray = keywords.trim().split(',').map(k => k.trim()).filter(k => k);
      const keywordParam = filterByKeyword || (keywordArray.length > 0 ? keywordArray[0] : '');
      
      console.log(`🔍 키워드로 뉴스 필터링: ${keywordParam}`);
      
      // 키워드가 있으면 필터링, 없으면 모든 뉴스 가져오기
      const url = keywordParam 
        ? `/api/news/firebase?keyword=${encodeURIComponent(keywordParam)}&limit=200`
        : '/api/news/firebase?limit=200';
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Firebase에서 ${result.articles.length}개의 뉴스를 가져왔습니다. (키워드: ${keywordParam})`);
        setArticles(result.articles);
      } else {
        console.error('Firebase에서 뉴스 가져오기 실패:', result.error);
      }
    } catch (error) {
      console.error('Firebase 뉴스 가져오기 오류:', error);
    }
  };

  // 키워드로 필터링
  const handleFilterByKeyword = () => {
    fetchCollectedNews(filterKeyword);
  };

  // 기사 선택/해제
  const toggleArticleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // 선택된 기사들 저장
  const saveSelectedArticles = async () => {
    if (selectedArticles.size === 0) {
      toast.error('저장할 기사를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const selectedArticleList = articles.filter(article => 
        selectedArticles.has(article.id)
      );

      let savedCount = 0;
      for (const article of selectedArticleList) {
        try {
          const response = await fetch('/api/news/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              article,
              includeFullContent: true
            }),
          });

          const result = await response.json();
          if (result.success) {
            savedCount++;
          }
        } catch (error) {
          console.error(`기사 저장 실패 (${article.title}):`, error);
        }
      }

      if (savedCount > 0) {
        toast.success(`${savedCount}개의 기사가 저장되었습니다.`);
        setSelectedArticles(new Set());
      } else {
        toast.error('기사 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('기사 저장 오류:', error);
      toast.error('기사 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // HTML 태그 제거 및 텍스트 정리
  const cleanHtmlText = (htmlText: string): string => {
    if (!htmlText) return '내용 없음';
    
    return htmlText
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ') // &nbsp; 제거
      .replace(/&amp;/g, '&') // &amp; 제거
      .replace(/&lt;/g, '<') // &lt; 제거
      .replace(/&gt;/g, '>') // &gt; 제거
      .replace(/&quot;/g, '"') // &quot; 제거
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로
      .trim();
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 검색 입력 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">구글 RSS 뉴스 수집</h2>
        <p className="text-gray-600 mb-4">
          키워드를 입력하고 "수집" 버튼을 클릭하면 구글 뉴스 RSS에서 관련 뉴스를 수집하여 Firebase에 저장합니다.
        </p>
        <div className="flex gap-4">
          <input
            type="text"
            id="news-search-keywords"
            name="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="검색할 키워드를 입력하세요 (쉼표로 구분, 예: AI, 기술, 경제)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleNewsCollection()}
          />
          <button
            onClick={handleNewsCollection}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '수집 중...' : '수집'}
          </button>
        </div>
      </div>

      {/* 수집 결과 요약 */}
      {collectionResult && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">수집 결과</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">총 수집:</span> {collectionResult.total_collected}개
            </div>
            <div>
              <span className="font-medium">중복 제거 후:</span> {collectionResult.total_unique}개
            </div>
            <div>
              <span className="font-medium">키워드:</span> {collectionResult.keywords.join(', ')}
            </div>
            <div>
              <span className="font-medium">Firebase 업로드:</span> 
              <span className={collectionResult.firebase_uploaded ? 'text-green-600' : 'text-red-600'}>
                {collectionResult.firebase_uploaded ? '성공' : '실패'}
              </span>
            </div>
          </div>
          {collectionResult.failed_keywords.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              실패한 키워드: {collectionResult.failed_keywords.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 선택된 기사 저장 버튼 */}
      {selectedArticles.size > 0 && (
        <div className="mb-4">
          <button
            onClick={saveSelectedArticles}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : `${selectedArticles.size}개 기사 저장`}
          </button>
        </div>
      )}

      {/* 수집된 뉴스 목록 */}
      {articles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              수집된 뉴스 ({articles.length}개)
            </h3>
            <div className="flex items-center gap-4">
              {/* 키워드 필터링 */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="키워드로 필터링..."
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleFilterByKeyword()}
                />
                <button
                  onClick={handleFilterByKeyword}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  필터
                </button>
                <button
                  onClick={() => {
                    setFilterKeyword('');
                    fetchCollectedNews('');
                  }}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  전체
                </button>
              </div>
              <div className="text-sm text-gray-500">
                총 {articles.length}개 중 {selectedArticles.size}개 선택됨
              </div>
            </div>
          </div>
          
          {/* 뉴스 목록 컨테이너 - 스크롤 가능하도록 설정 */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="space-y-2 p-2">
              {articles.map((article, index) => (
                <div
                  key={article.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedArticles.has(article.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleArticleSelection(article.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.id)}
                      onChange={() => toggleArticleSelection(article.id)}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg flex-1 mr-2">{article.title}</h4>
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">
                        {cleanHtmlText(article.description)}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{article.source}</span>
                        <span>{formatDate(article.published_at)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          키워드: {article.keyword}
                        </span>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          원문 보기 →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 페이지네이션 정보 */}
          {articles.length > 50 && (
            <div className="text-center text-sm text-gray-500">
              스크롤하여 더 많은 뉴스를 확인하세요
            </div>
          )}
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">처리 중...</p>
        </div>
      )}
    </div>
  );
} 