'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { IntegratedSidebar } from './IntegratedSidebar'
import { BulletinBoard } from './BulletinBoard'
import NewsSearch from './NewsSearch'
import NaverNewsSearch from './NaverNewsSearch'
import GoogleNewsAlerts from './GoogleNewsAlerts'
import { Bars3Icon } from '@heroicons/react/24/outline'

type ViewMode = 'list' | 'view' | 'edit' | 'create'
type ActiveFeature = 'bulletin' | 'news-search' | 'naver-news-search' | 'google-news-alerts'

export function Dashboard() {
  const { user, loading } = useAuth()
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>('bulletin')
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 모바일에서 사이드바 토글
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // 사이드바 닫기
  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
  }

  const handleCreatePost = () => {
    // 새 게시글 생성 로직
    console.log('새 게시글 생성')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-600">서비스를 이용하려면 로그인해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">협업 플랫폼</h1>
          <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </div>

      <div className="flex h-screen">
        {/* 사이드바 */}
        <IntegratedSidebar
          activeFeature={activeFeature}
          onFeatureChange={setActiveFeature}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-hidden">
          {activeFeature === 'bulletin' && (
            <BulletinBoard
              selectedBulletinId={selectedBulletinId}
              onBulletinSelect={setSelectedBulletinId}
              expandedBulletins={expandedBulletins}
              onExpandedBulletinsChange={setExpandedBulletins}
              selectedPostId={selectedPostId}
              onSelectPost={handleSelectPost}
              onCreatePost={handleCreatePost}
            />
          )}
          {activeFeature === 'news-search' && (
            <NewsSearch />
          )}
          {activeFeature === 'naver-news-search' && (
            <NaverNewsSearch />
          )}
          {activeFeature === 'google-news-alerts' && (
            <GoogleNewsAlerts />
          )}
        </div>
      </div>
    </div>
  )
} 