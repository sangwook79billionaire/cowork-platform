'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs, addDoc, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin, BulletinPost } from '@/types/firebase'
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
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  HeartIcon,
  StarIcon,
  LockClosedIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface BulletinBoardProps {
  onSelectPost: (postId: string) => void
  selectedPostId: string | null
  onCreatePost: () => void
  onBulletinSelect?: (bulletinId: string) => void
  onRefreshPosts?: () => void
  expandedBulletins?: Set<string>
  onExpandedBulletinsChange?: (expanded: Set<string>) => void
  selectedBulletinId?: string | null
}

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// 드래그 가능한 게시판 컴포넌트
function SortableBulletinItem({ 
  bulletin, 
  level, 
  hasChildren, 
  isExpanded, 
  isSelected, 
  childCount, 
  onToggleExpansion, 
  onSelect, 
  onEdit, 
  onDelete,
  isChecked,
  onCheckChange,
  isAdmin,
  user,
  allBulletins,
  renderBulletinTree
}: {
  bulletin: Bulletin
  level: number
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  childCount: number
  onToggleExpansion: () => void
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  isChecked: boolean
  onCheckChange: (checked: boolean) => void
  isAdmin: boolean
  user: any
  allBulletins: Bulletin[]
  renderBulletinTree: (bulletins: Bulletin[], allBulletins: Bulletin[], level: number) => JSX.Element[]
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
        className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
          isSelected 
            ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm' 
            : level === 0 
              ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' 
              : level === 1 
                ? 'bg-white hover:bg-gray-50 border-gray-100'
                : 'bg-gray-25 hover:bg-gray-50 border-transparent hover:border-gray-200'
        }`}
        style={{ 
          paddingLeft: `${level * 24 + 16}px`,
          marginLeft: `${level * 8}px`,
          marginRight: '8px',
          minWidth: `${Math.max(300, level * 50 + 300)}px`
        }}
      >
        {/* (admin) 체크박스 */}
        {isAdmin && (
          <input
            type="checkbox"
            className="mr-2"
            checked={isChecked}
            onChange={e => onCheckChange(e.target.checked)}
            onClick={e => e.stopPropagation()}
          />
        )}

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
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpansion()
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4 h-6 flex items-center justify-center">
              {level > 0 && (
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              )}
            </div>
          )}
        </div>

        {/* 게시판 아이콘 */}
        <div className="flex-shrink-0">
          {level === 0 ? (
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
          ) : level === 1 ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
            </div>
          ) : level === 2 ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-300 rounded-sm"></div>
            </div>
          ) : level === 3 ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-sm"></div>
            </div>
          ) : level === 4 ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-1 h-1 bg-purple-400 rounded-sm"></div>
            </div>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-1 h-1 bg-gray-400 rounded-sm"></div>
            </div>
          )}
        </div>

        {/* 게시판 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 
              className={`text-sm font-medium truncate cursor-pointer hover:text-primary-600 transition-colors ${
                isSelected ? 'text-primary-700' : 'text-gray-900'
              }`}
              onClick={(e) => {
                // 디버깅을 위한 임시 로그
                console.log('🔍 Bulletin edit check:', {
                  bulletinTitle: bulletin.title,
                  bulletinUserId: bulletin.userId,
                  currentUserId: user?.uid,
                  isAdmin: isAdmin,
                  canEdit: isAdmin || (user && bulletin.userId === user.uid)
                })
                
                // 편집 가능한 게시판인 경우 편집 모드로 전환
                if (isAdmin || (user && bulletin.userId === user.uid)) {
                  console.log('✏️ Opening edit modal for:', bulletin.title)
                  onEdit()
                } else {
                  // 편집 불가능한 경우 선택만
                  console.log('📋 Selecting bulletin:', bulletin.title)
                  onSelect()
                }
              }}
              title={
                isAdmin || (user && bulletin.userId === user.uid) 
                  ? "클릭하여 게시판 이름 편집" 
                  : "클릭하여 게시판 선택"
              }
            >
              {level > 0 && (
                <span className="text-xs text-gray-400 mr-1">L{level}</span>
              )}
              {bulletin.title}
              {/* 편집 가능한 게시판 표시 */}
              {(isAdmin || (user && bulletin.userId === user.uid)) && (
                <span className="ml-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  ✏️
                </span>
              )}
            </h3>
            {/* 권한 표시 배지 */}
            <div className="flex items-center space-x-1">
              {(isAdmin || (user && bulletin.userId === user.uid)) && (
                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                  {isAdmin ? '관리' : '내 게시판'}
                </span>
              )}
              {!(isAdmin || (user && bulletin.userId === user.uid)) && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                  읽기 전용
                </span>
              )}
              {hasChildren && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                  {childCount}
                </span>
              )}
            </div>
          </div>
          {bulletin.description && (
            <p className={`text-xs mt-1 truncate ${
              isSelected ? 'text-primary-500' : 'text-gray-500'
            }`}>
              {bulletin.description}
            </p>
          )}
        </div>

        {/* 계층 레벨 표시 */}
        {level > 0 && (
          <div className="flex-shrink-0 text-xs text-gray-400">
            L{level}
          </div>
        )}

        {/* 수정/삭제 버튼 - 모든 게시판에 표시 */}
        <div className="flex-shrink-0 flex items-center space-x-1 ml-2">
          {/* 편집 버튼 - 모든 게시판에 표시하되 권한에 따라 다르게 처리 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              // 권한 확인
              if (isAdmin || (user && bulletin.userId === user.uid)) {
                console.log('✏️ Edit button clicked for bulletin:', bulletin.title)
                onEdit()
              } else {
                // 권한이 없는 경우 안내
                toast.error('게시판을 수정할 권한이 없습니다. 관리자이거나 게시판 생성자만 수정할 수 있습니다.')
                console.log('❌ No permission to edit bulletin:', bulletin.title)
              }
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 border shadow-sm ${
              isAdmin || (user && bulletin.userId === user.uid)
                ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
            title={
              isAdmin || (user && bulletin.userId === user.uid)
                ? "게시판 수정 (권한 있음)"
                : "게시판 수정 (권한 없음)"
            }
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          
          {/* 삭제 버튼 (admin만) */}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm"
              title="게시판 삭제 (관리자만 가능)"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 하위 게시판들 - 드롭다운 형태 */}
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {renderBulletinTree(
            allBulletins.filter(b => b.parentId === bulletin.id),
            allBulletins,
            level + 1
          )}
        </div>
      )}
    </div>
  )
}

// 모의 데이터
const mockBulletins: Bulletin[] = [
  {
    id: 'bulletin-1',
    title: '공지사항',
    description: '중요한 공지사항을 확인하세요',
    parentId: '',
    level: 0,
    order: 1,
    isActive: true,
    userId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-2',
    title: '자유게시판',
    description: '자유롭게 의견을 나누세요',
    parentId: '',
    level: 0,
    order: 2,
    isActive: true,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-3',
    title: '질문과 답변',
    description: '궁금한 점을 물어보세요',
    parentId: '',
    level: 0,
    order: 3,
    isActive: true,
    userId: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-4',
    title: '프로젝트 공유',
    description: '프로젝트 관련 게시판',
    parentId: 'bulletin-2',
    level: 1,
    order: 1,
    isActive: true,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-5',
    title: '일상 이야기',
    description: '일상적인 이야기를 나누세요',
    parentId: 'bulletin-2',
    level: 1,
    order: 2,
    isActive: true,
    userId: 'user-3',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockPosts: BulletinPost[] = [
  {
    id: 'post-1',
    bulletinId: 'bulletin-1',
    title: '시스템 점검 안내',
    content: '오늘 밤 12시부터 시스템 점검이 있을 예정입니다.',
    userId: 'user-1',
    authorName: '관리자',
    isPinned: true,
    isLocked: false,
    viewCount: 150,
    likeCount: 12,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'post-2',
    bulletinId: 'bulletin-2',
    title: '새로운 프로젝트 아이디어',
    content: '다음 프로젝트로 어떤 것을 해보면 좋을까요?',
    userId: 'user-2',
    authorName: '개발자A',
    isPinned: false,
    isLocked: false,
    viewCount: 89,
    likeCount: 23,
    tags: ['아이디어', '프로젝트'],
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: 'post-3',
    bulletinId: 'bulletin-3',
    title: 'React 성능 최적화 질문',
    content: 'React 컴포넌트의 성능을 어떻게 최적화할 수 있을까요?',
    userId: 'user-3',
    authorName: '초보개발자',
    isPinned: false,
    isLocked: false,
    viewCount: 234,
    likeCount: 45,
    tags: ['React', '성능최적화'],
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
  },
]

export function BulletinBoard({ 
  onSelectPost, 
  selectedPostId, 
  onCreatePost, 
  onBulletinSelect, 
  onRefreshPosts,
  expandedBulletins: externalExpandedBulletins,
  onExpandedBulletinsChange,
  selectedBulletinId: externalSelectedBulletinId
}: BulletinBoardProps) {
  const { user, isAdmin } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [posts, setPosts] = useState<BulletinPost[]>([])
  const [internalSelectedBulletinId, setInternalSelectedBulletinId] = useState<string | null>(null)
  
  // 외부에서 전달된 selectedBulletinId가 있으면 사용, 없으면 내부 상태 사용
  const selectedBulletinId = externalSelectedBulletinId || internalSelectedBulletinId
  const [internalExpandedBulletins, setInternalExpandedBulletins] = useState<Set<string>>(new Set())
  
  // 외부에서 전달된 확장 상태가 있으면 사용, 없으면 내부 상태 사용
  const expandedBulletins = externalExpandedBulletins || internalExpandedBulletins
  const setExpandedBulletins = onExpandedBulletinsChange || setInternalExpandedBulletins
  const [loading, setLoading] = useState(true)
  const [showCreateBulletin, setShowCreateBulletin] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [newBulletin, setNewBulletin] = useState({
    title: '',
    description: '',
    parentId: '',
  })
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null)
  const [editingPost, setEditingPost] = useState<BulletinPost | null>(null)
  const [selectedBulletinIds, setSelectedBulletinIds] = useState<Set<string>>(new Set())
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())
  
  // 드래그 앤 드롭 상태
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    let bulletinsUnsubscribe: (() => void) | undefined
    let postsUnsubscribe: (() => void) | undefined

    const initializeData = async () => {
      if (user) {
        // 게시판 실시간 리스너 설정
        if (isTestMode) {
          setBulletins(mockBulletins)
          setLoading(false)
        } else {
          try {
            const q = query(
              collection(db, 'bulletins')
              // 임시로 복합 쿼리 제거 (인덱스 빌드 중)
              // where('isActive', '==', true),
              // orderBy('order', 'asc')
            )
            
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
                  order: data.order,
                  isActive: data.isActive,
                  userId: data.userId || 'unknown',
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                }
                bulletinData.push(bulletin)
                console.log(`📥 Loaded bulletin:`, {
                  id: bulletin.id,
                  title: bulletin.title,
                  parentId: bulletin.parentId,
                  level: bulletin.level,
                  hasParent: !!bulletin.parentId
                })
              })
              
              setBulletins(bulletinData)
              setLoading(false)
            }, (error) => {
              console.error('실시간 게시판 데이터 가져오기 오류:', error)
              toast.error('실시간 업데이트에 실패했습니다.')
              setLoading(false)
            })
          } catch (error: any) {
            toast.error('게시판을 불러오는데 실패했습니다.')
            console.error('Error fetching bulletins:', error)
            setLoading(false)
          }
        }

        // 기존 게시판들의 userId를 현재 사용자로 업데이트
        updateExistingBulletinsUserId()
      }
    }

    initializeData()

    // 컴포넌트 언마운트 시 리스너 해제
    return () => {
      if (bulletinsUnsubscribe) {
        bulletinsUnsubscribe()
      }
      if (postsUnsubscribe) {
        postsUnsubscribe()
      }
    }
  }, [user])

  // 게시판 로드 후 기본적으로 접힌 상태로 시작
  useEffect(() => {
    if (bulletins.length > 0) {
      setExpandedBulletins(new Set())
    }
  }, [bulletins])

  useEffect(() => {
    let postsUnsubscribe: (() => void) | undefined

    const initializePosts = async () => {
      if (selectedBulletinId) {
        if (isTestMode) {
          const bulletinPosts = mockPosts.filter(post => post.bulletinId === selectedBulletinId)
          setPosts(bulletinPosts)
        } else {
          try {
            const q = query(
              collection(db, 'bulletinPosts'),
              where('bulletinId', '==', selectedBulletinId)
            )
            
            postsUnsubscribe = onSnapshot(q, (querySnapshot) => {
              const postData: BulletinPost[] = []
              
              querySnapshot.forEach((doc) => {
                const data = doc.data()
                postData.push({
                  id: doc.id,
                  bulletinId: data.bulletinId,
                  title: data.title,
                  content: data.content,
                  userId: data.userId,
                  authorName: data.authorName,
                  isPinned: data.isPinned || false,
                  isLocked: data.isLocked || false,
                  viewCount: data.viewCount || 0,
                  likeCount: data.likeCount || 0,
                  tags: data.tags || [],
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                })
              })
              
              // 클라이언트 사이드에서 정렬
              postData.sort((a, b) => {
                if (a.isPinned !== b.isPinned) {
                  return b.isPinned ? 1 : -1
                }
                return b.createdAt.getTime() - a.createdAt.getTime()
              })
              
              setPosts(postData)
            }, (error) => {
              console.error('실시간 게시글 데이터 가져오기 오류:', error)
              toast.error('실시간 업데이트에 실패했습니다.')
            })
          } catch (error: any) {
            console.error('Error fetching posts:', error)
            if (error.code === 'unavailable' || error.message?.includes('QUIC_PROTOCOL_ERROR')) {
              console.warn('Firestore connection error, setting empty posts array')
              setPosts([])
            } else {
              toast.error('게시글을 불러오는데 실패했습니다.')
            }
          }
        }
      }
    }

    initializePosts()

    return () => {
      if (postsUnsubscribe) {
        postsUnsubscribe()
      }
    }
  }, [selectedBulletinId, refreshTrigger])

  // 기존 게시판들의 userId를 현재 사용자로 업데이트
  const updateExistingBulletinsUserId = async () => {
    if (!user?.uid || isTestMode) return

    try {
      const q = query(
        collection(db, 'bulletins'),
        where('userId', '==', 'unknown')
      )
      
      const querySnapshot = await getDocs(q)
      const updatePromises = querySnapshot.docs.map(docSnapshot => {
        const bulletinRef = doc(db, 'bulletins', docSnapshot.id)
        return setDoc(bulletinRef, {
          userId: user.uid,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      })

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
        console.log(`🔄 Updated ${updatePromises.length} bulletins with userId: ${user.uid}`)
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      }
    } catch (error: any) {
      console.error('Error updating bulletin user IDs:', error)
    }
  }

  const toggleBulletinExpansion = (bulletinId: string) => {
    const newExpanded = new Set(expandedBulletins)
    if (newExpanded.has(bulletinId)) {
      newExpanded.delete(bulletinId)
    } else {
      newExpanded.add(bulletinId)
    }
    setExpandedBulletins(newExpanded)
  }

  const getChildBulletins = (parentId: string) => {
    const children = bulletins.filter(bulletin => bulletin.parentId === parentId)
    console.log(`🔍 getChildBulletins for ${parentId}:`, children)
    console.log(`📊 All bulletins:`, bulletins)
    return children
  }

  const getTopLevelBulletins = () => {
    return bulletins.filter(bulletin => !bulletin.parentId || bulletin.parentId === null || bulletin.parentId === undefined)
  }

  // 게시판의 레벨을 계산하는 함수
  const getBulletinLevel = (bulletinId: string): number => {
    const bulletin = bulletins.find(b => b.id === bulletinId)
    if (!bulletin || !bulletin.parentId) return 0
    
    return 1 + getBulletinLevel(bulletin.parentId)
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }

  const renderBulletinTree = (
    bulletins: Bulletin[],
    allBulletins: Bulletin[],
    level: number = 0
  ) => {
    return bulletins.map((bulletin) => {
      const hasChildren = allBulletins.some(b => b.parentId === bulletin.id)
      const isExpanded = expandedBulletins.has(bulletin.id)
      const isSelected = selectedBulletinId === bulletin.id
      const childCount = allBulletins.filter(b => b.parentId === bulletin.id).length

      return (
        <SortableBulletinItem
          key={bulletin.id}
          bulletin={bulletin}
          level={level}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          isSelected={isSelected}
          childCount={childCount}
          onToggleExpansion={() => toggleBulletinExpansion(bulletin.id)}
          onSelect={() => {
            setInternalSelectedBulletinId(bulletin.id)
            onBulletinSelect?.(bulletin.id)
          }}
          onEdit={() => setEditingBulletin(bulletin)}
          onDelete={() => handleDeleteBulletin(bulletin.id)}
          isChecked={selectedBulletinIds.has(bulletin.id)}
          onCheckChange={(checked) => {
            setSelectedBulletinIds(prev => {
              const next = new Set(prev)
              if (checked) next.add(bulletin.id)
              else next.delete(bulletin.id)
              return next
            })
          }}
          isAdmin={isAdmin}
          user={user}
          allBulletins={allBulletins}
          renderBulletinTree={renderBulletinTree}
        />
      )
    })
  }

  const handleRefreshPosts = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const toggleAllBulletins = () => {
    const allBulletinIds = bulletins.map(b => b.id)
    const hasExpanded = allBulletinIds.some(id => expandedBulletins.has(id))
    
    if (hasExpanded) {
      // 모든 게시판 접기
      setExpandedBulletins(new Set())
    } else {
      // 모든 게시판 펼치기
      setExpandedBulletins(new Set(allBulletinIds))
    }
  }

  const handleCreateBulletin = async () => {
    if (!newBulletin.title.trim()) {
      toast.error('게시판 제목을 입력해주세요.')
      return
    }

    if (!user?.uid) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const bulletinData = {
        title: newBulletin.title.trim(),
        description: newBulletin.description.trim(),
        parentId: newBulletin.parentId || null,
        level: newBulletin.parentId ? getBulletinLevel(newBulletin.parentId) + 1 : 0,
        order: bulletins.length + 1,
        isActive: true,
        userId: user.uid, // 반드시 현재 사용자 ID로 설정
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      console.log('🚀 Creating bulletin with data:', bulletinData)

      if (isTestMode) {
        const newBulletinItem: Bulletin = {
          id: `bulletin-${Date.now()}`,
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
        setBulletins(prev => [...prev, newBulletinItem])
        
        // 부모 게시판이 있다면 부모 게시판을 펼친 상태로 설정
        if (bulletinData.parentId && typeof bulletinData.parentId === 'string') {
          const newExpanded = new Set([...Array.from(expandedBulletins), bulletinData.parentId as string])
          setExpandedBulletins(newExpanded)
        }
        
        // 새로 생성된 게시판을 펼친 상태로 설정
        const newExpanded = new Set([...Array.from(expandedBulletins), newBulletinItem.id])
        setExpandedBulletins(newExpanded)
        
        // 새로 생성된 게시판을 선택
        setInternalSelectedBulletinId(newBulletinItem.id)
        onBulletinSelect?.(newBulletinItem.id)
        
        toast.success('게시판이 생성되었습니다.')
      } else {
        const docRef = await addDoc(collection(db, 'bulletins'), bulletinData)
        toast.success('게시판이 생성되었습니다.')
        
        // 부모 게시판이 있다면 부모 게시판을 펼친 상태로 설정
        if (bulletinData.parentId && typeof bulletinData.parentId === 'string') {
          const newExpanded = new Set([...Array.from(expandedBulletins), bulletinData.parentId as string])
          setExpandedBulletins(newExpanded)
        }
        
        // 새로 생성된 게시판을 펼친 상태로 설정
        const newExpanded = new Set([...Array.from(expandedBulletins), docRef.id])
        setExpandedBulletins(newExpanded)
        
        // 현재 확장된 게시판 상태를 저장하고 fetchBulletins에 전달
        const currentExpandedState = new Set([...Array.from(expandedBulletins), docRef.id])
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
        
        // 새로 생성된 게시판을 선택
        setInternalSelectedBulletinId(docRef.id)
        onBulletinSelect?.(docRef.id)
      }

      setNewBulletin({ title: '', description: '', parentId: '' })
      setShowCreateBulletin(false)
    } catch (error: any) {
      toast.error('게시판 생성에 실패했습니다.')
      console.error('Error creating bulletin:', error)
    }
  }

  // 게시판 수정
  const handleEditBulletin = async (bulletin: Bulletin) => {
    if (isTestMode) {
      setBulletins(prev => prev.map(b => 
        b.id === bulletin.id ? { ...bulletin, updatedAt: new Date() } : b
      ))
      setEditingBulletin(null)
      toast.success('게시판이 수정되었습니다.')
      return
    }

    try {
      const bulletinRef = doc(db, 'bulletins', bulletin.id)
      await setDoc(bulletinRef, {
        ...bulletin,
        updatedAt: serverTimestamp(),
      })
      setEditingBulletin(null)
      
      // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      
      toast.success('게시판이 수정되었습니다.')
    } catch (error: any) {
      toast.error('게시판 수정에 실패했습니다.')
      console.error('Error updating bulletin:', error)
    }
  }

  // 게시판 삭제
  const handleDeleteBulletin = async (bulletinId: string) => {
    if (!confirm('정말로 이 게시판을 삭제하시겠습니까?')) {
      return
    }

    if (isTestMode) {
      setBulletins(prev => prev.filter(b => b.id !== bulletinId))
      toast.success('게시판이 삭제되었습니다.')
      return
    }

    try {
      const bulletinRef = doc(db, 'bulletins', bulletinId)
      await deleteDoc(bulletinRef)
      
      // 현재 확장된 게시판 상태를 저장 (삭제된 게시판들 제외)하고 fetchBulletins에 전달
      const currentExpandedState = new Set(
        Array.from(expandedBulletins).filter(id => !selectedBulletinIds.has(id))
      )
      // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      
      toast.success('게시판이 삭제되었습니다.')
    } catch (error: any) {
      toast.error('게시판 삭제에 실패했습니다.')
      console.error('Error deleting bulletin:', error)
    }
  }

  // 게시글 수정
  const handleEditPost = async (post: BulletinPost) => {
    console.log('📝 Editing post:', post)
    
    // 권한 확인
    if (!isAdmin && (!user || post.userId !== user.uid)) {
      toast.error('게시글을 수정할 권한이 없습니다.')
      return
    }
    
    if (isTestMode) {
      setPosts(prev => prev.map(p => 
        p.id === post.id ? { ...post, updatedAt: new Date() } : p
      ))
      setEditingPost(null)
      toast.success('게시글이 수정되었습니다.')
      return
    }

    try {
      const postRef = doc(db, 'bulletinPosts', post.id)
      await setDoc(postRef, {
        ...post,
        updatedAt: serverTimestamp(),
      })
      setEditingPost(null)
      
      // selectedBulletinId가 있으면 해당 게시판의 게시글만 새로고침
      if (selectedBulletinId) {
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      } else {
        // selectedBulletinId가 없으면 post의 bulletinId로 새로고침
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      }
      
      toast.success('게시글이 수정되었습니다.')
    } catch (error: any) {
      toast.error('게시글 수정에 실패했습니다.')
      console.error('Error updating post:', error)
    }
  }

  // 게시글 삭제
  const handleDeletePost = async (postId: string) => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    // 삭제할 게시글 찾기
    const postToDelete = posts.find(p => p.id === postId)
    if (!postToDelete) {
      toast.error('게시글을 찾을 수 없습니다.')
      return
    }

    if (isTestMode) {
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('게시글이 삭제되었습니다.')
      return
    }

    try {
      const postRef = doc(db, 'bulletinPosts', postId)
      await deleteDoc(postRef)
      
      // selectedBulletinId가 있으면 해당 게시판의 게시글만 새로고침
      if (selectedBulletinId) {
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      } else {
        // selectedBulletinId가 없으면 post의 bulletinId로 새로고침
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      }
      
      toast.success('게시글이 삭제되었습니다.')
    } catch (error: any) {
      toast.error('게시글 삭제에 실패했습니다.')
      console.error('Error deleting post:', error)
    }
  }

  const handleBulkDeleteBulletins = async () => {
    if (!window.confirm('선택한 게시판을 모두 삭제하시겠습니까?')) return
    if (isTestMode) {
      setBulletins(prev => prev.filter(b => !selectedBulletinIds.has(b.id)))
      setSelectedBulletinIds(new Set())
      toast.success('선택한 게시판이 삭제되었습니다.')
      return
    }
    try {
      for (const id of selectedBulletinIds) {
        const bulletinRef = doc(db, 'bulletins', id)
        await deleteDoc(bulletinRef)
      }
      setSelectedBulletinIds(new Set())
      
      // 현재 확장된 게시판 상태를 저장 (삭제된 게시판들 제외)하고 fetchBulletins에 전달
      const currentExpandedState = new Set(
        Array.from(expandedBulletins).filter(id => !selectedBulletinIds.has(id))
      )
      // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      
      toast.success('선택한 게시판이 삭제되었습니다.')
    } catch (e) {
      console.error('일괄 삭제 오류:', e)
      toast.error('일괄 삭제 중 오류 발생')
    }
  }

  const handleBulkDeletePosts = async () => {
    if (!window.confirm('선택한 게시글을 모두 삭제하시겠습니까?')) return
    if (isTestMode) {
      setPosts(prev => prev.filter(p => !selectedPostIds.has(p.id)))
      setSelectedPostIds(new Set())
      toast.success('선택한 게시글이 삭제되었습니다.')
      return
    }
    try {
      for (const id of selectedPostIds) {
        const postRef = doc(db, 'bulletinPosts', id)
        await deleteDoc(postRef)
      }
      setSelectedPostIds(new Set())
      
      // selectedBulletinId가 있으면 해당 게시판의 게시글만 새로고침
      if (selectedBulletinId) {
        // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
      }
      
      toast.success('선택한 게시글이 삭제되었습니다.')
    } catch (e) {
      console.error('일괄 삭제 오류:', e)
      toast.error('일괄 삭제 중 오류 발생')
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const draggedBulletin = bulletins.find(b => b.id === active.id)
    const targetBulletin = bulletins.find(b => b.id === over.id)

    if (!draggedBulletin || !targetBulletin) {
      return
    }

    // 같은 게시판으로는 이동 불가
    if (draggedBulletin.id === targetBulletin.id) {
      return
    }

    // 자기 자신의 하위로는 이동 불가
    if (isDescendant(draggedBulletin.id, targetBulletin.id)) {
      toast.error('자기 자신의 하위로는 이동할 수 없습니다.')
      return
    }

    try {
      // 새로운 부모 설정
      const newParentId = targetBulletin.id
      const newLevel = targetBulletin.level + 1

      if (isTestMode) {
        // 테스트 모드: 로컬 상태 업데이트
        setBulletins(prev => prev.map(b => 
          b.id === draggedBulletin.id 
            ? { ...b, parentId: newParentId, level: newLevel }
            : b
        ))
        toast.success('게시판 위치가 변경되었습니다.')
      } else {
        // 실제 모드: Firestore 업데이트
        const bulletinRef = doc(db, 'bulletins', draggedBulletin.id)
        await setDoc(bulletinRef, {
          parentId: newParentId,
          level: newLevel,
          updatedAt: serverTimestamp(),
        }, { merge: true })
        
              // 실시간 리스너가 이미 설정되어 있으므로 별도 새로고침 불필요
        
        toast.success('게시판 위치가 변경되었습니다.')
      }
    } catch (error) {
      console.error('게시판 이동 오류:', error)
      toast.error('게시판 이동에 실패했습니다.')
    }
  }

  // 하위 게시판인지 확인하는 함수
  const isDescendant = (parentId: string, childId: string): boolean => {
    const child = bulletins.find(b => b.id === childId)
    if (!child || !child.parentId) return false
    if (child.parentId === parentId) return true
    return isDescendant(parentId, child.parentId)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-3 lg:p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">게시글 목록</h2>
          <div className="flex items-center space-x-1 lg:space-x-2">
            {selectedBulletinId && (
              <button
                onClick={onCreatePost}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="새 게시글 작성"
              >
                <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 게시판 생성 모달 */}
      {showCreateBulletin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 게시판 생성</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  게시판 제목 *
                </label>
                <input
                  type="text"
                  value={newBulletin.title}
                  onChange={(e) => setNewBulletin({ ...newBulletin, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="게시판 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={newBulletin.description}
                  onChange={(e) => setNewBulletin({ ...newBulletin, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="게시판 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상위 게시판 (선택사항)
                </label>
                <select
                  value={newBulletin.parentId}
                  onChange={(e) => setNewBulletin({ ...newBulletin, parentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">📁 최상위 게시판</option>
                  {bulletins
                    .filter(bulletin => bulletin.isActive !== false) // 현재 존재하는 게시판만 필터링
                    .map((bulletin) => {
                      const level = getBulletinLevel(bulletin.id)
                      const indent = '  '.repeat(level)
                      const icon = level === 0 ? '📂' : level === 1 ? '📄' : level === 2 ? '📋' : '📌'
                      return (
                        <option key={bulletin.id} value={bulletin.id}>
                          {indent}{icon} {bulletin.title}
                        </option>
                      )
                    })}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateBulletin(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreateBulletin}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시판 수정 모달 */}
      {editingBulletin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <PencilIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">게시판 수정</h3>
            </div>
            
            {/* 권한 안내 */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  {isAdmin 
                    ? "관리자 권한으로 수정 중입니다" 
                    : "내가 만든 게시판을 수정 중입니다"
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  게시판 제목 *
                </label>
                <input
                  type="text"
                  value={editingBulletin.title}
                  onChange={(e) => setEditingBulletin({ ...editingBulletin, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="게시판 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={editingBulletin.description || ''}
                  onChange={(e) => setEditingBulletin({ ...editingBulletin, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="게시판 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingBulletin(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleEditBulletin(editingBulletin)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-1"
              >
                <PencilIcon className="w-4 h-4" />
                <span>수정 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 수정 모달 */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center space-x-2 mb-4">
              <PencilIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">게시글 수정</h3>
            </div>
            
            {/* 권한 안내 */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  {isAdmin 
                    ? "관리자 권한으로 수정 중입니다" 
                    : "내가 쓴 게시글을 수정 중입니다"
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="게시글 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용
                </label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="게시글 내용을 입력하세요"
                  rows={5}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleEditPost(editingPost)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-1"
              >
                <PencilIcon className="w-4 h-4" />
                <span>수정 완료</span>
              </button>
            </div>
          </div>
        </div>
      )}

        {/* 게시글 목록 */}
        <div className="flex-1 flex flex-col">
          {selectedBulletinId ? (
            <>
              <div className="p-3 lg:p-4 border-b border-gray-200">
                <h3 className="text-sm lg:text-md font-semibold text-gray-900">
                  {bulletins.find(b => b.id === selectedBulletinId)?.title}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {posts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-xs lg:text-sm">게시글이 없습니다</p>
                    <button
                      onClick={onCreatePost}
                      className="mt-2 text-primary-600 hover:text-primary-700 text-xs lg:text-sm font-medium"
                    >
                      첫 번째 게시글 작성하기
                    </button>
                  </div>
                ) : (
                  <div className="p-2">
                    {isAdmin && selectedPostIds.size > 0 && (
                      <button
                        onClick={handleBulkDeletePosts}
                        className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                      >
                        선택 게시글 삭제
                      </button>
                    )}
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => onSelectPost(post.id)}
                        className={`p-2 lg:p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedPostId === post.id
                            ? 'bg-primary-50 border border-primary-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-2 lg:space-x-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1 lg:space-x-2">
                              {post.isPinned && (
                                <StarIcon className="w-3 h-3 lg:w-4 lg:h-4 text-red-500" />
                              )}
                              {post.isLocked && (
                                <LockClosedIcon className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                              )}
                              <h3 className="text-xs lg:text-sm font-medium text-gray-900 truncate">
                                {post.title}
                              </h3>
                              {/* 수정 가능한 게시글 표시 */}
                              {(isAdmin || (user && post.userId === user.uid)) && (
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                                  {isAdmin ? '관리' : '내 글'}
                                </span>
                              )}
                              {/* 게시글 수정/삭제 버튼 (admin 또는 게시글 작성자) */}
                              {(isAdmin || (user && post.userId === user.uid)) && (
                                <div className="flex items-center space-x-1 ml-auto">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingPost(post)
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title={isAdmin ? "게시글 수정 (관리자)" : "게시글 수정 (내가 쓴 글)"}
                                  >
                                    <PencilIcon className="w-3 h-3" />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeletePost(post.id)
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="게시글 삭제 (관리자만 가능)"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 lg:space-x-4 mt-1 text-xs text-gray-500">
                              <span className="truncate">{post.authorName}</span>
                              <span className="hidden sm:inline">{formatDate(post.createdAt)}</span>
                              <div className="flex items-center space-x-1">
                                <EyeIcon className="w-3 h-3" />
                                <span className="hidden lg:inline">{post.viewCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <HeartIcon className="w-3 h-3" />
                                <span className="hidden lg:inline">{post.likeCount}</span>
                              </div>
                            </div>
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex space-x-1 mt-1">
                                {post.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-1 lg:px-2 py-0.5 lg:py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selectedPostIds.has(post.id)}
                            onChange={e => {
                              e.stopPropagation()
                              setSelectedPostIds(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(post.id)
                                else next.delete(post.id)
                                return next
                              })
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">게시판을 선택해주세요</p>
              </div>
            </div>
          )}
        </div>
    </div>
  )
} 