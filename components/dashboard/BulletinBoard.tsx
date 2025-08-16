'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { collection, query, where, getDocs, addDoc, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore'
import { db, getDisplayName, getDisplayNameFromUser, getUserNickname } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin, BulletinPost } from '@/types/firebase'
import toast from 'react-hot-toast'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import FloatingMenuExtension from '@tiptap/extension-floating-menu'
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
import {
  useDroppable,
} from '@dnd-kit/core'
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  EyeIcon,
  HeartIcon,
  StarIcon,
  LockClosedIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  XMarkIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  LinkIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import BulletinEditModal from './BulletinEditModal'

interface BulletinBoardProps {
  onSelectPost: (postId: string) => void
  selectedPostId: string | null
  onCreatePost: () => void
  onBulletinSelect?: (bulletinId: string) => void
  onRefreshPosts?: () => void
  selectedBulletinId?: string | null
  isSidebar?: boolean
  isMainContent?: boolean
  showCreatePost?: boolean
  setShowCreatePost?: (show: boolean) => void
  onAddTopLevelBulletin?: () => void
}

// Timestamp를 Date로 안전하게 변환하는 함수
const safeTimestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    try { return new Date(timestamp); } catch (error) { console.warn('Invalid date string:', timestamp); return null; }
  }
  if (typeof timestamp === 'number') {
    try { return new Date(timestamp); } catch (error) { console.warn('Invalid timestamp number:', timestamp); return null; }
  }
  console.warn('Unknown timestamp format:', timestamp);
  return null;
}

// Firebase 연결 상태 확인
const isFirebaseConnected = typeof window !== 'undefined' && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'dummy-key' &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'dummy-project'

