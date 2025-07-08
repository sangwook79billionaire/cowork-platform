// 클라이언트 전용 Firebase 설정
// 이 파일은 브라우저 환경에서만 사용되어야 합니다.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { UserProfile } from '@/types/firebase'

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)

// 서비스 내보내기
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// 사용자 프로필 가져오기 함수
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile
    }
    return null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// 사용자 닉네임 가져오기 함수
export const getUserNickname = async (userId: string): Promise<string> => {
  const profile = await getUserProfile(userId)
  return profile?.nickname || '익명'
} 