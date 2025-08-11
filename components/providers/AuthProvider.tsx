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
  isAdmin: boolean // admin 권한 확인
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
            const userProfileData: UserProfile = {
              id: user.uid,
              email: user.email || '',
              nickname: user.displayName || user.email?.split('@')[0] || '사용자',
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            
            try {
              await setDoc(doc(db, 'users', user.uid), userProfileData)
              setUserProfile(userProfileData)
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

    // admin 계정 특별 처리
    if (email === 'admin' && password === 'admin') {
      // admin 계정 생성 또는 업데이트
      const adminProfile: UserProfile = {
        id: 'admin',
        email: 'admin@admin.com',
        nickname: '관리자',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      try {
        await setDoc(doc(db, 'users', 'admin'), adminProfile)
        // admin 사용자 객체 생성
        const adminUser = {
          uid: 'admin',
          email: 'admin@admin.com',
          displayName: '관리자',
        } as unknown as User
        
        setUser(adminUser)
        setUserProfile(adminProfile)
        return
      } catch (error) {
        console.error('Error creating admin profile:', error)
        throw new Error('관리자 계정 생성 중 오류가 발생했습니다.')
      }
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

  const signUp = async (email: string, password: string, nickname: string) => {

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
        nickname,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await setDoc(doc(db, 'users', user.uid), userProfile)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!user || !db) {
      throw new Error('User not authenticated or Firebase not initialized')
    }

    try {
      const updatedProfile = {
        ...userProfile,
        ...profile,
        updatedAt: new Date(),
      } as UserProfile

      await setDoc(doc(db, 'users', user.uid), updatedProfile)
      setUserProfile(updatedProfile)
    } catch (error) {
      console.error('Error updating profile:', error)
      throw new Error('프로필 업데이트에 실패했습니다.')
    }
  }

  const signOut = async () => {

    if (!auth) {
      throw new Error('Firebase Auth is not initialized')
    }

    try {
      await firebaseSignOut(auth)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  // admin 권한 확인 (이메일이 admin@admin.com이거나 admin인 경우)
  const isAdmin = user?.email === 'admin@admin.com' || user?.uid === 'admin'

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }}>
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