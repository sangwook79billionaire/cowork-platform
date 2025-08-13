'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Zap,
  Brain
} from 'lucide-react';

interface TestResponse {
  success: boolean;
  message: string;
  response?: {
    content: string;
    provider: string;
    model: string;
    usage?: any;
  };
  error?: string;
  troubleshooting?: any;
}

const GeminiAITester: React.FC = () => {
  const [prompt, setPrompt] = useState('안녕하세요! 간단한 테스트입니다.');
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  // Gemini AI 상태 확인
  const checkGeminiStatus = async () => {
    try {
      setStatus('checking');
      const response = await fetch('/api/test/gemini');
      const data = await response.json();
      
      if (data.success && data.available) {
        setStatus('available');
      } else {
        setStatus('unavailable');
      }
    } catch (error) {
      console.error('상태 확인 실패:', error);
      setStatus('unavailable');
    }
  };

  // Gemini AI 테스트
  const testGemini = async () => {
    try {
      setLoading(true);
      setResponse(null);
      
      const response = await fetch('/api/test/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
      
      const data = await response.json();
      setResponse(data);
      
    } catch (error) {
      console.error('테스트 실패:', error);
      setResponse({
        success: false,
        message: '테스트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setLoading(false);
    }
  };

  // 프리셋 프롬프트
  const presetPrompts = [
    '안녕하세요! 간단한 테스트입니다.',
    '오늘 날씨에 대해 한 문장으로 설명해주세요.',
    '한국의 수도는 어디인가요?',
    '숏폼 동영상 스크립트를 작성하는 팁을 알려주세요.',
    'AI의 미래에 대해 간단히 설명해주세요.'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-800">Gemini AI 테스터</h2>
        </div>
        <button
          onClick={checkGeminiStatus}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>상태 확인</span>
        </button>
      </div>

      {/* 상태 표시 */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Gemini AI 상태:</span>
          {status === 'idle' && (
            <span className="text-sm text-gray-500">확인되지 않음</span>
          )}
          {status === 'checking' && (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-500">확인 중...</span>
            </div>
          )}
          {status === 'available' && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600">사용 가능</span>
            </div>
          )}
          {status === 'unavailable' && (
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">사용 불가</span>
            </div>
          )}
        </div>
        
        {status === 'unavailable' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Gemini AI 설정 필요</h4>
                <p className="text-sm text-red-700 mt-1">
                  Gemini AI를 사용하려면 API 키를 설정해야 합니다.
                </p>
                <div className="mt-2 text-sm text-red-600">
                  <p>1. <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>에서 API 키 생성</p>
                  <p>2. .env.local 파일에 GEMINI_API_KEY 추가</p>
                  <p>3. 서버 재시작</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 테스트 입력 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          테스트 프롬프트
        </label>
        <div className="flex space-x-2 mb-3">
          {presetPrompts.map((preset, index) => (
            <button
              key={index}
              onClick={() => setPrompt(preset)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              {preset.substring(0, 20)}...
            </button>
          ))}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Gemini AI에게 보낼 프롬프트를 입력하세요..."
        />
      </div>

      {/* 테스트 버튼 */}
      <div className="mb-6">
        <button
          onClick={testGemini}
          disabled={loading || status === 'unavailable'}
          className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>테스트 중...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Gemini AI 테스트</span>
            </>
          )}
        </button>
      </div>

      {/* 테스트 결과 */}
      {response && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            {response.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <h3 className="text-lg font-medium text-gray-800">
              {response.success ? '테스트 성공!' : '테스트 실패'}
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">{response.message}</p>
          
          {response.success && response.response && (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">AI 응답:</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{response.response.content}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">AI 제공자:</span>
                  <span className="ml-2 text-gray-900">{response.response.provider}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">모델:</span>
                  <span className="ml-2 text-gray-900">{response.response.model}</span>
                </div>
              </div>
            </div>
          )}
          
          {!response.success && response.troubleshooting && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">문제 해결 방법:</h4>
                             <ul className="text-sm text-yellow-700 space-y-1">
                 {Object.entries(response.troubleshooting).map(([key, value]) => (
                   <li key={key}>• {String(value)}</li>
                 ))}
               </ul>
            </div>
          )}
        </div>
      )}

      {/* 정보 박스 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start space-x-2">
          <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Gemini AI 정보</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• <strong>무료 할당량</strong>: 월 15회 요청</li>
              <li>• <strong>한국어 지원</strong>: 우수한 한국어 처리 능력</li>
              <li>• <strong>응답 속도</strong>: 빠른 응답 시간</li>
              <li>• <strong>비용</strong>: 무료 할당량 초과 시 $0.0005/1K 문자</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiAITester; 