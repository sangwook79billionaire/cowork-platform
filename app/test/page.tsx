'use client'

import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { AuthProvider } from '@/components/providers/AuthProvider'

export default function TestPage() {
  const [showLogin, setShowLogin] = useState(true)

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              윤수&상욱 공동작업장 - 테스트 모드
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLogin(!showLogin)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showLogin ? '대시보드 보기' : '로그인 보기'}
              </button>
              <div className="text-sm text-gray-500">
                Firebase 설정 없이 테스트 중
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-4xl mx-auto p-4">
          {showLogin ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">로그인 폼 테스트</h2>
              <LoginForm />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 p-6 border-b border-gray-200">대시보드 테스트</h2>
              <div className="h-[600px]">
                <Dashboard />
              </div>
            </div>
          )}
        </div>

        {/* 테스트 정보 */}
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">테스트 모드 정보</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Firebase 설정 없이 로컬에서 테스트 가능</li>
              <li>• 모의 사용자로 자동 로그인</li>
              <li>• 샘플 문서 3개 제공</li>
              <li>• 문서 생성, 편집, 저장 기능 테스트 가능</li>
              <li>• 실제 Firebase 프로젝트 설정 시 자동으로 실제 데이터 사용</li>
            </ul>
          </div>
        </div>
      </div>
    </AuthProvider>
  )
} 