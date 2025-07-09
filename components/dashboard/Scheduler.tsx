'use client';

import React, { useState, useEffect } from 'react';
import { ScheduledTask, TaskExecution } from '@/types/schedule';
import { calculateNextRun, validateSchedule } from '@/lib/scheduler';
import { addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { 
  ClockIcon, 
  CalendarIcon, 
  PlayIcon, 
  PauseIcon, 
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface SchedulerProps {
  isMobile?: boolean;
}

export default function Scheduler({ isMobile = false }: SchedulerProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);
  const [loading, setLoading] = useState(false);

  // 새 작업 폼 상태
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    topic: '',
    style: '일반적인',
    length: '중간',
    scheduleType: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    targetBulletinId: '',
    isActive: true
  });

  const styles = ['일반적인', '학술적인', '창의적인', '비즈니스', '친근한', '전문적인'];
  const lengths = ['짧은', '중간', '긴', '매우 긴'];
  const weekDays = [
    { value: 0, label: '일요일' },
    { value: 1, label: '월요일' },
    { value: 2, label: '화요일' },
    { value: 3, label: '수요일' },
    { value: 4, label: '목요일' },
    { value: 5, label: '금요일' },
    { value: 6, label: '토요일' }
  ];

  // 작업 목록 로드
  useEffect(() => {
    if (!user) return;

    const tasksQuery = query(
      collection(db, 'scheduledTasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScheduledTask[];
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [user]);

  // 실행 기록 로드
  useEffect(() => {
    if (!user) return;

    const executionsQuery = query(
      collection(db, 'taskExecutions'),
      where('taskId', 'in', tasks.map(t => t.id)),
      orderBy('executedAt', 'desc')
    );

    const unsubscribe = onSnapshot(executionsQuery, (snapshot) => {
      const executionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaskExecution[];
      setExecutions(executionsData);
    });

    return () => unsubscribe();
  }, [user, tasks]);

  const handleCreateTask = async () => {
    if (!user) return;

    // 유효성 검사
    if (!newTask.title.trim() || !newTask.topic.trim()) {
      toast.error('제목과 주제를 입력해주세요.');
      return;
    }

    const schedule = {
      type: newTask.scheduleType,
      time: newTask.time,
      daysOfWeek: newTask.scheduleType === 'weekly' ? newTask.daysOfWeek : undefined,
      dayOfMonth: newTask.scheduleType === 'monthly' ? newTask.dayOfMonth : undefined
    };

    if (!validateSchedule(schedule)) {
      toast.error('스케줄 설정이 올바르지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        topic: newTask.topic,
        style: newTask.style,
        length: newTask.length,
        schedule,
        targetBulletinId: newTask.targetBulletinId || null,
        isActive: newTask.isActive,
        nextRun: calculateNextRun({
          ...newTask,
          schedule,
          nextRun: new Date(),
          id: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.uid
        } as ScheduledTask),
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'scheduledTasks'), taskData);
      
      // 폼 초기화
      setNewTask({
        title: '',
        description: '',
        topic: '',
        style: '일반적인',
        length: '중간',
        scheduleType: 'daily',
        time: '09:00',
        daysOfWeek: [],
        dayOfMonth: 1,
        targetBulletinId: '',
        isActive: true
      });
      
      setShowCreateModal(false);
      toast.success('반복 작업이 생성되었습니다!');
    } catch (error) {
      console.error('Task creation failed:', error);
      toast.error('작업 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'scheduledTasks', taskId), {
        isActive: !isActive,
        updatedAt: serverTimestamp()
      });
      toast.success(isActive ? '작업이 일시정지되었습니다.' : '작업이 활성화되었습니다.');
    } catch (error) {
      console.error('Task toggle failed:', error);
      toast.error('작업 상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('정말로 이 작업을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'scheduledTasks', taskId));
      toast.success('작업이 삭제되었습니다.');
    } catch (error) {
      console.error('Task deletion failed:', error);
      toast.error('작업 삭제에 실패했습니다.');
    }
  };

  const handleViewExecution = (execution: TaskExecution) => {
    setSelectedExecution(execution);
    setShowExecutionModal(true);
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

  const getTaskStatus = (task: ScheduledTask) => {
    if (!task.isActive) return '일시정지';
    const now = new Date();
    const nextRun = new Date(task.nextRun);
    return nextRun <= now ? '실행 예정' : '대기 중';
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">반복 작업 관리</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <PlusIcon className="h-5 w-5" />
          새 작업 생성
        </button>
      </div>

      {/* 작업 목록 */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">반복 작업이 없습니다</h3>
            <p className="text-gray-500">새로운 반복 작업을 생성해보세요.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      getTaskStatus(task) === '일시정지' 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {getTaskStatus(task)}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">주제:</span>
                      <span className="ml-2 text-gray-600">{task.topic}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">스타일:</span>
                      <span className="ml-2 text-gray-600">{task.style}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">길이:</span>
                      <span className="ml-2 text-gray-600">{task.length}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-500">
                    <span className="font-medium">다음 실행:</span>
                    <span className="ml-2">{formatDate(task.nextRun)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTask(task.id, task.isActive)}
                    className={`p-2 rounded-md ${
                      task.isActive 
                        ? 'text-orange-600 hover:bg-orange-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={task.isActive ? '일시정지' : '활성화'}
                  >
                    {task.isActive ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    title="삭제"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 실행 기록 */}
      {executions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실행 기록</h3>
          <div className="space-y-2">
            {executions.slice(0, 10).map((execution) => (
              <div key={execution.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {execution.status === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {tasks.find(t => t.id === execution.taskId)?.title || '알 수 없는 작업'}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(execution.executedAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewExecution(execution)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    title="상세 보기"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 새 작업 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">새 반복 작업 생성</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    작업 제목 *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="작업 제목을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    주제 *
                  </label>
                  <input
                    type="text"
                    value={newTask.topic}
                    onChange={(e) => setNewTask({ ...newTask, topic: e.target.value })}
                    placeholder="AI가 생성할 글의 주제"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="작업에 대한 설명 (선택사항)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스타일
                  </label>
                  <select
                    value={newTask.style}
                    onChange={(e) => setNewTask({ ...newTask, style: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {styles.map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    길이
                  </label>
                  <select
                    value={newTask.length}
                    onChange={(e) => setNewTask({ ...newTask, length: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {lengths.map((length) => (
                      <option key={length} value={length}>{length}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    실행 시간
                  </label>
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반복 주기
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="daily"
                      checked={newTask.scheduleType === 'daily'}
                      onChange={(e) => setNewTask({ ...newTask, scheduleType: e.target.value as any })}
                      className="mr-2"
                    />
                    매일
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="weekly"
                      checked={newTask.scheduleType === 'weekly'}
                      onChange={(e) => setNewTask({ ...newTask, scheduleType: e.target.value as any })}
                      className="mr-2"
                    />
                    매주
                  </label>
                  
                  {newTask.scheduleType === 'weekly' && (
                    <div className="ml-6 space-y-2">
                      {weekDays.map((day) => (
                        <label key={day.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newTask.daysOfWeek.includes(day.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({
                                  ...newTask,
                                  daysOfWeek: [...newTask.daysOfWeek, day.value]
                                });
                              } else {
                                setNewTask({
                                  ...newTask,
                                  daysOfWeek: newTask.daysOfWeek.filter(d => d !== day.value)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          {day.label}
                        </label>
                      ))}
                    </div>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="monthly"
                      checked={newTask.scheduleType === 'monthly'}
                      onChange={(e) => setNewTask({ ...newTask, scheduleType: e.target.value as any })}
                      className="mr-2"
                    />
                    매월
                  </label>
                  
                  {newTask.scheduleType === 'monthly' && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        일자
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newTask.dayOfMonth}
                        onChange={(e) => setNewTask({ ...newTask, dayOfMonth: parseInt(e.target.value) })}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleCreateTask}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 실행 기록 상세 모달 */}
      {showExecutionModal && selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">실행 기록 상세</h3>
            
            <div className="space-y-4">
              <div>
                <span className="font-medium text-gray-700">상태:</span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  selectedExecution.status === 'success' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {selectedExecution.status === 'success' ? '성공' : '실패'}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">실행 시간:</span>
                <span className="ml-2 text-gray-600">{formatDate(selectedExecution.executedAt)}</span>
              </div>
              
              {selectedExecution.errorMessage && (
                <div>
                  <span className="font-medium text-gray-700">오류 메시지:</span>
                  <p className="mt-1 text-red-600">{selectedExecution.errorMessage}</p>
                </div>
              )}
              
              {selectedExecution.content && (
                <div>
                  <span className="font-medium text-gray-700">생성된 내용:</span>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">{selectedExecution.content}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowExecutionModal(false)}
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