// 대시보드 관련 공통 타입 정의

export type ActiveFeature = 
  | 'bulletin' 
  | 'news-search' 
  | 'news-archive' 
  | 'saved-articles' 
  | 'nate-news' 
  | 'shorts-scripts' 
  | 'gemini-ai-tester' 
  | 'ai-content'
  | 'todo-list' 
  | 'calendar' 
  | 'auto-crawl-scheduler';

export interface DashboardState {
  activeFeature: ActiveFeature;
  sidebarOpen: boolean;
  showCreatePost: boolean;
  showCreateTopLevelBulletin: boolean;
  showQuickExecuteModal: boolean;
}

export interface SidebarProps {
  activeFeature: ActiveFeature;
  onFeatureChange: (feature: ActiveFeature) => void;
  isOpen: boolean;
  onClose: () => void;
} 