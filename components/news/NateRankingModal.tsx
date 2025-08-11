'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface NateNewsArticle {
  rank: number;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string;
}

interface NateRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveArticle?: (article: NateNewsArticle) => void;
}

export default function NateRankingModal({ isOpen, onClose, onSaveArticle }: NateRankingModalProps) {
  const [articles, setArticles] = useState<NateNewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [savingArticles, setSavingArticles] = useState<Set<number>>(new Set());

  // 모달이 열릴 때 자동으로 뉴스 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchNateRanking();
    }
  }, [isOpen]);

  const fetchNateRanking = async () => {
    setLoading(true);
    try {
      console.log('🔍 네이트 뉴스 API 호출 시작...');
      const response = await fetch('/api/news/nate-ranking');
      const result = await response.json();
      
      console.log('🔍 네이트 뉴스 API 응답:', result);
      console.log('🔍 result.success:', result.success);
      console.log('🔍 result.articles:', result.articles);
      console.log('🔍 result.articles?.length:', result.articles?.length);

      if (result.success && result.articles && result.articles.length > 0) {
        console.log('✅ 네이트 뉴스 성공적으로 가져옴:', result.articles.length, '개');
        setArticles(result.articles);
        setLastUpdated(new Date());
        toast.success('네이트 뉴스 랭킹을 성공적으로 가져왔습니다.');
      } else {
        console.error('❌ 네이트 뉴스 가져오기 실패:', result);
        console.error('❌ success:', result.success);
        console.error('❌ articles:', result.articles);
        console.error('❌ articles length:', result.articles?.length);
        toast.error('네이트 뉴스 랭킹을 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 네이트 뉴스 API 호출 오류:', error);
      toast.error('뉴스 가져오기 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchNateRanking();
  };

  const handleSaveArticle = async (article: NateNewsArticle) => {
    if (savingArticles.has(article.rank)) return;

    setSavingArticles(prev => new Set(prev).add(article.rank));
    
    try {
      if (onSaveArticle) {
        await onSaveArticle(article);
        toast.success('기사가 저장되었습니다.');
      } else {
        // 기본 저장 로직 (로컬 스토리지)
        const savedArticles = JSON.parse(localStorage.getItem('savedNaverArticles') || '[]');
        const newSavedArticles = [...savedArticles, { ...article, savedAt: new Date().toISOString() }];
        localStorage.setItem('savedNaverArticles', JSON.stringify(newSavedArticles));
        toast.success('기사가 로컬에 저장되었습니다.');
      }
    } catch (error) {
      toast.error('기사 저장에 실패했습니다.');
    } finally {
      setSavingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(article.rank);
        return newSet;
      });
    }
  };

  const handleOpenArticle = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🏆 네이트 뉴스 랭킹 TOP 10</h2>
              <p className="text-gray-600 mt-1">실시간 인기 뉴스와 랭킹을 확인하세요</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* 컨텐츠 */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">뉴스를 가져오는 중...</span>
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.rank}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start space-x-4">
                      {/* 순위 */}
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          article.rank <= 3 
                            ? 'bg-red-500' 
                            : article.rank <= 6 
                            ? 'bg-orange-500' 
                            : 'bg-blue-500'
                        }`}>
                          {article.rank}
                        </div>
                      </div>

                      {/* 기사 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer"
                                onClick={() => handleOpenArticle(article.link)}>
                              {article.title}
                            </h4>
                            
                            {article.summary && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {article.summary}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="font-medium text-blue-600">{article.source}</span>
                              {article.publishedAt && (
                                <span>{article.publishedAt}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleOpenArticle(article.link)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="기사 보기"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleSaveArticle(article)}
                          disabled={savingArticles.has(article.rank)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="기사 저장"
                        >
                          <BookmarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">뉴스를 가져올 수 없습니다.</p>
                <button
                  onClick={handleRefresh}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              총 {articles.length}개의 기사
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? '로딩 중...' : '새로고침'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 