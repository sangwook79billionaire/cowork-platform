'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  ChatBubbleLeftRightIcon, 
  MagnifyingGlassIcon, 
  ArchiveBoxIcon, 
  BookmarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Bulletin } from '@/types/firebase'
import { toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ActiveFeature = 'bulletin' | 'news-search' | 'news-archive' | 'saved-articles' | 'nate-news' | 'todo-list' | 'calendar'

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
  const [allBulletins, setAllBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 디버깅: 컴포넌트 렌더링 확인
  console.log('🔍 IntegratedSidebar 렌더링 시작');
  console.log('  - props:', { activeFeature, isOpen, onClose: !!onClose });
  console.log('  - user:', !!user);

  // Firebase에서 모든 게시판 데이터 가져오기
  useEffect(() => {
    if (!isBulletinExpanded) return

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'bulletins'), 
        orderBy('level', 'asc'),
        orderBy('order', 'asc')
      ),
      (snapshot) => {
        const bulletinData: Bulletin[] = []
        snapshot.forEach((doc) => {
          bulletinData.push({
            id: doc.id,
            ...doc.data()
          } as Bulletin)
        })
        console.log('🔍 모든 게시판 데이터:', bulletinData);
        setAllBulletins(bulletinData)
        setLoading(false)
      },
      (error) => {
        console.error('게시판 데이터 로드 오류:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [isBulletinExpanded])

  // 게시판을 계층 구조로 정리하는 함수
  const buildBulletinTree = (bulletins: Bulletin[], parentId: string | null = null): Bulletin[] => {
    return bulletins
      .filter(bulletin => bulletin.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map(bulletin => ({
        ...bulletin,
        children: buildBulletinTree(bulletins, bulletin.id)
      }));
  };

  // 계층 구조로 정리된 게시판 데이터
  const bulletinTree = buildBulletinTree(allBulletins);

  // 드래그 앤 드롭 종료 시 처리
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = allBulletins.findIndex(b => b.id === active.id);
      const newIndex = allBulletins.findIndex(b => b.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newBulletins = arrayMove(allBulletins, oldIndex, newIndex);
        setAllBulletins(newBulletins);
        
        // Firebase에 순서 업데이트
        try {
          // TODO: Firebase batch update로 순서 변경
          toast.success('게시판 순서가 변경되었습니다.');
        } catch (error) {
          console.error('게시판 순서 변경 오류:', error);
          toast.error('게시판 순서 변경에 실패했습니다.');
        }
      }
    }
  };

  // 게시판을 재귀적으로 렌더링하는 함수
  const renderBulletinTree = (bulletins: any[], level: number = 0) => {
    return bulletins.map((bulletin) => (
      <div key={bulletin.id} className="space-y-1">
        <div className="flex items-center justify-between group">
          <button
            onClick={() => handleBulletinSelect(bulletin.id)}
            className={`flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors ${
              level > 0 ? 'ml-' + (level * 4) : ''
            }`}
            style={{ marginLeft: level * 16 }}
          >
            {level > 0 && <span className="mr-2">└─</span>}
            {bulletin.title}
          </button>
          
          {/* 게시판 관리 버튼들 */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditBulletin(bulletin);
              }}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="게시판 수정"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBulletin(bulletin);
              }}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="게시판 삭제"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {bulletin.children && bulletin.children.length > 0 && (
          <div className="ml-4">
            {renderBulletinTree(bulletin.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

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
    { 
      id: 'todo-list' as ActiveFeature, 
      name: '할 일 목록', 
      icon: ChatBubbleLeftRightIcon, 
      color: 'text-indigo-600', 
      bgColor: 'bg-indigo-50', 
      borderColor: 'border-indigo-200' 
    },
    { 
      id: 'calendar' as ActiveFeature, 
      name: '캘린더', 
      icon: ArchiveBoxIcon, 
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
    setIsBulletinExpanded(!isBulletinExpanded)
    // 게시판 기능 활성화
    onFeatureChange('bulletin')
  }

  const handleBulletinSelect = (bulletinId: string) => {
    console.log('🔍 게시판 선택:', bulletinId);
    if (onBulletinSelect) {
      onBulletinSelect(bulletinId);
    }
    // 모바일에서 게시판 선택 시 사이드바 닫기
    if (window.innerWidth < 1024) {
      onClose();
    }
  }

  const handleEditBulletin = (bulletin: Bulletin) => {
    console.log('🔍 게시판 수정:', bulletin);
    // TODO: 게시판 수정 모달 열기
    toast.success('게시판 수정 기능은 준비 중입니다.');
  }

  const handleDeleteBulletin = async (bulletin: Bulletin) => {
    if (!confirm(`"${bulletin.title}" 게시판을 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      console.log('🔍 게시판 삭제:', bulletin.id);
      // TODO: Firebase에서 게시판 삭제
      toast.success('게시판이 삭제되었습니다.');
    } catch (error) {
      console.error('게시판 삭제 오류:', error);
      toast.error('게시판 삭제에 실패했습니다.');
    }
  }

  const handleAddTopLevelBulletin = () => {
    console.log('🔍 최상위 게시판 추가');
    // TODO: 게시판 추가 모달 열기
    toast.success('게시판 추가 기능은 준비 중입니다.');
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={bulletinTree.map(b => b.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {bulletinTree.map((bulletin) => (
                            <div key={bulletin.id} className="space-y-1">
                              <div className="flex items-center justify-between group">
                                <button
                                  onClick={() => handleBulletinSelect(bulletin.id)}
                                  className={`flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors ${
                                    bulletin.children && bulletin.children.length > 0 ? 'ml-4' : ''
                                  }`}
                                  style={{ marginLeft: bulletin.children && bulletin.children.length > 0 ? 16 : 0 }}
                                >
                                  {bulletin.children && bulletin.children.length > 0 && (
                                    <ChevronRightIcon className="w-4 h-4 mr-2" />
                                  )}
                                  {bulletin.title}
                                </button>
                                
                                {/* 게시판 관리 버튼들 */}
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditBulletin(bulletin);
                                    }}
                                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="게시판 수정"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBulletin(bulletin);
                                    }}
                                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="게시판 삭제"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {bulletin.children && bulletin.children.length > 0 && (
                                <SortableContext
                                  items={bulletin.children.map(b => b.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {bulletin.children.map((childBulletin) => (
                                    <div key={childBulletin.id} className="ml-4">
                                      <button
                                        onClick={() => handleBulletinSelect(childBulletin.id)}
                                        className={`
                                          flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors
                                        `}
                                      >
                                        {childBulletin.title}
                                      </button>
                                    </div>
                                  ))}
                                </SortableContext>
                              )}
                            </div>
                          ))}
                        </SortableContext>
                      </DndContext>
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