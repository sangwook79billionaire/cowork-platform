// 클라이언트 전용 Firebase 설정
// 이 파일은 브라우저 환경에서만 사용되어야 합니다.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { UserProfile } from '@/types/firebase'

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy-domain',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dummy-bucket',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'dummy-app-id',
}

// Firebase 초기화 (환경 변수가 설정된 경우에만)
let app: any = null
let auth: any = null
let db: any = null
let storage: any = null

try {
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'dummy-key') {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
  } else {
    console.warn('Firebase 환경 변수가 설정되지 않았습니다. 모의 모드로 실행됩니다.')
  }
} catch (error) {
  console.error('Firebase 초기화 오류:', error)
}

// 서비스 내보내기
export { auth, db, storage }

// 사용자 프로필 가져오기 함수
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!db) {
    console.warn('Firebase가 초기화되지 않았습니다.')
    return null
  }
  
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