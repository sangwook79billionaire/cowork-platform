'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  content: string;
  source: {
    name: string;
  };
  publishedAt: string;
  keywords: string[];
  summary: string;
  language: 'ko' | 'en';
  country: string;
}

interface SearchFilters {
  keywords: string[];
  fromDate: string;
  toDate: string;
  language: 'ko' | 'en' | 'both';
  countries: string[];
}

export default function NewsSearch() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    keywords: [''],
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30일 전
    toDate: new Date().toISOString().split('T')[0], // 오늘
    language: 'both',
    countries: ['kr', 'us', 'gb', 'au']
  });

  const countryOptions = [
    { code: 'kr', name: '한국', flag: '🇰🇷' },
    { code: 'us', name: '미국', flag: '🇺🇸' },
    { code: 'gb', name: '영국', flag: '🇬🇧' },
    { code: 'au', name: '호주', flag: '🇦🇺' }
  ];

  const languageOptions = [
    { value: 'ko', label: '한국어', flag: '🇰🇷' },
    { value: 'en', label: '영어', flag: '🇺🇸' },
    { value: 'both', label: '모든 언어', flag: '🌍' }
  ];

  const searchNews = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/news/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: searchFilters.keywords.filter(k => k.trim() !== ''),
          fromDate: searchFilters.fromDate,
          toDate: searchFilters.toDate,
          language: searchFilters.language,
          countries: searchFilters.countries,
          limit: 20
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setArticles(data.articles || []);
        toast.success(`${data.articles?.length || 0}개의 기사를 찾았습니다.`);
      } else {
        throw new Error(data.error || '검색에 실패했습니다.');
      }
    } catch (error) {
      console.error('뉴스 검색 오류:', error);
      toast.error('뉴스 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    setSearchFilters(prev => ({
      ...prev,
      keywords: [...prev.keywords, '']
    }));
  };

  const removeKeyword = (index: number) => {
    setSearchFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  const updateKeyword = (index: number, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      keywords: prev.keywords.map((k, i) => i === index ? value : k)
    }));
  };

  const toggleCountry = (countryCode: string) => {
    setSearchFilters(prev => ({
      ...prev,
      countries: prev.countries.includes(countryCode)
        ? prev.countries.filter(c => c !== countryCode)
        : [...prev.countries, countryCode]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLanguageFlag = (language: string) => {
    return language === 'ko' ? '🇰🇷' : '🇺🇸';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">뉴스 검색</h1>
        <p className="text-gray-600">기간과 키워드로 한국 및 해외 뉴스를 검색하세요</p>
      </div>

      {/* 검색 필터 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
          검색 조건
        </h2>

        {/* 키워드 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검색 키워드
          </label>
          <div className="space-y-2">
            {searchFilters.keywords.map((keyword, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => updateKeyword(index, e.target.value)}
                  placeholder="검색할 키워드를 입력하세요"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchFilters.keywords.length > 1 && (
                  <button
                    onClick={() => removeKeyword(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addKeyword}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + 키워드 추가
            </button>
          </div>
        </div>

        {/* 날짜 범위 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              시작 날짜
            </label>
            <input
              type="date"
              value={searchFilters.fromDate}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              종료 날짜
            </label>
            <input
              type="date"
              value={searchFilters.toDate}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, toDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 언어 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <GlobeAltIcon className="h-4 w-4" />
            언어
          </label>
          <div className="flex gap-4">
            {languageOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={searchFilters.language === option.value}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, language: e.target.value as 'ko' | 'en' | 'both' }))}
                  className="text-blue-600"
                />
                <span className="text-lg">{option.flag}</span>
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 국가 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <GlobeAltIcon className="h-4 w-4" />
            국가
          </label>
          <div className="flex gap-4">
            {countryOptions.map((country) => (
              <label key={country.code} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchFilters.countries.includes(country.code)}
                  onChange={() => toggleCountry(country.code)}
                  className="text-blue-600"
                />
                <span className="text-lg">{country.flag}</span>
                <span>{country.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={searchNews}
          disabled={loading || searchFilters.keywords.every(k => k.trim() === '')}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              검색 중...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="h-5 w-5" />
              뉴스 검색
            </>
          )}
        </button>
      </div>

      {/* 검색 결과 */}
      {articles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DocumentTextIcon className="h-6 w-6 text-green-600" />
            검색 결과 ({articles.length}개)
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {articles.map((article, index) => (
              <div key={article.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getLanguageFlag(article.language)}</span>
                    <span className="text-sm text-gray-500">{article.source.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    {formatDate(article.publishedAt)}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    {article.title}
                  </a>
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {article.summary || article.content?.substring(0, 200)}
                </p>
                
                {article.keywords && article.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.keywords.slice(0, 3).map((keyword, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 