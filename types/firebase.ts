import { User } from 'firebase/auth'

export interface Document {
  id: string
  title: string
  content: string
  userId: string
  isPublic: boolean
  category?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface FileData {
  id: string
  name: string
  url: string
  size: number
  type: string
  userId: string
  documentId?: string
  createdAt: Date
}

export interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: 'user' | 'admin' // 사용자 역할 추가
  createdAt: Date
  updatedAt: Date
}

// 다층적 게시판 구조
export interface Bulletin {
  id: string
  title: string
  description: string
  parentId: string
  level: number
  userId: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  order: number
}

export interface BulletinPost {
  id: string
  bulletinId: string
  title: string
  content: string
  userId: string
  authorName: string
  isPinned: boolean
  isLocked: boolean
  viewCount: number
  likeCount: number
  tags?: string[]
  attachments?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface BulletinComment {
  id: string
  postId: string
  content: string
  userId: string
  authorName: string
  createdAt: Date
  updatedAt: Date
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  allDay: boolean
  location?: string
  color: string
  userId: string
  authorName: string
  createdAt: Date
  updatedAt: Date
  reminder?: string // 알림 설정 (분 단위)
}

export interface TodoItem {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate?: Date
  userId: string
  authorName: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
  reminder?: string // 알림 설정 (분 단위)
}

export interface Notification {
  id: string
  type: 'event' | 'todo'
  title: string
  message: string
  eventId?: string
  todoId?: string
  userId: string
  isRead: boolean
  scheduledFor: Date
  createdAt: Date
  updatedAt: Date
} 