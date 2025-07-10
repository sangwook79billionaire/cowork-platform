'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  ClockIcon,
  UserIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface GoogleEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string;
  color: string;
  recurring: boolean;
  attendees: Array<{
    email: string;
    name: string;
    responseStatus: string;
  }>;
}

interface GoogleTask {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  due: string;
  listId: string;
  listTitle: string;
  position: string;
  status: string;
  parent: string;
}

interface GoogleIntegrationProps {
  onEventsImported?: (events: GoogleEvent[]) => void;
  onTasksImported?: (tasks: GoogleTask[]) => void;
  isMobile?: boolean;
}

export default function GoogleIntegration({ 
  onEventsImported, 
  onTasksImported, 
  isMobile = false 
}: GoogleIntegrationProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);

  // Google 연동 상태 확인
  useEffect(() => {
    const checkGoogleConnection = () => {
      const googleData = localStorage.getItem('googleAuth');
      if (googleData) {
        const parsed = JSON.parse(googleData);
        setIsConnected(true);
        setGoogleUser(parsed);
      }
    };

    checkGoogleConnection();
  }, []);

  // Google 로그인
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/auth?action=login');
      const data = await response.json();
      
      if (response.ok) {
        // 새 창에서 Google OAuth 열기
        const authWindow = window.open(data.authUrl, 'googleAuth', 'width=500,height=600');
        
        // 인증 완료 후 콜백 처리
        const checkAuth = setInterval(async () => {
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            // 인증 완료 후 토큰 저장
            const googleData = localStorage.getItem('googleAuth');
            if (googleData) {
              const parsed = JSON.parse(googleData);
              setIsConnected(true);
              setGoogleUser(parsed);
              toast.success('Google 계정이 연동되었습니다!');
            }
          }
        }, 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Google 연동에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Google 로그아웃
  const handleGoogleLogout = () => {
    localStorage.removeItem('googleAuth');
    setIsConnected(false);
    setGoogleUser(null);
    setEvents([]);
    setTasks([]);
    toast.success('Google 연동이 해제되었습니다.');
  };

  // Google Calendar 이벤트 가져오기
  const importGoogleEvents = async () => {
    if (!isConnected || !googleUser) return;

    setImporting(true);
    try {
      const response = await fetch(`/api/google/calendar?accessToken=${googleUser.accessToken}&email=${googleUser.email}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events);
        onEventsImported?.(data.events);
        toast.success(`${data.totalEvents}개의 캘린더 이벤트를 가져왔습니다!`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('캘린더 데이터 가져오기에 실패했습니다.');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  // Google Tasks 가져오기
  const importGoogleTasks = async () => {
    if (!isConnected || !googleUser) return;

    setImporting(true);
    try {
      const response = await fetch(`/api/google/tasks?accessToken=${googleUser.accessToken}&email=${googleUser.email}`);
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks);
        onTasksImported?.(data.tasks);
        toast.success(`${data.totalTasks}개의 할 일을 가져왔습니다!`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('할 일 데이터 가져오기에 실패했습니다.');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Google 계정 연동</h2>
        </div>
      </div>

      {/* 연결 상태 */}
      {!isConnected ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Google 계정 연동</h3>
            <p className="text-gray-500 mb-4">
              Google Calendar와 Tasks에서 데이터를 가져와서 플랫폼에 동기화할 수 있습니다.
            </p>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 mx-auto"
            >
              <CalendarIcon className="h-5 w-5" />
              {loading ? '연결 중...' : 'Google 계정 연결'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 연결된 계정 정보 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {googleUser?.picture && (
                  <img 
                    src={googleUser.picture} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">{googleUser?.name}</h4>
                  <p className="text-sm text-gray-600">{googleUser?.email}</p>
                </div>
              </div>
              <button
                onClick={handleGoogleLogout}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 데이터 가져오기 버튼들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={importGoogleEvents}
              disabled={importing}
              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">캘린더 가져오기</h4>
                <p className="text-sm text-gray-600">Google Calendar 이벤트</p>
              </div>
              {importing && <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />}
            </button>

            <button
              onClick={importGoogleTasks}
              disabled={importing}
              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">할 일 가져오기</h4>
                <p className="text-sm text-gray-600">Google Tasks</p>
              </div>
              {importing && <ArrowPathIcon className="h-5 w-5 animate-spin text-green-600" />}
            </button>
          </div>

          {/* 가져온 데이터 미리보기 */}
          {(events.length > 0 || tasks.length > 0) && (
            <div className="space-y-4">
              {events.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">가져온 캘린더 이벤트 ({events.length}개)</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {events.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: event.color }}
                        />
                        <span className="text-sm font-medium">{event.title}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {events.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        외 {events.length - 5}개 더...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {tasks.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">가져온 할 일 ({tasks.length}개)</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{task.title}</span>
                        <span className="text-xs text-gray-500">{task.listTitle}</span>
                      </div>
                    ))}
                    {tasks.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        외 {tasks.length - 5}개 더...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 