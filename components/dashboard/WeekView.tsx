'use client'

import React from 'react'
import { CalendarEvent, TodoItem } from '@/types/firebase'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  todos: TodoItem[]
  onDateSelect: (date: Date) => void
  onCreateEvent: (date: Date) => void
  onCreateTodo: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onTodoClick: (todo: TodoItem) => void
  onEventDragStart: (event: CalendarEvent, e: React.DragEvent) => void
  onTodoDragStart: (todo: TodoItem, e: React.DragEvent) => void
  onDateDrop: (targetDate: Date, e: React.DragEvent) => void
  onDateDragOver: (e: React.DragEvent) => void
  onPreviousWeek: () => void
  onNextWeek: () => void
  isMobile?: boolean
}

export function WeekView({
  currentDate,
  events,
  todos,
  onDateSelect,
  onCreateEvent,
  onCreateTodo,
  onEventClick,
  onTodoClick,
  onEventDragStart,
  onTodoDragStart,
  onDateDrop,
  onDateDragOver,
  onPreviousWeek,
  onNextWeek,
  isMobile = false
}: WeekViewProps) {
  // 주의 시작일 (일요일) 계산
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  // 주의 날짜들 생성
  const getWeekDays = (date: Date) => {
    const weekStart = getWeekStart(date)
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getWeekDays(currentDate)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  const getEventsForDateAndTime = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
      const eventHour = eventDate.getHours()
      const eventDay = eventDate.getDate()
      const eventMonth = eventDate.getMonth()
      const eventYear = eventDate.getFullYear()
      
      return eventDay === date.getDate() && 
             eventMonth === date.getMonth() && 
             eventYear === date.getFullYear() && 
             eventHour === hour
    })
  }

  const getTodosForDate = (date: Date) => {
    return todos.filter(todo => {
      if (!todo.dueDate) return false
      const todoDate = todo.dueDate instanceof Date ? todo.dueDate : new Date(todo.dueDate)
      return todoDate.getDate() === date.getDate() && 
             todoDate.getMonth() === date.getMonth() && 
             todoDate.getFullYear() === date.getFullYear()
    })
  }

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear()
  }

  return (
    <div className="h-full flex flex-col">
      {/* 주 네비게이션 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onPreviousWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-semibold">
          {weekDays[0].toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })} 주
        </h2>
        
        <button
          onClick={onNextWeek}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 주별 캘린더 그리드 */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 h-full">
          {/* 시간 열 */}
          <div className="border-r border-gray-200">
            <div className="h-12 border-b border-gray-200"></div>
            {timeSlots.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 text-xs text-gray-500 p-1">
                {formatTime(hour)}
              </div>
            ))}
          </div>

          {/* 각 요일 열 */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="border-r border-gray-200 last:border-r-0">
              {/* 요일 헤더 */}
              <div 
                className={`h-12 border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
                  isToday(day) ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => onDateSelect(day)}
                onDrop={(e) => onDateDrop(day, e)}
                onDragOver={onDateDragOver}
              >
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(day)}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateEvent(day)
                    }}
                    className="p-1 hover:bg-blue-100 rounded text-blue-600"
                    title="이벤트 추가"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateTodo(day)
                    }}
                    className="p-1 hover:bg-green-100 rounded text-green-600"
                    title="할 일 추가"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 시간별 셀 */}
              {timeSlots.map(hour => {
                const hourEvents = getEventsForDateAndTime(day, hour)
                const dayTodos = getTodosForDate(day)
                
                return (
                  <div 
                    key={hour}
                    className={`h-16 border-b border-gray-100 p-1 relative ${
                      isToday(day) ? 'bg-blue-50' : ''
                    }`}
                    onDrop={(e) => onDateDrop(day, e)}
                    onDragOver={onDateDragOver}
                  >
                    {/* 이벤트들 */}
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className="text-xs p-1 mb-1 rounded cursor-pointer truncate"
                        style={{ backgroundColor: event.color + '20', color: event.color }}
                        onClick={() => onEventClick(event)}
                        draggable
                        onDragStart={(e) => onEventDragStart(event, e)}
                      >
                        {event.title}
                      </div>
                    ))}
                    
                    {/* 할 일들 (첫 번째 시간대에만 표시) */}
                    {hour === 9 && dayTodos.map(todo => (
                      <div
                        key={todo.id}
                        className={`text-xs p-1 mb-1 rounded cursor-pointer truncate ${
                          todo.completed ? 'line-through opacity-50' : ''
                        }`}
                        onClick={() => onTodoClick(todo)}
                        draggable
                        onDragStart={(e) => onTodoDragStart(todo, e)}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          todo.priority === 'high' ? 'bg-red-500' :
                          todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></span>
                        {todo.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 