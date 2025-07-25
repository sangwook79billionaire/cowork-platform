'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline'
import { BulletinTree } from './BulletinTree'

type ActiveFeature = 'bulletin' | 'news-search' | 'saved-articles'

interface IntegratedSidebarProps {
  activeFeature: ActiveFeature
  onFeatureChange: (feature: ActiveFeature) => void
  isOpen: boolean
  onClose: () => void
}

export function IntegratedSidebar({ 
  activeFeature, 
  onFeatureChange, 
  isOpen, 
  onClose 
}: IntegratedSidebarProps) {
  const { user, signOut } = useAuth()

  const features = [
    { 
      id: 'bulletin' as ActiveFeature, 
      name: '게시판', 
      icon: ChatBubbleLeftRightIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200' 
    },
    { 
      id: 'news-search' as ActiveFeature, 
      name: '뉴스 수집', 
      icon: MagnifyingGlassIcon, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50', 
      borderColor: 'border-green-200' 
    },
    { 
      id: 'saved-articles' as ActiveFeature, 
      name: '저장된 기사', 
      icon: BookmarkIcon, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-200' 
    },
  ]

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none lg:w-64
      `}>
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <h1 className="text-xl font-bold text-gray-900">협업 플랫폼</h1>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 사용자 정보 */}
          {user && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
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
              </div>
            </div>
          )}

          {/* 메뉴 */}
          <nav className="flex-1 p-4 space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon
              const isActive = activeFeature === feature.id
              
              return (
                <button
                  key={feature.id}
                  onClick={() => {
                    onFeatureChange(feature.id)
                    // 모바일에서 메뉴 클릭 시 사이드바 닫기
                    if (window.innerWidth < 1024) {
                      onClose()
                    }
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                    ${isActive 
                      ? `${feature.bgColor} ${feature.borderColor} border-2 ${feature.color} shadow-sm` 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-current' : ''}`} />
                  <span className="font-medium text-sm">{feature.name}</span>
                </button>
              )
            })}
          </nav>

          {/* 로그아웃 */}
          {user && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={signOut}
                className="w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 