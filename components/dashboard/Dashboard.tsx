'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DocumentEditor } from './DocumentEditor'
import { BulletinBoard } from './BulletinBoard'
import { PostViewer } from './PostViewer'
import { BulletinDropdown } from './BulletinDropdown'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())

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
  }

  const handleBackToView = () => {
    setViewMode('view')
    setEditingPostId(null)
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
              <BulletinDropdown 
                selectedBulletinId={selectedBulletinId}
                onBulletinSelect={handleBulletinSelect}
                expandedBulletins={expandedBulletins}
                onExpandedBulletinsChange={handleExpandedBulletinsChange}
              />
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
      <div className="flex-1 flex flex-col">
        {viewMode === 'list' && (
          <div className="w-full bg-white">
            <BulletinBoard 
              onSelectPost={handleSelectPost}
              selectedPostId={selectedPostId}
              onCreatePost={handleCreatePost}
              onBulletinSelect={handleBulletinSelect}
              onRefreshPosts={handleRefreshPosts}
              expandedBulletins={expandedBulletins}
              onExpandedBulletinsChange={handleExpandedBulletinsChange}
              selectedBulletinId={selectedBulletinId}
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
  )
} 