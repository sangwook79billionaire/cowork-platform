'use client';

import React, { useState } from 'react';
import { NewsArticle } from '@/lib/newsService';
import { toast } from 'react-hot-toast';

interface NewsSearchProps {
  onArticleSelect?: (article: NewsArticle) => void;
}

export default function NewsSearch({ onArticleSelect }: NewsSearchProps) {
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  // 뉴스 검색
  const handleSearch = async () => {
    if (!keywords.trim()) {
      toast.error('검색 키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/news/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywords.trim(),
          language: 'ko',
          includeSummary: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setArticles(result.data.articles);
        toast.success(`${result.data.totalResults}개의 기사를 찾았습니다.`);
      } else {
        toast.error(result.error || '뉴스 검색에 실패했습니다.');
      }
    } catch (error) {
      console.error('뉴스 검색 오류:', error);
      toast.error('뉴스 검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 검색 입력 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">뉴스 검색 및 요약</h2>
        <div className="flex gap-4">
          <input
            type="text"
            id="news-search-keywords"
            name="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="검색할 키워드를 입력하세요 (예: AI, 기술, 경제)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </div>

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

      {/* 검색 결과 */}
      {articles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            검색 결과 ({articles.length}개)
          </h3>
          <div className="grid gap-4">
            {articles.map((article) => (
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
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">{article.title}</h4>
                    <p className="text-gray-600 mb-2">{article.description}</p>
                    
                    {article.summary && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-blue-600">AI 요약:</span>
                        <p className="text-sm text-gray-700 mt-1">{article.summary}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{article.source.name}</span>
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                    
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      원문 보기 →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
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