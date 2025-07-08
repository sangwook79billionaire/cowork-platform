'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Bulletin, BulletinPost } from '@/types/firebase'
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  StarIcon,
  LockClosedIcon,
  EyeIcon,
  HeartIcon,
  PencilIcon,
  TrashIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BulletinContentProps {
  selectedBulletinId: string | null
  onSelectPost: (postId: string) => void
  onCreatePost: () => void
  onCreateBulletin?: (parentId?: string) => void
}

export function BulletinContent({ 
  selectedBulletinId, 
  onSelectPost, 
  onCreatePost,
  onCreateBulletin
}: BulletinContentProps) {
  const { user, isAdmin } = useAuth()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [posts, setPosts] = useState<BulletinPost[]>([])
  const [loading, setLoading] = useState(false)

  // 게시판 데이터 가져오기
  const fetchBulletins = async () => {
    try {
      const bulletinsRef = collection(db, 'bulletins')
      const q = query(bulletinsRef)
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
    }
  }

  // 게시글 가져오기
  const fetchPosts = async (bulletinId: string) => {
    setLoading(true)
    try {
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
      console.error('Error fetching posts:', error)
      if (error.code === 'unavailable' || error.message?.includes('QUIC_PROTOCOL_ERROR')) {
        console.warn('Firestore connection error, setting empty posts array')
        setPosts([])
      } else {
        toast.error('게시글을 불러오는데 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 하위 게시판 가져오기
  const getChildBulletins = (parentId: string) => {
    return bulletins.filter(bulletin => bulletin.parentId === parentId && bulletin.isActive !== false)
  }

  useEffect(() => {
    fetchBulletins()
  }, [])

  useEffect(() => {
    if (selectedBulletinId) {
      fetchPosts(selectedBulletinId)
    } else {
      setPosts([])
    }
  }, [selectedBulletinId])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }

  const selectedBulletin = bulletins.find(b => b.id === selectedBulletinId)
  const childBulletins = selectedBulletinId ? getChildBulletins(selectedBulletinId) : []

  if (!selectedBulletinId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">게시판을 선택해주세요</h3>
          <p className="text-sm">좌측에서 게시판을 선택하면 내용이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{selectedBulletin?.title}</h2>
            {selectedBulletin?.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedBulletin.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCreatePost}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="text-sm">새 게시글</span>
            </button>
            <button
              onClick={() => onCreateBulletin?.(selectedBulletinId || undefined)}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <FolderPlusIcon className="w-4 h-4" />
              <span className="text-sm">새 게시판</span>
            </button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* 하위 게시판 */}
            {childBulletins.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">하위 게시판</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {childBulletins.map((bulletin) => (
                    <div
                      key={bulletin.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900">{bulletin.title}</span>
                      </div>
                      {bulletin.description && (
                        <p className="text-sm text-gray-600 mt-1">{bulletin.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 게시글 목록 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">게시글</h3>
              {posts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">게시글이 없습니다</p>
                  <button
                    onClick={onCreatePost}
                    className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    첫 번째 게시글 작성하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post.id)}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {post.isPinned && (
                              <StarIcon className="w-4 h-4 text-red-500" />
                            )}
                            {post.isLocked && (
                              <LockClosedIcon className="w-4 h-4 text-gray-500" />
                            )}
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {post.title}
                            </h4>
                            {(isAdmin || (user && post.userId === user.uid)) && (
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                {isAdmin ? '관리' : '내 글'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>{post.authorName}</span>
                            <span>{formatDate(post.createdAt)}</span>
                            <div className="flex items-center space-x-1">
                              <EyeIcon className="w-3 h-3" />
                              <span>{post.viewCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <HeartIcon className="w-3 h-3" />
                              <span>{post.likeCount}</span>
                            </div>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex space-x-1 mt-2">
                              {post.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
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
          </div>
        )}
      </div>
    </div>
  )
} 