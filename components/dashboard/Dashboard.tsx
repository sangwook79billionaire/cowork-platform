'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { 
  BellIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { BulletinBoard } from './BulletinBoard'
import { PostViewer } from './PostViewer'
import { DocumentEditor } from './DocumentEditor'
import { IntegratedSidebar } from './IntegratedSidebar'
import { BulletinContent } from './BulletinContent'
import { Calendar } from './Calendar'
import { TodoList } from './TodoList'
import { NotificationCenter } from './NotificationCenter'
import { AccountSettings } from './AccountSettings'
import { BulletinCreateModal } from './BulletinCreateModal'

type ViewMode = 'list' | 'view' | 'edit' | 'create'
type ActiveFeature = 'bulletin' | 'calendar' | 'todo'

export function Dashboard() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())
  const [showSidebar, setShowSidebar] = useState(false)
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>('bulletin')
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [showBulletinCreateModal, setShowBulletinCreateModal] = useState(false)
  const [bulletinCreateParentId, setBulletinCreateParentId] = useState<string | undefined>()
  const [isMobile, setIsMobile] = useState(false)

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 모바일에서 사이드바 자동 숨김
  useEffect(() => {
    if (isMobile && showSidebar) {
      const timer = setTimeout(() => setShowSidebar(false), 300)
      return () => clearTimeout(timer)
    }
  }, [viewMode, activeFeature, isMobile])

  // 마우스 이동 감지 (데스크톱에서만)
  useEffect(() => {
    if (isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      if (viewMode === 'view' && selectedPostId) {
        const leftEdge = 50 // 왼쪽 가장자리 50px 영역
        
        if (e.clientX <= leftEdge) {
          setShowSidebar(true)
        } else if (e.clientX > 330) { // 사이드바 너비 + 여유 공간
          setShowSidebar(false)
        }
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (viewMode === 'view' && selectedPostId) {
        const target = event.target as HTMLElement
        const sidebar = document.querySelector('[data-sidebar]')
        
        if (sidebar && !sidebar.contains(target) && showSidebar) {
          // 사이드바 영역 밖을 클릭했을 때만 숨김
          const rect = sidebar.getBoundingClientRect()
          if (event.clientX > rect.right) {
            setShowSidebar(false)
          }
        }
      }
    }

    if (viewMode === 'view' && selectedPostId) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [viewMode, selectedPostId, showSidebar, isMobile])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    setViewMode('view')
    setShowSidebar(false)
  }

  const handleEditPost = (postId: string) => {
    setEditingPostId(postId)
    setViewMode('edit')
    setShowSidebar(false)
  }

  const handleCreatePost = () => {
    setEditingPostId(null)
    setViewMode('create')
  }

  const handleCreateBulletin = (parentId?: string) => {
    setBulletinCreateParentId(parentId)
    setShowBulletinCreateModal(true)
  }

  const handleBulletinCreated = (bulletin: any) => {
    // 게시판 생성 후 선택된 게시판을 새로 생성된 게시판으로 변경
    setSelectedBulletinId(bulletin.id)
    // 확장 상태에 부모 게시판 추가
    if (bulletin.parentId) {
      const newExpanded = new Set([...Array.from(expandedBulletins), bulletin.parentId])
      setExpandedBulletins(newExpanded)
    }
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

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-6">
            {/* 모바일 햄버거 메뉴 */}
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showSidebar ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            )}
            
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center">
              <ChatBubbleLeftRightIcon className="w-6 h-6 md:w-8 md:h-8 text-primary-600 mr-2 md:mr-3" />
              <span className="hidden sm:inline">윤수&상욱 공동작업장</span>
              <span className="sm:hidden">공동작업장</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setShowNotificationCenter(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <BellIcon className="w-5 h-5" />
              {/* 알림 표시기 */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={() => setShowAccountSettings(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="계정 설정"
            >
              <UserIcon className="w-5 h-5" />
            </button>
            <span className="hidden md:inline text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm px-3 py-1 md:px-4 md:py-2"
            >
              <span className="hidden sm:inline">로그아웃</span>
              <span className="sm:hidden">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex relative">
        {viewMode === 'list' && (
          <>
            {/* 좌측 통합 사이드바 */}
            <div className={`
              ${isMobile 
                ? 'fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out' 
                : 'w-80 flex-shrink-0'
              }
              ${isMobile && !showSidebar ? '-translate-x-full' : ''}
            `}>
              {isMobile && (
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleSidebar} />
              )}
              <div className={`
                ${isMobile ? 'w-80 h-full bg-white shadow-lg' : 'h-full'}
                bg-white border-r border-gray-200
              `}>
                <IntegratedSidebar
                  activeFeature={activeFeature}
                  onFeatureChange={setActiveFeature}
                  selectedBulletinId={selectedBulletinId}
                  onBulletinSelect={handleBulletinSelect}
                  expandedBulletins={expandedBulletins}
                  onExpandedBulletinsChange={handleExpandedBulletinsChange}
                  onCreateBulletin={handleCreateBulletin}
                  isMobile={isMobile}
                  onClose={() => setShowSidebar(false)}
                />
              </div>
            </div>
            
            {/* 우측 콘텐츠 영역 */}
            <div className={`flex-1 ${isMobile ? 'w-full' : ''}`}>
              {activeFeature === 'bulletin' && (
                <BulletinContent 
                  selectedBulletinId={selectedBulletinId}
                  onSelectPost={handleSelectPost}
                  onCreatePost={handleCreatePost}
                  onCreateBulletin={handleCreateBulletin}
                  isMobile={isMobile}
                  onBulletinSelect={handleBulletinSelect}
                />
              )}
              {activeFeature === 'calendar' && (
                <Calendar isMobile={isMobile} />
              )}
              {activeFeature === 'todo' && (
                <TodoList 
                  isMobile={isMobile}
                  onTodoCreated={(calendarEvent) => {
                    console.log('Todo created, calendar event:', calendarEvent)
                  }} 
                />
              )}
            </div>
          </>
        )}

        {viewMode === 'view' && selectedPostId && activeFeature === 'bulletin' && (
          <>
            {/* 좌측 게시판 트리 (데스크톱에서만) */}
            {!isMobile && (
              <div 
                className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out ${
                  showSidebar ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{ top: '73px' }}
                data-sidebar
              >
                <div className="w-80 h-full bg-white shadow-lg border-r border-gray-200">
                  <IntegratedSidebar
                    activeFeature={activeFeature}
                    onFeatureChange={setActiveFeature}
                    selectedBulletinId={selectedBulletinId}
                    onBulletinSelect={handleBulletinSelect}
                    expandedBulletins={expandedBulletins}
                    onExpandedBulletinsChange={handleExpandedBulletinsChange}
                    isMobile={isMobile}
                  />
                </div>
              </div>
            )}
            
            {/* 우측 게시글 뷰어 */}
            <div 
              className={`flex-1 transition-transform duration-300 ease-in-out ${
                !isMobile && showSidebar ? 'translate-x-80' : 'translate-x-0'
              }`}
            >
              <PostViewer 
                postId={selectedPostId}
                bulletinId={selectedBulletinId}
                onEditPost={handleEditPost}
                onBackToList={handleBackToList}
                isMobile={isMobile}
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
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* 모바일 하단 탭 네비게이션 */}
      {isMobile && viewMode === 'list' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="flex justify-around">
            {[
              { id: 'bulletin', name: '게시판', icon: ChatBubbleLeftRightIcon },
              { id: 'calendar', name: '캘린더', icon: CalendarIcon },
              { id: 'todo', name: '할 일', icon: CheckCircleIcon },
            ].map((feature) => {
              const Icon = feature.icon
              const isActive = activeFeature === feature.id
              
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id as ActiveFeature)}
                  className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors ${
                    isActive 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{feature.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 알림 센터 */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />

      {/* 계정 설정 */}
      <AccountSettings
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />

      {/* 게시판 생성 모달 */}
      <BulletinCreateModal
        isOpen={showBulletinCreateModal}
        onClose={() => setShowBulletinCreateModal(false)}
        parentId={bulletinCreateParentId}
        onBulletinCreated={handleBulletinCreated}
      />
    </div>
  )
} 