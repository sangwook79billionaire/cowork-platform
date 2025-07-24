// 클라이언트 전용 Firebase 설정
// 이 파일은 브라우저 환경에서만 사용되어야 합니다.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
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
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'dummy-key' &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'dummy-project') {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    
    // Firestore 연결 최적화 설정
    if (typeof window !== 'undefined') {
      // 클라이언트 사이드에서만 실행
      console.log('Firebase Firestore 초기화 완료')
    }
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

// 작성자 표시 이름 생성 함수 (닉네임 우선, 없으면 이메일)
export const getDisplayName = (authorName: string, userEmail?: string): string => {
  // authorName이 닉네임인지 확인 (이메일 형식이 아닌 경우)
  if (authorName && !authorName.includes('@')) {
    return authorName
  }
  
  // authorName이 이메일이거나 비어있는 경우, userEmail 사용
  if (userEmail) {
    return userEmail
  }
  
  // 둘 다 없는 경우
  return authorName || '익명'
}

// 작성자 표시 이름 생성 함수 (Firebase User 객체 사용)
export const getDisplayNameFromUser = (user: any, fallbackName?: string): string => {
  // 1. 사용자의 displayName이 있고 이메일이 아닌 경우
  if (user?.displayName && !user.displayName.includes('@')) {
    return user.displayName
  }
  
  // 2. fallbackName이 있고 이메일이 아닌 경우
  if (fallbackName && !fallbackName.includes('@')) {
    return fallbackName
  }
  
  // 3. 사용자의 이메일
  if (user?.email) {
    return user.email
  }
  
  // 4. fallbackName이 이메일인 경우
  if (fallbackName) {
    return fallbackName
  }
  
  // 5. 기본값
  return '익명'
} 