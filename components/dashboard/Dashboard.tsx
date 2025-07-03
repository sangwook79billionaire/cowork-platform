'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DocumentEditor } from './DocumentEditor'
import { BulletinBoard } from './BulletinBoard'
import { PostViewer } from './PostViewer'
import { Sidebar } from './Sidebar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)

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

  const handleRefreshPosts = () => {
    // BulletinBoard 내부에서 직접 처리됨
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedPostId(null)
    setEditingPostId(null)
  }

  const handleBackToView = () => {
    setViewMode('view')
    setEditingPostId(null)
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* 사이드바 */}
      <Sidebar 
        onSignOut={handleSignOut}
        user={user}
      />
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Cowork Platform
            </h1>
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

        {/* 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {viewMode === 'list' && (
            <div className="w-full bg-white">
              <BulletinBoard 
                onSelectPost={handleSelectPost}
                selectedPostId={selectedPostId}
                onCreatePost={handleCreatePost}
                onBulletinSelect={handleBulletinSelect}
                onRefreshPosts={handleRefreshPosts}
              />
            </div>
          )}

          {viewMode === 'view' && selectedPostId && (
            <div className="flex-1">
              <PostViewer 
                postId={selectedPostId}
                onEditPost={handleEditPost}
                onBackToList={handleBackToList}
              />
            </div>
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
    </div>
  )
} 