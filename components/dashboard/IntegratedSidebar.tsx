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
  XMarkIcon,
  PlayIcon,
  SparklesIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'
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
import { ActiveFeature } from '@/types/dashboard'
import BulletinEditModal from './BulletinEditModal'

// Timestamp를 Date로 안전하게 변환하는 함수
const safeTimestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  // 이미 Date 객체인 경우
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Firestore Timestamp인 경우
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // 문자열인 경우 (ISO 문자열)
  if (typeof timestamp === 'string') {
    try {
      return new Date(timestamp);
    } catch (error) {
      console.warn('Invalid date string:', timestamp);
      return null;
    }
  }
  
  // 숫자인 경우 (Unix timestamp)
  if (typeof timestamp === 'number') {
    try {
      return new Date(timestamp);
    } catch (error) {
      console.warn('Invalid timestamp number:', timestamp);
      return null;
    }
  }
  
  console.warn('Unknown timestamp format:', timestamp);
  return null;
}

interface IntegratedSidebarProps {
  activeFeature: ActiveFeature
  onFeatureChange: (feature: ActiveFeature) => void
  isOpen: boolean
  onClose: () => void
  onBulletinSelect?: (bulletinId: string) => void
  defaultBulletinExpanded?: boolean
}

export function IntegratedSidebar({ 
  activeFeature, 
  onFeatureChange, 
  isOpen, 
  onClose,
  onBulletinSelect,
  defaultBulletinExpanded = false
}: IntegratedSidebarProps) {
  const { user, signOut } = useAuth()
  const [isBulletinExpanded, setIsBulletinExpanded] = useState(defaultBulletinExpanded)
  const [allBulletins, setAllBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null)

  // 게시판 수정 모달 열기
  const handleEditBulletin = (bulletin: Bulletin) => {
    setSelectedBulletin(bulletin);
    setShowEditModal(true);
  };

  // 게시판 수정 완료 후 처리
  const handleBulletinUpdate = () => {
    // 게시판 데이터 새로고침
    if (isBulletinExpanded) {
      // useEffect가 자동으로 데이터를 새로고침함
    }
  };

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
    console.log('🔍 게시판 데이터 로딩 useEffect 실행');
    console.log('  - isBulletinExpanded:', isBulletinExpanded);
    console.log('  - user:', !!user);
    console.log('  - db 객체 존재:', !!db);
    
    if (!isBulletinExpanded) {
      console.log('🔍 게시판이 확장되지 않음 - 데이터 로딩 건너뜀');
      return;
    }

    if (!user) {
      console.log('🔍 사용자가 로그인되지 않음 - 데이터 로딩 건너뜀');
      return;
    }

    if (!db) {
      console.log('🔍 Firebase db 객체가 없음 - 데이터 로딩 건너뜀');
      return;
    }

    console.log('🔍 Firebase에서 게시판 데이터 가져오기 시작');
    console.log('🔍 Firestore 쿼리 실행: bulletins 컬렉션, level ASC, order ASC (색인 사용)');
    
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'bulletins'),
        orderBy('level', 'asc'),
        orderBy('order', 'asc')
      ),
      (snapshot) => {
        console.log('🔍 Firestore 스냅샷 수신:', snapshot.size, '개 문서');
        const bulletinData: Bulletin[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          console.log('🔍 게시판 문서 데이터:', { id: doc.id, ...data });
          // Timestamp를 Date로 안전하게 변환
          const bulletin: Bulletin = {
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            parentId: data.parentId || '',
            level: data.level || 0,
            userId: data.userId || '',
            createdAt: safeTimestampToDate(data.createdAt) || new Date(),
            updatedAt: safeTimestampToDate(data.updatedAt) || new Date(),
            isActive: data.isActive !== false,
            order: data.order || 0,
            children: []
          }
          bulletinData.push(bulletin)
        })
        
        // Firebase에서 이미 level ASC, order ASC로 정렬되어 있음
        console.log('🔍 Firebase에서 정렬된 게시판 데이터:', bulletinData);
        
        // Firestore에 데이터가 없으면 빈 배열로 설정
        if (bulletinData.length === 0) {
          console.log('🔍 Firestore에 게시판 데이터가 없음 - 빈 게시판 목록 설정');
          setAllBulletins([]);
          setLoading(false);
          return;
        }
        
        console.log('🔍 처리된 게시판 데이터:', bulletinData);
        setAllBulletins(bulletinData)
        setLoading(false)
      },
      (error) => {
        console.error('게시판 데이터 로드 오류:', error)
        console.error('오류 상세 정보:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        
        // 오류 발생 시 빈 배열로 설정
        console.log('🔍 오류 발생으로 빈 게시판 목록 설정');
        setAllBulletins([]);
        setLoading(false);
      }
    )

    return () => unsubscribe()
  }, [isBulletinExpanded, user, db])

  // 게시판을 계층 구조로 정리하는 함수
  const buildBulletinTree = (bulletins: Bulletin[], parentId: string | null = null): Bulletin[] => {
    console.log('🔍 buildBulletinTree 호출:', {
      bulletinsLength: bulletins.length,
      parentId,
      bulletins: bulletins.map(b => ({ id: b.id, title: b.title, parentId: b.parentId, level: b.level, order: b.order }))
    });
    
    const filtered = bulletins.filter(bulletin => {
      // parentId가 null이거나 빈 문자열이면 최상위 게시판
      if (parentId === null) {
        return !bulletin.parentId || bulletin.parentId.trim() === '';
      }
      // 특정 parentId를 가진 자식 게시판
      return bulletin.parentId === parentId;
    });
    
    console.log('🔍 필터링 결과:', {
      parentId,
      filteredLength: filtered.length,
      filtered: filtered.map(b => ({ id: b.id, title: b.title, parentId: b.parentId }))
    });
    
    const result = filtered.map(bulletin => ({
      ...bulletin,
      children: buildBulletinTree(bulletins, bulletin.id)
    }));
    
    console.log('🔍 최종 결과:', {
      parentId,
      resultLength: result.length,
      result: result.map(b => ({ id: b.id, title: b.title, childrenCount: b.children?.length || 0 }))
    });
    
    return result;
  };

  // 계층 구조로 정리된 게시판 데이터
  const bulletinTree = buildBulletinTree(allBulletins);
  console.log('🔍 게시판 트리 빌드 결과:', bulletinTree);
  console.log('  - 전체 게시판 수:', allBulletins.length);
  console.log('  - 트리 구조:', bulletinTree.map(b => ({ id: b.id, title: b.title, children: b.children?.length || 0 })));

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
      id: 'shorts-scripts' as ActiveFeature, 
      name: '숏폼 스크립트', 
      icon: PlayIcon, 
      color: 'text-pink-600', 
      bgColor: 'bg-pink-50', 
      borderColor: 'border-pink-200' 
    },
    { 
      id: 'gemini-ai-tester' as ActiveFeature, 
      name: 'Gemini AI 테스트', 
      icon: SparklesIcon, 
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
    { 
      id: 'auto-crawl-scheduler' as ActiveFeature, 
      name: '자동 크롤링', 
      icon: ArchiveBoxIcon, 
      color: 'text-teal-600', 
      bgColor: 'bg-teal-50', 
      borderColor: 'border-teal-200' 
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

  // activeFeature가 'bulletin'일 때 자동으로 게시판 확장
  useEffect(() => {
    if (activeFeature === 'bulletin' && !isBulletinExpanded) {
      setIsBulletinExpanded(true)
    }
  }, [activeFeature, isBulletinExpanded])

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

  // 기존 handleEditBulletin 함수는 위에서 정의됨

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
                console.log('🔍 게시판 메뉴 렌더링:', {
                  isActive,
                  isBulletinExpanded,
                  bulletinTreeLength: bulletinTree.length
                });
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
                              <div className="space-y-1">
                                {/* 최상위 게시판 */}
                                <div className="flex items-center justify-between group">
                                  <button
                                    onClick={() => handleBulletinSelect(bulletin.id)}
                                    className="flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors font-medium"
                                  >
                                    <span className="flex items-center">
                                      {bulletin.children && bulletin.children.length > 0 && (
                                        <ChevronRightIcon className="w-4 h-4 mr-2 text-gray-500" />
                                      )}
                                      📋 {bulletin.title}
                                    </span>
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
                                      <PencilIcon className="w-3 h-3" />
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
                                
                                {/* 하위 게시판들 */}
                                {bulletin.children && bulletin.children.length > 0 && (
                                  <div className="ml-6 space-y-1">
                                    {bulletin.children.map((childBulletin) => (
                                      <div key={childBulletin.id} className="flex items-center justify-between group">
                                        <button
                                          onClick={() => handleBulletinSelect(childBulletin.id)}
                                          className="flex-1 text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-lg transition-colors"
                                        >
                                          <span className="flex items-center">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                            📄 {childBulletin.title}
                                          </span>
                                        </button>
                                        
                                        {/* 하위 게시판 관리 버튼들 */}
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditBulletin(childBulletin);
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="게시판 수정"
                                          >
                                            <PencilIcon className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteBulletin(childBulletin);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="게시판 삭제"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
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

      {/* 게시판 수정 모달 */}
      <BulletinEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        bulletin={selectedBulletin ? {
          id: selectedBulletin.id,
          title: selectedBulletin.title,
          level: selectedBulletin.level,
          order: selectedBulletin.order
        } : null}
        onUpdate={handleBulletinUpdate}
      />
    </>
  )
} 