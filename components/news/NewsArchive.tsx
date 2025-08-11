'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

interface NewsCollection {
  id: string;
  keywords: string[];
  totalCollected: number;
  totalUnique: number;
  collectedAt: string;
  userId: string;
  status: 'completed' | 'failed' | 'partial';
  message?: string;
}

interface NewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  published_at: string;
  description: string;
  keyword: string;
  collected_at: string;
  collectionId?: string;
}

interface KeywordHistory {
  keyword: string;
  usedAt: string;
  collectionId: string;
  status: string;
}

interface NewsArchiveProps {
  onArticleSelect?: (article: NewsArticle) => void;
}

export default function NewsArchive({ onArticleSelect }: NewsArchiveProps) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<NewsCollection[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [keywordHistory, setKeywordHistory] = useState<KeywordHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [viewMode, setViewMode] = useState<'collections' | 'articles'>('collections');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  // 페이지 로드 시 아카이브 데이터 가져오기
  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchAllArticles();
      fetchKeywordHistory();
    }
  }, [user]);

  // 키워드 이력 가져오기
  const fetchKeywordHistory = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/news/keywords/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('키워드 이력을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setKeywordHistory(data.keywords || []);
    } catch (error) {
      console.error('키워드 이력 가져오기 오류:', error);
      toast.error('키워드 이력을 가져오는데 실패했습니다.');
    }
  };

  // 수집 내역 가져오기
  const fetchCollections = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/news/collections', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('수집 내역을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('수집 내역 가져오기 오류:', error);
      toast.error('수집 내역을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모든 기사 가져오기
  const fetchAllArticles = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/news/articles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('기사 목록을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('기사 목록 가져오기 오류:', error);
      toast.error('기사 목록을 가져오는데 실패했습니다.');
    }
  };

  // 특정 수집의 기사 가져오기
  const fetchCollectionArticles = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/news/collections/${collectionId}/articles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('수집 기사를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      return data.articles || [];
    } catch (error) {
      console.error('수집 기사 가져오기 오류:', error);
      toast.error('수집 기사를 가져오는데 실패했습니다.');
      return [];
    }
  };

  // 수집 내역 토글
  const toggleCollectionExpansion = async (collectionId: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
      // 수집 기사 가져오기
      const collectionArticles = await fetchCollectionArticles(collectionId);
      // 기존 기사에 추가
      setArticles(prev => {
        const existingIds = new Set(prev.map((a: NewsArticle) => a.id));
        const newArticles = collectionArticles.filter((a: NewsArticle) => !existingIds.has(a.id));
        return [...prev, ...newArticles];
      });
    }
    setExpandedCollections(newExpanded);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '날짜 없음';
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      case 'partial':
        return '부분 완료';
      default:
        return '알 수 없음';
    }
  };

  // 필터링된 기사
  const filteredArticles = articles.filter(article => {
    if (filterKeyword && !article.title.toLowerCase().includes(filterKeyword.toLowerCase()) &&
        !article.description.toLowerCase().includes(filterKeyword.toLowerCase())) {
      return false;
    }
    return true;
  }).sort((a: NewsArticle, b: NewsArticle) => {
    if (sortOrder === 'latest') {
      return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime();
    } else {
      return new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime();
    }
  });

  // 필터링된 수집 내역
  const filteredCollections = collections.filter(collection => {
    if (filterKeyword) {
      return collection.keywords.some(keyword => 
        keyword.toLowerCase().includes(filterKeyword.toLowerCase())
      );
    }
    return true;
  }).sort((a: NewsCollection, b: NewsCollection) => {
    if (sortOrder === 'latest') {
      return new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime();
    } else {
      return new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime();
    }
  });

  // 수집 내역 삭제
  const deleteCollection = async (collectionId: string) => {
    if (!confirm('이 수집 내역을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/news/collections/${collectionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('수집 내역 삭제에 실패했습니다.');
      }

      toast.success('수집 내역이 삭제되었습니다.');
      fetchCollections();
    } catch (error) {
      console.error('수집 내역 삭제 오류:', error);
      toast.error('수집 내역 삭제에 실패했습니다.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">뉴스 수집 아카이브</h2>
        <p className="text-gray-600">수집 키워드와 수집된 뉴스를 일자별로 확인할 수 있습니다.</p>
      </div>

      {/* 키워드 이력 */}
      {keywordHistory.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 사용된 키워드 이력</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {keywordHistory.slice(0, 12).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.keyword}</p>
                  <p className="text-xs text-gray-500">{formatDate(item.usedAt)}</p>
                </div>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
              </div>
            ))}
          </div>
          {keywordHistory.length > 12 && (
            <p className="text-sm text-gray-500 text-center mt-3">
              ... 외 {keywordHistory.length - 12}개 더
            </p>
          )}
        </div>
      )}

      {/* 필터 및 정렬 */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="키워드로 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'latest' | 'oldest')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('collections')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'collections'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                수집 내역
              </button>
              <button
                onClick={() => setViewMode('articles')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'articles'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                기사 목록
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      )}

      {/* 수집 내역 보기 */}
      {viewMode === 'collections' && !loading && (
        <div className="space-y-4">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">수집 내역이 없습니다.</p>
            </div>
          ) : (
            filteredCollections.map((collection) => (
              <div key={collection.id} className="bg-white rounded-lg shadow border">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(collection.status)}`}>
                        {getStatusText(collection.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(collection.collectedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCollectionExpansion(collection.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {expandedCollections.has(collection.id) ? '접기' : '펼치기'}
                      </button>
                      <button
                        onClick={() => deleteCollection(collection.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 mb-2">수집 키워드</h3>
                    <div className="flex flex-wrap gap-2">
                      {collection.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">총 수집:</span>
                      <span className="ml-2 font-medium">{collection.totalCollected}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">중복 제거:</span>
                      <span className="ml-2 font-medium">{collection.totalUnique}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">중복률:</span>
                      <span className="ml-2 font-medium">
                        {collection.totalCollected > 0 
                          ? Math.round(((collection.totalCollected - collection.totalUnique) / collection.totalCollected) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">상태:</span>
                      <span className="ml-2 font-medium">{getStatusText(collection.status)}</span>
                    </div>
                  </div>
                  
                  {collection.message && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{collection.message}</p>
                    </div>
                  )}
                </div>
                
                {/* 확장된 기사 목록 */}
                {expandedCollections.has(collection.id) && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">수집된 기사 목록</h4>
                    <div className="space-y-3">
                      {articles
                        .filter(article => article.collectionId === collection.id)
                        .slice(0, 10)
                        .map((article) => (
                          <div key={article.id} className="bg-white p-3 rounded-lg border">
                            <h5 className="font-medium text-gray-900 mb-1 line-clamp-2">
                              {article.title}
                            </h5>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>{article.source}</span>
                              <span>{formatDate(article.published_at)}</span>
                            </div>
                          </div>
                        ))}
                      {articles.filter(article => article.collectionId === collection.id).length > 10 && (
                        <p className="text-sm text-gray-500 text-center">
                          ... 외 {articles.filter(article => article.collectionId === collection.id).length - 10}개 더
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 기사 목록 보기 */}
      {viewMode === 'articles' && !loading && (
        <div className="space-y-4">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">수집된 기사가 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredArticles.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow border p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {article.description}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{article.source}</span>
                      <span>{formatDate(article.published_at)}</span>
                      <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {article.keyword}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (article.link && article.link.trim() !== '') {
                            try {
                              // URL이 http로 시작하지 않으면 https:// 추가
                              let urlString = article.link;
                              if (!urlString.startsWith('http')) {
                                urlString = `https://${urlString}`;
                              }
                              
                              const url = new URL(urlString);
                              window.open(url.toString(), '_blank', 'noopener,noreferrer');
                            } catch (error) {
                              console.error('잘못된 URL:', article.link);
                              toast.error('잘못된 기사 링크입니다.');
                            }
                          } else {
                            toast.error('기사 링크가 없습니다.');
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
                      >
                        원문 보기 →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 