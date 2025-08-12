'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  ArchiveBoxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { BulletinTree } from './BulletinTree'
import { collection, query, orderBy, getDocs, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Bulletin } from '@/types/firebase'

type ActiveFeature = 'bulletin' | 'news-search' | 'news-archive' | 'saved-articles' | 'nate-news'

interface IntegratedSidebarProps {
  activeFeature: ActiveFeature
  onFeatureChange: (feature: ActiveFeature) => void
  isOpen: boolean
  onClose: () => void
  onBulletinSelect?: (bulletinId: string) => void
}

export function IntegratedSidebar({ 
  activeFeature, 
  onFeatureChange, 
  isOpen, 
  onClose,
  onBulletinSelect
}: IntegratedSidebarProps) {
  const { user, signOut } = useAuth()
  const [isBulletinExpanded, setIsBulletinExpanded] = useState(false)
  const [topLevelBulletins, setTopLevelBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)

  // 디버깅: 컴포넌트 렌더링 확인
  console.log('🔍 IntegratedSidebar 렌더링 시작');
  console.log('  - props:', { activeFeature, isOpen, onClose: !!onClose });
  console.log('  - user:', !!user);

  // Firebase에서 최상위 게시판 데이터만 가져오기
  useEffect(() => {
    if (!isBulletinExpanded) return

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'bulletins'), 
        where('parentId', '==', null), // 최상위 게시판만
        orderBy('createdAt', 'asc')
      ),
      (snapshot) => {
        const bulletinData: Bulletin[] = []
        snapshot.forEach((doc) => {
          bulletinData.push({
            id: doc.id,
            ...doc.data()
          } as Bulletin)
        })
        setTopLevelBulletins(bulletinData)
        setLoading(false)
      },
      (error) => {
        console.error('게시판 데이터 로드 오류:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [isBulletinExpanded])

  const features = [
    { 
      id: 'bulletin' as ActiveFeature, 
      name: '게시판', 
      icon: ChatBubbleLeftRightIcon, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200',
      hasDropdown: true
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
      id: 'nate-news' as ActiveFeature, 
      name: '네이트 뉴스', 
      icon: MagnifyingGlassIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50', 
      borderColor: 'border-purple-200' 
    },
    { 
      id: 'news-archive' as ActiveFeature, 
      name: '뉴스 아카이브', 
      icon: ArchiveBoxIcon, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-200' 
    },
    { 
      id: 'saved-articles' as ActiveFeature, 
      name: '저장된 기사', 
      icon: BookmarkIcon, 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200' 
    },
  ]

  // 디버깅: features 배열 로그
  console.log('🔍 사이드바 features:', features);
  console.log('🔍 현재 activeFeature:', activeFeature);
  console.log('🔍 features 배열 길이:', features.length);
  console.log('🔍 features ID 목록:', features.map(f => f.id));

  // 네비게이션 메뉴 렌더링 로그
  useEffect(() => {
    console.log('🔍 네비게이션 메뉴 렌더링 시작');
  }, [features, activeFeature]);

  const handleBulletinClick = () => {
    if (activeFeature === 'bulletin') {
      setIsBulletinExpanded(!isBulletinExpanded)
    } else {
      onFeatureChange('bulletin')
      setIsBulletinExpanded(true)
    }
  }

  const handleBulletinSelect = (bulletinId: string) => {
    onBulletinSelect?.(bulletinId)
    // 모바일에서 게시판 선택 시 사이드바 닫기
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

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
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none lg:w-72
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
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {features.map((feature) => {
              const Icon = feature.icon
              const isActive = activeFeature === feature.id
              
              console.log(`🔍 메뉴 렌더링: ${feature.name} (${feature.id}) - 활성: ${isActive}`);
              
              if (feature.id === 'bulletin') {
                return (
                  <div key={feature.id} className="space-y-2">
                    <button
                      onClick={handleBulletinClick}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200
                        ${isActive 
                          ? `${feature.bgColor} ${feature.borderColor} border-2 ${feature.color} shadow-sm` 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-current' : ''}`} />
                        <span className="font-medium text-sm">{feature.name}</span>
                      </div>
                      {isActive && (
                        isBulletinExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )
                      )}
                    </button>
                    
                    {/* 최상위 게시판 드롭다운 */}
                    {isActive && isBulletinExpanded && (
                      <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-1">
                        {loading ? (
                          <div className="flex items-center space-x-2 py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-xs text-gray-500">게시판 로딩 중...</span>
                          </div>
                        ) : topLevelBulletins.length === 0 ? (
                          <div className="text-xs text-gray-500 py-2">
                            최상위 게시판이 없습니다
                          </div>
                        ) : (
                          topLevelBulletins.map((bulletin) => (
                            <button
                              key={bulletin.id}
                              onClick={() => handleBulletinSelect(bulletin.id)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                            >
                              {bulletin.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              }
              
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