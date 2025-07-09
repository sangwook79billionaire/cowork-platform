import { ScheduledTask, TaskExecution } from '@/types/schedule';
import { generatePost } from './gemini';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

// 다음 실행 시간 계산
export function calculateNextRun(task: ScheduledTask): Date {
  const now = new Date();
  const [hours, minutes] = task.schedule.time.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  // 오늘 이미 지난 시간이면 다음 날로 설정
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  switch (task.schedule.type) {
    case 'daily':
      return nextRun;
      
    case 'weekly':
      if (task.schedule.daysOfWeek) {
        const currentDay = now.getDay();
        const nextDay = task.schedule.daysOfWeek.find(day => day > currentDay);
        
        if (nextDay !== undefined) {
          nextRun.setDate(nextRun.getDate() + (nextDay - currentDay));
        } else {
          // 다음 주 첫 번째 요일로 설정
          const firstDay = Math.min(...task.schedule.daysOfWeek);
          nextRun.setDate(nextRun.getDate() + (7 - currentDay + firstDay));
        }
      }
      return nextRun;
      
    case 'monthly':
      if (task.schedule.dayOfMonth) {
        nextRun.setDate(task.schedule.dayOfMonth);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      }
      return nextRun;
      
    default:
      return nextRun;
  }
}

// 실행해야 할 작업들 확인
export function getTasksToExecute(tasks: ScheduledTask[]): ScheduledTask[] {
  const now = new Date();
  return tasks.filter(task => {
    if (!task.isActive) return false;
    
    const nextRun = new Date(task.nextRun);
    return nextRun <= now;
  });
}

// 작업 실행
export async function executeTask(task: ScheduledTask): Promise<TaskExecution> {
  try {
    // Gemini API로 글 생성
    const content = await generatePost(task.topic, task.style, task.length);
    
    // 실행 기록 생성
    const execution: Omit<TaskExecution, 'id'> = {
      taskId: task.id,
      content,
      executedAt: new Date(),
      status: 'success'
    };
    
    // Firestore에 실행 기록 저장
    const executionRef = await addDoc(collection(db, 'taskExecutions'), {
      ...execution,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // 게시판에 자동 저장 (선택사항)
    if (task.targetBulletinId) {
      // 여기서 게시판에 저장하는 로직 구현
      console.log('Auto-saving to bulletin:', task.targetBulletinId);
    }
    
    // 작업의 마지막 실행 시간과 다음 실행 시간 업데이트
    const nextRun = calculateNextRun(task);
    await updateDoc(doc(db, 'scheduledTasks', task.id), {
      lastRun: serverTimestamp(),
      nextRun: nextRun,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: executionRef.id,
      ...execution
    };
    
  } catch (error) {
    console.error('Task execution failed:', error);
    
    // 실패 기록 생성
    const execution: Omit<TaskExecution, 'id'> = {
      taskId: task.id,
      content: '',
      executedAt: new Date(),
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
    
    const executionRef = await addDoc(collection(db, 'taskExecutions'), {
      ...execution,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: executionRef.id,
      ...execution
    };
  }
}

// 시간대 변환 유틸리티
export function convertToUserTimezone(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

export function convertFromUserTimezone(date: Date, timezone: string): Date {
  const utc = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
}

// 스케줄 유효성 검사
export function validateSchedule(schedule: ScheduledTask['schedule']): boolean {
  if (!schedule.time || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
    return false;
  }
  
  switch (schedule.type) {
    case 'daily':
      return true;
      
    case 'weekly':
      return !!(schedule.daysOfWeek && schedule.daysOfWeek.length > 0 &&
             schedule.daysOfWeek.every(day => day >= 0 && day <= 6));
      
    case 'monthly':
      return !!(schedule.dayOfMonth && schedule.dayOfMonth >= 1 && schedule.dayOfMonth <= 31);
      
    default:
      return false;
  }
} 