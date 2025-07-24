'use client';

import React, { useState, useEffect } from 'react';
import { SavedArticle } from '@/lib/newsDatabase';
import { toast } from 'react-hot-toast';

export default function SavedArticles() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 저장된 기사 목록 가져오기
  const fetchSavedArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/news/save');
      const result = await response.json();

      if (result.success) {
        setArticles(result.data.articles);
      } else {
        toast.error(result.error || '저장된 기사를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('저장된 기사 가져오기 오류:', error);
      toast.error('저장된 기사를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기사 삭제
  const deleteArticle = async (articleId: string) => {
    if (!confirm('정말로 이 기사를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/news/save/${articleId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('기사가 삭제되었습니다.');
        fetchSavedArticles(); // 목록 새로고침
      } else {
        toast.error(result.error || '기사 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('기사 삭제 오류:', error);
      toast.error('기사 삭제 중 오류가 발생했습니다.');
    }
  };

  // 필터링된 기사 목록
  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    article.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    article.notes?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 날짜 포맷팅
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchSavedArticles();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">저장된 뉴스 기사</h2>
        
        {/* 검색 필터 */}
        <div className="mb-4">
          <input
            type="text"
            id="saved-articles-search"
            name="searchKeyword"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="저장된 기사에서 검색..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 새로고침 버튼 */}
        <button
          onClick={fetchSavedArticles}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 기사 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            총 {filteredArticles.length}개의 저장된 기사
          </p>
          
          <div className="grid gap-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg flex-1">{article.title}</h3>
                  <button
                    onClick={() => deleteArticle(article.id)}
                    className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                  >
                    삭제
                  </button>
                </div>

                <p className="text-gray-600 mb-3">{article.description}</p>

                {article.summary && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-600">AI 요약:</span>
                    <p className="text-sm text-gray-700 mt-1">{article.summary}</p>
                  </div>
                )}

                {article.fullContent && (
                  <details className="mb-3">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">
                      전체 내용 보기
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-40 overflow-y-auto">
                      {article.fullContent}
                    </div>
                  </details>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>{article.source.name}</span>
                    <span>저장: {formatDate(article.savedAt)}</span>
                    <span>발행: {formatDate(article.publishedAt)}</span>
                  </div>
                  
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    원문 보기 →
                  </a>
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                      {article.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {article.notes && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <span className="text-sm font-medium text-yellow-800">메모:</span>
                    <p className="text-sm text-yellow-700 mt-1">{article.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchKeyword ? '검색 결과가 없습니다.' : '저장된 기사가 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
} 