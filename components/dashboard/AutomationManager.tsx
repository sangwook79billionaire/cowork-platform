'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  NewspaperIcon, 
  VideoCameraIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  EyeIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string;
  keywords: string[];
  summary: string;
  category: string;
  timeSlot: string;
  createdAt: Date;
}

interface ShortsScript {
  id: string;
  title: string;
  opening: string;
  mainContent: string;
  closing: string;
  totalDuration: string;
  keywords: string[];
  source: string;
  newsArticleId: string;
  createdAt: Date;
}

interface AutomationManagerProps {
  isMobile?: boolean;
}

export default function AutomationManager({ isMobile = false }: AutomationManagerProps) {
  const { user } = useAuth();
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [shortsScripts, setShortsScripts] = useState<ShortsScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<ShortsScript | null>(null);

  // 뉴스 기사 로드
  useEffect(() => {
    if (user) {
      loadNewsArticles();
    }
  }, [user]);

  const loadNewsArticles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Firestore에서 뉴스 기사 가져오기 (실제 구현에서는 쿼리 필요)
      // 여기서는 모의 데이터 사용
      const mockArticles: NewsArticle[] = [
        {
          id: '1',
          title: '시니어 건강 관리의 새로운 트렌드',
          url: 'https://example.com/article1',
          content: '최근 시니어들의 건강 관리에 대한 새로운 트렌드가 나타나고 있습니다.',
          source: 'BBC News',
          publishedAt: new Date().toISOString(),
          keywords: ['시니어', '건강', '트렌드'],
          summary: '시니어 건강 관리의 새로운 트렌드에 대한 요약입니다.',
          category: 'morning',
          timeSlot: 'morning',
          createdAt: new Date()
        }
      ];
      
      setNewsArticles(mockArticles);
    } catch (error) {
      console.error('뉴스 기사 로드 오류:', error);
      toast.error('뉴스 기사를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 뉴스 자동화 실행
  const runNewsAutomation = async (timeSlot: 'morning' | 'evening') => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/automation/news-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          timeSlot
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`${timeSlot === 'morning' ? '오전' : '오후'} 뉴스 자동화가 완료되었습니다!`);
        loadNewsArticles(); // 기사 목록 새로고침
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('뉴스 자동화에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 숏츠 스크립트 생성
  const generateShortsScript = async (article: NewsArticle) => {
    if (!user) return;

    setGeneratingScript(true);
    try {
      const response = await fetch('/api/shorts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsArticle: article,
          targetDuration: '60',
          style: 'friendly'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedScript({
          id: Date.now().toString(),
          ...data,
          newsArticleId: article.id,
          createdAt: new Date()
        });
        setShowScriptModal(true);
        toast.success('숏츠 스크립트가 생성되었습니다!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('스크립트 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setGeneratingScript(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">자동화 관리</h2>
        </div>
      </div>

      {/* 자동화 실행 버튼들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => runNewsAutomation('morning')}
          disabled={loading}
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <NewspaperIcon className="h-8 w-8 text-blue-600" />
          <div className="text-left">
            <h4 className="font-semibold text-gray-900">오전 뉴스 자동화</h4>
            <p className="text-sm text-gray-600">매일 오전 8시 뉴스 검색 및 요약</p>
          </div>
          {loading && <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />}
        </button>

        <button
          onClick={() => runNewsAutomation('evening')}
          disabled={loading}
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <NewspaperIcon className="h-8 w-8 text-green-600" />
          <div className="text-left">
            <h4 className="font-semibold text-gray-900">오후 뉴스 자동화</h4>
            <p className="text-sm text-gray-600">매일 오후 7시 뉴스 검색 및 요약</p>
          </div>
          {loading && <ArrowPathIcon className="h-5 w-5 animate-spin text-green-600" />}
        </button>
      </div>

      {/* 뉴스 기사 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">수집된 뉴스 기사</h3>
        
        {newsArticles.length === 0 ? (
          <div className="text-center py-8">
            <NewspaperIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">뉴스 기사가 없습니다</h4>
            <p className="text-gray-500">자동화를 실행하여 뉴스 기사를 수집해보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {newsArticles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{article.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{article.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span>{formatDate(article.createdAt)}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        article.timeSlot === 'morning' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {article.timeSlot === 'morning' ? '오전' : '오후'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => generateShortsScript(article)}
                    disabled={generatingScript}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                    {generatingScript ? '생성 중...' : '숏츠 생성'}
                  </button>
                </div>
                
                {/* 키워드 */}
                <div className="flex flex-wrap gap-2">
                  {article.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 숏츠 스크립트 모달 */}
      {showScriptModal && generatedScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <VideoCameraIcon className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold">생성된 숏츠 스크립트</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">{generatedScript.title}</h4>
                <p className="text-sm text-gray-600">재생 시간: {generatedScript.totalDuration}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">오프닝</h5>
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm">{generatedScript.opening}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">본론</h5>
                  <div className="p-3 bg-green-50 rounded-md">
                    <p className="text-sm">{generatedScript.mainContent}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">클로징</h5>
                  <div className="p-3 bg-purple-50 rounded-md">
                    <p className="text-sm">{generatedScript.closing}</p>
                  </div>
                </div>
              </div>

              {/* 키워드 */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">키워드</h5>
                <div className="flex flex-wrap gap-2">
                  {generatedScript.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 