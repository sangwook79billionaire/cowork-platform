'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { IntegratedSidebar } from './IntegratedSidebar'
import { BulletinBoard } from './BulletinBoard'
import { TodoList } from './TodoList'
import { Calendar } from './Calendar'
import NewsSearch from '@/components/news/NewsSearch'
import NewsArchive from '@/components/news/NewsArchive'
import SavedArticles from '@/components/news/SavedArticles'
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon, PlusIcon } from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'
type ActiveFeature = 'bulletin' | 'news-search' | 'news-archive' | 'saved-articles' | 'todo-list' | 'calendar'

export function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>('bulletin')
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateTopLevelBulletin, setShowCreateTopLevelBulletin] = useState(false)

  // 모바일에서 사이드바 토글
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // 사이드바 닫기
  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      await signOut()
      console.log('로그아웃 완료')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  // 최상위 게시판 추가 처리
  const handleAddTopLevelBulletin = () => {
    setShowCreateTopLevelBulletin(true)
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
  }

  const handleCreatePost = () => {
    // 새 게시글 작성 창 열기
    setShowCreatePost(true)
    console.log('새 게시글 작성 창 열기')
  }

  const handleBulletinSelect = (bulletinId: string) => {
    setSelectedBulletinId(bulletinId)
    setSelectedPostId(null) // 게시판 변경 시 선택된 게시글 초기화
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-600">서비스를 이용하려면 로그인해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">


      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">협업 플랫폼</h1>
          <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </div>

      <div className="flex h-screen lg:h-screen h-[calc(100vh-60px)]">
        {/* 좌측 구역: Level 0 메뉴 + 게시판 트리 */}
        <div className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-40 w-80 lg:w-[30%] border-r border-gray-200 bg-white flex flex-col transition-transform duration-300 ease-in-out`}>
          {/* Level 0 메뉴 - 모바일에서 스크롤 가능 */}
          <div className="p-4 border-b border-gray-200 overflow-y-auto max-h-[40vh] lg:max-h-none">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
              <button
                onClick={closeSidebar}
                className="lg:hidden p-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setActiveFeature('bulletin')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeFeature === 'bulletin' 
                    ? 'bg-blue-50 border-blue-200 border-2 text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-blue-600 rounded"></div>
                <span className="font-medium text-sm">게시판</span>
              </button>
              
              <button
                onClick={() => setActiveFeature('news-search')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeFeature === 'news-search' 
                    ? 'bg-green-50 border-green-200 border-2 text-green-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-green-600 rounded"></div>
                <span className="font-medium text-sm">뉴스 수집</span>
              </button>
              
              <button
                onClick={() => setActiveFeature('news-archive')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeFeature === 'news-archive' 
                    ? 'bg-purple-50 border-purple-200 border-2 text-purple-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-purple-600 rounded"></div>
                <span className="font-medium text-sm">뉴스 아카이브</span>
              </button>
              
              <button
                onClick={() => setActiveFeature('saved-articles')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeFeature === 'saved-articles' 
                    ? 'bg-orange-50 border-orange-200 border-2 text-orange-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-orange-600 rounded"></div>
                <span className="font-medium text-sm">저장된 기사</span>
              </button>

              <button
                onClick={() => setActiveFeature('todo-list')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeFeature === 'todo-list' 
                    ? 'bg-indigo-50 border-indigo-200 border-2 text-indigo-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-indigo-600 rounded"></div>
                <span className="font-medium text-sm">할 일 목록</span>
              </button>

              <button
                onClick={() => setActiveFeature('calendar')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  activeFeature === 'calendar' 
                    ? 'bg-red-50 border-red-200 border-2 text-red-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="w-5 h-5 bg-red-600 rounded"></div>
                <span className="font-medium text-sm">캘린더</span>
              </button>
            </div>
          </div>

          {/* 게시판 트리 (게시판이 선택된 경우에만 표시) - 모바일에서 스크롤 가능 */}
          {activeFeature === 'bulletin' && (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">게시판 목록</h3>
                  <button
                    onClick={handleAddTopLevelBulletin}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="최상위 게시판 추가"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <BulletinBoard
                selectedBulletinId={selectedBulletinId}
                onBulletinSelect={setSelectedBulletinId}
                selectedPostId={selectedPostId}
                onSelectPost={handleSelectPost}
                onCreatePost={handleCreatePost}
                showCreatePost={showCreatePost}
                setShowCreatePost={setShowCreatePost}
                isSidebar={true} // 사이드바 모드로 표시
                onAddTopLevelBulletin={handleAddTopLevelBulletin}
              />
            </div>
          )}

          {/* 사용자 정보 - 고정 위치 */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">로그인됨</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 우측 구역: 선택된 콘텐츠 */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
          {activeFeature === 'bulletin' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <BulletinBoard
                  selectedBulletinId={selectedBulletinId}
                  onBulletinSelect={setSelectedBulletinId}
                  selectedPostId={selectedPostId}
                  onSelectPost={handleSelectPost}
                  onCreatePost={handleCreatePost}
                  showCreatePost={showCreatePost}
                  setShowCreatePost={setShowCreatePost}
                  isMainContent={true} // 메인 콘텐츠 모드로 표시
                />
              </div>
            </div>
          )}

          {activeFeature === 'news-search' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <NewsSearch />
              </div>
            </div>
          )}

          {activeFeature === 'news-archive' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <NewsArchive />
              </div>
            </div>
          )}

          {activeFeature === 'saved-articles' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <SavedArticles />
              </div>
            </div>
          )}

          {activeFeature === 'todo-list' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <TodoList />
              </div>
            </div>
          )}

          {activeFeature === 'calendar' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <Calendar />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모바일에서 사이드바가 열렸을 때 배경 오버레이 */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeSidebar}
        />
      )}
    </div>
  )
} 