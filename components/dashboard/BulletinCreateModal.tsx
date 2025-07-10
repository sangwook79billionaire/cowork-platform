'use client'

import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin } from '@/types/firebase'
import toast from 'react-hot-toast'
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'

interface BulletinCreateModalProps {
  isOpen: boolean
  onClose: () => void
  parentId?: string
  onBulletinCreated?: (bulletin: Bulletin) => void
}

export function BulletinCreateModal({ 
  isOpen, 
  onClose, 
  parentId, 
  onBulletinCreated 
}: BulletinCreateModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error('게시판 제목을 입력해주세요.')
      return
    }

    if (!user?.uid) {
      toast.error('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      const bulletinData = {
        title: title.trim(),
        description: description.trim(),
        parentId: parentId || null,
        level: parentId ? 1 : 0, // 부모가 있으면 하위 게시판
        order: 0,
        isActive: true,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'bulletins'), bulletinData)
      
      const newBulletin: Bulletin = {
        id: docRef.id,
        title: bulletinData.title,
        description: bulletinData.description,
        parentId: bulletinData.parentId || '',
        level: bulletinData.level,
        order: bulletinData.order,
        isActive: bulletinData.isActive,
        userId: bulletinData.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      toast.success('게시판이 생성되었습니다.')
      onBulletinCreated?.(newBulletin)
      onClose()
      
      // 폼 초기화
      setTitle('')
      setDescription('')
    } catch (error) {
      console.error('Error creating bulletin:', error)
      toast.error('게시판 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">새 게시판 생성</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              게시판 제목 *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="게시판 제목을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
              placeholder="게시판에 대한 설명을 입력하세요 (선택사항)"
            />
          </div>

          {parentId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                이 게시판은 선택된 게시판의 하위 게시판으로 생성됩니다.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 