'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db, getDisplayName } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { BulletinPost, BulletinComment, Bulletin } from '@/types/firebase'
import toast from 'react-hot-toast'
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  StarIcon,
  LockClosedIcon,
  UserIcon,
  CalendarIcon,
  PencilIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

interface PostViewerProps {
  postId: string
  bulletinId: string | null
  onEditPost: (postId: string) => void
  onBackToList: () => void
  isMobile?: boolean
}

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// 모의 데이터
const mockPost: BulletinPost = {
  id: 'post-1',
  bulletinId: 'bulletin-1',
  title: '시스템 점검 안내',
  content: `
    <h2>시스템 점검 안내</h2>
    <p>안녕하세요, 여러분!</p>
    <p>오늘 밤 <strong>12시부터 2시까지</strong> 시스템 점검이 있을 예정입니다.</p>
    <h3>점검 내용:</h3>
    <ul>
      <li>서버 성능 최적화</li>
      <li>보안 업데이트</li>
      <li>데이터베이스 백업</li>
    </ul>
    <p>점검 시간 동안 서비스 이용이 제한될 수 있으니 참고해 주시기 바랍니다.</p>
    <p>문의사항이 있으시면 언제든 연락주세요.</p>
    <blockquote>
      <p>감사합니다!</p>
    </blockquote>
  `,
  userId: 'user-1',
  authorName: '관리자',
  isPinned: true,
  isLocked: false,
  viewCount: 150,
  likeCount: 12,
  tags: ['공지', '시스템'],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
}

const mockComments: BulletinComment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    content: '점검 시간 알려주셔서 감사합니다!',
    userId: 'user-2',
    authorName: '개발자A',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    content: '점검 후 성능이 개선될 것 같네요.',
    userId: 'user-3',
    authorName: '개발자B',
    createdAt: new Date('2024-01-15T11:15:00'),
    updatedAt: new Date('2024-01-15T11:15:00'),
  },
]

export function PostViewer({ postId, bulletinId, onEditPost, onBackToList, isMobile = false }: PostViewerProps) {
  const { user } = useAuth()
  const [post, setPost] = useState<BulletinPost | null>(null)
  const [comments, setComments] = useState<BulletinComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [bulletinPath, setBulletinPath] = useState<Bulletin[]>([])

  useEffect(() => {
    if (postId) {
      fetchPost()
      fetchComments()
    }
    if (bulletinId) {
      fetchBulletins()
    }
  }, [postId, bulletinId])

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
      
      // 게시판 경로 계산
      if (bulletinId) {
        const path = calculateBulletinPath(bulletinId, fetchedBulletins)
        setBulletinPath(path)
      }
    } catch (error) {
      console.error('게시판 데이터 가져오기 오류:', error)
    }
  }

  // 게시판 경로 계산
  const calculateBulletinPath = (bulletinId: string, allBulletins: Bulletin[]): Bulletin[] => {
    const path: Bulletin[] = []
    let currentId = bulletinId
    
    while (currentId) {
      const bulletin = allBulletins.find(b => b.id === currentId)
      if (bulletin) {
        path.unshift(bulletin)
        currentId = bulletin.parentId || ''
      } else {
        break
      }
    }
    
    return path
  }

  const fetchPost = async () => {
    if (isTestMode) {
      setPost(mockPost)
      setLoading(false)
      return
    }

    try {
      const docRef = doc(db, 'bulletinPosts', postId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const postData: BulletinPost = {
          id: docSnap.id,
          bulletinId: data.bulletinId,
          title: data.title,
          content: data.content,
          userId: data.userId,
          authorName: data.authorName,
          isPinned: data.isPinned,
          isLocked: data.isLocked,
          viewCount: data.viewCount,
          likeCount: data.likeCount,
          tags: data.tags,
          attachments: data.attachments,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        }

        setPost(postData)
      } else {
        toast.error('게시글을 찾을 수 없습니다.')
      }
    } catch (error: any) {
      toast.error('게시글을 불러오는데 실패했습니다.')
      console.error('Error fetching post:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    if (isTestMode) {
      setComments(mockComments)
      return
    }

    try {
      // 실제 구현에서는 Firestore에서 댓글을 가져옴
      setComments([])
    } catch (error: any) {
      toast.error('댓글을 불러오는데 실패했습니다.')
      console.error('Error fetching comments:', error)
    }
  }

  const handleLike = async () => {
    if (!user || !post) return

    if (isTestMode) {
      setIsLiked(!isLiked)
      setPost({
        ...post,
        likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
      })
      return
    }

    try {
      const docRef = doc(db, 'bulletinPosts', postId)
      await updateDoc(docRef, {
        likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
        updatedAt: serverTimestamp()
      })

      setIsLiked(!isLiked)
      setPost({
        ...post,
        likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
      })
    } catch (error: any) {
      toast.error('좋아요 처리에 실패했습니다.')
      console.error('Error updating like:', error)
    }
  }

  const addComment = async () => {
    if (!user || !post || !newComment.trim()) return

    if (isTestMode) {
      const comment: BulletinComment = {
        id: `comment-${Date.now()}`,
        postId: post.id,
        content: newComment,
        userId: user.uid,
        authorName: user.displayName || user.email || '익명',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setComments([...comments, comment])
      setNewComment('')
      toast.success('댓글이 작성되었습니다.')
      return
    }

    try {
      // 실제 구현에서는 Firestore에 댓글을 저장
      setNewComment('')
      toast.success('댓글이 작성되었습니다.')
    } catch (error: any) {
      toast.error('댓글 작성에 실패했습니다.')
      console.error('Error adding comment:', error)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>게시글을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 게시글 헤더 */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* 브레드크럼 */}
            {bulletinPath.length > 0 && (
              <div className="flex items-center space-x-2 mb-3 text-sm text-gray-500">
                {bulletinPath.map((bulletin, index) => (
                  <div key={bulletin.id} className="flex items-center">
                    <span className="hover:text-gray-700 transition-colors">
                      {bulletin.title}
                    </span>
                    {index < bulletinPath.length - 1 && (
                      <ChevronRightIcon className="w-4 h-4 mx-1" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2 mb-2">
              {onBackToList && (
                <button
                  onClick={onBackToList}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="목록으로 돌아가기"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
              )}
              {post.isPinned && (
                <StarIcon className="w-5 h-5 text-red-500" />
              )}
              {post.isLocked && (
                <LockClosedIcon className="w-5 h-5 text-gray-500" />
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                {post.title}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center space-x-1">
                <UserIcon className="w-4 h-4" />
                <span>{getDisplayName(post.authorName)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex space-x-2">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-xs bg-primary-100 text-primary-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {onEditPost && user && post.userId === user.uid && (
              <button
                onClick={() => onEditPost(post.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="게시글 편집"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center space-x-1 text-gray-500">
              <EyeIcon className="w-4 h-4" />
              <span className="text-sm">{post.viewCount}</span>
            </div>
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                isLiked
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isLiked ? "좋아요 취소" : "좋아요"}
            >
              <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likeCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 게시글 내용 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* 댓글 섹션 */}
      <div className="border-t border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            댓글 ({comments.length})
          </h3>
        </div>

        {/* 댓글 목록 */}
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {getDisplayName(comment.authorName)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 댓글 작성 */}
        {user && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim()}
                    className="btn-primary text-sm"
                  >
                    댓글 작성
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 