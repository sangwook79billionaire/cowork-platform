'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, orderBy, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { db, getUserNickname } from '@/lib/firebase'
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
  FlagIcon,
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
]

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [selectedDateForTodo, setSelectedDateForTodo] = useState<Date | null>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  const [showEventDetailModal, setShowEventDetailModal] = useState(false)
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CalendarEvent | null>(null)
  const [showTodoDetailModal, setShowTodoDetailModal] = useState(false)
  const [selectedTodoForDetail, setSelectedTodoForDetail] = useState<TodoItem | null>(null)
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [draggedTodo, setDraggedTodo] = useState<TodoItem | null>(null)
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false)
  const [dragTargetDate, setDragTargetDate] = useState<Date | null>(null)
  const [dragTargetItem, setDragTargetItem] = useState<{ type: 'event' | 'todo', item: CalendarEvent | TodoItem } | null>(null)
  const [newTimeForm, setNewTimeForm] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    dueDate: '',
    dueTime: '',
  })

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let todosUnsubscribe: (() => void) | undefined

    const initializeData = async () => {
      if (isTestMode) {
        setEvents(mockEvents)
        setTodos(mockTodos)
        setLoading(false)
        return
      }

      try {
        const eventsRef = collection(db, 'calendarEvents')
        const q = query(eventsRef, orderBy('startDate', 'asc'))
        
        // 실시간 리스너 설정
        unsubscribe = onSnapshot(q, (querySnapshot) => {
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
        }, (error) => {
          console.error('실시간 이벤트 데이터 가져오기 오류:', error)
          toast.error('실시간 업데이트에 실패했습니다.')
        })

        // todos 실시간 리스너 설정
        const todosRef = collection(db, 'todos')
        const todosQ = query(todosRef, orderBy('createdAt', 'desc'))
        
        todosUnsubscribe = onSnapshot(todosQ, (querySnapshot) => {
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
              reminder: data.reminder,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            })
          })
          
          setTodos(fetchedTodos)
          setLoading(false)
        }, (error) => {
          console.error('실시간 할 일 데이터 가져오기 오류:', error)
          toast.error('실시간 업데이트에 실패했습니다.')
          setLoading(false)
        })
      } catch (error) {
        console.error('이벤트 데이터 가져오기 오류:', error)
        toast.error('이벤트를 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }

    initializeData()

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      if (todosUnsubscribe) {
        todosUnsubscribe()
      }
    }
  }, [isTestMode])

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

    // 사용자 닉네임 가져오기
    const authorNickname = await getUserNickname(user.uid)
    
    const eventData = {
      title: eventForm.title,
      description: eventForm.description,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: eventForm.allDay,
      userId: user.uid,
      authorName: authorNickname,
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

    // 사용자 닉네임 가져오기
    const authorNickname = await getUserNickname(user.uid)
    
    const todoData = {
      title: todoForm.title,
      description: todoForm.description,
      completed: false,
      priority: todoForm.priority,
      dueDate: todoForm.dueDate ? new Date(`${todoForm.dueDate}T${todoForm.dueTime}`) : undefined,
      userId: user.uid,
      authorName: authorNickname,
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

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEventForDetail(event)
    setShowEventDetailModal(true)
  }

  const handleTodoClick = (todo: TodoItem) => {
    setSelectedTodoForDetail(todo)
    setShowTodoDetailModal(true)
  }

  const handleEventRightClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedEvent(event)
    setEventForm({
      title: event.title,
      description: event.description || '',
      startDate: event.startDate.toISOString().split('T')[0],
      startTime: event.allDay ? '09:00' : event.startDate.toTimeString().slice(0, 5),
      endDate: event.endDate.toISOString().split('T')[0],
      endTime: event.allDay ? '10:00' : event.endDate.toTimeString().slice(0, 5),
      allDay: event.allDay,
      location: event.location || '',
      color: event.color || '#3B82F6',
      reminder: event.reminder || '15',
    })
    setShowEventModal(true)
  }

  const handleTodoRightClick = (todo: TodoItem, e: React.MouseEvent) => {
    e.preventDefault()
    setTodoForm({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate ? todo.dueDate.toISOString().split('T')[0] : '',
      dueTime: todo.dueDate ? todo.dueDate.toTimeString().slice(0, 5) : '09:00',
      tags: todo.tags ? todo.tags.join(', ') : '',
      reminder: todo.reminder || '0',
    })
    setShowTodoModal(true)
  }

  const handleEventDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'event', id: event.id }))
    setDraggedEvent(event)
  }

  const handleTodoDragStart = (todo: TodoItem, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'todo', id: todo.id }))
    setDraggedTodo(todo)
  }

  const handleDateDrop = (targetDate: Date, e: React.DragEvent) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const { type, id } = data
      
      if (type === 'event') {
        const event = events.find(e => e.id === id)
        if (event) {
          setDragTargetItem({ type: 'event', item: event })
          setDragTargetDate(targetDate)
          setNewTimeForm({
            startDate: targetDate.toISOString().split('T')[0],
            startTime: event.allDay ? '09:00' : event.startDate.toTimeString().slice(0, 5),
            endDate: targetDate.toISOString().split('T')[0],
            endTime: event.allDay ? '10:00' : event.endDate.toTimeString().slice(0, 5),
            dueDate: '',
            dueTime: '',
          })
          setShowTimeChangeModal(true)
        }
      } else if (type === 'todo') {
        const todo = todos.find(t => t.id === id)
        if (todo) {
          setDragTargetItem({ type: 'todo', item: todo })
          setDragTargetDate(targetDate)
          setNewTimeForm({
            startDate: '',
            startTime: '',
            endDate: '',
            endTime: '',
            dueDate: targetDate.toISOString().split('T')[0],
            dueTime: todo.dueDate ? todo.dueDate.toTimeString().slice(0, 5) : '09:00',
          })
          setShowTimeChangeModal(true)
        }
      }
    } catch (error) {
      console.error('드래그 데이터 파싱 오류:', error)
    }
  }

  const handleDateDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleConfirmTimeChange = async () => {
    if (!dragTargetItem || !dragTargetDate) return

    try {
      if (dragTargetItem.type === 'event') {
        const event = dragTargetItem.item as CalendarEvent
        const newStartDate = new Date(`${newTimeForm.startDate}T${newTimeForm.startTime}`)
        const newEndDate = new Date(`${newTimeForm.endDate}T${newTimeForm.endTime}`)
        
        if (isTestMode) {
          setEvents(events.map(e => 
            e.id === event.id 
              ? { ...e, startDate: newStartDate, endDate: newEndDate }
              : e
          ))
          toast.success('일정이 이동되었습니다.')
        } else {
          await updateDoc(doc(db, 'calendarEvents', event.id), {
            startDate: newStartDate,
            endDate: newEndDate,
            updatedAt: serverTimestamp()
          })
          toast.success('일정이 이동되었습니다.')
        }
      } else if (dragTargetItem.type === 'todo') {
        const todo = dragTargetItem.item as TodoItem
        const newDueDate = new Date(`${newTimeForm.dueDate}T${newTimeForm.dueTime}`)
        
        if (isTestMode) {
          setTodos(todos.map(t => 
            t.id === todo.id 
              ? { ...t, dueDate: newDueDate }
              : t
          ))
          toast.success('할 일이 이동되었습니다.')
        } else {
          await updateDoc(doc(db, 'todos', todo.id), {
            dueDate: newDueDate,
            updatedAt: serverTimestamp()
          })
          toast.success('할 일이 이동되었습니다.')
        }
      }
      
      setShowTimeChangeModal(false)
      setDragTargetItem(null)
      setDragTargetDate(null)
    } catch (error) {
      console.error('이동 중 오류:', error)
      toast.error('이동에 실패했습니다.')
    }
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

  const parseICalFile = (content: string) => {
    const events: CalendarEvent[] = []
    const lines = content.split(/\r?\n/)
    let currentEvent: any = {}
    let inEvent = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line === 'BEGIN:VEVENT') {
        inEvent = true
        currentEvent = {}
      } else if (line === 'END:VEVENT') {
        inEvent = false
        if (currentEvent.summary && currentEvent.dtstart) {
          // 이벤트 데이터 변환
          const event: CalendarEvent = {
            id: currentEvent.uid || `imported-${Date.now()}-${Math.random()}`,
            title: currentEvent.summary,
            description: currentEvent.description || '',
            startDate: new Date(currentEvent.dtstart),
            endDate: new Date(currentEvent.dtend || currentEvent.dtstart),
            allDay: currentEvent.dtstart.includes('T') ? false : true,
            userId: user?.uid || '',
            authorName: user?.displayName || user?.email || '가져온 일정',
            color: '#3B82F6',
            location: currentEvent.location || '',
            reminder: '15',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          events.push(event)
        }
      } else if (inEvent) {
        const [key, value] = line.split(':', 2)
        if (key && value) {
          switch (key) {
            case 'UID':
              currentEvent.uid = value
              break
            case 'SUMMARY':
              currentEvent.summary = value
              break
            case 'DESCRIPTION':
              currentEvent.description = value.replace(/\\n/g, '\n')
              break
            case 'DTSTART':
            case 'DTSTART;VALUE=DATE':
              currentEvent.dtstart = value.replace(/[TZ]/g, '')
              break
            case 'DTEND':
            case 'DTEND;VALUE=DATE':
              currentEvent.dtend = value.replace(/[TZ]/g, '')
              break
            case 'LOCATION':
              currentEvent.location = value
              break
          }
        }
      }
    }

    return events
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.ics')) {
      toast.error('iCal 파일(.ics)만 업로드 가능합니다.')
      return
    }

    try {
      const content = await file.text()
      const importedEvents = parseICalFile(content)
      
      if (importedEvents.length === 0) {
        toast.error('파일에서 일정을 찾을 수 없습니다.')
        return
      }

      // 중복 체크 (제목과 시작 시간으로)
      const existingEvents = events.filter(existing => 
        importedEvents.some(imported => 
          imported.title === existing.title && 
          imported.startDate.getTime() === existing.startDate.getTime()
        )
      )

      if (existingEvents.length > 0) {
        const shouldOverwrite = confirm(
          `${existingEvents.length}개의 중복 일정이 있습니다. 덮어쓰시겠습니까?`
        )
        if (!shouldOverwrite) return
      }

      // 이벤트 저장
      if (isTestMode) {
        setEvents([...events, ...importedEvents])
        toast.success(`${importedEvents.length}개의 일정을 가져왔습니다.`)
      } else {
        // Firestore에 저장
        for (const event of importedEvents) {
          const eventData = {
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            allDay: event.allDay,
            userId: user?.uid || '',
            authorName: event.authorName,
            color: event.color,
            location: event.location,
            reminder: event.reminder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
          
          const docRef = await addDoc(collection(db, 'calendarEvents'), eventData)
          event.id = docRef.id
        }
        
        setEvents([...events, ...importedEvents])
        toast.success(`${importedEvents.length}개의 일정을 가져왔습니다.`)
      }

      setShowImportModal(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('파일 파싱 오류:', error)
      toast.error('파일을 읽는 중 오류가 발생했습니다.')
    }
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
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center space-x-2"
              title="휴대전화 캘린더 가져오기"
            >
              <ArrowDownTrayIcon className="w-5 h-5 rotate-180" />
              <span>가져오기</span>
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
                        onDrop={(e) => handleDateDrop(day.date, e)}
                        onDragOver={handleDateDragOver}
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
                              className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ 
                                backgroundColor: event.color + '20',
                                color: event.color,
                                border: `1px solid ${event.color}40`
                              }}
                              title={event.title}
                              draggable
                              onDragStart={(e) => handleEventDragStart(event, e)}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEventClick(event)
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEventRightClick(event, e)
                              }}
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

      {/* 가져오기 모달 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">휴대전화 캘린더 가져오기</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📱 가져오기 방법</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>휴대전화에서 캘린더를 iCal 파일로 내보내세요</li>
                  <li>파일을 컴퓨터로 전송하세요</li>
                  <li>아래 "파일 선택" 버튼을 클릭하여 업로드하세요</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ 주의사항</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                  <li>iCal 파일(.ics)만 지원됩니다</li>
                  <li>중복된 일정이 있으면 덮어쓰기 여부를 확인합니다</li>
                  <li>가져온 일정은 현재 사용자 계정에 저장됩니다</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ 지원되는 앱</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                  <li>iPhone: 설정 → 캘린더 → 계정 → 캘린더 내보내기</li>
                  <li>Android: Google 캘린더 → 설정 → 캘린더 내보내기</li>
                  <li>기타: Outlook, Apple Calendar 등</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 rotate-180" />
                  <span>파일 선택</span>
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  .ics 파일을 선택하세요
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="btn-secondary"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이벤트 세부 내용 모달 */}
      {showEventDetailModal && selectedEventForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">일정 세부사항</h2>
              <button
                onClick={() => setShowEventDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: selectedEventForDetail.color }}>
                  {selectedEventForDetail.title}
                </h3>
                {selectedEventForDetail.description && (
                  <p className="text-gray-600 mb-3">{selectedEventForDetail.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {selectedEventForDetail.allDay ? (
                      `${formatDate(selectedEventForDetail.startDate)} (종일)`
                    ) : (
                      `${formatDate(selectedEventForDetail.startDate)} ${formatTime(selectedEventForDetail.startDate)} - ${formatTime(selectedEventForDetail.endDate)}`
                    )}
                  </span>
                </div>

                {selectedEventForDetail.location && (
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{selectedEventForDetail.location}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">작성자: {selectedEventForDetail.authorName}</span>
                </div>

                {selectedEventForDetail.reminder && selectedEventForDetail.reminder !== '0' && (
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      알림: {selectedEventForDetail.reminder}분 전
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEventDetailModal(false)
                  handleEventRightClick(selectedEventForDetail, {} as React.MouseEvent)
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span>수정</span>
              </button>
              <button
                onClick={() => setShowEventDetailModal(false)}
                className="btn-primary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 할 일 세부 내용 모달 */}
      {showTodoDetailModal && selectedTodoForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">할 일 세부사항</h2>
              <button
                onClick={() => setShowTodoDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {selectedTodoForDetail.title}
                </h3>
                {selectedTodoForDetail.description && (
                  <p className="text-gray-600 mb-3">{selectedTodoForDetail.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className={`w-4 h-4 ${selectedTodoForDetail.completed ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${selectedTodoForDetail.completed ? 'text-green-600' : 'text-gray-600'}`}>
                    {selectedTodoForDetail.completed ? '완료됨' : '미완료'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <FlagIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    우선순위: {selectedTodoForDetail.priority === 'high' ? '높음' : selectedTodoForDetail.priority === 'medium' ? '보통' : '낮음'}
                  </span>
                </div>

                {selectedTodoForDetail.dueDate && (
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      마감일: {formatDate(selectedTodoForDetail.dueDate)}
                    </span>
                  </div>
                )}

                {selectedTodoForDetail.tags && selectedTodoForDetail.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">태그:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedTodoForDetail.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">작성자: {selectedTodoForDetail.authorName}</span>
                </div>

                {selectedTodoForDetail.reminder && selectedTodoForDetail.reminder !== '0' && (
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      알림: {selectedTodoForDetail.reminder}분 전
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTodoDetailModal(false)
                  handleTodoRightClick(selectedTodoForDetail, {} as React.MouseEvent)
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span>수정</span>
              </button>
              <button
                onClick={() => setShowTodoDetailModal(false)}
                className="btn-primary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시간대 변경 모달 */}
      {showTimeChangeModal && dragTargetItem && dragTargetDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {dragTargetItem.type === 'event' ? '일정 이동' : '할 일 이동'}
              </h2>
              <button
                onClick={() => {
                  setShowTimeChangeModal(false)
                  setDragTargetItem(null)
                  setDragTargetDate(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {dragTargetItem.type === 'event' 
                    ? (dragTargetItem.item as CalendarEvent).title 
                    : (dragTargetItem.item as TodoItem).title
                  }
                </h3>
                <p className="text-blue-800 text-sm">
                  {dragTargetDate.toLocaleDateString('ko-KR')}로 이동하시겠습니까?
                </p>
              </div>

              {dragTargetItem.type === 'event' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 날짜
                    </label>
                    <input
                      type="date"
                      value={newTimeForm.startDate}
                      onChange={(e) => setNewTimeForm({ ...newTimeForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={newTimeForm.startTime}
                      onChange={(e) => setNewTimeForm({ ...newTimeForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료 날짜
                    </label>
                    <input
                      type="date"
                      value={newTimeForm.endDate}
                      onChange={(e) => setNewTimeForm({ ...newTimeForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={newTimeForm.endTime}
                      onChange={(e) => setNewTimeForm({ ...newTimeForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {dragTargetItem.type === 'todo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      마감 날짜
                    </label>
                    <input
                      type="date"
                      value={newTimeForm.dueDate}
                      onChange={(e) => setNewTimeForm({ ...newTimeForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      마감 시간
                    </label>
                    <input
                      type="time"
                      value={newTimeForm.dueTime}
                      onChange={(e) => setNewTimeForm({ ...newTimeForm, dueTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTimeChangeModal(false)
                  setDragTargetItem(null)
                  setDragTargetDate(null)
                }}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleConfirmTimeChange}
                className="btn-primary"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}