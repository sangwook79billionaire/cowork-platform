'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

interface SummaryResult {
  summary: string;
  originalText: string;
}

export default function NewsSearch({ onArticleSelect }: NewsSearchProps) {
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [collectionResult, setCollectionResult] = useState<NewsCollectionResult | null>(null);
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'relevance'>('latest');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isDateFilterActive, setIsDateFilterActive] = useState<boolean>(false);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showKeywordGuide, setShowKeywordGuide] = useState<boolean>(false);

  // 페이지 로드 시 자동으로 뉴스 가져오기 (최초 진입 시에만)
  useEffect(() => {
    fetchCollectedNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뉴스 수집 (구글 RSS 기반)
  const handleNewsCollection = async () => {
    if (!keywords.trim()) {
      toast.error('검색 키워드를 입력해주세요.');
      return;
    }

    setLoading(true);
    // 새로운 수집 시작 시 기존 기사들 초기화
    setArticles([]);
    setSelectedArticles(new Set());
    setCollectionResult(null);
    
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
        
        // 새로 수집된 키워드들로만 Firebase에서 뉴스 가져오기
        await fetchCollectedNewsByKeywords(result.keywords);
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

  // 특정 키워드들로 수집된 뉴스만 가져오기
  const fetchCollectedNewsByKeywords = async (targetKeywords: string[]) => {
    try {
      setLoading(true);
      setArticles([]); // 새로 수집된 키워드로만 보여주기 위해 초기화
      console.log('🔍 새로 수집된 키워드들로 뉴스 가져오기:', targetKeywords);
      // Firestore에 저장이 완료된 후 약간 대기
      await new Promise(res => setTimeout(res, 1000));
      const allArticles: NewsArticle[] = [];
      for (const keyword of targetKeywords) {
        const url = `/api/news/firebase?keyword=${encodeURIComponent(keyword)}&limit=200`;
        console.log(`🔍 키워드 "${keyword}" API 호출:`, url);
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        console.log(`🔍 키워드 "${keyword}" 응답 상태:`, response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ 키워드 "${keyword}" API 오류:`, response.status, errorText);
          continue;
        }
        const result = await response.json();
        console.log(`✅ [${keyword}] API 응답:`, result);
        if (result.success && result.articles) {
          console.log(`✅ 키워드 "${keyword}"에서 ${result.articles.length}개 뉴스 가져옴`);
          allArticles.push(...result.articles);
        } else {
          console.warn(`⚠️ 키워드 "${keyword}"에서 뉴스를 가져오지 못함:`, result);
        }
      }
      // 중복 제거
      const uniqueArticles = allArticles.filter((article, index, self) => 
        index === self.findIndex(a => a.id === article.id)
      );
      console.log(`✅ 총 ${uniqueArticles.length}개의 고유한 뉴스를 가져왔습니다.`);
      setArticles(uniqueArticles); // 반드시 즉시 반영
      setLoading(false);
      if (uniqueArticles.length === 0) {
        toast.success('수집된 뉴스가 없습니다. 키워드를 입력하고 뉴스를 수집해보세요.');
      }
    } catch (error) {
      console.error('키워드별 뉴스 가져오기 오류:', error);
      setLoading(false);
      toast.error('뉴스 가져오기 중 오류가 발생했습니다.');
    }
  };

  // Firebase에서 수집된 뉴스 가져오기 (기존 전체 뉴스)
  const fetchCollectedNews = async (filterByKeyword: string = '') => {
    try {
      console.log('🔍 Firebase에서 뉴스 가져오기 시작');
      
      // 필터링할 키워드 결정
      const keywordParam = filterByKeyword || '';
      
      console.log(`🔍 키워드로 뉴스 필터링: ${keywordParam || '전체'}`);
      
      // 키워드가 있으면 필터링, 없으면 모든 뉴스 가져오기
      const url = keywordParam 
        ? `/api/news/firebase?keyword=${encodeURIComponent(keywordParam)}&limit=200`
        : '/api/news/firebase?limit=200';
        
      console.log('🔍 요청 URL:', url);
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 API 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Firebase API 오류:', errorText);
        toast.error(`Firebase API 오류: ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log('🔍 Firebase API 응답:', result);

      if (result.success) {
        console.log(`✅ Firebase에서 ${result.articles.length}개의 뉴스를 가져왔습니다. (키워드: ${keywordParam || '전체'})`);
        setArticles(result.articles);
        
        if (result.articles.length === 0) {
          toast.success('수집된 뉴스가 없습니다. 키워드를 입력하고 뉴스를 수집해보세요.');
        }
      } else {
        console.error('Firebase에서 뉴스 가져오기 실패:', result.error);
        toast.error('Firebase에서 뉴스를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Firebase 뉴스 가져오기 오류:', error);
      toast.error('Firebase 뉴스 가져오기 중 오류가 발생했습니다.');
    }
  };

  // 키워드로 필터링
  const handleFilterByKeyword = () => {
    console.log('🔍 필터 키워드 적용:', filterKeyword);
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

  // HTML 태그 제거 및 텍스트 정리 (description이 제목 반복이면 '요약 없음' 반환)
  const cleanHtmlText = (htmlText: string, title?: string): string => {
    if (!htmlText) return '요약 없음';
    let text = htmlText
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    // description이 제목 반복이면 요약 없음
    if (title && (text === title || text.startsWith(title))) {
      return '요약 없음';
    }
    return text || '요약 없음';
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

  // 관련도 점수 계산 함수
  const getRelevanceScore = (article: NewsArticle, keywords: string) => {
    if (!keywords) return 0;
    const keywordArr = keywords.split(',').map(k => k.trim()).filter(Boolean);
    let score = 0;
    for (const kw of keywordArr) {
      if (!kw) continue;
      const regex = new RegExp(kw, 'gi');
      score += (article.title.match(regex)?.length || 0);
      score += (article.description.match(regex)?.length || 0);
    }
    return score;
  };

  // 빠른 날짜 선택 함수들
  const setQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setIsDateFilterActive(true);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsDateFilterActive(false);
  };

  // 날짜 필터링 함수
  const isArticleInDateRange = (article: NewsArticle) => {
    if (!isDateFilterActive || !startDate || !endDate) return true;
    
    const articleDate = new Date(article.published_at);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // 종료일은 하루 끝까지 포함
    
    return articleDate >= start && articleDate <= end;
  };

  // 정렬된 뉴스 목록 (useMemo로 최적화)
  const sortedArticles = useMemo(() => {
    let filteredArticles = articles.filter(isArticleInDateRange);
    
    if (sortOrder === 'latest') {
      return filteredArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sortOrder === 'oldest') {
      return filteredArticles.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    } else if (sortOrder === 'relevance') {
      return filteredArticles.sort((a, b) => getRelevanceScore(b, keywords) - getRelevanceScore(a, keywords));
    }
    return filteredArticles;
  }, [articles, sortOrder, keywords, startDate, endDate, isDateFilterActive]);

  // 기사 요약 함수
  const handleSummarizeArticle = async (article: NewsArticle) => {
    try {
      setSummaryLoading(true);
      setSummaryResult(null);
      setShowSummaryModal(true);

      console.log(`🔍 기사 요약 시작: ${article.title}`);

      const response = await fetch('/api/news/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: article.link,
          title: article.title,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSummaryResult({
          summary: result.summary,
          originalText: result.originalText,
        });
        toast.success('기사 요약이 완료되었습니다.');
      } else {
        toast.error(result.error || '요약 중 오류가 발생했습니다.');
        setShowSummaryModal(false);
      }
    } catch (error) {
      console.error('요약 요청 오류:', error);
      toast.error('요약 요청 중 오류가 발생했습니다.');
      setShowSummaryModal(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      {/* 검색 입력 */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-4">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="키워드를 입력하세요 (예: 삼성전자, AI OR 인공지능, '전기차 시장')"
              className="w-full px-4 py-3 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleNewsCollection()}
            />
            <button
              onClick={() => setShowKeywordGuide(!showKeywordGuide)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              title="검색 가이드 보기"
            >
              ?
            </button>
          </div>
          <button
            onClick={handleNewsCollection}
            disabled={loading || !keywords.trim()}
            className="w-full lg:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? '수집 중...' : '뉴스 수집'}
          </button>
        </div>

        {/* 키워드 검색 가이드 */}
        {showKeywordGuide && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 RSS 검색 최적화 가이드</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <div>
                <strong>📝 기본 검색:</strong> <code className="bg-blue-100 px-1 rounded">삼성전자</code> - 정확한 키워드 검색
              </div>
              <div>
                <strong>🔗 AND 검색:</strong> <code className="bg-blue-100 px-1 rounded">AI 인공지능</code> - 두 키워드 모두 포함된 기사
              </div>
              <div>
                <strong>📋 OR 검색:</strong> <code className="bg-blue-100 px-1 rounded">AI OR 인공지능</code> - 둘 중 하나라도 포함된 기사
              </div>
              <div>
                <strong>💬 정확한 구문:</strong> <code className="bg-blue-100 px-1 rounded">"전기차 시장"</code> - 정확한 구문 검색
              </div>
              <div className="mt-2 text-xs text-blue-600">
                💡 <strong>팁:</strong> 여러 단어로 검색하면 더 많은 관련 기사를 찾을 수 있습니다.
              </div>
            </div>
          </div>
        )}

        {/* 수집 결과 표시 */}
        {collectionResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">📊 수집 결과</h4>
            <div className="text-sm text-green-700 space-y-1">
              <div>총 수집: {collectionResult.total_collected}개</div>
              <div>중복 제거 후: {collectionResult.total_unique}개</div>
              <div>성공한 키워드: {collectionResult.keywords.join(', ')}</div>
              {collectionResult.failed_keywords.length > 0 && (
                <div>실패한 키워드: {collectionResult.failed_keywords.join(', ')}</div>
              )}
            </div>
          </div>
        )}
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

      {/* 수집된 뉴스 목록 */}
      {articles.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">
              수집된 뉴스 ({sortedArticles.length}개)
              {isDateFilterActive && (
                <span className="ml-2 text-sm text-blue-600">
                  (기간 필터 적용)
                </span>
              )}
            </h3>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full lg:w-auto">
              {/* 정렬 드롭다운 */}
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-auto"
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="relevance">관련도순</option>
              </select>

              {/* 기간 필터 */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-1 w-full lg:w-auto">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-auto"
                    placeholder="시작일"
                  />
                  <span className="text-xs text-gray-500">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-auto"
                    placeholder="종료일"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsDateFilterActive(true)}
                    className="px-2 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    적용
                  </button>
                  <button
                    onClick={clearDateFilter}
                    className="px-2 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    해제
                  </button>
                </div>
              </div>

              {/* 빠른 날짜 선택 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuickDate(0)}
                  className="px-2 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  오늘
                </button>
                <button
                  onClick={() => setQuickDate(7)}
                  className="px-2 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  7일
                </button>
                <button
                  onClick={() => setQuickDate(30)}
                  className="px-2 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  30일
                </button>
              </div>

              {/* 키워드 필터링 */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto">
                <input
                  type="text"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="키워드로 필터링..."
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-auto"
                  onKeyPress={(e) => e.key === 'Enter' && handleFilterByKeyword()}
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleFilterByKeyword}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    필터
                  </button>
                  <button
                    onClick={() => {
                      setFilterKeyword('');
                      fetchCollectedNews('');
                    }}
                    className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    전체
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                총 {articles.length}개 중 {sortedArticles.length}개 표시됨
              </div>
            </div>
          </div>
          
          {/* 뉴스 목록 컨테이너 - 스크롤 가능하도록 설정 */}
          <div className="max-h-96 lg:max-h-[70vh] overflow-y-auto border border-gray-200 rounded-lg bg-white">
            <div className="space-y-2 p-2">
              {sortedArticles.map((article, index) => (
                <div
                  key={article.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors hover:shadow-sm ${
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
                      className="mt-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-base lg:text-lg flex-1 mr-2 line-clamp-2">{article.title}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">#{index + 1}</span>
                          {sortOrder === 'relevance' && (
                            <span className="text-xs text-pink-600">관련도: {getRelevanceScore(article, keywords)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2 text-sm">
                        {cleanHtmlText(article.description, article.title)}
                      </p>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between text-sm text-gray-500 gap-2">
                        <span>{article.source}</span>
                        <span>{formatDate(article.published_at)}</span>
                      </div>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between mt-2 gap-2">
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          키워드: {article.keyword}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSummarizeArticle(article);
                            }}
                            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            요약하기
                          </button>
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

      {/* 요약 결과 모달 */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 lg:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">기사 요약</h3>
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  setSummaryResult(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ✕
              </button>
            </div>
            
            {summaryLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">기사를 분석하고 요약하고 있습니다...</p>
              </div>
            ) : summaryResult ? (
              <div className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">📝 요약</h4>
                  <p className="text-gray-700 leading-relaxed">{summaryResult.summary}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">📄 원본 텍스트 일부</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{summaryResult.originalText}</p>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowSummaryModal(false);
                      setSummaryResult(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    닫기
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">뉴스를 수집하고 있습니다...</span>
        </div>
      )}
    </div>
  );
} 