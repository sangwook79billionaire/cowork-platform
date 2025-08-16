'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin } from '@/types/firebase'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
  EllipsisVerticalIcon,
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
  useDroppable,
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
  onEditBulletin?: (bulletinId: string) => void
  onDeleteBulletin?: (bulletinId: string) => void
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
  onEditBulletin,
  onDeleteBulletin,
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
  onEditBulletin?: (bulletinId: string) => void
  onDeleteBulletin?: (bulletinId: string) => void
  isOver?: boolean
}) {
  const { user, isAdmin } = useAuth()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bulletin.id })

  const {
    setNodeRef: setDroppableRef,
    isOver: isDroppableOver,
  } = useDroppable({ id: `droppable-${bulletin.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setDroppableRef} style={style} className="mb-1 relative">
      {/* 드롭 영역 표시 */}
      {isDroppableOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-10">
          <div className="flex flex-col items-center justify-center h-full space-y-1">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
              여기에 드롭
            </div>
            <div className="text-blue-600 text-xs text-center">
              <div>• 상단: 앞으로 이동</div>
              <div>• 중간: 하위로 이동</div>
              <div>• 하단: 뒤로 이동</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 드래그 중일 때 시각적 피드백 */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-30 border-2 border-blue-300 rounded-lg pointer-events-none z-5"></div>
      )}
      
      <div
        id={bulletin.id}
        ref={setNodeRef}
        onClick={onSelect}
        className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md transition-colors relative ${
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

        {/* 확장/축소 버튼 - 하위 게시판이 있을 때만 표시 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpansion()
            }}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            title={isExpanded ? "게시판 접기" : "게시판 펼치기"}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRightIcon className="w-3 h-3" />
            )}
          </button>
        ) : (
          <div className="w-3 h-3 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
          </div>
        )}

        {/* 레벨 표시 */}
        <div className="flex-shrink-0">
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                lv.{bulletin.level + 1}
              </span>
        </div>

        {/* 게시판 제목 */}
        <span className="flex-1 text-sm truncate">{bulletin.title}</span>

        {/* 액션 버튼들 */}
        <div className="flex items-center space-x-1">
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
          
          {/* 편집 버튼 (모든 사용자에게 표시) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditBulletin?.(bulletin.id)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="게시판 편집"
          >
            <PencilIcon className="w-3 h-3" />
          </button>
          
          {/* 삭제 버튼 (관리자만) */}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteBulletin?.(bulletin.id)
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="게시판 삭제"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          )}
        </div>
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
  onEditBulletin,
  onDeleteBulletin,
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
  const fetchBulletins = () => {
    try {
      const bulletinsRef = collection(db, 'bulletins')
      const q = query(bulletinsRef, orderBy('level', 'asc'), orderBy('order', 'asc'))
      
      // 실시간 데이터 구독
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
        
        // 계층 구조에 따라 정렬
        const sortedBulletins = sortBulletinsByHierarchy(fetchedBulletins)
        setBulletins(sortedBulletins)
        setLoading(false)
      }, (error) => {
        console.error('게시판 데이터 실시간 구독 오류:', error)
        setLoading(false)
      })
      
      // 구독 해제 함수 반환
      return unsubscribe
    } catch (error) {
      console.error('게시판 데이터 가져오기 오류:', error)
      setLoading(false)
      // 에러 발생 시 빈 함수 반환
      return () => {}
    }
  }

  // 계층 구조에 따라 게시판 정렬
  const sortBulletinsByHierarchy = (bulletins: Bulletin[]): Bulletin[] => {
    const result: Bulletin[] = []
    const processed = new Set<string>()
    
    // 최상위 게시판부터 시작
    const topLevel = bulletins.filter(b => !b.parentId || b.parentId.trim() === '')
    
    const addBulletinWithChildren = (bulletin: Bulletin) => {
      if (processed.has(bulletin.id)) return
      
      result.push(bulletin)
      processed.add(bulletin.id)
      
      // 자식 게시판들 추가
      const children = bulletins.filter(b => b.parentId === bulletin.id)
      children.sort((a, b) => a.order - b.order)
      children.forEach(child => addBulletinWithChildren(child))
    }
    
    topLevel.sort((a, b) => a.order - b.order)
    topLevel.forEach(bulletin => addBulletinWithChildren(bulletin))
    
    return result
  }

  useEffect(() => {
    const unsubscribe = fetchBulletins()
    
    // cleanup 함수 반환
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  // 최상위 게시판만 자동으로 확장 (하위 게시판은 접힌 상태)
  useEffect(() => {
    if (bulletins.length > 0) {
      const topLevelBulletins = bulletins.filter(b => !b.parentId || b.parentId.trim() === '');
      const newExpanded = new Set<string>();
      // 최상위 게시판만 확장
      topLevelBulletins.forEach(bulletin => {
        newExpanded.add(bulletin.id);
      });
      onExpandedBulletinsChange(newExpanded);
    }
  }, [bulletins, onExpandedBulletinsChange]);

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

        try {
          let newParentId: string | null = null
          let newLevel: number = 0
          let newOrder: number = 0
          let moveType: 'same-level-before' | 'same-level-after' | 'sub-level' = 'same-level-before'

          // 드롭 위치에 따른 처리
          const targetRect = document.getElementById(targetBulletin.id)?.getBoundingClientRect()
          const draggedRect = document.getElementById(draggedBulletin.id)?.getBoundingClientRect()
          
          if (targetRect && draggedRect) {
            const dropY = (event.activatorEvent as MouseEvent)?.clientY || 0
            const targetTop = targetRect.top
            const targetBottom = targetRect.bottom
            const targetHeight = targetRect.height
            
            // 드롭 위치가 타겟의 상단 1/4 영역이면 타겟의 위에 배치 (같은 레벨)
            if (dropY < targetTop + targetHeight / 4) {
              moveType = 'same-level-before'
              // 타겟과 같은 레벨에 배치
              newParentId = targetBulletin.parentId
              newLevel = targetBulletin.level
              
              // 타겟보다 앞에 배치
              const siblings = bulletins.filter(b => 
                b.parentId === newParentId && b.level === newLevel
              )
              newOrder = Math.max(0, targetBulletin.order - 1)
              
              // 기존 순서 조정
              for (const sibling of siblings) {
                if (sibling.order >= newOrder && sibling.id !== draggedBulletin.id) {
                  await updateDoc(doc(db, 'bulletins', sibling.id), {
                    order: sibling.order + 1,
                    updatedAt: new Date()
                  })
                }
              }
            }
            // 드롭 위치가 타겟의 하단 1/4 영역이면 타겟의 아래에 배치 (같은 레벨)
            else if (dropY > targetBottom - targetHeight / 4) {
              moveType = 'same-level-after'
              // 타겟과 같은 레벨에 배치
              newParentId = targetBulletin.parentId
              newLevel = targetBulletin.level
              
              // 타겟보다 뒤에 배치
              const siblings = bulletins.filter(b => 
                b.parentId === newParentId && b.level === newLevel
              )
              newOrder = targetBulletin.order + 1
              
              // 기존 순서 조정
              for (const sibling of siblings) {
                if (sibling.order > targetBulletin.order && sibling.id !== draggedBulletin.id) {
                  await updateDoc(doc(db, 'bulletins', sibling.id), {
                    order: sibling.order + 1,
                    updatedAt: new Date()
                  })
                }
              }
            }
            // 드롭 위치가 타겟의 중간 영역이면 타겟의 하위로 배치 (하위 레벨)
            else {
              moveType = 'sub-level'
              // 타겟의 하위로 배치
              newParentId = targetBulletin.id
              newLevel = targetBulletin.level + 1
              
              // 하위 게시판들의 순서 조정
              const children = bulletins.filter(b => b.parentId === targetBulletin.id)
              newOrder = children.length
            }
          }

          // 드래그된 게시판 업데이트
          await updateDoc(doc(db, 'bulletins', draggedBulletin.id), {
            parentId: newParentId,
            level: newLevel,
            order: newOrder,
            updatedAt: new Date()
          })

          // 타겟 게시판을 확장 상태로 설정 (하위로 이동한 경우)
          if (newParentId === targetBulletin.id) {
            const newExpanded = new Set([...Array.from(expandedBulletins), targetBulletin.id])
            onExpandedBulletinsChange(newExpanded)
          }

          // 이동 타입에 따른 메시지 표시
          let message = ''
          if (moveType === 'same-level-before') {
            message = `게시판이 "${targetBulletin.title}" 앞으로 이동되었습니다.`
          } else if (moveType === 'same-level-after') {
            message = `게시판이 "${targetBulletin.title}" 뒤로 이동되었습니다.`
          } else if (moveType === 'sub-level') {
            message = `게시판이 "${targetBulletin.title}"의 하위로 이동되었습니다.`
          }
          
          toast.success(message)
          
          // 게시판 데이터 새로고침
          // fetchBulletins() // onSnapshot으로 인해 불필요
        } catch (error) {
          console.error('Error updating bulletin position:', error)
          toast.error('게시판 위치 변경에 실패했습니다.')
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
            onEditBulletin={onEditBulletin}
            onDeleteBulletin={onDeleteBulletin}
            isOver={isOver}
          />

          {/* 하위 게시판들 - 계층 구조로 표시 */}
          {hasChildren && (
            <div className={`ml-4 border-l border-gray-200 ${isExpanded ? 'block' : 'hidden'}`}>
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