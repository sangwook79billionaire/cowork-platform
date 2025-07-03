'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs, addDoc, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin, BulletinPost } from '@/types/firebase'
import toast from 'react-hot-toast'
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
}

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// 모의 데이터
const mockBulletins: Bulletin[] = [
  {
    id: 'bulletin-1',
    title: '공지사항',
    description: '중요한 공지사항을 확인하세요',
    level: 0,
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-2',
    title: '자유게시판',
    description: '자유롭게 의견을 나누세요',
    level: 0,
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-3',
    title: '질문과 답변',
    description: '궁금한 점을 물어보세요',
    level: 0,
    order: 3,
    isActive: true,
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

export function BulletinBoard({ onSelectPost, selectedPostId, onCreatePost, onBulletinSelect, onRefreshPosts }: BulletinBoardProps) {
  const { user, isAdmin } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [posts, setPosts] = useState<BulletinPost[]>([])
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())
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

  useEffect(() => {
    if (user) {
      fetchBulletins()
    }
  }, [user])

  // 게시판 로드 후 기본적으로 접힌 상태로 시작
  useEffect(() => {
    if (bulletins.length > 0) {
      setExpandedBulletins(new Set())
    }
  }, [bulletins])

  useEffect(() => {
    if (selectedBulletinId) {
      fetchPosts(selectedBulletinId)
    }
  }, [selectedBulletinId, refreshTrigger])

  const fetchBulletins = async () => {
    if (isTestMode) {
      setBulletins(mockBulletins)
      setLoading(false)
      return
    }

    try {
      const q = query(
        collection(db, 'bulletins')
        // 임시로 복합 쿼리 제거 (인덱스 빌드 중)
        // where('isActive', '==', true),
        // orderBy('order', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
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
    } catch (error: any) {
      toast.error('게시판을 불러오는데 실패했습니다.')
      console.error('Error fetching bulletins:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async (bulletinId: string) => {
    if (isTestMode) {
      const bulletinPosts = mockPosts.filter(post => post.bulletinId === bulletinId)
      setPosts(bulletinPosts)
      return
    }

    try {
      // 임시로 단순한 쿼리 사용 (인덱스 오류 해결을 위해)
      const q = query(
        collection(db, 'bulletinPosts'),
        where('bulletinId', '==', bulletinId)
      )
      
      const querySnapshot = await getDocs(q)
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
    } catch (error: any) {
      toast.error('게시글을 불러오는데 실패했습니다.')
      console.error('Error fetching posts:', error)
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

      console.log(`🔍 Rendering bulletin: ${bulletin.title} (${bulletin.id})`, {
        hasChildren,
        isExpanded,
        childCount,
        parentId: bulletin.parentId,
        level
      })

      return (
        <div key={bulletin.id} className="mb-1">
          <div
            onClick={() => {
              setSelectedBulletinId(bulletin.id)
              onBulletinSelect?.(bulletin.id)
            }}
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
                checked={selectedBulletinIds.has(bulletin.id)}
                onChange={e => {
                  e.stopPropagation()
                  setSelectedBulletinIds(prev => {
                    const next = new Set(prev)
                    if (e.target.checked) next.add(bulletin.id)
                    else next.delete(bulletin.id)
                    return next
                  })
                }}
              />
            )}

            {/* 확장/축소 버튼 */}
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBulletinExpansion(bulletin.id)
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
                <h3 className={`text-sm font-medium truncate ${
                  isSelected ? 'text-primary-700' : 'text-gray-900'
                }`}>
                  {level > 0 && (
                    <span className="text-xs text-gray-400 mr-1">L{level}</span>
                  )}
                  {bulletin.title}
                </h3>
                {hasChildren && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                    {childCount}
                  </span>
                )}
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

            {/* Admin 권한에 따른 수정/삭제 버튼 */}
            {isAdmin && (
              <div className="flex-shrink-0 flex items-center space-x-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingBulletin(bulletin)
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="게시판 수정"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBulletin(bulletin.id)
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="게시판 삭제"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* 하위 게시판들 - 드롭다운 형태 */}
          {(() => {
            if (hasChildren && isExpanded) {
              const children = allBulletins.filter(b => b.parentId === bulletin.id)
              console.log(`🎯 Rendering children for ${bulletin.title} (${bulletin.id}):`, children)
              console.log(`✅ Conditions met: hasChildren=${hasChildren}, isExpanded=${isExpanded}`)
              return renderBulletinTree(children, allBulletins, level + 1)
            } else if (hasChildren && !isExpanded) {
              console.log(`❌ Conditions not met for ${bulletin.title} (${bulletin.id}): hasChildren=${hasChildren}, isExpanded=${isExpanded}`)
              return null
            } else {
              console.log(`❌ No children for ${bulletin.title} (${bulletin.id}): hasChildren=${hasChildren}`)
              return null
            }
          })()}
        </div>
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

    try {
      const bulletinData = {
        title: newBulletin.title.trim(),
        description: newBulletin.description.trim(),
        parentId: newBulletin.parentId || null,
        level: newBulletin.parentId ? getBulletinLevel(newBulletin.parentId) + 1 : 0,
        order: bulletins.length + 1,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      console.log('🚀 Creating bulletin with data:', bulletinData)

      if (isTestMode) {
        const newBulletinItem: Bulletin = {
          id: `bulletin-${Date.now()}`,
          title: bulletinData.title,
          description: bulletinData.description,
          parentId: bulletinData.parentId || undefined,
          level: bulletinData.level,
          order: bulletinData.order,
          isActive: bulletinData.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setBulletins(prev => [...prev, newBulletinItem])
        
        // 부모 게시판이 있다면 부모 게시판을 펼친 상태로 설정
        if (bulletinData.parentId && typeof bulletinData.parentId === 'string') {
          setExpandedBulletins(prev => new Set([...Array.from(prev), bulletinData.parentId as string]))
        }
        
        // 새로 생성된 게시판을 펼친 상태로 설정
        setExpandedBulletins(prev => new Set([...Array.from(prev), newBulletinItem.id]))
        
        // 새로 생성된 게시판을 선택
        setSelectedBulletinId(newBulletinItem.id)
        onBulletinSelect?.(newBulletinItem.id)
        
        toast.success('게시판이 생성되었습니다.')
      } else {
        const docRef = await addDoc(collection(db, 'bulletins'), bulletinData)
        toast.success('게시판이 생성되었습니다.')
        
        // 부모 게시판이 있다면 부모 게시판을 펼친 상태로 설정
        if (bulletinData.parentId && typeof bulletinData.parentId === 'string') {
          setExpandedBulletins(prev => new Set([...Array.from(prev), bulletinData.parentId as string]))
        }
        
        // 새로 생성된 게시판을 펼친 상태로 설정
        setExpandedBulletins(prev => new Set([...Array.from(prev), docRef.id]))
        
        // 게시판 목록 새로고침
        await fetchBulletins()
        
        // 새로 생성된 게시판을 선택
        setSelectedBulletinId(docRef.id)
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
      fetchBulletins()
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
      fetchBulletins()
      toast.success('게시판이 삭제되었습니다.')
    } catch (error: any) {
      toast.error('게시판 삭제에 실패했습니다.')
      console.error('Error deleting bulletin:', error)
    }
  }

  // 게시글 수정
  const handleEditPost = async (post: BulletinPost) => {
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
      fetchPosts(selectedBulletinId!)
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

    if (isTestMode) {
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('게시글이 삭제되었습니다.')
      return
    }

    try {
      const postRef = doc(db, 'bulletinPosts', postId)
      await deleteDoc(postRef)
      fetchPosts(selectedBulletinId!)
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
      fetchBulletins()
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
      fetchPosts(selectedBulletinId!)
      toast.success('선택한 게시글이 삭제되었습니다.')
    } catch (e) {
      console.error('일괄 삭제 오류:', e)
      toast.error('일괄 삭제 중 오류 발생')
    }
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
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">게시판</h2>
          <div className="flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={toggleAllBulletins}
              className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="전체 펼치기/접기"
            >
              {expandedBulletins.size > 0 ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setShowCreateBulletin(true)}
              className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="새 게시판 생성"
            >
              <FolderPlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            {selectedBulletinId && (
              <button
                onClick={onCreatePost}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="새 게시글 작성"
              >
                <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            )}
            {isAdmin && selectedBulletinIds.size > 0 && (
              <button
                onClick={handleBulkDeleteBulletins}
                className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
              >
                선택 게시판 삭제
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
                  {bulletins.map((bulletin) => {
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
            <h3 className="text-lg font-semibold mb-4">게시판 수정</h3>
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
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 수정 모달 */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">게시글 수정</h3>
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
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 게시판 목록 */}
        <div className="w-full lg:w-full border-b lg:border-b-0 lg:border-r border-gray-200">
          {/* 게시판 구조 안내 */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
              <span>최상위 게시판</span>
              <div className="w-3 h-3 bg-blue-400 rounded-sm ml-4"></div>
              <span>1단계 하위</span>
              <div className="w-2 h-2 bg-blue-300 rounded-sm ml-4"></div>
              <span>2단계 하위</span>
              <div className="w-1.5 h-1.5 bg-green-400 rounded-sm ml-4"></div>
              <span>3단계 하위</span>
              <div className="w-1 h-1 bg-purple-400 rounded-sm ml-4"></div>
              <span>4단계+ 하위</span>
            </div>
          </div>
          <div className="p-4 h-full overflow-y-auto overflow-x-auto">
            <div className="min-w-max">
              {renderBulletinTree(getTopLevelBulletins(), bulletins, 0)}
            </div>
          </div>
        </div>

        {/* 게시글 목록 - 선택된 게시판이 있을 때만 표시 */}
        {selectedBulletinId && (
          <div className="w-full lg:w-1/2 flex flex-col border-l border-gray-200">
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
                            {/* Admin 권한에 따른 수정/삭제 버튼 */}
                            {isAdmin && (
                              <div className="flex items-center space-x-1 ml-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingPost(post)
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="게시글 수정"
                                >
                                  <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeletePost(post.id)
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="게시글 삭제"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
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
          </div>
        )}
      </div>
    </div>
  )
} 