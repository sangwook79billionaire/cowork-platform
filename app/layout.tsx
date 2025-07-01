import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import dynamic from 'next/dynamic'

const inter = Inter({ subsets: ['latin'] })

// AuthProvider를 동적 임포트로 변경하여 서버에서 렌더링되지 않도록 함
const AuthProvider = dynamic(() => import('@/components/providers/AuthProvider').then(mod => ({ default: mod.AuthProvider })), {
  ssr: false,
})

export const metadata: Metadata = {
  title: 'Cowork Platform',
  description: 'A modern collaboration platform for teams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
} 