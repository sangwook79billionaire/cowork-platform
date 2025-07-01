'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/auth/LoginForm'
import { Dashboard } from '@/components/dashboard/Dashboard'

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 테스트 모드 안내 */}
      {isTestMode && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-800 text-sm">
                🧪 테스트 모드: Firebase 설정 없이 로컬에서 테스트 중입니다.
              </span>
            </div>
            <a
              href="/test"
              className="text-yellow-800 hover:text-yellow-900 text-sm font-medium underline"
            >
              테스트 페이지 보기
            </a>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      {!user ? <LoginForm /> : <Dashboard />}
    </div>
  )
} 