'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { TodoItem, CalendarEvent } from '@/types/firebase'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'

interface TodoListProps {
  onTodoCreated?: (calendarEvent: CalendarEvent) => void
}

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// 모의 데이터
const mockTodos: TodoItem[] = [
  {
    id: 'todo-1',
    title: '프로젝트 기획서 작성',
    description: '다음 주 미팅을 위한 기획서 완성',
    completed: false,
    priority: 'high',
    dueDate: new Date('2024-01-18'),
    userId: 'user-1',
    authorName: '윤수',
    tags: ['프로젝트', '기획'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'todo-2',
    title: '코드 리뷰',
    description: '팀원들의 PR 검토 및 피드백',
    completed: true,
    priority: 'medium',
    dueDate: new Date('2024-01-15'),
    userId: 'user-2',
    authorName: '상욱',
    tags: ['개발', '리뷰'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'todo-3',
    title: '회의록 정리',
    description: '오늘 미팅 내용 정리 및 공유',
    completed: false,
    priority: 'low',
    userId: 'user-1',
    authorName: '윤수',
    tags: ['회의', '문서'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
]

export function TodoList({ onTodoCreated }: TodoListProps) {
  const { user } = useAuth()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    tags: '',
    reminder: '0', // 알림 없음
  })

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    if (isTestMode) {
      setTodos(mockTodos)
      setLoading(false)
      return
    }

    try {
      const todosRef = collection(db, 'todos')
      const q = query(todosRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const fetchedTodos: TodoItem[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedTodos.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          completed: data.completed || false,
          priority: data.priority || 'medium',
          dueDate: data.dueDate?.toDate(),
          userId: data.userId,
          authorName: data.authorName,
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        })
      })
      
      setTodos(fetchedTodos)
    } catch (error) {
      console.error('할 일 데이터 가져오기 오류:', error)
      toast.error('할 일을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTodo = () => {
    setSelectedTodo(null)
    setTodoForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      tags: '',
      reminder: '0',
    })
    setShowTodoModal(true)
  }

  const handleEditTodo = (todo: TodoItem) => {
    setSelectedTodo(todo)
    setTodoForm({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.toISOString().split('T')[0] : '',
      tags: todo.tags ? todo.tags.join(', ') : '',
      reminder: todo.reminder || '0',
    })
    setShowTodoModal(true)
  }

  const handleToggleTodo = async (todoId: string) => {
    if (!user) return

    const todo = todos.find(t => t.id === todoId)
    if (!todo) return

    if (isTestMode) {
      setTodos(todos.map(t => 
        t.id === todoId ? { ...t, completed: !t.completed } : t
      ))
      toast.success(todo.completed ? '할 일을 미완료로 변경했습니다.' : '할 일을 완료했습니다.')
      return
    }

    try {
      await updateDoc(doc(db, 'todos', todoId), {
        completed: !todo.completed,
        updatedAt: serverTimestamp()
      })
      setTodos(todos.map(t => 
        t.id === todoId ? { ...t, completed: !t.completed } : t
      ))
      toast.success(todo.completed ? '할 일을 미완료로 변경했습니다.' : '할 일을 완료했습니다.')
    } catch (error) {
      toast.error('할 일 상태 변경에 실패했습니다.')
      console.error('Error updating todo:', error)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    if (!user) return

    if (isTestMode) {
      setTodos(todos.filter(t => t.id !== todoId))
      toast.success('할 일이 삭제되었습니다.')
      return
    }

    try {
      await deleteDoc(doc(db, 'todos', todoId))
      setTodos(todos.filter(t => t.id !== todoId))
      toast.success('할 일이 삭제되었습니다.')
    } catch (error) {
      toast.error('할 일 삭제에 실패했습니다.')
      console.error('Error deleting todo:', error)
    }
  }

  const handleSaveTodo = async () => {
    if (!user || !todoForm.title.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    const todoData = {
      title: todoForm.title,
      description: todoForm.description,
      completed: false,
      priority: todoForm.priority,
      dueDate: todoForm.dueDate ? new Date(todoForm.dueDate) : undefined,
      userId: user.uid,
      authorName: user.displayName || user.email || '익명',
      tags: todoForm.tags ? todoForm.tags.split(',').map(tag => tag.trim()) : [],
      reminder: todoForm.reminder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (isTestMode) {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        ...todoData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      // 할 일을 캘린더 이벤트로도 추가
      if (todoForm.dueDate) {
        const dueDate = new Date(todoForm.dueDate)
        const calendarEvent: CalendarEvent = {
          id: `event-from-todo-${Date.now()}`,
          title: `📋 ${todoForm.title}`,
          description: todoForm.description,
          startDate: dueDate,
          endDate: dueDate,
          allDay: true,
          userId: user.uid,
          authorName: user.displayName || user.email || '익명',
          color: '#10B981', // 초록색으로 할 일 표시
          location: '',
          reminder: todoForm.reminder,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        // 여기서는 캘린더 이벤트를 추가할 수 없으므로 콜백으로 처리
        if (onTodoCreated) {
          onTodoCreated(calendarEvent)
        }
      }
      
      setTodos([...todos, newTodo])
      setShowTodoModal(false)
      toast.success('할 일이 생성되었습니다.')
      return
    }

    try {
      const docRef = await addDoc(collection(db, 'todos'), todoData)
      
      // 할 일을 캘린더 이벤트로도 추가
      if (todoForm.dueDate) {
        const dueDate = new Date(todoForm.dueDate)
        const calendarEventData = {
          title: `📋 ${todoForm.title}`,
          description: todoForm.description,
          startDate: dueDate,
          endDate: dueDate,
          allDay: true,
          userId: user.uid,
          authorName: user.displayName || user.email || '익명',
          color: '#10B981', // 초록색으로 할 일 표시
          location: '',
          reminder: todoForm.reminder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        await addDoc(collection(db, 'calendarEvents'), calendarEventData)
      }
      
      const newTodo: TodoItem = {
        id: docRef.id,
        ...todoData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      setTodos([...todos, newTodo])
      setShowTodoModal(false)
      toast.success('할 일이 생성되었습니다.')
    } catch (error) {
      toast.error('할 일 저장에 실패했습니다.')
      console.error('Error saving todo:', error)
    }
  }

  const getFilteredTodos = () => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed)
      case 'completed':
        return todos.filter(todo => todo.completed)
      default:
        return todos
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '높음'
      case 'medium':
        return '보통'
      case 'low':
        return '낮음'
      default:
        return '보통'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const filteredTodos = getFilteredTodos()

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <CheckCircleIcon className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">할 일 목록</h1>
          </div>
          <button
            onClick={handleCreateTodo}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>할 일 추가</span>
          </button>
        </div>

        {/* 필터 */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-primary-100 text-primary-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            전체 ({todos.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'active' 
                ? 'bg-primary-100 text-primary-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            진행중 ({todos.filter(t => !t.completed).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'completed' 
                ? 'bg-primary-100 text-primary-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            완료 ({todos.filter(t => t.completed).length})
          </button>
        </div>
      </div>

      {/* 할 일 목록 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-3">
          {filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                todo.completed ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleToggleTodo(todo.id)}
                  className="flex-shrink-0 mt-1"
                >
                  {todo.completed ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400 hover:text-green-600" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium text-gray-900 ${
                        todo.completed ? 'line-through' : ''
                      }`}>
                        {todo.title}
                      </h3>
                      {todo.description && (
                        <p className={`text-sm text-gray-600 mt-1 ${
                          todo.completed ? 'line-through' : ''
                        }`}>
                          {todo.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(todo.priority)}`}>
                        {getPriorityText(todo.priority)}
                      </span>
                      <button
                        onClick={() => handleEditTodo(todo)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {todo.dueDate && (
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{formatDate(todo.dueDate)}</span>
                      </div>
                    )}
                    <span>{todo.authorName}</span>
                  </div>

                  {todo.tags && todo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {todo.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTodos.length === 0 && (
          <div className="text-center py-12">
            <CheckCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? '할 일이 없습니다' : 
               filter === 'active' ? '진행중인 할 일이 없습니다' : '완료된 할 일이 없습니다'}
            </h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? '새로운 할 일을 추가해보세요!' : 
               filter === 'active' ? '모든 할 일이 완료되었습니다!' : '완료된 할 일이 없습니다.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={handleCreateTodo}
                className="btn-primary"
              >
                할 일 추가하기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 할 일 모달 */}
      {showTodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {selectedTodo ? '할 일 수정' : '새 할 일'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={todoForm.title}
                  onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="할 일 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={todoForm.description}
                  onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="할 일 설명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  우선순위
                </label>
                <select
                  value={todoForm.priority}
                  onChange={(e) => setTodoForm({ ...todoForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마감일
                </label>
                <input
                  type="date"
                  value={todoForm.dueDate}
                  onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <input
                  type="text"
                  value={todoForm.tags}
                  onChange={(e) => setTodoForm({ ...todoForm, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="태그를 쉼표로 구분하여 입력"
                />
              </div>

              {/* 알림 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  알림
                </label>
                <select
                  value={todoForm.reminder}
                  onChange={(e) => setTodoForm({ ...todoForm, reminder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="0">알림 없음</option>
                  <option value="5">5분 전</option>
                  <option value="10">10분 전</option>
                  <option value="15">15분 전</option>
                  <option value="30">30분 전</option>
                  <option value="60">1시간 전</option>
                  <option value="1440">1일 전</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTodoModal(false)}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleSaveTodo}
                className="btn-primary"
              >
                {selectedTodo ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 