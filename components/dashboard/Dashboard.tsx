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
import NateNews from '@/components/news/NateNews'
import ShortsScriptManager from '@/components/news/ShortsScriptManager'
import GeminiAITester from './GeminiAITester'
import QuickExecuteModal from './QuickExecuteModal'
import AutoCrawlScheduler from './AutoCrawlScheduler'
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon, PlusIcon } from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'
type ActiveFeature = 'bulletin' | 'news-search' | 'news-archive' | 'saved-articles' | 'nate-news' | 'shorts-scripts' | 'gemini-ai-tester' | 'todo-list' | 'calendar' | 'auto-crawl-scheduler'

export function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>('bulletin')
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateTopLevelBulletin, setShowCreateTopLevelBulletin] = useState(false)
  const [showQuickExecuteModal, setShowQuickExecuteModal] = useState(false)

  // 디버깅: Dashboard 상태 확인
  console.log('🔍 Dashboard 렌더링');
  console.log('  - activeFeature:', activeFeature);
  console.log('  - sidebarOpen:', sidebarOpen);
  console.log('  - user:', !!user);

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
          <button
            onClick={() => setShowQuickExecuteModal(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>즉시 실행</span>
          </button>
        </div>
      </div>

      <div className="flex h-screen lg:h-screen h-[calc(100vh-60px)]">
        {/* 좌측 구역: IntegratedSidebar 사용 */}
        <IntegratedSidebar
          activeFeature={activeFeature}
          onFeatureChange={setActiveFeature}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          onBulletinSelect={handleBulletinSelect}
        />

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

          {activeFeature === 'nate-news' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <NateNews />
              </div>
            </div>
          )}

          {activeFeature === 'shorts-scripts' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <ShortsScriptManager />
              </div>
            </div>
          )}

          {activeFeature === 'gemini-ai-tester' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <GeminiAITester />
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

          {activeFeature === 'auto-crawl-scheduler' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <AutoCrawlScheduler />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 즉시 실행 모달 */}
      <QuickExecuteModal
        isOpen={showQuickExecuteModal}
        onClose={() => setShowQuickExecuteModal(false)}
      />

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