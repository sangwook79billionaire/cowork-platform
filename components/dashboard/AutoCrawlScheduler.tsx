'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Calendar,
  BarChart3
} from 'lucide-react';

interface SchedulerStatus {
  isActive: boolean;
  nextRun: string;
  lastRun: string;
  lastStatus: 'success' | 'error' | 'running' | 'never';
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  schedules: Array<{
    time: string;
    description: string;
    cron: string;
  }>;
}

interface CrawlHistory {
  id: string;
  crawledAt: string;
  date: string;
  totalArticles: number;
  newArticles: number;
  duplicateArticles: number;
  sections: number;
  status: 'success' | 'error' | 'running';
  reason?: string;
}

const AutoCrawlScheduler: React.FC = () => {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [history, setHistory] = useState<CrawlHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualRunning, setManualRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    isActive: true,
    schedules: [
      { time: '09:00', description: '오전 뉴스 크롤링', cron: '0 9 * * *' },
      { time: '18:00', description: '오후 뉴스 크롤링', cron: '0 18 * * *' }
    ]
  });

  // 상태 조회
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scheduler/auto-crawl');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('스케줄러 상태 조회 실패:', error);
    }
  };

  // 이력 조회
  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/scheduler/auto-crawl/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('크롤링 이력 조회 실패:', error);
    }
  };

  // 수동 실행
  const runManualCrawl = async () => {
    try {
      setManualRunning(true);
      const response = await fetch('/api/scheduler/auto-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'manual' })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`수동 크롤링이 시작되었습니다.\n실행 ID: ${data.runId}`);
        // 상태 새로고침
        setTimeout(() => {
          fetchStatus();
          fetchHistory();
        }, 2000);
      } else {
        alert('수동 크롤링 실행에 실패했습니다.');
      }
    } catch (error) {
      console.error('수동 크롤링 실행 실패:', error);
      alert('수동 크롤링 실행 중 오류가 발생했습니다.');
    } finally {
      setManualRunning(false);
    }
  };

  // 설정 업데이트
  const updateSettings = async () => {
    try {
      const response = await fetch('/api/scheduler/auto-crawl', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('스케줄러 설정이 업데이트되었습니다.');
        setShowSettings(false);
        fetchStatus();
      } else {
        alert('설정 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
      alert('설정 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 시간 포맷팅
  const formatTime = (isoString: string) => {
    if (isoString === 'never') return '실행된 적 없음';
    return new Date(isoString).toLocaleString('ko-KR');
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
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '성공';
      case 'error':
        return '오류';
      case 'running':
        return '실행 중';
      default:
        return '알 수 없음';
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">자동 크롤링 스케줄러</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>설정</span>
          </button>
          <button
            onClick={runManualCrawl}
            disabled={manualRunning}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {manualRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{manualRunning ? '실행 중...' : '수동 실행'}</span>
          </button>
        </div>
      </div>

      {/* 현재 상태 */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">다음 실행</span>
            </div>
            <p className="text-lg font-semibold text-blue-900 mt-1">
              {formatTime(status.nextRun)}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">마지막 실행</span>
            </div>
            <p className="text-lg font-semibold text-green-900 mt-1">
              {formatTime(status.lastRun)}
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">성공률</span>
            </div>
            <p className="text-lg font-semibold text-purple-900 mt-1">
              {status.totalRuns > 0 
                ? Math.round((status.successRuns / status.totalRuns) * 100) 
                : 0}%
            </p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">마지막 상태</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon(status.lastStatus)}
              <span className="text-lg font-semibold text-orange-900">
                {getStatusText(status.lastStatus)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 스케줄 정보 */}
      {status && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">스케줄 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {status.schedules.map((schedule, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{schedule.description}</p>
                    <p className="text-sm text-gray-600">매일 {schedule.time}</p>
                  </div>
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {schedule.cron}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4">스케줄러 설정</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={settings.isActive}
                  onChange={(e) => setSettings({...settings, isActive: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  자동 크롤링 활성화
                </label>
              </div>

              {settings.schedules.map((schedule, index) => (
                <div key={index} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {schedule.description}
                  </label>
                  <input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => {
                      const newSchedules = [...settings.schedules];
                      newSchedules[index].time = e.target.value;
                      setSettings({...settings, schedules: newSchedules});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateSettings}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 최근 실행 이력 */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-3">최근 실행 이력</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  실행 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기사 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  새 기사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  섹션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.slice(0, 10).map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(item.crawledAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span className="text-sm text-gray-900">
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalArticles}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.newArticles}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.sections}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AutoCrawlScheduler; 