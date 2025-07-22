'use client'

import { useState } from 'react'
import { 
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { BulletinTree } from './BulletinTree'

type ActiveFeature = 'bulletin' | 'news-search'

interface IntegratedSidebarProps {
  activeFeature: ActiveFeature
  onFeatureChange: (feature: ActiveFeature) => void
  selectedBulletinId: string | null
  onBulletinSelect: (bulletinId: string) => void
  expandedBulletins: Set<string>
  onExpandedBulletinsChange: (expanded: Set<string>) => void
  onCreateBulletin?: (parentId?: string) => void
  onEditBulletin?: (bulletinId: string) => void
  onDeleteBulletin?: (bulletinId: string) => void
  isMobile?: boolean
  onClose?: () => void
}

export function IntegratedSidebar({
  activeFeature,
  onFeatureChange,
  selectedBulletinId,
  onBulletinSelect,
  expandedBulletins,
  onExpandedBulletinsChange,
  onCreateBulletin,
  onEditBulletin,
  onDeleteBulletin,
  isMobile = false,
  onClose,
}: IntegratedSidebarProps) {
  const [showBulletinTree, setShowBulletinTree] = useState(true)

  const features = [
    {
      id: 'bulletin' as ActiveFeature,
      name: '게시판',
      icon: ChatBubbleLeftRightIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'news-search' as ActiveFeature,
      name: '뉴스 검색',
      icon: MagnifyingGlassIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ]

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* 모바일 헤더 */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="사이드바 닫기"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 기능 선택 탭 */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-2">
          {features.map((feature) => {
            const Icon = feature.icon
            const isActive = activeFeature === feature.id
            
            return (
              <button
                key={feature.id}
                onClick={() => {
                  onFeatureChange(feature.id)
                  if (feature.id === 'bulletin') {
                    setShowBulletinTree(true)
                  }
                }}
                className={`w-full flex items-center space-x-3 px-3 py-3 md:py-2 rounded-lg transition-colors ${
                  isActive 
                    ? `${feature.bgColor} ${feature.color} border ${feature.borderColor}` 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title={`${feature.name} 메뉴`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{feature.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 게시판 트리 (게시판 선택 시에만 표시) */}
      {activeFeature === 'bulletin' && showBulletinTree && (
        <div className="flex-1 overflow-y-auto">
          <BulletinTree 
            selectedBulletinId={selectedBulletinId}
            onBulletinSelect={onBulletinSelect}
            expandedBulletins={expandedBulletins}
            onExpandedBulletinsChange={onExpandedBulletinsChange}
            onCreateBulletin={onCreateBulletin}
            onEditBulletin={onEditBulletin}
            onDeleteBulletin={onDeleteBulletin}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* 뉴스 검색 사이드바 (뉴스 검색 선택 시에만 표시) */}
      {activeFeature === 'news-search' && (
        <div className="flex-1 p-4">
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">뉴스 검색</h3>
            <p className="text-gray-500">기간과 키워드로 뉴스를 검색하세요</p>
          </div>
        </div>
      )}
    </div>
  )
} 