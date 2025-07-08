'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore'
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface BulletinTreeProps {
  selectedBulletinId: string | null
  onBulletinSelect: (bulletinId: string) => void
  expandedBulletins: Set<string>
  onExpandedBulletinsChange: (expanded: Set<string>) => void
  onCreateBulletin?: (parentId?: string) => void
  isMobile?: boolean
}

// 드래그 가능한 게시판 아이템 컴포넌트
function SortableBulletinItem({ 
  bulletin, 
  level, 
  hasChildren, 
  isExpanded, 
  isSelected, 
  onToggleExpansion, 
  onSelect, 
  onCreateBulletin,
  onBulletinSelect,
  isOver
}: {
  bulletin: Bulletin
  level: number
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  onToggleExpansion: () => void
  onSelect: () => void
  onCreateBulletin?: (parentId?: string) => void
  onBulletinSelect: (bulletinId: string) => void
  isOver?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bulletin.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        onClick={onSelect}
        className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${
          isSelected ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-700'
        } ${isOver ? 'bg-blue-50 border-2 border-blue-300' : ''}`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-4 h-4 cursor-grab active:cursor-grabbing mr-2"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div className="w-3 h-0.5 bg-gray-400 mb-0.5"></div>
            <div className="w-3 h-0.5 bg-gray-400 mb-0.5"></div>
            <div className="w-3 h-0.5 bg-gray-400"></div>
          </div>
        </div>

        {/* 확장/축소 버튼 */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpansion()
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
              onCreateBulletin?.(bulletin.id)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="하위 게시판 생성"
          >
            <PlusIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export function BulletinTree({ 
  selectedBulletinId, 
  onBulletinSelect, 
  expandedBulletins, 
  onExpandedBulletinsChange,
  onCreateBulletin,
  isMobile = false
}: BulletinTreeProps) {
  const { user, isAdmin } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 게시판 데이터 가져오기
  const fetchBulletins = async () => {
    try {
      const bulletinsRef = collection(db, 'bulletins')
      const q = query(bulletinsRef, orderBy('order', 'asc'))
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

  // 드래그 시작 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  // 드래그 오버 핸들러
  const handleDragOver = (event: DragEndEvent) => {
    const { over } = event
    setOverId(over?.id as string || null)
  }

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const draggedBulletin = bulletins.find(b => b.id === active.id)
      const targetBulletin = bulletins.find(b => b.id === over?.id)

      if (draggedBulletin && targetBulletin) {
        // 자기 자신을 부모로 설정하는 것을 방지
        if (draggedBulletin.id === targetBulletin.id) {
          setActiveId(null)
          return
        }

        // 드래그된 게시판이 타겟의 하위 게시판인지 확인 (순환 참조 방지)
        const isDescendant = (parentId: string, childId: string): boolean => {
          const children = getChildBulletins(parentId)
          for (const child of children) {
            if (child.id === childId) return true
            if (isDescendant(child.id, childId)) return true
          }
          return false
        }

        if (isDescendant(draggedBulletin.id, targetBulletin.id)) {
          toast.error('자기 자신의 하위 게시판으로 이동할 수 없습니다.')
          setActiveId(null)
          return
        }

        // 새로운 부모 설정
        const newParentId = targetBulletin.id
        const newLevel = getBulletinLevel(targetBulletin.id) + 1

        try {
          // 드래그된 게시판의 부모와 레벨 업데이트
          await updateDoc(doc(db, 'bulletins', draggedBulletin.id), {
            parentId: newParentId,
            level: newLevel,
            updatedAt: new Date()
          })

          // 타겟 게시판을 확장 상태로 설정
          const newExpanded = new Set([...Array.from(expandedBulletins), targetBulletin.id])
          onExpandedBulletinsChange(newExpanded)

          toast.success('게시판 구조가 변경되었습니다.')
          
          // 게시판 데이터 새로고침
          fetchBulletins()
        } catch (error) {
          console.error('Error updating bulletin hierarchy:', error)
          toast.error('게시판 구조 변경에 실패했습니다.')
        }
      }
    }
    setActiveId(null)
    setOverId(null)
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
      const isOver = overId === bulletin.id

      return (
        <div key={bulletin.id}>
          <SortableBulletinItem
            bulletin={bulletin}
            level={level}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggleExpansion={() => toggleBulletinExpansion(bulletin.id)}
            onSelect={() => onBulletinSelect(bulletin.id)}
            onCreateBulletin={handleCreateBulletin}
            onBulletinSelect={onBulletinSelect}
            isOver={isOver}
          />

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
          >
            <SortableContext
              items={getTopLevelBulletins().map(bulletin => bulletin.id)}
              strategy={verticalListSortingStrategy}
            >
              {renderBulletinTree(getTopLevelBulletins())}
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-200">
                  <span className="text-sm font-medium">
                    {bulletins.find(b => b.id === activeId)?.title}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
            {/* 드롭 인디케이터 */}
            {overId && activeId && overId !== activeId && (
              <div className="fixed pointer-events-none z-50">
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  여기에 드롭하여 하위 게시판으로 이동
                </div>
              </div>
            )}
          </DndContext>
        </div>
    </div>
  )
}