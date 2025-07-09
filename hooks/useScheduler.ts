import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export function useScheduler() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 스케줄러 실행 함수
  const executeScheduler = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();
      
      if (response.ok && data.executedCount > 0) {
        console.log(`Scheduler executed ${data.executedCount} tasks:`, data.results);
        // 여기서 알림을 표시하거나 다른 처리를 할 수 있습니다
      }
    } catch (error) {
      console.error('Scheduler execution failed:', error);
    }
  };

  // 스케줄러 상태 확인 함수
  const checkSchedulerStatus = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/scheduler?userId=${user.uid}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('Scheduler status:', data);
        return data;
      }
    } catch (error) {
      console.error('Scheduler status check failed:', error);
    }
  };

  // 스케줄러 시작
  const startScheduler = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 1분마다 스케줄러 실행
    intervalRef.current = setInterval(executeScheduler, 60000);
    
    // 즉시 한 번 실행
    executeScheduler();
  };

  // 스케줄러 중지
  const stopScheduler = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (user) {
      startScheduler();
    } else {
      stopScheduler();
    }

    return () => {
      stopScheduler();
    };
  }, [user]);

  return {
    executeScheduler,
    checkSchedulerStatus,
    startScheduler,
    stopScheduler
  };
} 