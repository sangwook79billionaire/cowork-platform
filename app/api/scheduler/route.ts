import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTasksToExecute, executeTask } from '@/lib/scheduler';
import { ScheduledTask } from '@/types/schedule';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 사용자의 모든 활성 작업 가져오기
    const tasksQuery = query(
      collection(db, 'scheduledTasks'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ScheduledTask[];

    // 실행해야 할 작업들 확인
    const tasksToExecute = getTasksToExecute(tasks);

    if (tasksToExecute.length === 0) {
      return NextResponse.json({ 
        message: '실행할 작업이 없습니다.',
        executedCount: 0 
      });
    }

    // 각 작업 실행
    const results = [];
    for (const task of tasksToExecute) {
      try {
        const result = await executeTask(task);
        results.push({
          taskId: task.id,
          taskTitle: task.title,
          status: result.status,
          content: result.content,
          errorMessage: result.errorMessage
        });
      } catch (error) {
        console.error(`Task execution failed for ${task.id}:`, error);
        results.push({
          taskId: task.id,
          taskTitle: task.title,
          status: 'failed',
          content: '',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `${results.length}개의 작업이 실행되었습니다.`,
      executedCount: results.length,
      results
    });

  } catch (error) {
    console.error('Scheduler execution failed:', error);
    return NextResponse.json({ error: '스케줄러 실행에 실패했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 사용자의 모든 작업 가져오기
    const tasksQuery = query(
      collection(db, 'scheduledTasks'),
      where('userId', '==', userId)
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ScheduledTask[];

    // 실행해야 할 작업들 확인
    const tasksToExecute = getTasksToExecute(tasks);

    return NextResponse.json({
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.isActive).length,
      tasksToExecute: tasksToExecute.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        isActive: task.isActive,
        nextRun: task.nextRun,
        lastRun: task.lastRun
      }))
    });

  } catch (error) {
    console.error('Scheduler status check failed:', error);
    return NextResponse.json({ error: '스케줄러 상태 확인에 실패했습니다.' }, { status: 500 });
  }
} 