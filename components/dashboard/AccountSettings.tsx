'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UserProfile } from '@/types/firebase'
import toast from 'react-hot-toast'
import {
  UserIcon,
  PhoneIcon,
  GlobeAltIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface AccountSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function AccountSettings({ isOpen, onClose }: AccountSettingsProps) {
  const { userProfile, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nickname: userProfile?.nickname || '',
    phoneNumber: userProfile?.phoneNumber || '',
    countryCode: userProfile?.countryCode || '+82',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProfile({
        nickname: formData.nickname,
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
      })
      toast.success('프로필이 업데이트되었습니다.')
      onClose()
    } catch (error: any) {
      toast.error(error.message || '프로필 업데이트에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const countryCodes = [
    { code: '+82', name: '대한민국' },
    { code: '+1', name: '미국/캐나다' },
    { code: '+81', name: '일본' },
    { code: '+86', name: '중국' },
    { code: '+44', name: '영국' },
    { code: '+49', name: '독일' },
    { code: '+33', name: '프랑스' },
    { code: '+39', name: '이탈리아' },
    { code: '+34', name: '스페인' },
    { code: '+61', name: '호주' },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">계정 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={userProfile?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임 *
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="닉네임을 입력하세요"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              국가 코드
            </label>
            <div className="relative">
              <GlobeAltIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              휴대전화번호
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="휴대전화번호를 입력하세요"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              휴대전화번호는 향후 메신저 서비스 연동에 사용됩니다.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 