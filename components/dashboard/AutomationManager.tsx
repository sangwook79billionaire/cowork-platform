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
  ArrowPathIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  BoltIcon
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
  relevanceScore?: number;
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
  const [automationStatus, setAutomationStatus] = useState({
    morning: { lastRun: null as Date | null, isRunning: false, articleCount: 0 },
    evening: { lastRun: null as Date | null, isRunning: false, articleCount: 0 },
    now: { lastRun: null as Date | null, isRunning: false, articleCount: 0 }
  });
  
  // 새로운 상태들
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<NewsArticle | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [showSelectionMode, setShowSelectionMode] = useState(false);

  // 뉴스 기사 로드
  useEffect(() => {
    if (user) {
      loadNewsArticles();
      loadAutomationStatus();
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
          content: '최근 시니어들의 건강 관리에 대한 새로운 트렌드가 나타나고 있습니다. 특히 디지털 헬스케어 기술의 발전으로 원격 건강 모니터링이 활성화되고 있으며, 개인 맞춤형 건강 관리 서비스가 주목받고 있습니다. 전문가들은 이러한 기술 발전이 시니어들의 삶의 질 향상에 크게 기여할 것으로 전망하고 있습니다.',
          source: 'BBC News',
          publishedAt: new Date().toISOString(),
          keywords: ['시니어', '건강', '트렌드'],
          summary: '시니어 건강 관리의 새로운 트렌드에 대한 요약입니다.',
          category: 'morning',
          timeSlot: 'morning',
          createdAt: new Date(),
          relevanceScore: 95
        },
        {
          id: '2',
          title: '노인 건강을 위한 운동 프로그램',
          url: 'https://example.com/article2',
          content: '노인들의 건강 증진을 위한 새로운 운동 프로그램이 개발되었습니다. 이 프로그램은 관절 건강과 근력 강화에 중점을 두고 설계되었습니다. 전문가들은 정기적인 운동이 노화 과정을 늦추고 전반적인 건강 상태를 개선하는 데 도움이 된다고 강조합니다.',
          source: 'CNN Health',
          publishedAt: new Date().toISOString(),
          keywords: ['노인', '운동', '건강'],
          summary: '노인 건강을 위한 운동 프로그램 소개',
          category: 'morning',
          timeSlot: 'morning',
          createdAt: new Date(),
          relevanceScore: 92
        },
        {
          id: '3',
          title: '시니어를 위한 영양 관리 가이드',
          url: 'https://example.com/article3',
          content: '시니어들의 건강한 노후를 위한 영양 관리 가이드가 발표되었습니다. 연령대별 맞춤 영양 섭취가 중요하다고 강조했습니다. 특히 단백질 섭취와 비타민 보충이 시니어 건강에 핵심적인 역할을 한다고 전문가들은 설명합니다.',
          source: 'Health Today',
          publishedAt: new Date().toISOString(),
          keywords: ['시니어', '영양', '관리'],
          summary: '시니어를 위한 영양 관리 가이드',
          category: 'morning',
          timeSlot: 'morning',
          createdAt: new Date(),
          relevanceScore: 88
        },
        {
          id: '4',
          title: '노인 건강검진의 중요성',
          url: 'https://example.com/article4',
          content: '정기적인 건강검진이 노인들의 건강 관리에 얼마나 중요한지에 대한 연구 결과가 발표되었습니다. 조기 발견과 예방이 질병 치료보다 효과적이라는 것이 연구의 핵심 내용입니다.',
          source: 'Medical News',
          publishedAt: new Date().toISOString(),
          keywords: ['노인', '건강검진', '중요성'],
          summary: '노인 건강검진의 중요성에 대한 연구',
          category: 'morning',
          timeSlot: 'morning',
          createdAt: new Date(),
          relevanceScore: 85
        },
        {
          id: '5',
          title: '시니어 마음 건강 관리법',
          url: 'https://example.com/article5',
          content: '시니어들의 정신 건강을 위한 다양한 관리법이 소개되었습니다. 사회적 활동과 취미 생활이 중요하다고 강조했습니다. 우울증 예방과 인지 기능 유지를 위한 구체적인 방법들이 제시되었습니다.',
          source: 'Psychology Today',
          publishedAt: new Date().toISOString(),
          keywords: ['시니어', '마음', '건강'],
          summary: '시니어 마음 건강 관리법 소개',
          category: 'morning',
          timeSlot: 'morning',
          createdAt: new Date(),
          relevanceScore: 82
        },
        {
          id: '6',
          title: '오후 시니어 건강 뉴스',
          url: 'https://example.com/article6',
          content: '오후 시간대의 시니어 건강 관련 뉴스입니다. 다양한 건강 정보와 팁을 제공합니다. 전문가들의 조언과 실제 사례를 통해 시니어들이 실천할 수 있는 건강 관리 방법을 소개합니다.',
          source: 'Evening Health',
          publishedAt: new Date().toISOString(),
          keywords: ['시니어', '건강', '오후'],
          summary: '오후 시니어 건강 뉴스',
          category: 'evening',
          timeSlot: 'evening',
          createdAt: new Date(),
          relevanceScore: 90
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

  const loadAutomationStatus = async () => {
    // 자동화 상태 로드 (실제 구현에서는 API 호출)
    setAutomationStatus({
      morning: { 
        lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
        isRunning: false, 
        articleCount: 5 
      },
      evening: { 
        lastRun: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5시간 전
        isRunning: false, 
        articleCount: 3 
      },
      now: {
        lastRun: null,
        isRunning: false,
        articleCount: 0
      }
    });
  };

  // 뉴스 자동화 실행
  const runNewsAutomation = async (timeSlot: 'morning' | 'evening' | 'now') => {
    if (!user) return;

    setAutomationStatus(prev => ({
      ...prev,
      [timeSlot]: { ...prev[timeSlot], isRunning: true }
    }));

    try {
      let response;
      
      if (timeSlot === 'now') {
        // 실시간 뉴스 검색 (5시간 전부터 현재까지)
        console.log('🚀 실시간 뉴스 검색 시작');
        console.log('📤 API 요청 데이터:', {
          keywords: ['노인 건강', '시니어 건강'],
          fromDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          toDate: new Date().toISOString(),
          limit: 10
        });
        
        response = await fetch('/api/news/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keywords: ['노인 건강', '시니어 건강'],
            fromDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5시간 전
            toDate: new Date().toISOString(), // 현재
            limit: 10
          }),
        });
        
        console.log('📡 API 응답 상태:', response.status);
      } else {
        // 기존 자동화 (오전/오후)
        response = await fetch('/api/automation/news-daily', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            timeSlot
          }),
        });
      }

      const data = await response.json();
      
      console.log('📥 API 응답 데이터:', data);
      console.log('📊 응답 상세 정보:', {
        status: data.status,
        totalCount: data.totalCount,
        articlesLength: data.articles?.length || 0,
        firstArticle: data.articles?.[0] || '없음',
        keywords: data.keywords,
        fromDate: data.fromDate,
        toDate: data.toDate
      });
      
      if (response.ok) {
        if (timeSlot === 'now') {
          // 실시간 검색 결과를 기사 목록에 추가
          console.log('✅ 실시간 뉴스 검색 성공, 기사 수:', data.articles?.length || 0);
          
          const realTimeArticles = data.articles.map((article: any, index: number) => ({
            id: `realtime-${index}`,
            title: article.title,
            url: article.url,
            content: article.content || article.description,
            source: article.source.name,
            publishedAt: article.publishedAt,
            keywords: ['노인 건강', '시니어 건강'],
            summary: article.description || article.content?.substring(0, 200) + '...',
            category: 'realtime',
            timeSlot: 'now',
            createdAt: new Date(),
            relevanceScore: Math.floor(Math.random() * 20) + 80 // 80-100 사이
          }));
          
          console.log('📝 처리된 실시간 기사들:', realTimeArticles);
          
          setNewsArticles(prev => [...realTimeArticles, ...prev]);
          toast.success(`실시간 뉴스 검색 완료! ${realTimeArticles.length}개 기사를 찾았습니다.`);
        } else {
          toast.success(`${timeSlot === 'morning' ? '오전' : '오후'} 뉴스 자동화가 완료되었습니다!`);
        }
        loadNewsArticles(); // 기사 목록 새로고침
        loadAutomationStatus(); // 상태 새로고침
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(timeSlot === 'now' ? '실시간 뉴스 검색에 실패했습니다.' : '뉴스 자동화에 실패했습니다.');
      console.error(error);
    } finally {
      setAutomationStatus(prev => ({
        ...prev,
        [timeSlot]: { ...prev[timeSlot], isRunning: false }
      }));
    }
  };

  // 기사 미리보기
  const handlePreviewArticle = (article: NewsArticle) => {
    setPreviewArticle(article);
    setShowPreviewModal(true);
  };

  // 기사 선택/해제
  const handleToggleArticleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // 선택된 기사들로 숏츠 스크립트 초안 생성
  const handleCreateShortsDrafts = async () => {
    if (selectedArticles.size === 0) {
      toast.error('선택된 기사가 없습니다.');
      return;
    }

    setGeneratingScript(true);
    try {
      const selectedArticleList = newsArticles.filter(article => selectedArticles.has(article.id));
      
      for (const article of selectedArticleList) {
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
          // 게시판에 숏츠 스크립트 초안 등록
          await saveShortsDraftToBulletin(article, data);
        }
      }

      toast.success(`${selectedArticles.size}개의 숏츠 스크립트 초안이 생성되었습니다!`);
      setSelectedArticles(new Set());
      setShowSelectionMode(false);
    } catch (error) {
      toast.error('숏츠 스크립트 초안 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setGeneratingScript(false);
    }
  };

  // 숏츠 스크립트 초안을 게시판에 저장
  const saveShortsDraftToBulletin = async (article: NewsArticle, scriptData: any) => {
    try {
      const response = await fetch('/api/news/create-shorts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[숏츠 초안] ${article.keywords.slice(0, 2).join(', ')} - ${article.title}`,
          content: `## 숏츠 스크립트 초안

**원본 기사**: ${article.title}
**출처**: ${article.source}
**키워드**: ${article.keywords.join(', ')}

### 오프닝
${scriptData.opening}

### 본론
${scriptData.mainContent}

### 클로징
${scriptData.closing}

### 제작 정보
- 재생 시간: ${scriptData.totalDuration}
- 스타일: 친근한 톤
- 대상: 시니어 건강 관심층`,
          bulletinId: 'shorts-drafts', // 숏츠 초안 전용 게시판 ID
          userId: user?.uid
        }),
      });

      if (!response.ok) {
        throw new Error('게시판 저장 실패');
      }
    } catch (error) {
      console.error('숏츠 초안 저장 오류:', error);
      throw error;
    }
  };

  // 숏츠 스크립트 생성 (기존 기능)
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

  const getTimeSlotArticles = (timeSlot: 'morning' | 'evening' | 'now') => {
    return newsArticles
      .filter(article => article.timeSlot === timeSlot)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 5);
  };

  const getTimeSlotStatus = (timeSlot: 'morning' | 'evening' | 'now') => {
    return automationStatus[timeSlot];
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => runNewsAutomation('morning')}
          disabled={automationStatus.morning.isRunning}
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <NewspaperIcon className="h-8 w-8 text-blue-600" />
          <div className="text-left flex-1">
            <h4 className="font-semibold text-gray-900">오전 뉴스 자동화</h4>
            <p className="text-sm text-gray-600">매일 오전 6시 뉴스 검색 및 요약</p>
            {automationStatus.morning.lastRun && (
              <p className="text-xs text-gray-500 mt-1">
                마지막 실행: {formatDate(automationStatus.morning.lastRun)}
              </p>
            )}
          </div>
          {automationStatus.morning.isRunning && (
            <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
          )}
        </button>

        <button
          onClick={() => runNewsAutomation('evening')}
          disabled={automationStatus.evening.isRunning}
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <NewspaperIcon className="h-8 w-8 text-green-600" />
          <div className="text-left flex-1">
            <h4 className="font-semibold text-gray-900">오후 뉴스 자동화</h4>
            <p className="text-sm text-gray-600">매일 오후 6시 뉴스 검색 및 요약</p>
            {automationStatus.evening.lastRun && (
              <p className="text-xs text-gray-500 mt-1">
                마지막 실행: {formatDate(automationStatus.evening.lastRun)}
              </p>
            )}
          </div>
          {automationStatus.evening.isRunning && (
            <ArrowPathIcon className="h-5 w-5 animate-spin text-green-600" />
          )}
        </button>

        <button
          onClick={() => runNewsAutomation('now')}
          disabled={automationStatus.now.isRunning}
          className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-orange-200"
        >
          <BoltIcon className="h-8 w-8 text-orange-600" />
          <div className="text-left flex-1">
            <h4 className="font-semibold text-gray-900">지금 검색</h4>
            <p className="text-sm text-gray-600">현재 시점 기준 5시간 전 뉴스 검색</p>
            {automationStatus.now.lastRun && (
              <p className="text-xs text-gray-500 mt-1">
                마지막 실행: {formatDate(automationStatus.now.lastRun)}
              </p>
            )}
          </div>
          {automationStatus.now.isRunning && (
            <ArrowPathIcon className="h-5 w-5 animate-spin text-orange-600" />
          )}
        </button>
      </div>

      {/* 뉴스 기사 선택 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <VideoCameraIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">어떤 뉴스를 활용하여 숏츠를 제작하시겠습니까?</h3>
        </div>
        <p className="text-blue-700 text-sm">
          기사를 클릭하여 미리보기 후, 선택 버튼을 눌러 숏츠 스크립트 초안을 생성할 수 있습니다.
        </p>
      </div>

      {/* 선택 모드 토글 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CheckIcon className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">선택 모드</span>
        </div>
        <button
          onClick={() => setShowSelectionMode(!showSelectionMode)}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            showSelectionMode 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showSelectionMode ? '선택 모드 종료' : '선택 모드 시작'}
        </button>
      </div>

      {/* 선택된 기사들로 숏츠 생성 버튼 */}
      {showSelectionMode && selectedArticles.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VideoCameraIcon className="h-5 w-5 text-purple-600" />
              <span className="text-purple-900 font-medium">
                {selectedArticles.size}개 기사 선택됨
              </span>
            </div>
            <button
              onClick={handleCreateShortsDrafts}
              disabled={generatingScript}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {generatingScript ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              {generatingScript ? '생성 중...' : '숏츠 초안 생성'}
            </button>
          </div>
        </div>
      )}

      {/* 실시간 뉴스 결과 */}
      {getTimeSlotArticles('now').length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">실시간 뉴스 결과</h3>
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">
                {getTimeSlotArticles('now').length}개 기사
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTimeSlotArticles('now').map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border-l-4 border-orange-500">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">
                        실시간 {article.relevanceScore}%
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-orange-600"
                        onClick={() => handlePreviewArticle(article)}>
                      {article.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-3">{article.summary}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* 키워드 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {article.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {showSelectionMode && (
                    <button
                      onClick={() => handleToggleArticleSelection(article.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedArticles.has(article.id)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedArticles.has(article.id) ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CheckIcon className="h-4 w-4" />
                      )}
                      {selectedArticles.has(article.id) ? '선택됨' : '선택'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => generateShortsScript(article)}
                    disabled={generatingScript}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                    {generatingScript ? '생성 중...' : '숏츠 생성'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오전 뉴스 결과 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">오전 뉴스 결과</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
              {getTimeSlotArticles('morning').length}개 기사
            </span>
          </div>
        </div>
        
        {getTimeSlotArticles('morning').length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <NewspaperIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">오전 뉴스 기사가 없습니다</h4>
            <p className="text-gray-500">오전 자동화를 실행하여 뉴스 기사를 수집해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTimeSlotArticles('morning').map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                        관련도 {article.relevanceScore}%
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-blue-600"
                        onClick={() => handlePreviewArticle(article)}>
                      {article.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-3">{article.summary}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* 키워드 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {article.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {showSelectionMode && (
                    <button
                      onClick={() => handleToggleArticleSelection(article.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedArticles.has(article.id)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedArticles.has(article.id) ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CheckIcon className="h-4 w-4" />
                      )}
                      {selectedArticles.has(article.id) ? '선택됨' : '선택'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => generateShortsScript(article)}
                    disabled={generatingScript}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                    {generatingScript ? '생성 중...' : '숏츠 생성'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오후 뉴스 결과 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">오후 뉴스 결과</h3>
            <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
              {getTimeSlotArticles('evening').length}개 기사
            </span>
          </div>
        </div>
        
        {getTimeSlotArticles('evening').length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <NewspaperIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">오후 뉴스 기사가 없습니다</h4>
            <p className="text-gray-500">오후 자동화를 실행하여 뉴스 기사를 수집해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTimeSlotArticles('evening').map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                        관련도 {article.relevanceScore}%
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-green-600"
                        onClick={() => handlePreviewArticle(article)}>
                      {article.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-3">{article.summary}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* 키워드 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {article.keywords.slice(0, 3).map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  {showSelectionMode && (
                    <button
                      onClick={() => handleToggleArticleSelection(article.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedArticles.has(article.id)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedArticles.has(article.id) ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CheckIcon className="h-4 w-4" />
                      )}
                      {selectedArticles.has(article.id) ? '선택됨' : '선택'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => generateShortsScript(article)}
                    disabled={generatingScript}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                    {generatingScript ? '생성 중...' : '숏츠 생성'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 기사 미리보기 모달 */}
      {showPreviewModal && previewArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <NewspaperIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold">기사 미리보기</h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{previewArticle.title}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>{previewArticle.source}</span>
                  <span>•</span>
                  <span>{formatDate(previewArticle.createdAt)}</span>
                  <span>•</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                    관련도 {previewArticle.relevanceScore}%
                  </span>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 mb-2">요약</h5>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700">{previewArticle.summary}</p>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 mb-2">전문 내용</h5>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">{previewArticle.content}</p>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-gray-900 mb-2">키워드</h5>
                <div className="flex flex-wrap gap-2">
                  {previewArticle.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                뒤로 가기
              </button>
              <button
                onClick={() => {
                  handleToggleArticleSelection(previewArticle.id);
                  setShowPreviewModal(false);
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedArticles.has(previewArticle.id)
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedArticles.has(previewArticle.id) ? '선택 해제' : '선택하기'}
              </button>
            </div>
          </div>
        </div>
      )}

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