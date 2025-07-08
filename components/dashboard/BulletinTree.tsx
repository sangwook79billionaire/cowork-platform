'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin } from '@/types/firebase'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BulletinTreeProps {
  selectedBulletinId: string | null
  onBulletinSelect: (bulletinId: string) => void
  expandedBulletins: Set<string>
  onExpandedBulletinsChange: (expanded: Set<string>) => void
  onCreateBulletin?: (parentId?: string) => void
}

export function BulletinTree({ 
  selectedBulletinId, 
  onBulletinSelect, 
  expandedBulletins, 
  onExpandedBulletinsChange,
  onCreateBulletin
}: BulletinTreeProps) {
  const { user, isAdmin } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)

  // 게시판 데이터 가져오기
  const fetchBulletins = async () => {
    try {
      const bulletinsRef = collection(db, 'bulletins')
      const q = query(bulletinsRef, orderBy('createdAt', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const fetchedBulletins: Bulletin[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        fetchedBulletins.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          parentId: data.parentId || '',
          level: data.level || 0,
          userId: data.userId || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isActive: data.isActive !== false,
          order: data.order || 0,
        })
      })
      
      setBulletins(fetchedBulletins)
    } catch (error) {
      console.error('게시판 데이터 가져오기 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBulletins()
  }, [])

  // 하위 게시판 가져오기
  const getChildBulletins = (parentId: string) => {
    return bulletins.filter(bulletin => bulletin.parentId === parentId && bulletin.isActive !== false)
  }

  // 최상위 게시판 가져오기
  const getTopLevelBulletins = () => {
    return bulletins.filter(bulletin => !bulletin.parentId && bulletin.isActive !== false)
  }

  // 게시판 레벨 계산
  const getBulletinLevel = (bulletinId: string): number => {
    const bulletin = bulletins.find(b => b.id === bulletinId)
    if (!bulletin || !bulletin.parentId) return 0
    
    let level = 0
    let currentParentId = bulletin.parentId
    
    while (currentParentId) {
      level++
      const parent = bulletins.find(b => b.id === currentParentId)
      if (!parent) break
      currentParentId = parent.parentId || ''
    }
    
    return level
  }

  // 확장/축소 토글
  const toggleBulletinExpansion = (bulletinId: string) => {
    const newExpanded = new Set(expandedBulletins)
    if (newExpanded.has(bulletinId)) {
      newExpanded.delete(bulletinId)
    } else {
      newExpanded.add(bulletinId)
    }
    onExpandedBulletinsChange(newExpanded)
  }

  // 게시판 생성 핸들러
  const handleCreateBulletin = (parentId?: string) => {
    if (onCreateBulletin) {
      onCreateBulletin(parentId)
    } else {
      toast.success('새 게시판 생성 기능은 준비 중입니다.')
    }
  }

  // 게시판 트리 렌더링
  const renderBulletinTree = (
    bulletins: Bulletin[],
    level: number = 0
  ) => {
    return bulletins.map((bulletin) => {
      const children = getChildBulletins(bulletin.id)
      const hasChildren = children.length > 0
      const isExpanded = expandedBulletins.has(bulletin.id)
      const isSelected = selectedBulletinId === bulletin.id

      return (
        <div key={bulletin.id}>
          <div
            onClick={() => onBulletinSelect(bulletin.id)}
            className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${
              isSelected ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-700'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {/* 확장/축소 버튼 */}
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBulletinExpansion(bulletin.id)
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-3 h-3" />
                  ) : (
                    <ChevronRightIcon className="w-3 h-3" />
                  )}
                </button>
              ) : (
                <div className="w-3 h-3"></div>
              )}
            </div>

            {/* 게시판 아이콘 */}
            <div className="flex-shrink-0">
              {level === 0 ? (
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
              ) : level === 1 ? (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-sm"></div>
                </div>
              ) : level === 2 ? (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-300 rounded-sm"></div>
                </div>
              ) : (
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-sm"></div>
                </div>
              )}
            </div>

            {/* 게시판 제목 */}
            <span className="flex-1 text-sm truncate">{bulletin.title}</span>

            {/* 새 게시판 생성 버튼 (선택된 게시판에만 표시) */}
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateBulletin(bulletin.id)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                title="하위 게시판 생성"
              >
                <PlusIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 하위 게시판들 */}
          {hasChildren && isExpanded && (
            <div className="ml-2">
              {renderBulletinTree(children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">게시판</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCreateBulletin()}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="새 게시판 생성"
            >
              <FolderPlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 게시판 트리 */}
      <div className="flex-1 overflow-y-auto p-2">
        {renderBulletinTree(getTopLevelBulletins())}
      </div>
    </div>
  )
}