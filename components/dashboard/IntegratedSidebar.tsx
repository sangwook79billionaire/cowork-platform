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
  PencilIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { collection, query, orderBy, onSnapshot, where, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Bulletin } from '@/types/firebase'
import { toast } from 'react-hot-toast';
import { ActiveFeature } from '@/types/dashboard'
import BulletinEditModal from './BulletinEditModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
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

// Timestamp를 Date로 안전하게 변환하는 함수
const safeTimestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  if (timestamp instanceof Date) return timestamp;
  if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp === 'string') {
    try { return new Date(timestamp); } catch (error) { return null; }
  }
  if (typeof timestamp === 'number') {
    try { return new Date(timestamp); } catch (error) { return null; }
  }
  
  return null;
}

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
  const [allBulletins, setAllBulletins] = useState<Bulletin[]>([])
  const [expandedBulletins, setExpandedBulletins] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null)
  
  // 드래그 앤 드롭 관련 상태
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 게시판 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'bulletins'),
        orderBy('level', 'asc'),
        orderBy('order', 'asc')
      ),
      (snapshot) => {
        const bulletinData: Bulletin[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
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
        
        setAllBulletins(bulletinData)
        setLoading(false)
      },
      (error) => {
        console.error('게시판 데이터 로드 오류:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // 계층 구조로 게시판 정리
  const buildBulletinTree = (bulletins: Bulletin[], parentId: string | null = null): Bulletin[] => {
    const filtered = bulletins.filter(bulletin => {
      if (parentId === null) return !bulletin.parentId || bulletin.parentId.trim() === '';
      return bulletin.parentId === parentId;
    });
    
    return filtered.map(bulletin => ({
      ...bulletin,
      children: buildBulletinTree(bulletins, bulletin.id)
    }));
  };

  const bulletinTree = buildBulletinTree(allBulletins);

  // 최상위 게시판만 자동으로 확장
  useEffect(() => {
    if (allBulletins.length > 0) {
      const topLevelBulletins = allBulletins.filter(b => !b.parentId || b.parentId.trim() === '');
      const newExpanded = new Set<string>();
      topLevelBulletins.forEach(bulletin => {
        newExpanded.add(bulletin.id);
      });
      setExpandedBulletins(newExpanded);
    }
  }, [allBulletins]);

  // 게시판 확장/축소 토글
  const toggleBulletinExpansion = (bulletinId: string) => {
    setExpandedBulletins(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(bulletinId)) {
        newExpanded.delete(bulletinId);
      } else {
        newExpanded.add(bulletinId);
      }
      return newExpanded;
    });
  };

  // 게시판 수정 모달 열기
  const handleEditBulletin = (bulletin: Bulletin) => {
    setSelectedBulletin(bulletin);
    setShowEditModal(true);
  };

  // 게시판 삭제
  const handleDeleteBulletin = async (bulletin: Bulletin) => {
    if (!confirm(`"${bulletin.title}" 게시판을 삭제하시겠습니까?`)) return;
    
    try {
      await deleteDoc(doc(db, 'bulletins', bulletin.id));
      toast.success('게시판이 삭제되었습니다.');
    } catch (error) {
      console.error('게시판 삭제 오류:', error);
      toast.error('게시판 삭제에 실패했습니다.');
    }
  };

  // 게시판 선택
  const handleBulletinSelect = (bulletinId: string) => {
    onBulletinSelect?.(bulletinId);
  };

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  // 드래그 오버
  const handleDragOver = (event: DragOverEvent) => {
    // 드래그 오버 시 필요한 로직 (필요시 구현)
  };

  // 드래그 종료
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setIsDragging(false);
    
    if (!over || active.id === over.id) return;
    
    const activeBulletin = allBulletins.find(b => b.id === active.id);
    const overBulletin = allBulletins.find(b => b.id === over.id);
    
    if (!activeBulletin || !overBulletin) return;
    
    try {
      // 게시판 순서 변경
      const batch = writeBatch(db);
      
      // 순서 변경
      const newOrder = overBulletin.order;
      
      // 같은 레벨 내에서 순서 변경
      if (activeBulletin.level === overBulletin.level && activeBulletin.parentId === overBulletin.parentId) {
        // 순서만 변경
        batch.update(doc(db, 'bulletins', activeBulletin.id), {
          order: newOrder,
          updatedAt: new Date()
        });
        
        // 다른 게시판들의 순서 조정
        const sameLevelBulletins = allBulletins.filter(b => 
          b.level === activeBulletin.level && 
          b.parentId === activeBulletin.parentId &&
          b.id !== activeBulletin.id
        );
        
        sameLevelBulletins.forEach(bulletin => {
          if (bulletin.order >= newOrder) {
            batch.update(doc(db, 'bulletins', bulletin.id), {
              order: bulletin.order + 1,
              updatedAt: new Date()
            });
          }
        });
      } else {
        // 다른 레벨로 이동 (부모 변경)
        batch.update(doc(db, 'bulletins', activeBulletin.id), {
          parentId: overBulletin.parentId,
          level: overBulletin.level,
          order: newOrder,
          updatedAt: new Date()
        });
        
        // 하위 게시판들의 레벨도 조정
        const updateChildrenLevels = (parentId: string, newLevel: number) => {
          const children = allBulletins.filter(b => b.parentId === parentId);
          children.forEach(child => {
            batch.update(doc(db, 'bulletins', child.id), {
              level: newLevel + 1,
              updatedAt: new Date()
            });
            updateChildrenLevels(child.id, newLevel + 1);
          });
        };
        
        updateChildrenLevels(activeBulletin.id, overBulletin.level);
      }
      
      await batch.commit();
      toast.success('게시판 위치가 변경되었습니다.');
    } catch (error) {
      console.error('게시판 위치 변경 오류:', error);
      toast.error('게시판 위치 변경에 실패했습니다.');
    }
  };

  // 드래그 가능한 게시판 아이템 컴포넌트
  const DraggableBulletinItem = ({ bulletin, level }: { bulletin: Bulletin; level: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: bulletin.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const hasChildren = bulletin.children && bulletin.children.length > 0;
    const isExpanded = expandedBulletins.has(bulletin.id);
    
    return (
      <div ref={setNodeRef} style={style} className="space-y-1">
        <div className="flex items-center justify-between group">
          <div className="flex items-center flex-1">
            {/* 드래그 핸들 */}
            <div
              {...attributes}
              {...listeners}
              className="p-1 hover:bg-gray-200 rounded transition-colors mr-1 cursor-grab active:cursor-grabbing"
              title="드래그하여 위치 변경"
            >
              <div className="w-3 h-3 flex items-center justify-center">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full ml-0.5"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full ml-0.5"></div>
              </div>
            </div>
            
            {/* 확장/축소 버튼 */}
            {hasChildren && (
              <button
                onClick={() => toggleBulletinExpansion(bulletin.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors mr-1"
                title={isExpanded ? "게시판 접기" : "게시판 펼치기"}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3" />
                )}
              </button>
            )}
            
            {/* 하위 게시판이 없으면 점으로 표시 */}
            {!hasChildren && (
              <div className="w-3 h-3 flex items-center justify-center mr-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              </div>
            )}
            
            <button
              onClick={() => handleBulletinSelect(bulletin.id)}
              className={`flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors`}
              style={{ marginLeft: level * 16 }}
            >
              <span className="mr-2 text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                lv.{bulletin.level + 1}
              </span>
              {bulletin.title}
              {hasChildren && bulletin.children && (
                <span className="ml-2 text-xs text-gray-500">
                  ({bulletin.children.length})
                </span>
              )}
            </button>
          </div>
          
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
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* 하위 게시판들 - 드롭다운 형식으로 표시 */}
        {hasChildren && bulletin.children && (
          <div className={`ml-4 border-l border-gray-200 transition-all duration-200 ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            {renderBulletinTree(bulletin.children, level + 1)}
          </div>
        )}
      </div>
    );
  };

  // 게시판 트리 렌더링
  const renderBulletinTree = (bulletins: Bulletin[], level: number = 0) => {
    return bulletins.map((bulletin) => (
      <DraggableBulletinItem key={bulletin.id} bulletin={bulletin} level={level} />
    ));
  };

  // 메뉴 항목들
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
      id: 'nate-news' as ActiveFeature, 
      name: '네이트 뉴스', 
      icon: ArchiveBoxIcon, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50', 
      borderColor: 'border-purple-200' 
    },
    { 
      id: 'ai-content' as ActiveFeature, 
      name: 'AI 콘텐츠 생성', 
      icon: SparklesIcon, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50', 
      borderColor: 'border-orange-200' 
    },
    { 
      id: 'shorts-scripts' as ActiveFeature, 
      name: '숏츠 스크립트', 
      icon: PlayIcon, 
      color: 'text-red-600', 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-200' 
    }
  ];

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
              
              if (feature.id === 'bulletin') {
                return (
                  <div key={feature.id} className="space-y-2">
                    <button
                      onClick={() => onFeatureChange(feature.id)}
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
                    </button>
                    
                    {/* 게시판 트리 */}
                    {isActive && (
                      <div className="pl-4 space-y-1">
                        {/* 새 게시판 추가 버튼 */}
                        <button
                          onClick={() => {
                            setSelectedBulletin({
                              id: '',
                              title: '',
                              description: '',
                              parentId: '',
                              level: 0,
                              userId: user?.uid || '',
                              createdAt: new Date(),
                              updatedAt: new Date(),
                              isActive: true,
                              order: 0,
                              children: []
                            });
                            setShowEditModal(true);
                          }}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-300 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          새 게시판 추가
                        </button>
                        
                        {loading ? (
                          <div className="text-sm text-gray-500">로딩 중...</div>
                        ) : bulletinTree.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={allBulletins.map(b => b.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {renderBulletinTree(bulletinTree, 0)}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="text-sm text-gray-500">게시판이 없습니다.</div>
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
        </div>
      </div>

      {/* 게시판 수정 모달 */}
      <BulletinEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        bulletin={selectedBulletin}
        onUpdate={() => {
          setShowEditModal(false);
          setSelectedBulletin(null);
        }}
      />
    </>
  )
} 