// 드래그 가능한 게시판 아이템 컴포넌트
function SortableBulletinItem({ 
  bulletin, 
  isSelected, 
  isExpanded, 
  hasChildren,
  onBulletinSelect,
  onToggleExpansion,
  onEditBulletin,
  onOpenCreateBulletin,
  onDeleteBulletin,
  onToggleLevelDropdown,
  onSelectLevel,
  levelDropdownOpen,
  onLongPressStart,
  onLongPressEnd,
  onLongPressCancel,
  longPressedBulletin,
  closeMobileEditOptions,
  level = 0
}: {
  bulletin: Bulletin
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  onBulletinSelect: (bulletin: Bulletin) => void
  onToggleExpansion: (bulletinId: string) => void
  onEditBulletin: (bulletin: Bulletin) => void
  onOpenCreateBulletin: (type: 'same-level' | 'sub-level' | 'top-level', bulletin?: Bulletin) => void
  onDeleteBulletin: (bulletinId: string) => void
  onToggleLevelDropdown: (bulletinId: string | null) => void
  onSelectLevel: (bulletin: Bulletin, newLevel: number) => void
  levelDropdownOpen: string | null
  onLongPressStart: (bulletinId: string) => void
  onLongPressEnd: () => void
  onLongPressCancel: () => void
  longPressedBulletin: string | null
  closeMobileEditOptions: () => void
  level?: number
}) {
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
    isOver,
  } = useDroppable({ id: `droppable-${bulletin.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
          <div
        ref={setDroppableRef}
        className={`relative ${isOver ? 'bg-blue-50 border-2 border-blue-300 rounded-lg' : ''}`}
      >
        {/* 드롭 영역 표시 */}
        {isOver && (
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
        style={style}
        className={`
          flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
          ${isSelected 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-700 hover:bg-gray-50'
          }
          ${isDragging ? 'opacity-50' : ''}
          ${isOver ? 'bg-blue-100' : ''}
        `}
        onClick={() => onBulletinSelect(bulletin)}
        onTouchStart={() => onLongPressStart(bulletin.id)}
        onTouchEnd={onLongPressEnd}
        onTouchCancel={onLongPressCancel}
        onMouseDown={() => onLongPressStart(bulletin.id)}
        onMouseUp={onLongPressEnd}
        onMouseLeave={onLongPressCancel}
      >
        {/* 왼쪽 영역: 게시판 제목 (모바일에서는 우선적으로 표시) */}
        <div className="flex items-center flex-1 min-w-0">
          {/* 데스크톱에서만 드래그 핸들 표시 */}
          <div className="hidden md:block">
            <div
              {...attributes}
              {...listeners}
              className="p-1 hover:bg-gray-200 rounded transition-colors cursor-grab active:cursor-grabbing mr-2"
              title="드래그하여 이동"
            >
              <ArrowsUpDownIcon className="w-3 h-3 text-gray-400" />
            </div>
          </div>
          
          {/* 게시판 제목 (모바일에서 우선 표시) */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {/* 데스크톱에서만 레벨 표시 */}
            <div className="hidden md:block relative flex-shrink-0 level-dropdown">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLevelDropdown(bulletin.id)
                }}
                className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium hover:bg-gray-200 transition-colors flex items-center space-x-1"
              >
                <span>Lv.{bulletin.level + 1}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 레벨 선택 드롭다운 */}
              {levelDropdownOpen === bulletin.id && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
                  <div className="py-1">
                    {Array.from({ length: Math.max(1, bulletin.level + 2) }, (_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectLevel(bulletin, i)
                          onToggleLevelDropdown(null)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                          i === bulletin.level ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Lv.{i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="truncate font-medium">{bulletin.title}</span>
          </div>
        </div>
        
        {/* 오른쪽 영역: 데스크톱에서만 편집 버튼들 표시 */}
        <div className="hidden md:flex items-center space-x-1 ml-2">
          {/* 하위 게시판이 있을 때만 확장/축소 버튼 표시 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpansion(bulletin.id)
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={isExpanded ? "축소" : "확장"}
            >
              <ChevronDownIcon 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenCreateBulletin('same-level', bulletin)
            }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="같은 레벨에 게시판 추가"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditBulletin(bulletin)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="편집"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenCreateBulletin('sub-level', bulletin)
            }}
            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="하위 게시판 추가"
          >
            <FolderPlusIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteBulletin(bulletin.id)
            }}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="삭제"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 모바일에서 확장/축소 버튼만 표시 */}
        <div className="md:hidden">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpansion(bulletin.id)
              }}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title={isExpanded ? "축소" : "확장"}
            >
              <ChevronDownIcon 
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
          )}
        </div>
      </div>

      {/* 모바일 롱프레스 편집 옵션 */}
      {longPressedBulletin === bulletin.id && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-90 rounded-lg flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-4 shadow-lg max-w-xs w-full mx-4">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-gray-900">{bulletin.title}</h3>
              <p className="text-sm text-gray-600">편집 옵션</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEditBulletin(bulletin)
                  closeMobileEditOptions()
                }}
                className="flex flex-col items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <PencilIcon className="w-6 h-6 text-blue-600 mb-1" />
                <span className="text-xs text-blue-600">편집</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCreateBulletin('same-level', bulletin)
                  closeMobileEditOptions()
                }}
                className="flex flex-col items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <PlusIcon className="w-6 h-6 text-green-600 mb-1" />
                <span className="text-xs text-green-600">추가</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCreateBulletin('sub-level', bulletin)
                  closeMobileEditOptions()
                }}
                className="flex flex-col items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <FolderPlusIcon className="w-6 h-6 text-purple-600 mb-1" />
                <span className="text-xs text-purple-600">하위</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteBulletin(bulletin.id)
                  closeMobileEditOptions()
                }}
                className="flex flex-col items-center p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <TrashIcon className="w-6 h-6 text-red-600 mb-1" />
                <span className="text-xs text-red-600">삭제</span>
              </button>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeMobileEditOptions()
              }}
              className="w-full mt-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}
      
      {/* 드롭 영역 표시 */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-50 rounded-lg pointer-events-none z-10">
          <div className="flex items-center justify-center h-full">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
              순서 변경
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function BulletinBoard({ 
  onSelectPost, 
  selectedPostId, 
  onCreatePost, 
  onBulletinSelect, 
  onRefreshPosts,
  selectedBulletinId: externalSelectedBulletinId,
  isSidebar = false,
  isMainContent = false,
  showCreatePost: externalShowCreatePost,
  setShowCreatePost: externalSetShowCreatePost
}: BulletinBoardProps) {
  const { user, isAdmin } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [posts, setPosts] = useState<BulletinPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateBulletin, setShowCreateBulletin] = useState(false)
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [newBulletin, setNewBulletin] = useState<Partial<Bulletin>>({
    title: '',
    description: '',
    parentId: '',
  })
  const [editBulletinForm, setEditBulletinForm] = useState<Partial<Bulletin>>({
    title: '',
    description: '',
  })
  const [newPost, setNewPost] = useState<Partial<BulletinPost>>({
    title: '',
    content: '',
    tags: [],
  })
  const [selectedBulletinIds, setSelectedBulletinIds] = useState<Set<string>>(new Set())
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    // 기본적으로 최상위 게시판은 확장된 상태로 설정
    return expanded;
  })
  const [internalSelectedBulletinId, setInternalSelectedBulletinId] = useState<string | null>(null)
  
  // 게시판 생성 관련 상태
  const [showCreateBulletinModal, setShowCreateBulletinModal] = useState(false)
  const [createBulletinType, setCreateBulletinType] = useState<'same-level' | 'sub-level' | 'top-level'>('same-level')
  const [createBulletinForm, setCreateBulletinForm] = useState({
    title: '',
    description: '',
    parentId: '',
  })
  const [selectedParentBulletin, setSelectedParentBulletin] = useState<Bulletin | null>(null)
  
  // 외부에서 전달된 selectedBulletinId가 있으면 사용, 없으면 내부 상태 사용
  const selectedBulletinId = externalSelectedBulletinId || internalSelectedBulletinId

  // 모달 상태를 useRef로 관리 (상태 초기화 문제 우회)
  const modalRef = useRef({
    showEditBulletin: false,
    editingBulletin: null as Bulletin | null,
    editBulletinForm: { title: '', description: '' }
  })

  // 모달 강제 렌더링을 위한 상태
  const [modalKey, setModalKey] = useState(0)

  // 레벨 드롭다운 관련 상태
  const [levelDropdownOpen, setLevelDropdownOpen] = useState<string | null>(null)

  // 모바일 롱프레스 관련 상태
  const [longPressedBulletin, setLongPressedBulletin] = useState<string | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (levelDropdownOpen && !(event.target as Element).closest('.level-dropdown')) {
        setLevelDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [levelDropdownOpen])

  // 모달 상태 설정 함수
  const setModalState = useCallback((show: boolean, bulletin: Bulletin | null, form: Partial<Bulletin>) => {
    console.log('🔧 모달 상태 업데이트 (useRef):', { show, bulletin, form })
    modalRef.current = {
      showEditBulletin: show,
      editingBulletin: bulletin,
      editBulletinForm: { ...modalRef.current.editBulletinForm, ...form }
    }
    // 강제 리렌더링
    setModalKey(prev => prev + 1)
  }, [])

  // 게시판 편집 핸들러
  const handleEditBulletin = useCallback((bulletin: Bulletin) => {
    console.log('✏️ 게시판 편집 버튼 클릭됨:', bulletin)
    setModalState(true, bulletin, { title: bulletin.title, description: bulletin.description })
  }, [setModalState])

  // 레벨 드롭다운 토글
  const handleToggleLevelDropdown = useCallback((bulletinId: string | null) => {
    setLevelDropdownOpen(bulletinId)
  }, [])

  // 레벨 선택 핸들러
  const handleSelectLevel = useCallback(async (bulletin: Bulletin, newLevel: number) => {
    try {
      if (newLevel === bulletin.level) {
        return // 같은 레벨이면 변경하지 않음
      }

      // 새로운 부모 찾기
      let newParentId: string | null = null
      
      if (newLevel === 0) {
        // 최상위 레벨로 이동
        newParentId = null
      } else {
        // 해당 레벨의 부모 찾기
        const targetParent = bulletins.find(b => b.level === newLevel - 1)
        if (targetParent) {
          newParentId = targetParent.id
        } else {
          toast.error('해당 레벨로 이동할 수 없습니다.')
          return
        }
      }

      // 게시판 이동
      const bulletinRef = doc(db, 'bulletins', bulletin.id)
      await updateDoc(bulletinRef, {
        parentId: newParentId,
        level: newLevel,
        updatedAt: serverTimestamp(),
      })
      
      toast.success(`Lv.${newLevel + 1}로 이동되었습니다.`)
    } catch (error) {
      console.error('레벨 변경 오류:', error)
      toast.error('레벨 변경에 실패했습니다.')
    }
  }, [bulletins])

  // 모바일 롱프레스 시작
  const handleLongPressStart = useCallback((bulletinId: string) => {
    const timer = setTimeout(() => {
      setLongPressedBulletin(bulletinId)
      toast.success('편집 옵션이 표시되었습니다.')
    }, 500) // 0.5초 길게 누르기
    setLongPressTimer(timer)
  }, [])

  // 모바일 롱프레스 종료
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }, [longPressTimer])

  // 모바일 롱프레스 취소
  const handleLongPressCancel = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setLongPressedBulletin(null)
  }, [longPressTimer])

  // 모바일에서 편집 옵션 닫기
  const closeMobileEditOptions = useCallback(() => {
    setLongPressedBulletin(null)
  }, [])

  // 모바일 롱프레스 타이머 정리
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  }, [longPressTimer])

  // 게시판 저장 핸들러
  const handleSaveEditBulletin = async () => {
    const { editingBulletin, editBulletinForm } = modalRef.current
    if (!editingBulletin || !editBulletinForm.title?.trim()) {
      toast.error('게시판 제목을 입력해주세요.')
      return
    }
    try {
      const bulletinRef = doc(db, 'bulletins', editingBulletin.id)
      await updateDoc(bulletinRef, {
        title: editBulletinForm.title.trim(),
        description: editBulletinForm.description || '',
        updatedAt: serverTimestamp(),
      })
      toast.success('게시판이 수정되었습니다.')
      setModalState(false, null, { title: '', description: '' })
    } catch (error) {
      console.error('게시판 수정 오류:', error)
      toast.error('게시판 수정에 실패했습니다.')
    }
  }

  // 게시판 생성 모달 열기
  const handleOpenCreateBulletin = (type: 'same-level' | 'sub-level' | 'top-level', parentBulletin?: Bulletin) => {
    setCreateBulletinType(type)
    setSelectedParentBulletin(parentBulletin || null)
    
    if (type === 'top-level') {
      // 최상위 레벨에 추가
      setCreateBulletinForm({
        title: '',
        description: '',
        parentId: '',
      })
    } else if (type === 'same-level') {
      // 같은 레벨에 추가 (같은 부모 하위에)
      setCreateBulletinForm({
        title: '',
        description: '',
        parentId: parentBulletin?.parentId || '',
      })
    } else {
      // 하위 레벨에 추가 (현재 게시판의 자식으로)
      setCreateBulletinForm({
        title: '',
        description: '',
        parentId: parentBulletin?.id || '',
      })
    }
    
    setShowCreateBulletinModal(true)
  }

  // 게시판 생성 저장
  const handleSaveCreateBulletin = async () => {
    if (!createBulletinForm.title?.trim()) {
      toast.error('게시판 제목을 입력해주세요.')
      return
    }
    
    try {
      const parentId = createBulletinForm.parentId
      const parentLevel = parentId ? getBulletinLevel(parentId) : 0
      const newLevel = parentLevel + 1
      
      // 같은 레벨의 게시판 개수 확인하여 order 설정
      const sameLevelBulletins = bulletins.filter(b => 
        b.level === newLevel && b.parentId === parentId
      )
      const newOrder = sameLevelBulletins.length

      const bulletinData = {
        title: createBulletinForm.title.trim(),
        description: createBulletinForm.description || '',
        parentId: parentId || '',
        level: newLevel,
        order: newOrder,
        isActive: true,
        userId: user?.uid || 'unknown',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      await addDoc(collection(db, 'bulletins'), bulletinData)
      
      toast.success('게시판이 생성되었습니다.')
      setShowCreateBulletinModal(false)
      setCreateBulletinForm({ title: '', description: '', parentId: '' })
      setSelectedParentBulletin(null)
      
      // 새로 생성된 게시판이 하위 레벨인 경우 부모를 확장
      if (createBulletinType === 'sub-level' && selectedParentBulletin) {
        setExpandedBulletins(prev => new Set([...prev, selectedParentBulletin.id]))
      }
    } catch (error) {
      console.error('게시판 생성 오류:', error)
      toast.error('게시판 생성에 실패했습니다.')
    }
  }

  // 게시판 선택
  const handleBulletinSelect = (bulletin: Bulletin) => {
    setInternalSelectedBulletinId(bulletin.id)
    if (onBulletinSelect) {
      onBulletinSelect(bulletin.id)
    }
  }

  // 게시글 확장/축소 토글
  const handleSelectPost = (post: BulletinPost) => {
    setSelectedPost(post)
    setShowPostModal(true)
    setIsReadingMode(true)
    onSelectPost(post.id)
  }

  const handleEditPost = (post: BulletinPost) => {
    setSelectedPost(post)
    setEditingPostData(post)
    setShowPostModal(true)
    setIsReadingMode(false)
    // 에디터에 기존 내용 설정
    if (editor) {
      editor.commands.setContent(post.content || '')
    }
  }

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true)
    const activeBulletin = bulletins.find(b => b.id === event.active.id)
    setDraggedBulletin(activeBulletin || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false)
    setDraggedBulletin(null)
    const { active, over } = event

    if (active.id !== over?.id && over?.id) {
      const activeBulletin = bulletins.find(b => b.id === active.id)
      const overBulletin = bulletins.find(b => b.id === over.id)

      if (activeBulletin && overBulletin) {
        try {
          let newParentId: string | null = null
          let newLevel: number = 0
          let newOrder: number = 0
          let moveType: 'same-level-before' | 'same-level-after' | 'sub-level' = 'same-level-before'

          // 드롭 위치에 따른 처리
          const targetElement = document.getElementById(overBulletin.id)
          if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect()
            const dropY = (event.activatorEvent as MouseEvent)?.clientY || 0
            const targetTop = targetRect.top
            const targetBottom = targetRect.bottom
            const targetHeight = targetRect.height
            
            // 드롭 위치가 타겟의 상단 1/4 영역이면 타겟의 위에 배치 (같은 레벨)
            if (dropY < targetTop + targetHeight / 4) {
              moveType = 'same-level-before'
              // 타겟과 같은 레벨에 배치
              newParentId = overBulletin.parentId
              newLevel = overBulletin.level
              
              // 타겟보다 앞에 배치
              const siblings = bulletins.filter(b => 
                b.parentId === newParentId && b.level === newLevel
              )
              newOrder = Math.max(0, overBulletin.order - 1)
              
              // 기존 순서 조정
              const batch = writeBatch(db)
              for (const sibling of siblings) {
                if (sibling.order >= newOrder && sibling.id !== activeBulletin.id) {
                  const ref = doc(db, 'bulletins', sibling.id)
                  batch.update(ref, { 
                    order: sibling.order + 1,
                    updatedAt: serverTimestamp()
                  })
                }
              }
              await batch.commit()
            }
            // 드롭 위치가 타겟의 하단 1/4 영역이면 타겟의 아래에 배치 (같은 레벨)
            else if (dropY > targetBottom - targetHeight / 4) {
              moveType = 'same-level-after'
              // 타겟과 같은 레벨에 배치
              newParentId = overBulletin.parentId
              newLevel = overBulletin.level
              
              // 타겟보다 뒤에 배치
              const siblings = bulletins.filter(b => 
                b.parentId === newParentId && b.level === newLevel
              )
              newOrder = overBulletin.order + 1
              
              // 기존 순서 조정
              const batch = writeBatch(db)
              for (const sibling of siblings) {
                if (sibling.order > overBulletin.order && sibling.id !== activeBulletin.id) {
                  const ref = doc(db, 'bulletins', sibling.id)
                  batch.update(ref, { 
                    order: sibling.order + 1,
                    updatedAt: serverTimestamp()
                  })
                }
              }
              await batch.commit()
            }
            // 드롭 위치가 타겟의 중간 영역이면 타겟의 하위로 배치 (하위 레벨)
            else {
              moveType = 'sub-level'
              // 타겟의 하위로 배치
              newParentId = overBulletin.id
              newLevel = overBulletin.level + 1
              
              // 하위 게시판들의 순서 조정
              const children = bulletins.filter(b => b.parentId === overBulletin.id)
              newOrder = children.length
            }
          }

          // 드래그된 게시판 업데이트
          await updateDoc(doc(db, 'bulletins', activeBulletin.id), {
            parentId: newParentId,
            level: newLevel,
            order: newOrder,
            updatedAt: serverTimestamp()
          })
          
          // 이동 타입에 따른 메시지 표시
          let message = ''
          if (moveType === 'same-level-before') {
            message = `게시판이 "${overBulletin.title}" 앞으로 이동되었습니다.`
          } else if (moveType === 'same-level-after') {
            message = `게시판이 "${overBulletin.title}" 뒤로 이동되었습니다.`
          } else if (moveType === 'sub-level') {
            message = `게시판이 "${overBulletin.title}"의 하위로 이동되었습니다.`
          }
          
          toast.success(message)
        } catch (error) {
          console.error('게시판 위치 변경 오류:', error)
          toast.error('게시판 위치 변경에 실패했습니다.')
        }
      }
    }
  }

  // 게시판 삭제
  const handleDeleteBulletin = async (bulletinId: string) => {
    if (!confirm('정말로 이 게시판을 삭제하시겠습니까?')) {
      return
    }
    try {
      await deleteDoc(doc(db, 'bulletins', bulletinId))
      toast.success('게시판이 삭제되었습니다.')
    } catch (error) {
      console.error('게시판 삭제 오류:', error)
      toast.error('게시판 삭제에 실패했습니다.')
    }
  }

  // 상위 게시판으로 이동
  const handleMoveToParent = async (bulletin: Bulletin) => {
    try {
      // 현재 게시판의 부모를 찾기
      const currentParent = bulletins.find(b => b.id === bulletin.parentId)
      
      if (!currentParent) {
        // 이미 최상위 레벨인 경우
        toast.error('이미 최상위 레벨입니다.')
        return
      }

      // 부모의 부모를 찾기 (상위 레벨로 이동)
      const grandParent = bulletins.find(b => b.id === currentParent.parentId)
      
      let newParentId: string | null = null
      let newLevel: number = 0

      if (grandParent) {
        // 할아버지가 있는 경우: 할아버지의 하위로 이동
        newParentId = grandParent.id
        newLevel = grandParent.level + 1
      } else {
        // 할아버지가 없는 경우: 최상위 레벨로 이동
        newParentId = null
        newLevel = 0
      }

      // 게시판 이동
      const bulletinRef = doc(db, 'bulletins', bulletin.id)
      await updateDoc(bulletinRef, {
        parentId: newParentId,
        level: newLevel,
        updatedAt: serverTimestamp(),
      })
      
      toast.success('상위 레벨로 이동되었습니다.')
      
      // 모달 닫기
      setModalState(false, null, { title: '', description: '' })
    } catch (error) {
      console.error('상위 레벨 이동 오류:', error)
      toast.error('상위 레벨 이동에 실패했습니다.')
    }
  }

  // 게시판 확장/축소 토글
  const toggleBulletinExpansion = (bulletinId: string) => {
    setExpandedBulletins(prev => {
      const next = new Set(prev)
      if (next.has(bulletinId)) {
        next.delete(bulletinId)
      } else {
        next.add(bulletinId)
      }
      return next
    })
  }

  // 하위 게시판 가져오기
  const getChildBulletins = (parentId: string) => {
    return bulletins.filter(b => b.parentId === parentId)
  }

  // 최상위 게시판 가져오기
  const getTopLevelBulletins = () => {
    return bulletins.filter(b => !b.parentId || b.parentId === '')
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

  // 게시판 레벨 가져오기
  const getBulletinLevel = (bulletinId: string): number => {
    const bulletin = bulletins.find(b => b.id === bulletinId)
    if (!bulletin) return 0
    if (!bulletin.parentId || bulletin.parentId === '') return 0
    return 1 + getBulletinLevel(bulletin.parentId)
  }

  // 게시판 경로 가져오기
  const getBulletinPath = (bulletinId: string): Bulletin[] => {
    const path: Bulletin[] = []
    let currentBulletin = bulletins.find(b => b.id === bulletinId)

    while (currentBulletin) {
      path.unshift(currentBulletin)
      const parentBulletin = bulletins.find(b => b.id === currentBulletin!.parentId)
      currentBulletin = parentBulletin
    }
    return path
  }

  // 게시판 트리 렌더링
  const renderBulletinTree = (
    bulletins: Bulletin[],
    allBulletins: Bulletin[],
    level: number = 0
  ) => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={bulletins.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">

            
            {bulletins.map((bulletin) => {
              const isSelected = selectedBulletinId === bulletin.id
              const isExpanded = expandedBulletins.has(bulletin.id)
              const hasChildren = allBulletins.some(b => b.parentId === bulletin.id)
              const childBulletins = allBulletins.filter(b => b.parentId === bulletin.id)

              return (
                <div key={bulletin.id} className="space-y-1">
                  <SortableBulletinItem
                    bulletin={bulletin}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    hasChildren={hasChildren}
                    onBulletinSelect={handleBulletinSelect}
                    onToggleExpansion={toggleBulletinExpansion}
                    onEditBulletin={handleEditBulletin}
                    onOpenCreateBulletin={handleOpenCreateBulletin}
                    onDeleteBulletin={handleDeleteBulletin}
                    onToggleLevelDropdown={handleToggleLevelDropdown}
                    onSelectLevel={handleSelectLevel}
                    levelDropdownOpen={levelDropdownOpen}
                    onLongPressStart={handleLongPressStart}
                    onLongPressEnd={handleLongPressEnd}
                    onLongPressCancel={handleLongPressCancel}
                    longPressedBulletin={longPressedBulletin}
                    closeMobileEditOptions={closeMobileEditOptions}
                    level={level}
                  />
                  
                  {/* 하위 게시판들 - 드롭다운 형식으로 표시 */}
                  {hasChildren && (
                    <div className={`ml-4 border-l border-gray-200 transition-all duration-200 ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      {renderBulletinTree(childBulletins, allBulletins, level + 1)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SortableContext>
        
        {/* 드래그 오버레이 */}
        <DragOverlay>
          {draggedBulletin ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-90">
              <div className="flex items-center space-x-2">
                <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{draggedBulletin.title}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
              </DndContext>
    )
  }

  // 게시글 생성
  const handleCreatePost = async () => {
    if (!selectedBulletinId || !newPost.title?.trim()) {
      toast.error('게시판을 선택하고 제목을 입력해주세요.')
      return
    }
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }
    try {
      // 사용자 닉네임 가져오기
      let authorName = '익명'
      if (user?.uid) {
        const nickname = await getUserNickname(user.uid)
        // 닉네임이 '익명'이거나 비어있으면 이메일 사용
        if (nickname && nickname !== '익명') {
          authorName = nickname
        } else if (user.email) {
          authorName = user.email
        }
      }

      const postData = {
        title: newPost.title.trim(),
        content: newPost.content || '',
        bulletinId: selectedBulletinId,
        userId: user?.uid || 'unknown',
        authorName: authorName,
        isPinned: false,
        isLocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      await addDoc(collection(db, 'bulletinPosts'), postData)
      toast.success('게시글이 작성되었습니다.')
      setNewPost({ title: '', content: '', tags: [] })
      editor?.commands.setContent('') // Clear editor content
      externalSetShowCreatePost?.(false) // Close modal
      onRefreshPosts?.() // Refresh posts list
    } catch (error) {
      console.error('게시글 작성 오류:', error)
      toast.error('게시글 작성에 실패했습니다.')
    }
  }

  // 게시글 삭제
  const handleDeletePost = async (postId: string) => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return
    }
    try {
      await deleteDoc(doc(db, 'bulletinPosts', postId))
      toast.success('게시글이 삭제되었습니다.')
    } catch (error) {
      console.error('게시글 삭제 오류:', error)
      toast.error('게시글 삭제에 실패했습니다.')
    }
  }

  // 게시글 수정 저장
  const handleSaveEditPost = async () => {
    if (!editingPostData || !editingPostData.title?.trim()) {
      toast.error('게시글 제목을 입력해주세요.')
      return
    }
    try {
      const postRef = doc(db, 'bulletinPosts', editingPostData.id)
      await setDoc(postRef, {
        ...editingPostData,
        title: editingPostData.title.trim(),
        content: editingPostData.content || '',
        updatedAt: serverTimestamp(),
      }, { merge: true })
      toast.success('게시글이 수정되었습니다.')
      setEditingPostData(null)
    } catch (error) {
      console.error('게시글 수정 오류:', error)
      toast.error('게시글 수정에 실패했습니다.')
    }
  }

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // 게시판 데이터 초기화
  useEffect(() => {
    let bulletinsUnsubscribe: (() => void) | undefined

    const initializeData = async () => {
      if (user) {
        if (!db || !isFirebaseConnected) {
          setError('Firebase 연결이 설정되지 않았습니다.')
          setLoading(false)
          return
        }

        try {
          const q = query(collection(db, 'bulletins'))
          bulletinsUnsubscribe = onSnapshot(q, (querySnapshot) => {
            const bulletinData: Bulletin[] = []
            querySnapshot.forEach((doc) => {
              const data = doc.data()
              const bulletin = {
                id: doc.id,
                title: data.title,
                description: data.description,
                parentId: data.parentId,
                level: data.level,
                order: data.order || 0,
                isActive: data.isActive,
                userId: data.userId || 'unknown',
                createdAt: safeTimestampToDate(data.createdAt) || new Date(),
                updatedAt: safeTimestampToDate(data.updatedAt) || new Date(),
              }
              bulletinData.push(bulletin)
            })
            // 계층 구조에 따라 정렬
            const sortedBulletins = sortBulletinsByHierarchy(bulletinData)
            setBulletins(sortedBulletins)
            
            // 기본적으로 최상위 게시판을 확장 상태로 설정
            const topLevelBulletins = sortedBulletins.filter(b => !b.parentId || b.parentId.trim() === '')
            const expandedSet = new Set<string>()
            topLevelBulletins.forEach(bulletin => {
              expandedSet.add(bulletin.id)
            })
            setExpandedBulletins(expandedSet)
            
            setLoading(false)
          }, (error) => {
            console.error('실시간 게시판 데이터 가져오기 오류:', error)
            setError('게시판 데이터를 가져오는 중 오류가 발생했습니다.')
            setLoading(false)
          })
        } catch (error) {
          console.error('게시판 데이터 초기화 오류:', error)
          setError('게시판 데이터를 초기화하는 중 오류가 발생했습니다.')
          setLoading(false)
        }
      }
    }

    initializeData()

    return () => {
      if (bulletinsUnsubscribe) {
        bulletinsUnsubscribe()
      }
    }
  }, [user])

  // 게시글 데이터 초기화
  useEffect(() => {
    let postsUnsubscribe: (() => void) | undefined

    const initializePosts = async () => {
      if (user && selectedBulletinId) {
        if (!db || !isFirebaseConnected) {
          return
        }

        try {
          const q = query(
            collection(db, 'bulletinPosts'),
            where('bulletinId', '==', selectedBulletinId)
          )
          
          postsUnsubscribe = onSnapshot(q, (querySnapshot) => {
            const postData: BulletinPost[] = []
            querySnapshot.forEach((doc) => {
              const data = doc.data()
              const post = {
                id: doc.id,
                title: data.title,
                content: data.content,
                bulletinId: data.bulletinId,
                userId: data.userId,
                authorName: data.authorName,
                isPinned: data.isPinned || false,
                isLocked: data.isLocked || false,
                viewCount: data.viewCount || 0,
                likeCount: data.likeCount || 0,
                tags: data.tags || [],
                createdAt: safeTimestampToDate(data.createdAt) || new Date(),
                updatedAt: safeTimestampToDate(data.updatedAt) || new Date(),
              }
              postData.push(post)
            })
            
            // 클라이언트 사이드에서 정렬
            postData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            setPosts(postData)
          }, (error) => {
            console.error('실시간 게시글 데이터 가져오기 오류:', error)
          })
        } catch (error) {
          console.error('게시글 데이터 초기화 오류:', error)
        }
      } else {
        setPosts([])
      }
    }

    initializePosts()

    return () => {
      if (postsUnsubscribe) {
        postsUnsubscribe()
      }
    }
  }, [user, selectedBulletinId])

  // currentBulletin 자동 설정
  useEffect(() => {
    if (selectedBulletinId && bulletins.length > 0) {
      const bulletin = bulletins.find(b => b.id === selectedBulletinId)
      setCurrentBulletin(bulletin || null)
    } else {
      setCurrentBulletin(null)
    }
  }, [selectedBulletinId, bulletins])

  // 게시글 작성 모달 상태
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showEditPost, setShowEditPost] = useState(false)
  const [editingPostData, setEditingPostData] = useState<BulletinPost | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BulletinPost | null>(null)
  const [isReadingMode, setIsReadingMode] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedBulletin, setDraggedBulletin] = useState<Bulletin | null>(null)

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // TipTap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit에서 중복되는 확장 프로그램들을 비활성화
        underline: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Typography,
      Underline,
      Strike,
      Code,
      CodeBlock,
      Blockquote,
      HorizontalRule,
      Image,
      Placeholder.configure({
        placeholder: '내용을 입력해주세요...',
      }),
      Highlight,
      Subscript,
      Superscript,
      TaskList.configure({
        itemTypeName: 'taskItem',
      }),
      TaskItem,
      BubbleMenuExtension,
      FloatingMenuExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setNewPost({ ...newPost, content: editor.getHTML() })
      // 수정 모달이 열려있을 때는 editingPostData도 업데이트
      if (editingPostData) {
        setEditingPostData({ ...editingPostData, content: editor.getHTML() })
      }
    },
    immediatelyRender: false, // SSR hydration 오류 방지
  })

  // 에디터 툴바 버튼들
  const ToolbarButton = ({ onClick, isActive, children, title }: any) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
      }`}
      title={title}
    >
      {children}
    </button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>오류: {error}</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 게시판 편집 모달 */}
      {modalRef.current.showEditBulletin && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 opacity-100 pointer-events-auto" 
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <PencilIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">게시판 편집</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  게시판 제목 *
                </label>
                <input
                  type="text"
                  value={modalRef.current.editBulletinForm.title || ''}
                  onChange={(e) => {
                    modalRef.current.editBulletinForm.title = e.target.value
                    setModalKey(prev => prev + 1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black placeholder-gray-500"
                  placeholder="게시판 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={modalRef.current.editBulletinForm.description || ''}
                  onChange={(e) => {
                    modalRef.current.editBulletinForm.description = e.target.value
                    setModalKey(prev => prev + 1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black placeholder-gray-500"
                  placeholder="게시판 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-4 mt-6">
              {/* 상위 게시판으로 이동 버튼 */}
              {modalRef.current.editingBulletin && modalRef.current.editingBulletin.level > 0 && (
                <button
                  onClick={() => handleMoveToParent(modalRef.current.editingBulletin!)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span>상위 게시판으로 이동</span>
                </button>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setModalState(false, null, { title: '', description: '' })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEditBulletin}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>수정 완료</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 게시판 생성 모달 */}
      {showCreateBulletinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              {createBulletinType === 'same-level' ? (
                <PlusIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <FolderPlusIcon className="w-5 h-5 text-green-600" />
              )}
              <h3 className="text-lg font-semibold">
                {createBulletinType === 'same-level' ? '같은 레벨에 게시판 추가' : '하위 레벨에 게시판 추가'}
              </h3>
            </div>
            
            {selectedParentBulletin && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  선택된 게시판: <span className="font-medium">{selectedParentBulletin.title}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {createBulletinType === 'same-level' 
                    ? '같은 부모 하위에 새 게시판이 생성됩니다.' 
                    : '이 게시판의 하위에 새 게시판이 생성됩니다.'
                  }
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  게시판 제목 *
                </label>
                <input
                  type="text"
                  value={createBulletinForm.title}
                  onChange={(e) => setCreateBulletinForm({ ...createBulletinForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black placeholder-gray-500"
                  placeholder="새 게시판 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={createBulletinForm.description}
                  onChange={(e) => setCreateBulletinForm({ ...createBulletinForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black placeholder-gray-500"
                  placeholder="게시판 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateBulletinModal(false)
                  setCreateBulletinForm({ title: '', description: '', parentId: '' })
                  setSelectedParentBulletin(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveCreateBulletin}
                className={`px-4 py-2 text-white rounded-md transition-colors flex items-center space-x-1 ${
                  createBulletinType === 'same-level' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {createBulletinType === 'same-level' ? (
                  <PlusIcon className="w-4 h-4" />
                ) : (
                  <FolderPlusIcon className="w-4 h-4" />
                )}
                <span>생성 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 편집 모달 */}
      {editingPostData && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setEditingPostData(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
              <input
                type="text"
                value={editingPostData.title || ''}
                onChange={(e) => setEditingPostData({ ...editingPostData, title: e.target.value })}
                className="text-2xl font-bold border-none outline-none bg-transparent text-black placeholder-gray-500"
                placeholder="제목 없음"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingPostData(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveEditPost}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                수정 완료
              </button>
            </div>
          </div>

          {/* 툴바 */}
          <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold')}
              title="굵게"
            >
              <BoldIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic')}
              title="기울임"
            >
              <ItalicIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              isActive={editor?.isActive('underline')}
              title="밑줄"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              isActive={editor?.isActive('strike')}
              title="취소선"
            >
              <span className="w-4 h-4 text-sm font-bold">S</span>
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList')}
              title="글머리 기호 목록"
            >
              <ListBulletIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList')}
              title="번호 매기기 목록"
            >
              <span className="w-4 h-4 text-sm font-bold">1.</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              isActive={editor?.isActive('taskList')}
              title="할 일 목록"
            >
              <span className="w-4 h-4 text-sm">☐</span>
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCode().run()}
              isActive={editor?.isActive('code')}
              title="인라인 코드"
            >
              <span className="w-4 h-4 text-sm font-bold">{'<>'}</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              isActive={editor?.isActive('codeBlock')}
              title="코드 블록"
            >
              <span className="w-4 h-4 text-sm font-bold">{'</>'}</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              isActive={editor?.isActive('blockquote')}
              title="인용구"
            >
              <span className="w-4 h-4 text-sm font-bold">"</span>
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('URL을 입력하세요:')
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run()
                }
              }}
              isActive={editor?.isActive('link')}
              title="링크"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="표 삽입"
            >
              <span className="w-4 h-4 text-sm font-bold">⊞</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="구분선"
            >
              <span className="w-4 h-4 text-sm font-bold">—</span>
            </ToolbarButton>
          </div>

          {/* 에디터 */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <EditorContent editor={editor} className="prose prose-lg max-w-none" />
            </div>
          </div>
        </div>
      )}

      {/* 게시글 작성 모달 */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreatePost(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
              <input
                type="text"
                value={newPost.title || ''}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="text-2xl font-bold border-none outline-none bg-transparent text-black placeholder-gray-500"
                placeholder="제목 없음"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreatePost(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreatePost}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                게시
              </button>
            </div>
          </div>

          {/* 툴바 */}
          <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold')}
              title="굵게"
            >
              <BoldIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic')}
              title="기울임"
            >
              <ItalicIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              isActive={editor?.isActive('underline')}
              title="밑줄"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList')}
              title="글머리 기호 목록"
            >
              <ListBulletIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList')}
              title="번호 매기기 목록"
            >
              <span className="w-4 h-4 text-sm font-bold">1.</span>
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('URL을 입력하세요:')
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run()
                }
              }}
              isActive={editor?.isActive('link')}
              title="링크"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="표 삽입"
            >
              <span className="w-4 h-4 text-sm font-bold">⊞</span>
            </ToolbarButton>
          </div>

          {/* 에디터 */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <EditorContent editor={editor} className="prose prose-lg max-w-none" />
            </div>
          </div>
        </div>
      )}

      {/* 게시글 읽기/편집 모달 */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowPostModal(false)
                  setSelectedPost(null)
                  setIsReadingMode(true)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold">{selectedPost.title}</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{getDisplayName(selectedPost.authorName)}</span>
                  <span>•</span>
                  <span>{formatDate(selectedPost.createdAt)}</span>
                  <span>•</span>
                  <span>조회 {selectedPost.viewCount}</span>
                  <span>•</span>
                  <span>좋아요 {selectedPost.likeCount}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isReadingMode ? (
                <button
                  onClick={() => {
                    setIsReadingMode(false)
                    setEditingPostData(selectedPost)
                    if (editor) {
                      editor.commands.setContent(selectedPost.content || '')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  편집
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsReadingMode(true)
                      setEditingPostData(null)
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEditPost}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    저장
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 읽기 모드 */}
          {isReadingMode ? (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                />
              </div>
            </div>
          ) : (
            /* 편집 모드 */
            <>
              {/* 툴바 */}
              <div className="flex items-center space-x-1 p-2 border-b border-gray-200 bg-gray-50">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editor?.isActive('bold')}
                  title="굵게"
                >
                  <BoldIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editor?.isActive('italic')}
                  title="기울임"
                >
                  <ItalicIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editor?.isActive('underline')}
                  title="밑줄"
                >
                  <UnderlineIcon className="w-4 h-4" />
                </ToolbarButton>
                
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editor?.isActive('bulletList')}
                  title="글머리 기호 목록"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editor?.isActive('orderedList')}
                  title="번호 매기기 목록"
                >
                  <span className="w-4 h-4 text-sm font-bold">1.</span>
                </ToolbarButton>
                
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                
                <ToolbarButton
                  onClick={() => {
                    const url = window.prompt('URL을 입력하세요:')
                    if (url) {
                      editor?.chain().focus().setLink({ href: url }).run()
                    }
                  }}
                  isActive={editor?.isActive('link')}
                  title="링크"
                >
                  <LinkIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  title="표 삽입"
                >
                  <span className="w-4 h-4 text-sm font-bold">⊞</span>
                </ToolbarButton>
              </div>

              {/* 에디터 */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                  <EditorContent editor={editor} className="prose prose-lg max-w-none" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 좌측 메뉴 영역 */}
      {isSidebar && (
        <div className="w-full lg:w-3/10 bg-white border-r border-gray-200 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">게시판</h2>
              <button
                onClick={() => setShowCreateBulletin(true)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                title="새 게시판 생성"
              >
                <FolderPlusIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {renderBulletinTree(getTopLevelBulletins(), bulletins)}
            </div>
          </div>
        </div>
      )}

      {/* 우측 메인 콘텐츠 영역 */}
      {isMainContent && (
        <div className="flex-1 bg-gray-50 p-4">
          {currentBulletin ? (
            <div className="space-y-4">
              {/* 게시판 경로 (브레드크럼) */}
              <div className="flex items-center space-x-1 mt-1 text-sm text-gray-500">
                <span>홈</span>
                {getBulletinPath(currentBulletin.id).map((bulletin, index) => (
                  <div key={bulletin.id} className="flex items-center space-x-1">
                    <ChevronRightIcon className="w-3 h-3" />
                    <button
                      onClick={() => handleBulletinSelect(bulletin)}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {bulletin.title}
                    </button>
                  </div>
                ))}
              </div>

              {/* 게시판 제목 */}
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{currentBulletin.title}</h1>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>새 글 작성</span>
                </button>
              </div>

              {/* 게시글 목록 */}
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600 mb-2">아직 게시글이 없습니다</p>
                    <p className="text-sm text-gray-500">첫 번째 게시글을 작성해보세요!</p>
                    <button
                      onClick={() => setShowCreatePost(true)}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>첫 글 작성하기</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 게시글 통계 */}
                    <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                      <span>총 {posts.length}개의 게시글</span>
                      <div className="flex items-center space-x-4">
                        <span>📌 고정글: {posts.filter(p => p.isPinned).length}개</span>
                        <span>🔒 잠금글: {posts.filter(p => p.isLocked).length}개</span>
                      </div>
                    </div>
                    
                    {/* 게시글 목록 */}
                    {posts.map((post, index) => (
                      <div 
                        key={post.id} 
                        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                        onClick={() => handleSelectPost(post)}
                      >
                        {/* 게시글 헤더 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {post.title}
                              </h3>
                              {post.isPinned && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  📌 고정
                                </span>
                              )}
                              {post.isLocked && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  🔒 잠금
                                </span>
                              )}
                            </div>
                            
                            {/* 태그 */}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {post.tags.map((tag, tagIndex) => (
                                  <span 
                                    key={tagIndex}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* 관리 버튼들 */}
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditPost(post)
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="게시글 편집"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePost(post.id)
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="게시글 삭제"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* 게시글 메타 정보 */}
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span className="font-medium">{getDisplayName(post.authorName)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>📅</span>
                            <span>{formatDate(post.createdAt)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>👁️</span>
                            <span>{post.viewCount}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>❤️</span>
                            <span>{post.likeCount}</span>
                          </span>
                        </div>
                        
                        {/* 게시글 내용 미리보기 */}
                        <div className="text-gray-700 leading-relaxed">
                          {post.content.length > 300 ? (
                            <div>
                              <p className="mb-2">{post.content.substring(0, 300)}...</p>
                              <span className="text-blue-600 text-sm font-medium">더 보기</span>
                            </div>
                          ) : (
                            <p>{post.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>게시판을 선택하여 게시글을 확인하세요</p>
              <p className="text-sm">좌측에서 원하는 게시판을 클릭하세요</p>
            </div>
          )}
        </div>
      )}
      
      {/* 게시판 수정 모달 */}
      <BulletinEditModal
        isOpen={modalRef.current.showEditBulletin}
        onClose={() => setModalState(false, null, { title: '', description: '' })}
        bulletin={modalRef.current.editingBulletin ? {
          id: modalRef.current.editingBulletin.id,
          title: modalRef.current.editingBulletin.title,
          description: modalRef.current.editingBulletin.description || '',
          parentId: modalRef.current.editingBulletin.parentId || '',
          level: modalRef.current.editingBulletin.level,
          userId: modalRef.current.editingBulletin.userId || '',
          createdAt: modalRef.current.editingBulletin.createdAt || new Date(),
          updatedAt: modalRef.current.editingBulletin.updatedAt || new Date(),
          isActive: modalRef.current.editingBulletin.isActive !== false,
          order: modalRef.current.editingBulletin.order,
          children: modalRef.current.editingBulletin.children || []
        } : null}
        onUpdate={() => {
          // 게시판 데이터 새로고침
          // useEffect가 자동으로 데이터를 새로고침함
        }}
      />
    </div>
  )
} 