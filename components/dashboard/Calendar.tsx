'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, orderBy, getDocs, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { CalendarEvent, TodoItem } from '@/types/firebase'
import toast from 'react-hot-toast'
import {
  CalendarIcon,
  PencilIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { useRef } from 'react'

interface CalendarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
}

type CalendarView = 'month' | 'week' | 'day' | 'list'

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// 모의 데이터
const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: '팀 미팅',
    description: '주간 진행상황 공유',
    startDate: new Date('2024-01-15T10:00:00'),
    endDate: new Date('2024-01-15T11:00:00'),
    allDay: false,
    userId: 'user-1',
    authorName: '윤수',
    color: '#3B82F6',
    location: '회의실 A',
    reminder: '15',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'event-2',
    title: '프로젝트 마감일',
    description: '첫 번째 프로토타입 완성',
    startDate: new Date('2024-01-20T00:00:00'),
    endDate: new Date('2024-01-20T23:59:59'),
    allDay: true,
    userId: 'user-2',
    authorName: '상욱',
    color: '#EF4444',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
]

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [selectedDateForTodo, setSelectedDateForTodo] = useState<Date | null>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    color: '#3B82F6',
    reminder: '15',
  })
  const [todoForm, setTodoForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    dueTime: '09:00',
    tags: '',
    reminder: '0',
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: Date } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    if (isTestMode) {
      setEvents(mockEvents)
      setLoading(false)
      return
    }

    try {
      const eventsRef = collection(db, 'calendarEvents')
      const q = query(eventsRef, orderBy('startDate', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const fetchedEvents: CalendarEvent[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedEvents.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          allDay: data.allDay || false,
          userId: data.userId,
          authorName: data.authorName,
          color: data.color || '#3B82F6',
          location: data.location,
          reminder: data.reminder,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        })
      })
      
      setEvents(fetchedEvents)
    } catch (error) {
      console.error('이벤트 데이터 가져오기 오류:', error)
      toast.error('이벤트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setEventForm({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '10:00',
      allDay: false,
      location: '',
      color: '#3B82F6',
      reminder: '15',
    })
    setShowEventModal(true)
  }

  const handleCreateTodo = (date?: Date) => {
    const targetDate = date || new Date()
    setSelectedDateForTodo(targetDate)
    setTodoForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: targetDate.toISOString().split('T')[0],
      dueTime: '09:00',
      tags: '',
      reminder: '0',
    })
    setShowTodoModal(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventForm({
      title: event.title,
      description: event.description || '',
      startDate: event.startDate.toISOString().split('T')[0],
      startTime: event.allDay ? '' : event.startDate.toTimeString().slice(0, 5),
      endDate: event.endDate.toISOString().split('T')[0],
      endTime: event.allDay ? '' : event.endDate.toTimeString().slice(0, 5),
      allDay: event.allDay,
      location: event.location || '',
      color: event.color || '#3B82F6',
      reminder: event.reminder || '15',
    })
    setShowEventModal(true)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return

    if (isTestMode) {
      setEvents(events.filter(e => e.id !== eventId))
      toast.success('이벤트가 삭제되었습니다.')
      return
    }

    try {
      await deleteDoc(doc(db, 'calendarEvents', eventId))
      setEvents(events.filter(e => e.id !== eventId))
      toast.success('이벤트가 삭제되었습니다.')
    } catch (error) {
      toast.error('이벤트 삭제에 실패했습니다.')
      console.error('Error deleting event:', error)
    }
  }

  const handleSaveEvent = async () => {
    if (!user || !eventForm.title.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    const startDateTime = eventForm.allDay 
      ? new Date(eventForm.startDate)
      : new Date(`${eventForm.startDate}T${eventForm.startTime}`)
    
    const endDateTime = eventForm.allDay
      ? new Date(eventForm.endDate)
      : new Date(`${eventForm.endDate}T${eventForm.endTime}`)

    if (startDateTime > endDateTime) {
      toast.error('종료 시간이 시작 시간보다 빠를 수 없습니다.')
      return
    }

    const eventData = {
      title: eventForm.title,
      description: eventForm.description,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: eventForm.allDay,
      userId: user.uid,
      authorName: user.displayName || user.email || '익명',
      color: eventForm.color,
      location: eventForm.location,
      reminder: eventForm.reminder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (isTestMode) {
      const newEvent: CalendarEvent = {
        id: selectedEvent?.id || `event-${Date.now()}`,
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      if (selectedEvent) {
        setEvents(events.map(e => e.id === selectedEvent.id ? newEvent : e))
      } else {
        setEvents([...events, newEvent])
      }
      
      setShowEventModal(false)
      toast.success(selectedEvent ? '이벤트가 수정되었습니다.' : '이벤트가 생성되었습니다.')
      return
    }

    try {
      if (selectedEvent) {
        await updateDoc(doc(db, 'calendarEvents', selectedEvent.id), eventData)
        // 타입 안전성을 위해 새로운 이벤트 객체를 생성
        const updatedEvent: CalendarEvent = {
          ...selectedEvent,
          ...eventData,
          createdAt: selectedEvent.createdAt,
          updatedAt: new Date(),
        }
        setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e))
        toast.success('이벤트가 수정되었습니다.')
      } else {
        const docRef = await addDoc(collection(db, 'calendarEvents'), eventData)
        const newEvent: CalendarEvent = {
          id: docRef.id,
          ...eventData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setEvents([...events, newEvent])
        toast.success('이벤트가 생성되었습니다.')
      }
      
      setShowEventModal(false)
    } catch (error) {
      toast.error('이벤트 저장에 실패했습니다.')
      console.error('Error saving event:', error)
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
      dueDate: todoForm.dueDate ? new Date(`${todoForm.dueDate}T${todoForm.dueTime}`) : undefined,
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
        dueDate: todoForm.dueDate ? new Date(`${todoForm.dueDate}T${todoForm.dueTime}`) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      // 할 일을 캘린더 이벤트로도 추가
      if (todoForm.dueDate) {
        const dueDateTime = new Date(`${todoForm.dueDate}T${todoForm.dueTime}`)
        const calendarEvent: CalendarEvent = {
          id: `event-from-todo-${Date.now()}`,
          title: `📋 ${todoForm.title}`,
          description: todoForm.description,
          startDate: dueDateTime,
          endDate: dueDateTime,
          allDay: false,
          userId: user.uid,
          authorName: user.displayName || user.email || '익명',
          color: '#10B981', // 초록색으로 할 일 표시
          location: '',
          reminder: todoForm.reminder,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setEvents([...events, calendarEvent])
      }
      
      setShowTodoModal(false)
      toast.success('할 일이 생성되었습니다.')
      return
    }

    try {
      const docRef = await addDoc(collection(db, 'todos'), todoData)
      
      // 할 일을 캘린더 이벤트로도 추가
      if (todoForm.dueDate) {
        const dueDateTime = new Date(`${todoForm.dueDate}T${todoForm.dueTime}`)
        const calendarEventData = {
          title: `📋 ${todoForm.title}`,
          description: todoForm.description,
          startDate: dueDateTime,
          endDate: dueDateTime,
          allDay: false,
          userId: user.uid,
          authorName: user.displayName || user.email || '익명',
          color: '#10B981', // 초록색으로 할 일 표시
          location: '',
          reminder: todoForm.reminder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        const eventDocRef = await addDoc(collection(db, 'calendarEvents'), calendarEventData)
        const newEvent: CalendarEvent = {
          id: eventDocRef.id,
          ...calendarEventData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setEvents([...events, newEvent])
      }
      
      setShowTodoModal(false)
      toast.success('할 일이 생성되었습니다.')
    } catch (error) {
      toast.error('할 일 저장에 실패했습니다.')
      console.error('Error saving todo:', error)
    }
  }

  const handleCreateEventWithDate = (date: Date) => {
    setSelectedEvent(null)
    setEventForm({
      title: '',
      description: '',
      startDate: date.toISOString().split('T')[0],
      startTime: '09:00',
      endDate: date.toISOString().split('T')[0],
      endTime: '10:00',
      allDay: false,
      location: '',
      color: '#3B82F6',
      reminder: '15',
    })
    setShowEventModal(true)
  }

  const generateICalFile = () => {
    const now = new Date()
    const calendarName = '윤수&상욱 공동작업장'
    
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//윤수&상욱 공동작업장//Calendar//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
      `X-WR-CALDESC:${calendarName} 캘린더`,
      ''
    ]

    // 이벤트 추가
    events.forEach((event) => {
      const startDate = event.startDate
      const endDate = event.endDate
      
      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@cowork-platform.com`,
        `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
        event.location ? `LOCATION:${event.location}` : '',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      )
    })

    icalContent.push('END:VCALENDAR')

    // 파일 다운로드
    const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${calendarName}_캘린더.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('캘린더 파일이 다운로드되었습니다.')
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      const checkDate = new Date(date)
      
      // 날짜만 비교 (시간 제외)
      checkDate.setHours(0, 0, 0, 0)
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(0, 0, 0, 0)
      
      return checkDate >= eventStart && checkDate <= eventEnd
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // 달력 그리드 생성 함수들
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const getCalendarDays = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days = []

    // 이전 달의 마지막 날들
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth)
    
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevYear, prevMonth, prevMonthDays - i),
        isCurrentMonth: false,
        isToday: false
      })
    }

    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const today = new Date()
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString()
      })
    }

    // 다음 달의 첫 날들
    const remainingDays = 42 - days.length // 6주 x 7일 = 42
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(nextYear, nextMonth, day),
        isCurrentMonth: false,
        isToday: false
      })
    }

    return days
  }

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreateEvent}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>일정 추가</span>
            </button>
            <button
              onClick={() => handleCreateTodo()}
              className="btn-secondary flex items-center space-x-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>할 일 추가</span>
            </button>
            <button
              onClick={() => setShowSyncModal(true)}
              className="btn-secondary flex items-center space-x-2"
              title="휴대전화 캘린더와 동기화"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>동기화</span>
            </button>
          </div>
        </div>

        {/* 뷰 선택 및 날짜 네비게이션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calendarView === 'month' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              월
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calendarView === 'week' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              주
            </button>
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calendarView === 'day' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              일
            </button>
            <button
              onClick={() => setCalendarView('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calendarView === 'list' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              목록
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                if (calendarView === 'month') {
                  newDate.setMonth(newDate.getMonth() - 1)
                } else if (calendarView === 'week') {
                  newDate.setDate(newDate.getDate() - 7)
                } else {
                  newDate.setDate(newDate.getDate() - 1)
                }
                setCurrentDate(newDate)
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              오늘
            </button>
            
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                if (calendarView === 'month') {
                  newDate.setMonth(newDate.getMonth() + 1)
                } else if (calendarView === 'week') {
                  newDate.setDate(newDate.getDate() + 7)
                } else {
                  newDate.setDate(newDate.getDate() + 1)
                }
                setCurrentDate(newDate)
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 현재 날짜 표시 */}
        <div className="mt-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {calendarView === 'month' && (
              `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
            )}
            {calendarView === 'week' && (
              `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 주`
            )}
            {calendarView === 'day' && (
              `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`
            )}
          </h2>
        </div>
      </div>

      {/* 캘린더 콘텐츠 */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* 월별 달력 뷰 */}
            {calendarView === 'month' && (
              <div className="space-y-4">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 달력 그리드 */}
                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays(currentDate.getFullYear(), currentDate.getMonth()).map((day, index) => {
                    const dayEvents = getEventsForDate(day.date)
                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] p-2 border border-gray-200 ${
                          day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        } ${
                          day.isToday ? 'ring-2 ring-primary-500' : ''
                        } hover:bg-gray-50 transition-colors cursor-pointer`}
                        onClick={() => {
                          setCurrentDate(day.date)
                          setCalendarView('day')
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, date: day.date })
                        }}
                      >
                        <div className={`text-sm font-medium ${
                          day.isCurrentMonth 
                            ? day.isToday 
                              ? 'text-primary-600' 
                              : 'text-gray-900'
                            : 'text-gray-400'
                        }`}>
                          {day.date.getDate()}
                        </div>
                        
                        {/* 이벤트 표시 */}
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="text-xs p-1 rounded truncate"
                              style={{ 
                                backgroundColor: event.color + '20',
                                color: event.color,
                                border: `1px solid ${event.color}40`
                              }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayEvents.length - 2}개 더
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 주별 뷰 */}
            {calendarView === 'week' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">주별 뷰</h3>
                  <p className="text-gray-500">주별 뷰 기능이 곧 추가됩니다.</p>
                </div>
              </div>
            )}

            {/* 일별 뷰 */}
            {calendarView === 'day' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">일별 뷰</h3>
                  <p className="text-gray-500">일별 뷰 기능이 곧 추가됩니다.</p>
                </div>
              </div>
            )}

            {/* 이벤트 목록 (기존) */}
            {calendarView === 'list' && (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                        {event.description && (
                          <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(event.startDate)}</span>
                            {!event.allDay && (
                              <span> {formatTime(event.startDate)}</span>
                            )}
                          </div>
                          
                          {event.endDate && event.endDate.getTime() !== event.startDate.getTime() && (
                            <div className="flex items-center space-x-1">
                              <span>~</span>
                              <span>{formatDate(event.endDate)}</span>
                              {!event.allDay && (
                                <span> {formatTime(event.endDate)}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {event.location && (
                          <div className="flex items-center space-x-2 mt-2">
                            <MapPinIcon className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        
                        {event.reminder && event.reminder !== '0' && (
                          <div className="flex items-center space-x-2 mt-2">
                            <ClockIcon className="w-4 h-4" />
                            <span>{event.reminder}분 전 알림</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{event.authorName}</span>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: event.color }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}

                {events.length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">일정이 없습니다</h3>
                    <p className="text-gray-500 mb-4">새로운 일정을 추가해보세요!</p>
                    <button
                      onClick={handleCreateEvent}
                      className="btn-primary"
                    >
                      일정 추가하기
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 이벤트 모달 */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {selectedEvent ? '일정 수정' : '새 일정'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="일정 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="일정 설명"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={eventForm.allDay}
                  onChange={(e) => setEventForm({ ...eventForm, allDay: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="allDay" className="text-sm text-gray-700">
                  종일
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {!eventForm.allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {!eventForm.allDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </div>

              {/* 위치 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  위치
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="위치를 입력하세요"
                />
              </div>

              {/* 알림 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  알림
                </label>
                <select
                  value={eventForm.reminder}
                  onChange={(e) => setEventForm({ ...eventForm, reminder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  색상
                </label>
                <div className="flex space-x-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setEventForm({ ...eventForm, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        eventForm.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleSaveEvent}
                className="btn-primary"
              >
                {selectedEvent ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 할 일 모달 */}
      {showTodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">새 할 일</h2>
            
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
                  마감 시간
                </label>
                <input
                  type="time"
                  value={todoForm.dueTime}
                  onChange={(e) => setTodoForm({ ...todoForm, dueTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg py-1 w-36"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            onClick={() => {
              setContextMenu(null)
              handleCreateTodo(contextMenu.date)
            }}
          >
            <CheckCircleIcon className="w-4 h-4 inline-block mr-2 text-green-500" /> 할 일 추가
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            onClick={() => {
              setContextMenu(null)
              handleCreateEventWithDate(contextMenu.date)
            }}
          >
            <PlusIcon className="w-4 h-4 inline-block mr-2 text-blue-500" /> 일정 추가
          </button>
        </div>
      )}

      {/* 동기화 안내 모달 */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">휴대전화 캘린더 동기화</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📱 동기화 방법</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>아래 "캘린더 다운로드" 버튼을 클릭하세요</li>
                  <li>다운로드된 .ics 파일을 휴대전화로 전송하세요</li>
                  <li>휴대전화에서 파일을 열어 캘린더 앱에 추가하세요</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ 주의사항</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                  <li>이 파일에는 현재 캘린더의 모든 일정이 포함됩니다</li>
                  <li>휴대전화에서 기존 일정과 중복될 수 있습니다</li>
                  <li>정기적으로 새로운 파일을 다운로드하여 최신 상태를 유지하세요</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ 지원되는 앱</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                  <li>iPhone: 기본 캘린더 앱</li>
                  <li>Android: Google 캘린더, 삼성 캘린더</li>
                  <li>기타: Outlook, Apple Calendar 등</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSyncModal(false)}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={() => {
                  generateICalFile()
                  setShowSyncModal(false)
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>캘린더 다운로드</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}