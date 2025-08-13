'use client';

import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, BookmarkIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface NateNewsArticle {
  rank: number;
  title: string;
  link: string;
  source: string;
  summary: string;
  publishedAt: string;
  section: string;
}

interface NateNewsSection {
  section: string;
  sectionName: string;
  articles: NateNewsArticle[];
}

interface NateNewsResponse {
  success: boolean;
  date: string;
  sections: NateNewsSection[];
  totalArticles: number;
}

export default function NateNews() {
  const [sections, setSections] = useState<NateNewsSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [savingArticles, setSavingArticles] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5분
  const [currentDate, setCurrentDate] = useState<string>('');

  // 컴포넌트 마운트 시 자동으로 뉴스 가져오기
  useEffect(() => {
    fetchNateRanking();
  }, []);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNateRanking();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const fetchNateRanking = async () => {
    setLoading(true);
    try {
      console.log('🔍 네이트 뉴스 API 호출 시작...');
      const response = await fetch('/api/news/nate-ranking');
      const result: NateNewsResponse = await response.json();
      
      console.log('🔍 네이트 뉴스 API 응답:', result);
      console.log('🔍 result.success:', result.success);
      console.log('🔍 result.sections:', result.sections);
      console.log('🔍 result.totalArticles:', result.totalArticles);

      if (result.success && result.sections && result.sections.length > 0) {
        console.log('✅ 네이트 뉴스 성공적으로 가져옴:', result.totalArticles, '개 기사,', result.sections.length, '개 섹션');
        setSections(result.sections);
        setCurrentDate(result.date);
        setLastUpdated(new Date());
        toast.success('네이트 뉴스 랭킹을 성공적으로 가져왔습니다.');
      } else {
        console.error('❌ 네이트 뉴스 가져오기 실패:', result);
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
    if (savingArticles.has(article.rank.toString())) return;

    setSavingArticles(prev => new Set(prev).add(article.rank.toString()));
    
    try {
      // 로컬 스토리지에 저장
      const savedArticles = JSON.parse(localStorage.getItem('savedNateArticles') || '[]');
      const newSavedArticles = [...savedArticles, { ...article, savedAt: new Date().toISOString() }];
      localStorage.setItem('savedNateArticles', JSON.stringify(newSavedArticles));
      toast.success('기사가 로컬에 저장되었습니다.');
    } catch (error) {
      toast.error('기사 저장에 실패했습니다.');
    } finally {
      setSavingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(article.rank.toString());
        return newSet;
      });
    }
  };

  const handleOpenArticle = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleCreateShorts = async (article: NateNewsArticle) => {
    try {
      console.log('🔍 숏폼 제작 시작:', article.title);
      
      // 숏폼 제작 API 호출
      const response = await fetch('/api/gemini/create-shorts-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: article.title,
          content: article.summary || article.title,
          source: article.source,
          link: article.link
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('숏폼 스크립트가 생성되었습니다!');
        console.log('✅ 숏폼 스크립트 생성 성공:', result);
        
        // 생성된 스크립트를 새 창에서 열기
        if (result.script) {
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head>
                  <title>숏폼 스크립트 - ${article.title}</title>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                    .script { background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
                    .title { color: #495057; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                    .source { color: #6c757d; font-size: 14px; margin-bottom: 15px; }
                    .content { white-space: pre-wrap; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <div class="title">${article.title}</div>
                    <div class="source">출처: ${article.source || '네이트 뉴스'}</div>
                  </div>
                  <div class="script">
                    <h3>숏폼 스크립트:</h3>
                    <div class="content">${result.script}</div>
                  </div>
                </body>
              </html>
            `);
            newWindow.document.close();
          }
        }
      } else {
        toast.error('숏폼 스크립트 생성에 실패했습니다.');
        console.error('❌ 숏폼 스크립트 생성 실패:', result);
      }
    } catch (error) {
      console.error('❌ 숏폼 제작 오류:', error);
      toast.error('숏폼 제작 중 오류가 발생했습니다.');
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    if (!autoRefresh) {
      toast.success('자동 새로고침이 활성화되었습니다.');
    } else {
      toast.success('자동 새로고침이 비활성화되었습니다.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ChartBarIcon className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏆 네이트 뉴스 랭킹</h1>
            <p className="text-gray-600">실시간 인기 뉴스와 랭킹을 확인하세요</p>
          </div>
        </div>
        
        {/* 컨트롤 버튼들 */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '로딩 중...' : '새로고침'}
          </button>

          <button
            onClick={toggleAutoRefresh}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              autoRefresh 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <ArrowPathIcon className="h-4 w-4" />
            {autoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'}
          </button>

          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={60000}>1분</option>
              <option value={300000}>5분</option>
              <option value={900000}>15분</option>
              <option value={1800000}>30분</option>
            </select>
          )}

          {lastUpdated && (
            <span className="text-sm text-gray-500">
              마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
            </span>
          )}
        </div>
      </div>

      {/* 뉴스 목록 */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
            <span className="text-gray-600">뉴스를 가져오는 중...</span>
          </div>
        ) : sections.length > 0 ? (
          <div className="grid gap-4">
            {sections.map((section) => (
              <div key={section.section} className="bg-white rounded-lg p-4 shadow-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.sectionName}</h2>
                <div className="grid gap-4">
                  {section.articles.map((article) => (
                    <div
                      key={article.rank}
                      className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start space-x-4">
                        {/* 순위 */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
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
                              <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2 hover:text-purple-600 cursor-pointer"
                                  onClick={() => handleOpenArticle(article.link)}>
                                {article.title}
                              </h3>
                              
                              {article.summary && (
                                <p className="text-gray-600 text-base mb-4 line-clamp-3 leading-relaxed">
                                  {article.summary}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                  {article.source}
                                </span>
                                {article.publishedAt && (
                                  <span className="bg-gray-100 px-2 py-1 rounded">
                                    {article.publishedAt}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handleOpenArticle(article.link)}
                            className="p-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="기사 보기"
                          >
                            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                          </button>
                          
                          <button
                            onClick={() => handleSaveArticle(article)}
                            disabled={savingArticles.has(article.rank.toString())}
                            className="p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="기사 저장"
                          >
                            <BookmarkIcon className="h-5 w-5" />
                          </button>

                          <button
                            onClick={() => handleCreateShorts(article)}
                            className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="숏폼 제작"
                          >
                            <ChartBarIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">뉴스를 가져올 수 없습니다.</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {/* 통계 정보 */}
      {sections.length > 0 && (
        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-3">📊 뉴스 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{sections.reduce((sum, s) => sum + s.articles.length, 0)}</div>
              <div className="text-purple-700">총 기사 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {sections.reduce((sum, s) => sum + s.articles.filter(a => a.rank <= 3).length, 0)}
              </div>
              <div className="text-red-700">TOP 3</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {sections.reduce((sum, s) => sum + s.articles.filter(a => a.rank > 3 && a.rank <= 6).length, 0)}
              </div>
              <div className="text-orange-700">TOP 4-6</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sections.reduce((sum, s) => sum + s.articles.filter(a => a.rank > 6).length, 0)}
              </div>
              <div className="text-blue-700">TOP 7-10</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 