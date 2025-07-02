'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserProfile } from '@/types/firebase'
import { mockUser, mockUserProfile } from '@/lib/mockData'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    if (isTestMode) {
      // 테스트 모드: 모의 사용자로 자동 로그인
      setUser(mockUser as unknown as User)
      setUserProfile(mockUserProfile)
      setLoading(false)
      return
    }

    // Firebase가 초기화되지 않은 경우 처리
    if (!auth) {
      console.warn('Firebase Auth is not initialized')
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user && db) {
        // 사용자 프로필 정보 가져오기
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile)
          } else {
            // 프로필이 없으면 자동 생성
            const userProfile: UserProfile = {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || '사용자',
              avatarUrl: user.photoURL || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            
            try {
              await setDoc(doc(db, 'users', user.uid), userProfile)
              setUserProfile(userProfile)
            } catch (createError) {
              console.error('Error creating user profile:', createError)
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (isTestMode) {
      // 테스트 모드: 항상 성공
      setUser(mockUser as unknown as User)
      setUserProfile(mockUserProfile)
      return
    }

    if (!auth) {
      throw new Error('Firebase Auth is not initialized')
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    if (isTestMode) {
      // 테스트 모드: 항상 성공
      const newUser = { ...mockUser, email, displayName: name } as unknown as User
      const newProfile = { ...mockUserProfile, email, name }
      setUser(newUser)
      setUserProfile(newProfile)
      return
    }

    if (!auth || !db) {
      throw new Error('Firebase is not initialized')
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 사용자 프로필 생성
      const userProfile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        name,
        avatarUrl: user.photoURL || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await setDoc(doc(db, 'users', user.uid), userProfile)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const signOut = async () => {
    if (isTestMode) {
      // 테스트 모드: 로그아웃
      setUser(null)
      setUserProfile(null)
      return
    }

    if (!auth) {
      throw new Error('Firebase Auth is not initialized')
    }

    try {
      await firebaseSignOut(auth)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 