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
} from '@heroicons/react/24/outline'

interface BulletinDropdownProps {
  selectedBulletinId: string | null
  onBulletinSelect: (bulletinId: string) => void
  expandedBulletins?: Set<string>
  onExpandedBulletinsChange?: (expanded: Set<string>) => void
}

export function BulletinDropdown({ 
  selectedBulletinId, 
  onBulletinSelect, 
  expandedBulletins: externalExpandedBulletins,
  onExpandedBulletinsChange 
}: BulletinDropdownProps) {
  const { user } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [internalExpandedBulletins, setInternalExpandedBulletins] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // 외부에서 전달된 확장 상태가 있으면 사용, 없으면 내부 상태 사용
  const expandedBulletins = externalExpandedBulletins || internalExpandedBulletins
  const setExpandedBulletins = onExpandedBulletinsChange || setInternalExpandedBulletins

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
    const newSet = new Set(expandedBulletins)
    if (newSet.has(bulletinId)) {
      newSet.delete(bulletinId)
    } else {
      newSet.add(bulletinId)
    }
    setExpandedBulletins(newSet)
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
            onClick={() => {
              onBulletinSelect(bulletin.id)
              setIsOpen(false)
            }}
            className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md ${
              isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
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
          </div>

          {/* 하위 게시판들 */}
          {hasChildren && (
            <div className={`ml-4 border-l border-gray-200 ${isExpanded ? 'block' : 'hidden'}`}>
              {renderBulletinTree(children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  // 선택된 게시판 제목 가져오기
  const getSelectedBulletinTitle = () => {
    if (!selectedBulletinId) return '게시판 선택'
    const bulletin = bulletins.find(b => b.id === selectedBulletinId)
    return bulletin?.title || '게시판 선택'
  }

  if (loading) {
    return (
      <div className="relative">
        <button
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled
        >
          <span className="text-gray-500">로딩 중...</span>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-medium text-gray-700">{getSelectedBulletinTitle()}</span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {renderBulletinTree(getTopLevelBulletins())}
          </div>
        </div>
      )}
    </div>
  )
} 