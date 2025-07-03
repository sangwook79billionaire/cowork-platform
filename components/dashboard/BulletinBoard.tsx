'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
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
  const { user } = useAuth()
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

  useEffect(() => {
    if (user) {
      fetchBulletins()
    }
  }, [user])

  // 게시판 로드 후 모든 게시판을 펼치기
  useEffect(() => {
    if (bulletins.length > 0) {
      const allBulletinIds = bulletins.map(b => b.id)
      setExpandedBulletins(new Set(allBulletinIds))
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
        bulletinData.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          parentId: data.parentId,
          level: data.level,
          order: data.order,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
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
    return bulletins.filter(bulletin => bulletin.parentId === parentId)
  }

  const getTopLevelBulletins = () => {
    return bulletins.filter(bulletin => !bulletin.parentId || bulletin.parentId === null)
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

  const renderBulletinTree = (bulletins: Bulletin[], level: number = 0) => {
    return bulletins.map((bulletin) => {
      const hasChildren = bulletins.some(b => b.parentId === bulletin.id)
      const isExpanded = expandedBulletins.has(bulletin.id)
      const isSelected = selectedBulletinId === bulletin.id
      const childCount = bulletins.filter(b => b.parentId === bulletin.id).length

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
              paddingLeft: `${level * 16 + 8}px`,
              marginLeft: `${level * 4}px`,
              marginRight: '4px'
            }}
          >
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
                <div className="w-4 h-4 flex items-center justify-center">
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
              ) : (
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-300 rounded-sm"></div>
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
          </div>

          {/* 하위 게시판들 */}
          {hasChildren && isExpanded && (
            <div className="mt-1">
              {renderBulletinTree(getChildBulletins(bulletin.id), level + 1)}
            </div>
          )}
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
        level: newBulletin.parentId ? 1 : 0,
        order: bulletins.length + 1,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

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
        setBulletins([...bulletins, newBulletinItem])
        toast.success('게시판이 생성되었습니다.')
      } else {
        const docRef = await addDoc(collection(db, 'bulletins'), bulletinData)
        toast.success('게시판이 생성되었습니다.')
        fetchBulletins() // 게시판 목록 새로고침
      }

      setNewBulletin({ title: '', description: '', parentId: '' })
      setShowCreateBulletin(false)
    } catch (error: any) {
      toast.error('게시판 생성에 실패했습니다.')
      console.error('Error creating bulletin:', error)
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
                  {bulletins.filter(b => !b.parentId).map((bulletin) => (
                    <option key={bulletin.id} value={bulletin.id}>
                      📂 {bulletin.title}
                    </option>
                  ))}
                  {bulletins.filter(b => b.parentId).map((bulletin) => {
                    const parent = bulletins.find(p => p.id === bulletin.parentId)
                    return (
                      <option key={bulletin.id} value={bulletin.id}>
                        &nbsp;&nbsp;&nbsp;📄 {bulletin.title} (하위: {parent?.title})
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

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 게시판 목록 */}
        <div className="w-full lg:w-2/5 border-b lg:border-b-0 lg:border-r border-gray-200">
          {/* 게시판 구조 안내 */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
              <span>최상위 게시판</span>
              <div className="w-3 h-3 bg-gray-300 rounded-sm ml-4"></div>
              <span>하위 게시판</span>
              <div className="w-3 h-3 bg-gray-200 rounded-sm ml-4"></div>
              <span>세부 게시판</span>
            </div>
          </div>
          <div className="p-2 h-full overflow-y-auto">
            {renderBulletinTree(getTopLevelBulletins())}
          </div>
        </div>

        {/* 게시글 목록 */}
        <div className="w-full lg:w-3/5 flex flex-col">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
              <div className="text-center p-4">
                <ChatBubbleLeftRightIcon className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-base lg:text-lg font-medium mb-2">게시판을 선택해주세요</p>
                <p className="text-xs lg:text-sm text-gray-400">위에서 게시판을 선택하여 게시글을 확인하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 