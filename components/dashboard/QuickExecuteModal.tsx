'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  FileText,
  Newspaper,
  Sparkles,
  Settings,
  Calendar
} from 'lucide-react';

interface QuickExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExecutionStatus {
  crawling: 'idle' | 'running' | 'success' | 'error';
  scriptGeneration: 'idle' | 'running' | 'success' | 'error';
  crawlingResult?: {
    totalArticles: number;
    newArticles: number;
    duplicateArticles: number;
    sections: number;
  };
  scriptResult?: {
    generatedScripts: number;
    totalArticles: number;
  };
}

const QuickExecuteModal: React.FC<QuickExecuteModalProps> = ({ isOpen, onClose }) => {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({
    crawling: 'idle',
    scriptGeneration: 'idle'
  });
  
  const [settings, setSettings] = useState({
    crawlSections: ['sisa', 'spo', 'ent', 'pol', 'eco', 'soc', 'int', 'its'],
    crawlLimit: 5,
    generateScripts: true,
    aiProvider: 'google' as 'google' | 'openai' | 'anthropic',
    aiModel: 'gemini-pro',
    forceRegenerate: false
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 섹션별 이름 매핑
  const sectionNames: { [key: string]: string } = {
    'sisa': '시사',
    'spo': '스포츠',
    'ent': '연예',
    'pol': '정치',
    'eco': '경제',
    'soc': '사회',
    'int': '세계',
    'its': '과학'
  };

  // 섹션 선택 토글
  const toggleSection = (section: string) => {
    setSettings(prev => ({
      ...prev,
      crawlSections: prev.crawlSections.includes(section)
        ? prev.crawlSections.filter(s => s !== section)
        : [...prev.crawlSections, section]
    }));
  };

  // 전체 섹션 선택/해제
  const toggleAllSections = () => {
    setSettings(prev => ({
      ...prev,
      crawlSections: prev.crawlSections.length === 8 ? [] : ['sisa', 'spo', 'ent', 'pol', 'eco', 'soc', 'int', 'its']
    }));
  };

  // 자동 크롤링 실행
  const executeCrawling = async () => {
    try {
      setExecutionStatus(prev => ({ ...prev, crawling: 'running' }));
      
      const response = await fetch('/api/news/auto-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sections: settings.crawlSections,
          limit: settings.crawlLimit
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExecutionStatus(prev => ({
          ...prev,
          crawling: 'success',
          crawlingResult: {
            totalArticles: data.totalArticles,
            newArticles: data.newArticles,
            duplicateArticles: data.duplicateArticles,
            sections: data.sections
          }
        }));
      } else {
        throw new Error('크롤링 실행 실패');
      }
    } catch (error) {
      console.error('크롤링 오류:', error);
      setExecutionStatus(prev => ({ ...prev, crawling: 'error' }));
    }
  };

  // 스크립트 생성 실행
  const executeScriptGeneration = async () => {
    try {
      setExecutionStatus(prev => ({ ...prev, scriptGeneration: 'running' }));
      
      const response = await fetch('/api/news/generate-shorts-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          section: settings.crawlSections.length === 1 ? settings.crawlSections[0] : undefined,
          limit: settings.crawlLimit * 2,
          forceRegenerate: settings.forceRegenerate,
          aiProvider: settings.aiProvider,
          aiModel: settings.aiModel
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExecutionStatus(prev => ({
          ...prev,
          scriptGeneration: 'success',
          scriptResult: {
            generatedScripts: data.generatedScripts,
            totalArticles: data.totalArticles
          }
        }));
      } else {
        throw new Error('스크립트 생성 실패');
      }
    } catch (error) {
      console.error('스크립트 생성 오류:', error);
      setExecutionStatus(prev => ({ ...prev, scriptGeneration: 'error' }));
    }
  };

  // 전체 실행 (크롤링 + 스크립트 생성)
  const executeAll = async () => {
    try {
      // 1단계: 크롤링 실행
      await executeCrawling();
      
      // 2단계: 크롤링 성공 시 스크립트 생성
      if (executionStatus.crawling === 'success' && settings.generateScripts) {
        // 잠시 대기 후 스크립트 생성
        setTimeout(() => {
          executeScriptGeneration();
        }, 2000);
      }
    } catch (error) {
      console.error('전체 실행 오류:', error);
    }
  };

  // 상태별 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '완료';
      case 'error':
        return '오류';
      case 'running':
        return '실행 중';
      default:
        return '대기 중';
    }
  };

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setExecutionStatus({
        crawling: 'idle',
        scriptGeneration: 'idle'
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-800">즉시 실행</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 설정 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 크롤링 설정 */}
          <div className="space-y-4">
                         <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
               <Newspaper className="w-5 h-5 text-blue-600" />
               <span>뉴스 크롤링 설정</span>
             </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크롤링할 섹션
              </label>
              <div className="space-y-2">
                <button
                  onClick={toggleAllSections}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  {settings.crawlSections.length === 8 ? '전체 해제' : '전체 선택'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(sectionNames).map(([code, name]) => (
                    <label key={code} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.crawlSections.includes(code)}
                        onChange={() => toggleSection(code)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                섹션당 기사 수
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.crawlLimit}
                onChange={(e) => setSettings(prev => ({ ...prev, crawlLimit: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 스크립트 생성 설정 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <span>스크립트 생성 설정</span>
            </h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="generateScripts"
                checked={settings.generateScripts}
                onChange={(e) => setSettings(prev => ({ ...prev, generateScripts: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="generateScripts" className="text-sm font-medium text-gray-700">
                크롤링 후 자동으로 스크립트 생성
              </label>
            </div>

            {settings.generateScripts && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI 모델
                  </label>
                  <select
                    value={settings.aiProvider}
                    onChange={(e) => {
                      const provider = e.target.value as 'google' | 'openai' | 'anthropic';
                      setSettings(prev => ({
                        ...prev,
                        aiProvider: provider,
                        aiModel: provider === 'google' ? 'gemini-pro' : 
                                 provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3'
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    모델
                  </label>
                  <select
                    value={settings.aiModel}
                    onChange={(e) => setSettings(prev => ({ ...prev, aiModel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {settings.aiProvider === 'google' && (
                      <option value="gemini-pro">Gemini Pro</option>
                    )}
                    {settings.aiProvider === 'openai' && (
                      <>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                    {settings.aiProvider === 'anthropic' && (
                      <>
                        <option value="claude-3">Claude 3</option>
                        <option value="claude-2">Claude 2</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="forceRegenerate"
                    checked={settings.forceRegenerate}
                    onChange={(e) => setSettings(prev => ({ ...prev, forceRegenerate: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="forceRegenerate" className="text-sm font-medium text-gray-700">
                    기존 스크립트 재생성
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 실행 버튼들 */}
        <div className="flex flex-wrap gap-3 mb-6">
                     <button
             onClick={executeCrawling}
             disabled={executionStatus.crawling === 'running' || settings.crawlSections.length === 0}
             className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             <Newspaper className="w-4 h-4" />
             <span>크롤링만 실행</span>
           </button>

          {settings.generateScripts && (
            <button
              onClick={executeScriptGeneration}
              disabled={executionStatus.scriptGeneration === 'running'}
              className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>스크립트만 생성</span>
            </button>
          )}

          <button
            onClick={executeAll}
            disabled={executionStatus.crawling === 'running' || executionStatus.scriptGeneration === 'running' || settings.crawlSections.length === 0}
            className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>전체 실행</span>
          </button>
        </div>

        {/* 실행 상태 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">실행 상태</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 크롤링 상태 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">뉴스 크롤링</h4>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(executionStatus.crawling)}
                  <span className="text-sm font-medium">
                    {getStatusText(executionStatus.crawling)}
                  </span>
                </div>
              </div>
              
              {executionStatus.crawlingResult && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 기사:</span>
                    <span className="font-medium">{executionStatus.crawlingResult.totalArticles}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">새 기사:</span>
                    <span className="font-medium text-green-600">{executionStatus.crawlingResult.newArticles}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">중복 기사:</span>
                    <span className="font-medium text-orange-600">{executionStatus.crawlingResult.duplicateArticles}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">처리 섹션:</span>
                    <span className="font-medium">{executionStatus.crawlingResult.sections}개</span>
                  </div>
                </div>
              )}
            </div>

            {/* 스크립트 생성 상태 */}
            {settings.generateScripts && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">스크립트 생성</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(executionStatus.scriptGeneration)}
                    <span className="text-sm font-medium">
                      {getStatusText(executionStatus.scriptGeneration)}
                    </span>
                  </div>
                </div>
                
                {executionStatus.scriptResult && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">생성된 스크립트:</span>
                      <span className="font-medium text-green-600">{executionStatus.scriptResult.generatedScripts}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">처리된 기사:</span>
                      <span className="font-medium">{executionStatus.scriptResult.totalArticles}개</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 정보 박스 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">실행 가이드</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• <strong>크롤링만 실행</strong>: 선택한 섹션의 뉴스만 수집</li>
                <li>• <strong>스크립트만 생성</strong>: 기존 뉴스로 스크립트 생성</li>
                <li>• <strong>전체 실행</strong>: 크롤링 → 스크립트 생성 순차 실행</li>
                <li>• 크롤링 완료 후 자동으로 스크립트가 생성됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickExecuteModal; 