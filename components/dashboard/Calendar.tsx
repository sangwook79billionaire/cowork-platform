'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, orderBy, getDocs, addDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { CalendarEvent } from '@/types/firebase'
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
} from '@heroicons/react/24/outline'

interface CalendarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
}

type CalendarView = 'month' | 'week' | 'day'

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
    reminder: '15', // 15분 전 알림
  })

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
      } else {
        await addDoc(collection(db, 'calendarEvents'), eventData)
        await fetchEvents()
      }
      
      setShowEventModal(false)
      toast.success(selectedEvent ? '이벤트가 수정되었습니다.' : '이벤트가 생성되었습니다.')
    } catch (error) {
      toast.error('이벤트 저장에 실패했습니다.')
      console.error('Error saving event:', error)
    }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      const checkDate = new Date(date)
      
      return eventStart <= checkDate && eventEnd >= checkDate
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
          <button
            onClick={handleCreateEvent}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>일정 추가</span>
          </button>
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

      {/* 캘린더 내용 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    {event.allDay ? (
                      `${formatDate(event.startDate)}${event.startDate.toDateString() !== event.endDate.toDateString() ? ` ~ ${formatDate(event.endDate)}` : ''} (종일)`
                    ) : (
                      `${formatDate(event.startDate)} ${formatTime(event.startDate)} ~ ${formatTime(event.endDate)}`
                    )}
                  </span>
                </div>
                
                {event.location && (
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                
                {event.reminder && event.reminder !== '0' && (
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>{event.reminder}분 전 알림</span>
                  </div>
                )}
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
        </div>

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
    </div>
  )
} 