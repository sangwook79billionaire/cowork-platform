'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Notification, CalendarEvent, TodoItem } from '@/types/firebase'
import toast from 'react-hot-toast'
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// 모의 알림 데이터
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'event',
    title: '팀 미팅',
    message: '10분 후 팀 미팅이 있습니다.',
    eventId: 'event-1',
    userId: 'user-1',
    isRead: false,
    scheduledFor: new Date(Date.now() + 10 * 60 * 1000), // 10분 후
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'notif-2',
    type: 'todo',
    title: '프로젝트 기획서 작성',
    message: '오늘 마감인 할 일이 있습니다.',
    todoId: 'todo-1',
    userId: 'user-1',
    isRead: false,
    scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30분 후
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications()
    }
  }, [isOpen, user])

  const fetchNotifications = async () => {
    if (isTestMode) {
      setNotifications(mockNotifications)
      setLoading(false)
      return
    }

    try {
      const notificationsRef = collection(db, 'notifications')
      const q = query(
        notificationsRef,
        where('userId', '==', user?.uid),
        orderBy('scheduledFor', 'desc')
      )
      const querySnapshot = await getDocs(q)
      
      const fetchedNotifications: Notification[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedNotifications.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          message: data.message,
          eventId: data.eventId,
          todoId: data.todoId,
          userId: data.userId,
          isRead: data.isRead || false,
          scheduledFor: data.scheduledFor?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        })
      })
      
      setNotifications(fetchedNotifications)
    } catch (error) {
      console.error('알림 데이터 가져오기 오류:', error)
      toast.error('알림을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (isTestMode) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      return
    }

    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        updatedAt: serverTimestamp()
      })
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (isTestMode) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      return
    }

    try {
      await deleteDoc(doc(db, 'notifications', notificationId))
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}일 후`
    if (hours > 0) return `${hours}시간 후`
    if (minutes > 0) return `${minutes}분 후`
    return '지금'
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />
      case 'todo':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-600" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">알림</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 알림 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">알림이 없습니다</h3>
              <p className="text-gray-500">새로운 알림이 오면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            notification.isRead ? 'text-gray-600' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            notification.isRead ? 'text-gray-500' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTime(notification.scheduledFor)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="읽음 표시"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="삭제"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 