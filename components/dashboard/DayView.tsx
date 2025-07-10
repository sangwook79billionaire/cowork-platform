'use client'

import React from 'react'
import { CalendarEvent, TodoItem } from '@/types/firebase'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ClockIcon, MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface DayViewProps {
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
  onPreviousDay: () => void
  onNextDay: () => void
  isMobile?: boolean
}

export function DayView({
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
  onPreviousDay,
  onNextDay,
  isMobile = false
}: DayViewProps) {
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  const getEventsForTime = (hour: number) => {
    return events.filter(event => {
      const eventDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
      const eventHour = eventDate.getHours()
      const eventDay = eventDate.getDate()
      const eventMonth = eventDate.getMonth()
      const eventYear = eventDate.getFullYear()
      
      return eventDay === currentDate.getDate() && 
             eventMonth === currentDate.getMonth() && 
             eventYear === currentDate.getFullYear() && 
             eventHour === hour
    })
  }

  const getTodosForDate = () => {
    return todos.filter(todo => {
      if (!todo.dueDate) return false
      const todoDate = todo.dueDate instanceof Date ? todo.dueDate : new Date(todo.dueDate)
      return todoDate.getDate() === currentDate.getDate() && 
             todoDate.getMonth() === currentDate.getMonth() && 
             todoDate.getFullYear() === currentDate.getFullYear()
    })
  }

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear()
  }

  const dayTodos = getTodosForDate()

  return (
    <div className="h-full flex flex-col">
      {/* 일 네비게이션 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onPreviousDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            {formatDate(currentDate)}
          </h2>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onCreateEvent(currentDate)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              이벤트 추가
            </button>
            <button
              onClick={() => onCreateTodo(currentDate)}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              할 일 추가
            </button>
          </div>
        </div>
        
        <button
          onClick={onNextDay}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 일별 캘린더 */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 h-full">
          {/* 할 일 섹션 */}
          {dayTodos.length > 0 && (
            <div className="border-b border-gray-200 p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                할 일
              </h3>
              <div className="space-y-2">
                {dayTodos.map(todo => (
                  <div
                    key={todo.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                      todo.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                    }`}
                    onClick={() => onTodoClick(todo)}
                    draggable
                    onDragStart={(e) => onTodoDragStart(todo, e)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        todo.priority === 'high' ? 'bg-red-500' :
                        todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></span>
                      <span className={`flex-1 ${todo.completed ? 'line-through opacity-50' : ''}`}>
                        {todo.title}
                      </span>
                      {todo.completed && (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    {todo.description && (
                      <p className="text-sm text-gray-600 mt-1 ml-5">
                        {todo.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시간별 이벤트 섹션 */}
          <div className="flex-1">
            {timeSlots.map(hour => {
              const hourEvents = getEventsForTime(hour)
              
              return (
                <div 
                  key={hour}
                  className={`border-b border-gray-100 p-4 ${
                    isToday(currentDate) && hour === new Date().getHours() ? 'bg-blue-50' : ''
                  }`}
                  onDrop={(e) => onDateDrop(currentDate, e)}
                  onDragOver={onDateDragOver}
                >
                  <div className="flex items-start gap-4">
                    {/* 시간 표시 */}
                    <div className="w-16 text-sm font-medium text-gray-500 flex-shrink-0">
                      {formatTime(hour)}
                    </div>
                    
                    {/* 이벤트들 */}
                    <div className="flex-1 space-y-2">
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                          style={{ 
                            backgroundColor: event.color + '10', 
                            borderLeft: `4px solid ${event.color}` 
                          }}
                          onClick={() => onEventClick(event)}
                          draggable
                          onDragStart={(e) => onEventDragStart(event, e)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {event.title}
                              </h4>
                              {event.description && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {formatEventTime(event.startDate)} - {formatEventTime(event.endDate)}
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="w-3 h-3" />
                                    {event.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onCreateEvent(currentDate)
                                }}
                                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                title="이벤트 추가"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* 빈 시간대에 추가 버튼 */}
                      {hourEvents.length === 0 && (
                        <button
                          onClick={() => onCreateEvent(currentDate)}
                          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-600"
                        >
                          <PlusIcon className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 