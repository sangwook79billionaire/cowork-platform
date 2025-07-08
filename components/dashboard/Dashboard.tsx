'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DocumentEditor } from './DocumentEditor'
import { BulletinBoard } from './BulletinBoard'
import { PostViewer } from './PostViewer'
import { BulletinTree } from './BulletinTree'
import { BulletinContent } from './BulletinContent'
import { Calendar } from './Calendar'
import { TodoList } from './TodoList'
import { 
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'
type ActiveFeature = 'bulletin' | 'calendar' | 'todo'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>('bulletin')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())
  const [showSidebar, setShowSidebar] = useState(false)
  const [showFeatureDropdown, setShowFeatureDropdown] = useState(false)

  // 마우스 위치 감지
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (viewMode === 'view') {
        // 왼쪽 100px 이내에 마우스가 있으면 사이드바 표시 (기존 50px에서 2배로 확장)
        if (e.clientX <= 100) {
          setShowSidebar(true)
        } else {
          // 게시판 트리가 표시된 상태에서 트리 영역 내에 마우스가 있으면 숨기지 않음
          if (showSidebar && e.clientX <= 400) { // 320px(트리 너비) + 80px(여유 공간)
            setShowSidebar(true)
          } else {
            setShowSidebar(false)
          }
        }
      }
    }

    if (viewMode === 'view') {
      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [viewMode, showSidebar])

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.feature-dropdown')) {
        setShowFeatureDropdown(false)
      }
    }

    if (showFeatureDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFeatureDropdown])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    setViewMode('view')
    setShowSidebar(false) // 게시글 보기 시작할 때 사이드바 숨김
  }

  const handleEditPost = (postId: string) => {
    setEditingPostId(postId)
    setViewMode('edit')
  }

  const handleCreatePost = () => {
    setEditingPostId(null)
    setViewMode('create')
  }

  const handleBulletinSelect = (bulletinId: string) => {
    setSelectedBulletinId(bulletinId)
  }

  const handleExpandedBulletinsChange = (expanded: Set<string>) => {
    setExpandedBulletins(expanded)
  }

  const handleRefreshPosts = () => {
    // BulletinBoard 내부에서 직접 처리됨
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedPostId(null)
    setEditingPostId(null)
    setShowSidebar(false)
  }

  const handleBackToView = () => {
    setViewMode('view')
    setEditingPostId(null)
    setShowSidebar(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-primary-600 mr-3" />
              윤수&상욱 공동작업장
            </h1>
            
            {/* 기능 선택 드롭다운 */}
            <div className="relative feature-dropdown">
              <button
                onClick={() => setShowFeatureDropdown(!showFeatureDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {activeFeature === 'bulletin' && (
                  <>
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">게시판</span>
                  </>
                )}
                {activeFeature === 'calendar' && (
                  <>
                    <CalendarIcon className="w-5 h-5 text-green-600" />
                    <span className="font-medium">캘린더</span>
                  </>
                )}
                {activeFeature === 'todo' && (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">할 일</span>
                  </>
                )}
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              </button>

              {showFeatureDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveFeature('bulletin')
                        setShowFeatureDropdown(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                        activeFeature === 'bulletin' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      <span>게시판</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveFeature('calendar')
                        setShowFeatureDropdown(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                        activeFeature === 'calendar' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                      }`}
                    >
                      <CalendarIcon className="w-5 h-5" />
                      <span>캘린더</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveFeature('todo')
                        setShowFeatureDropdown(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 ${
                        activeFeature === 'todo' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>할 일</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex">
        {viewMode === 'list' && (
          <>
            {/* 좌측 사이드바 (게시판일 때만) */}
            {activeFeature === 'bulletin' && (
              <div className="w-80 flex-shrink-0">
                <BulletinTree 
                  selectedBulletinId={selectedBulletinId}
                  onBulletinSelect={handleBulletinSelect}
                  expandedBulletins={expandedBulletins}
                  onExpandedBulletinsChange={handleExpandedBulletinsChange}
                />
              </div>
            )}
            
            {/* 우측 콘텐츠 영역 */}
            <div className="flex-1">
              {activeFeature === 'bulletin' && (
                <BulletinContent 
                  selectedBulletinId={selectedBulletinId}
                  onSelectPost={handleSelectPost}
                  onCreatePost={handleCreatePost}
                />
              )}
              {activeFeature === 'calendar' && (
                <Calendar />
              )}
              {activeFeature === 'todo' && (
                <TodoList />
              )}
            </div>
          </>
        )}

        {viewMode === 'view' && selectedPostId && activeFeature === 'bulletin' && (
          <>
            {/* 좌측 게시판 트리 (숨겨짐/표시됨) */}
            <div 
              className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out ${
                showSidebar ? 'translate-x-0' : '-translate-x-full'
              }`}
              style={{ top: '73px' }} // 헤더 높이만큼 아래로
            >
              <div className="w-80 h-full bg-white shadow-lg border-r border-gray-200">
                <BulletinTree 
                  selectedBulletinId={selectedBulletinId}
                  onBulletinSelect={handleBulletinSelect}
                  expandedBulletins={expandedBulletins}
                  onExpandedBulletinsChange={handleExpandedBulletinsChange}
                />
              </div>
            </div>
            
            {/* 우측 게시글 뷰어 */}
            <div 
              className={`flex-1 transition-transform duration-300 ease-in-out ${
                showSidebar ? 'translate-x-80' : 'translate-x-0'
              }`}
            >
              <PostViewer 
                postId={selectedPostId}
                bulletinId={selectedBulletinId}
                onEditPost={handleEditPost}
                onBackToList={handleBackToList}
              />
            </div>
          </>
        )}

        {(viewMode === 'edit' || viewMode === 'create') && activeFeature === 'bulletin' && (
          <div className="flex-1">
            <DocumentEditor 
              documentId={editingPostId || 'new'}
              isPostEditor={true}
              bulletinId={selectedBulletinId || undefined}
              onBack={viewMode === 'edit' ? handleBackToView : handleBackToList}
              onSave={handleBackToList}
              onRefreshPosts={handleRefreshPosts}
            />
          </div>
        )}
      </div>
    </div>
  )
} 