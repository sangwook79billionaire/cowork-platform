'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  NewspaperIcon, 
  PlayIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AutoSummaryResult {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string;
  summary: string;
  shortsScript: string;
  keyword: string;
  relevanceScore?: number;
}

interface ShortsContent {
  shortsScript: string;
  seoTitle: string;
  videoDescription: string;
}

interface AutoSummaryManagerProps {
  isMobile?: boolean;
}

export default function AutoSummaryManager({ isMobile = false }: AutoSummaryManagerProps) {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<string[]>(['노인 건강', '시니어 건강']);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AutoSummaryResult[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'evening'>('morning');
  const [showResults, setShowResults] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<AutoSummaryResult | null>(null);
  const [shortsContent, setShortsContent] = useState<ShortsContent | null>(null);
  const [creatingShorts, setCreatingShorts] = useState(false);

  // 키워드 추가
  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
      toast.success('키워드가 추가되었습니다.');
    }
  };

  // 키워드 삭제
  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(newKeywords);
    toast.success('키워드가 삭제되었습니다.');
  };

  // 자동 요약 실행
  const runAutoSummary = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (keywords.length === 0) {
      toast.error('키워드를 추가해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/news/auto-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          timeSlot: selectedTimeSlot,
          userId: user.uid
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setShowResults(true);
        toast.success(`${data.articlesProcessed}개의 기사를 처리했습니다!`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('자동 요약 실행에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 숏츠 생성
  const createShorts = async (article: AutoSummaryResult) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setCreatingShorts(true);
    try {
      const response = await fetch('/api/news/create-shorts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: article.url, // URL을 ID로 사용
          articleTitle: article.title,
          articleContent: article.content,
          articleSummary: article.summary,
          keyword: article.keyword,
          userId: user.uid
        })
      });

      const data = await response.json();

      if (response.ok) {
        setShortsContent(data);
        setSelectedArticle(article);
        toast.success('숏츠 콘텐츠가 생성되었습니다!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('숏츠 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setCreatingShorts(false);
    }
  };

  // 텍스트 파일 다운로드
  const downloadResults = () => {
    if (results.length === 0) return;

    let content = `자동 뉴스 요약 결과 (${new Date().toLocaleDateString()})\n`;
    content += `시간대: ${selectedTimeSlot === 'morning' ? '오전' : '오후'}\n\n`;

    results.forEach((result, index) => {
      content += `=== ${index + 1}. ${result.keyword} ===\n`;
      content += `제목: ${result.title}\n`;
      content += `출처: ${result.source}\n`;
      content += `URL: ${result.url}\n\n`;
      content += `[요약]\n${result.summary}\n\n`;
      content += '='.repeat(50) + '\n\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auto_summary_${selectedTimeSlot}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('결과가 다운로드되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NewspaperIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">자동 뉴스 요약 & 쇼츠 생성</h2>
        </div>
      </div>

      {/* 설정 패널 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          {/* 시간대 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              실행 시간대
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTimeSlot('morning')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTimeSlot === 'morning'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="오전 8시 실행"
              >
                <ClockIcon className="w-4 h-4 inline mr-1" />
                오전 (8시)
              </button>
              <button
                onClick={() => setSelectedTimeSlot('evening')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTimeSlot === 'evening'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="오후 6시 실행"
              >
                <ClockIcon className="w-4 h-4 inline mr-1" />
                오후 (6시)
              </button>
            </div>
          </div>

          {/* 키워드 관리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색 키워드
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="새 키워드 입력"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="키워드 추가"
              >
                추가
              </button>
            </div>
            
            {/* 키워드 목록 */}
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  <span>{keyword}</span>
                  <button
                    onClick={() => removeKeyword(index)}
                    className="text-blue-500 hover:text-blue-700"
                    title="키워드 삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 실행 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={runAutoSummary}
              disabled={loading || keywords.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="자동 요약 실행"
            >
              {loading ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5" />
              )}
              {loading ? '처리 중...' : '자동 요약 실행'}
            </button>

            {results.length > 0 && (
              <button
                onClick={downloadResults}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                title="결과 다운로드"
              >
                <DocumentTextIcon className="w-5 h-5" />
                결과 다운로드
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 결과 표시 */}
      {showResults && results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">처리 결과</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircleIcon className="w-4 h-4" />
              {results.length}개 기사 처리 완료
            </div>
          </div>

          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {result.keyword}
                      </h4>
                      {result.relevanceScore && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          연관성: {result.relevanceScore}점
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{result.title}</p>
                    <p className="text-xs text-gray-500">
                      {result.source} • {new Date(result.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="원문 보기"
                    >
                      원문 →
                    </a>
                    <button
                      onClick={() => createShorts(result)}
                      disabled={creatingShorts}
                      className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                      title="숏츠 생성"
                    >
                      {creatingShorts ? '생성 중...' : '숏츠 생성'}
                    </button>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <DocumentTextIcon className="w-4 h-4" />
                    주요 내용
                  </h5>
                  <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                    {result.summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 숏츠 콘텐츠 표시 */}
      {shortsContent && selectedArticle && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">숏츠 콘텐츠</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <PlayIcon className="w-4 h-4" />
              {selectedArticle.keyword}
            </div>
          </div>

          <div className="space-y-6">
            {/* SEO 최적화된 제목 */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                <DocumentTextIcon className="w-4 h-4" />
                SEO 최적화된 제목
              </h5>
              <div className="bg-yellow-50 rounded-md p-3 text-sm text-gray-700 border border-yellow-200">
                {shortsContent.seoTitle}
              </div>
            </div>

            {/* 숏츠 스크립트 */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                <PlayIcon className="w-4 h-4" />
                숏츠 스크립트
              </h5>
              <div className="bg-blue-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-line border border-blue-200">
                {shortsContent.shortsScript}
              </div>
            </div>

            {/* 영상 설명 */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                <DocumentTextIcon className="w-4 h-4" />
                영상 설명
              </h5>
              <div className="bg-green-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-line border border-green-200">
                {shortsContent.videoDescription}
              </div>
            </div>

            {/* 복사 버튼들 */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shortsContent.seoTitle);
                  toast.success('제목이 복사되었습니다!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                title="제목 복사"
              >
                <DocumentTextIcon className="w-4 h-4" />
                제목 복사
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shortsContent.shortsScript);
                  toast.success('스크립트가 복사되었습니다!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="스크립트 복사"
              >
                <PlayIcon className="w-4 h-4" />
                스크립트 복사
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shortsContent.videoDescription);
                  toast.success('영상 설명이 복사되었습니다!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                title="영상 설명 복사"
              >
                <DocumentTextIcon className="w-4 h-4" />
                영상 설명 복사
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      {!showResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">사용 방법</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 키워드를 추가하고 실행 시간대를 선택하세요</li>
                <li>• "자동 요약 실행" 버튼을 클릭하면 뉴스를 검색하고 요약합니다</li>
                <li>• 각 키워드별로 연관성 높은 기사 5개를 선별하여 요약합니다</li>
                <li>• 원하는 기사를 선택하여 숏츠 스크립트, SEO 제목, 영상 설명을 생성할 수 있습니다</li>
                <li>• 결과는 Firestore에 저장되며 텍스트 파일로 다운로드할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 