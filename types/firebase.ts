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
  description?: string
  parentId?: string // 상위 게시판 ID (없으면 최상위)
  level: number // 깊이 레벨 (0: 최상위, 1: 하위, 2: 하하위...)
  order: number // 정렬 순서
  isActive: boolean
  userId: string // 게시판 생성자 ID
  createdAt: Date
  updatedAt: Date
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
  attachments?: string[] // FileData ID 배열
  createdAt: Date
  updatedAt: Date
}

export interface BulletinComment {
  id: string
  postId: string
  content: string
  userId: string
  authorName: string
  parentId?: string // 대댓글용
  createdAt: Date
  updatedAt: Date
} 