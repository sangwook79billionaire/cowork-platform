'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Document } from '@/types/firebase'
import { mockDocuments } from '@/lib/mockData'
import toast from 'react-hot-toast'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  LinkIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

interface DocumentEditorProps {
  documentId: string
  isPostEditor?: boolean
  bulletinId?: string // 게시판 ID 추가
  onBack?: () => void
  onSave?: () => void
  onRefreshPosts?: () => void
}

// 테스트 모드 확인
const isTestMode = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

export function DocumentEditor({ documentId, isPostEditor, bulletinId, onBack, onSave, onRefreshPosts }: DocumentEditorProps) {
  const { user } = useAuth()
  const [document, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditorInitialized, setIsEditorInitialized] = useState(false)

  useEffect(() => {
    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  // 에디터 초기화
  useEffect(() => {
    if (editorRef.current && !isEditorInitialized) {
      initializeEditor()
    }
  }, [content, isEditorInitialized])

  const initializeEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content || ''
      setIsEditorInitialized(true)
    }
  }

  const saveSelection = () => {
    if (typeof window !== 'undefined' && window.getSelection) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        return selection.getRangeAt(0)
      }
    }
    return null
  }

  const restoreSelection = (range: Range | null) => {
    if (range && typeof window !== 'undefined' && window.getSelection) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const savedRange = saveSelection()
    setContent(target.innerHTML)
    // 다음 틱에서 커서 위치 복원
    setTimeout(() => {
      if (savedRange) {
        restoreSelection(savedRange)
      }
    }, 0)
  }, [])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setContent(e.currentTarget.innerHTML)
  }, [])

  const fetchDocument = async () => {
    // 새 게시글 작성 모드인 경우
    if (documentId === 'new') {
      setDocument({
        id: 'new',
        title: '',
        content: '',
        userId: user?.uid || '',
        isPublic: false,
        category: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      setTitle('')
      setContent('')
      setLoading(false)
      setIsEditorInitialized(false)
      return
    }

    if (isTestMode) {
      // 테스트 모드: 모의 데이터에서 문서 찾기
      const foundDocument = mockDocuments.find(doc => doc.id === documentId)
      if (foundDocument) {
        setDocument(foundDocument)
        setTitle(foundDocument.title)
        setContent(foundDocument.content)
      } else {
        toast.error('문서를 찾을 수 없습니다.')
      }
      setLoading(false)
      return
    }

    try {
      const docRef = doc(db, 'documents', documentId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        const documentData: Document = {
          id: docSnap.id,
          title: data.title,
          content: data.content,
          userId: data.userId,
          isPublic: data.isPublic,
          category: data.category,
          tags: data.tags,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        }

        setDocument(documentData)
        setTitle(documentData.title)
        setContent(documentData.content)
        setIsEditorInitialized(false)
      } else {
        toast.error('문서를 찾을 수 없습니다.')
      }
    } catch (error: any) {
      toast.error('문서를 불러오는데 실패했습니다.')
      console.error('Error fetching document:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveDocument = async () => {
    if (!user) return

    setSaving(true)
    
    // 새 게시글 작성 모드인 경우
    if (documentId === 'new') {
      if (isTestMode) {
        // 테스트 모드: 로컬 상태만 업데이트
        const newDocument = {
          id: `doc-${Date.now()}`,
          title,
          content,
          userId: user.uid,
          isPublic: false,
          category: '',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setDocument(newDocument)
        toast.success('새 게시글이 작성되었습니다.')
        setSaving(false)
        if (onSave) onSave()
        return
      }

      try {
        // Firestore에 새 게시글을 저장
        if (!bulletinId) {
          toast.error('게시판을 선택해주세요.')
          setSaving(false)
          return
        }

        const postData = {
          bulletinId: bulletinId,
          title: title.trim(),
          content: content,
          userId: user.uid,
          authorName: user.displayName || user.email || '익명',
          isPinned: false,
          isLocked: false,
          viewCount: 0,
          likeCount: 0,
          tags: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        await addDoc(collection(db, 'bulletinPosts'), postData)
        toast.success('새 게시글이 작성되었습니다.')
        if (onRefreshPosts) onRefreshPosts()
        if (onSave) onSave()
      } catch (error: any) {
        toast.error('게시글 작성에 실패했습니다.')
        console.error('Error creating post:', error)
      } finally {
        setSaving(false)
      }
      return
    }

    // 기존 문서 편집 모드
    if (!document) {
      setSaving(false)
      return
    }
    
    if (isTestMode) {
      // 테스트 모드: 로컬 상태만 업데이트
      setDocument({
        ...document,
        title,
        content,
        updatedAt: new Date(),
      })
      toast.success('저장되었습니다.')
      setSaving(false)
      return
    }

    try {
      const docRef = doc(db, 'documents', documentId)
      await updateDoc(docRef, {
        title,
        content,
        updatedAt: serverTimestamp()
      })

      toast.success('저장되었습니다.')
    } catch (error: any) {
      toast.error('저장에 실패했습니다.')
      console.error('Error saving document:', error)
    } finally {
      setSaving(false)
    }
  }

  // 자동 저장 (3초 후) - 기존 문서 편집 시에만
  useEffect(() => {
    if (!document || documentId === 'new') return

    const timeoutId = setTimeout(() => {
      if (title !== document.title || content !== document.content) {
        saveDocument()
      }
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [title, content, document, documentId])

  // 에디터 명령어 실행
  const execCommand = (command: string, value?: string) => {
    if (typeof window !== 'undefined' && window.document) {
      window.document.execCommand(command, false, value)
      editorRef.current?.focus()
    }
  }

  // 링크 삽입
  const insertLink = () => {
    if (linkText && linkUrl) {
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
      execCommand('insertHTML', linkHtml)
      setShowLinkDialog(false)
      setLinkUrl('')
      setLinkText('')
    }
  }

  // 이미지 삽입
  const insertImage = () => {
    if (imageUrl) {
      const imgHtml = `<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;" />`
      execCommand('insertHTML', imgHtml)
      setShowImageDialog(false)
      setImageUrl('')
      setImageAlt('')
    }
  }

  // 에디터 툴바
  const Toolbar = () => (
    <div className="border-b border-gray-200 p-2 bg-gray-50">
      <div className="flex items-center space-x-1">
        {/* 텍스트 스타일 */}
        <button
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="p-2 hover:bg-gray-200 rounded font-bold"
          title="제목 1"
        >
          H1
        </button>
        <button
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="p-2 hover:bg-gray-200 rounded font-bold"
          title="제목 2"
        >
          H2
        </button>
        <button
          onClick={() => execCommand('formatBlock', '<h3>')}
          className="p-2 hover:bg-gray-200 rounded font-bold"
          title="제목 3"
        >
          H3
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        {/* 텍스트 포맷 */}
        <button
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded"
          title="굵게"
        >
          <BoldIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded"
          title="기울임"
        >
          <ItalicIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded"
          title="밑줄"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        {/* 목록 */}
        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded"
          title="글머리 기호 목록"
        >
          <ListBulletIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded"
          title="번호 매기기 목록"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        {/* 인용구 */}
        <button
          onClick={() => execCommand('formatBlock', '<blockquote>')}
          className="p-2 hover:bg-gray-200 rounded"
          title="인용구"
        >
          <ChatBubbleLeftRightIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('formatBlock', '<pre>')}
          className="p-2 hover:bg-gray-200 rounded"
          title="코드 블록"
        >
          <CommandLineIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        {/* 링크 */}
        <button
          onClick={() => setShowLinkDialog(true)}
          className="p-2 hover:bg-gray-200 rounded"
          title="링크 삽입"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowImageDialog(true)}
          className="p-2 hover:bg-gray-200 rounded"
          title="이미지 삽입"
        >
          <PhotoIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  if (loading && documentId !== 'new') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!document && documentId !== 'new') {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>문서를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="뒤로 가기"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 flex-1"
              placeholder={isPostEditor ? "게시글 제목" : "제목 없음"}
            />
          </div>
          <div className="flex items-center space-x-2">
            {saving && (
              <span className="text-sm text-gray-500">저장 중...</span>
            )}
            <button
              onClick={() => {
                saveDocument()
                if (onSave) {
                  onSave()
                }
              }}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {isPostEditor ? "게시글 저장" : "저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 툴바 */}
      <Toolbar />

      {/* 에디터 */}
      <div className="flex-1 p-4">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleBlur}
          className="w-full h-full outline-none text-gray-900 prose prose-sm max-w-none"
          style={{ minHeight: 'calc(100vh - 300px)' }}
          data-placeholder={isPostEditor ? "게시글 내용을 입력하세요..." : "문서 내용을 입력하세요..."}
        />
      </div>

      {/* 링크 삽입 다이얼로그 */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">링크 삽입</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 텍스트
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="링크 텍스트"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={insertLink}
                className="btn-primary"
              >
                삽입
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 삽입 다이얼로그 */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">이미지 삽입</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대체 텍스트
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="이미지 설명"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowImageDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={insertImage}
                className="btn-primary"
              >
                삽입
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 