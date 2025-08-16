'use client';

import { useState } from 'react';
import { ContentGenerator } from './ContentGenerator';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
}

interface NewsContentPipelineProps {
  initialKeyword?: string;
}

export function NewsContentPipeline({ initialKeyword }: NewsContentPipelineProps) {
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);
  const [keyword, setKeyword] = useState(initialKeyword || '');

  // 뉴스 검색 결과 (예시 데이터)
  const mockNewsResults: NewsArticle[] = [
    {
      id: '1',
      title: '무릎 통증, 계단 내려갈 때 주의해야 할 점들',
      content: '최근 연구에 따르면 계단을 내려갈 때 무릎에 가해지는 압력이 올라갈 때보다 3배 이상 높다고 합니다. 전문의들은 계단 내려가기 전에 충분한 준비운동을 권장하고 있습니다.',
      source: '건강일보',
      publishedAt: '2024-01-15'
    },
    {
      id: '2',
      title: '무릎 건강을 위한 운동 가이드',
      content: '무릎 관절 건강을 위해서는 정기적인 운동이 중요합니다. 특히 수영, 자전거 타기 등 관절에 부담이 적은 운동을 권장합니다.',
      source: '운동과학연구소',
      publishedAt: '2024-01-14'
    }
  ];

  const handleNewsSelect = (news: NewsArticle) => {
    setSelectedNews(news);
    // 뉴스 제목에서 키워드 추출
    if (!keyword) {
      const extractedKeyword = news.title.split(',')[0].trim();
      setKeyword(extractedKeyword);
    }
  };

  const handleKeywordChange = (newKeyword: string) => {
    setKeyword(newKeyword);
    setSelectedNews(null); // 키워드가 변경되면 선택된 뉴스 초기화
  };

  return (
    <div className="space-y-6">
      {/* 키워드 입력 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔍 키워드 입력
        </h3>
        <input
          type="text"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder="키워드를 입력하거나 아래 뉴스 중에서 선택하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 뉴스 검색 결과 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📰 관련 뉴스
        </h3>
        
        {mockNewsResults.length > 0 ? (
          <div className="space-y-3">
            {mockNewsResults.map((news) => (
              <div
                key={news.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedNews?.id === news.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleNewsSelect(news)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {news.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {news.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>출처: {news.source}</span>
                      <span>발행일: {news.publishedAt}</span>
                    </div>
                  </div>
                  {selectedNews?.id === news.id && (
                    <div className="ml-4 text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            관련 뉴스가 없습니다.
          </p>
        )}
      </div>

      {/* 콘텐츠 생성기 */}
      <ContentGenerator
        keyword={keyword}
        newsContent={selectedNews?.content}
      />

      {/* 선택된 뉴스 정보 표시 */}
      {selectedNews && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            📋 선택된 뉴스 정보
          </h4>
          <div className="text-sm text-blue-800">
            <p><strong>제목:</strong> {selectedNews.title}</p>
            <p><strong>출처:</strong> {selectedNews.source}</p>
            <p><strong>발행일:</strong> {selectedNews.publishedAt}</p>
            <p><strong>내용:</strong> {selectedNews.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}
