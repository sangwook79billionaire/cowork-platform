'use client'

import { User } from 'firebase/auth'
import { 
  DocumentTextIcon, 
  FolderIcon, 
  UserIcon,
  CogIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  user: User | null
  onSignOut: () => void
}

export function Sidebar({ user, onSignOut }: SidebarProps) {
  const menuItems = [
    { name: '문서', icon: DocumentTextIcon, href: '#', current: true },
    { name: '폴더', icon: FolderIcon, href: '#', current: false },
    { name: '프로필', icon: UserIcon, href: '#', current: false },
    { name: '설정', icon: CogIcon, href: '#', current: false },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* 사용자 정보 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || '사용자'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              item.current
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon
              className={`mr-3 h-5 w-5 ${
                item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
            {item.name}
          </a>
        ))}
      </nav>

      {/* 로그아웃 버튼 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onSignOut}
          className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          로그아웃
        </button>
      </div>
    </div>
  )
} 