'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DocumentEditor } from './DocumentEditor'
import { BulletinBoard } from './BulletinBoard'
import { PostViewer } from './PostViewer'
import { BulletinTree } from './BulletinTree'
import { BulletinContent } from './BulletinContent'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())
  const [showSidebar, setShowSidebar] = useState(false)

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
              Cowork Platform
            </h1>
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
            {/* 좌측 게시판 트리 */}
            <div className="w-80 flex-shrink-0">
              <BulletinTree 
                selectedBulletinId={selectedBulletinId}
                onBulletinSelect={handleBulletinSelect}
                expandedBulletins={expandedBulletins}
                onExpandedBulletinsChange={handleExpandedBulletinsChange}
              />
            </div>
            
            {/* 우측 콘텐츠 영역 */}
            <div className="flex-1">
              <BulletinContent 
                selectedBulletinId={selectedBulletinId}
                onSelectPost={handleSelectPost}
                onCreatePost={handleCreatePost}
              />
            </div>
          </>
        )}

        {viewMode === 'view' && selectedPostId && (
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
                onEditPost={handleEditPost}
                onBackToList={handleBackToList}
              />
            </div>
          </>
        )}

        {(viewMode === 'edit' || viewMode === 'create') && (
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