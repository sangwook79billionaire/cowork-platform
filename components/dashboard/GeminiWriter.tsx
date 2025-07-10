'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  KeyIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface GeminiWriterProps {
  onContentGenerated?: (content: string) => void;
  initialContent?: string;
  onSaveToBulletin?: (content: string, title: string) => void;
}

export default function GeminiWriter({ onContentGenerated, initialContent = '', onSaveToBulletin }: GeminiWriterProps) {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('일반적인');
  const [length, setLength] = useState('중간');
  const [content, setContent] = useState(initialContent);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');

  const styles = [
    '일반적인', '학술적인', '창의적인', '비즈니스', '친근한', '전문적인'
  ];

  const lengths = [
    '짧은', '중간', '긴', '매우 긴'
  ];

  const handleGeneratePost = async () => {
    if (!topic.trim()) {
      toast.error('주제를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          topic,
          style,
          length,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '글 생성에 실패했습니다.');
      }

      setContent(data.result);
      onContentGenerated?.(data.result);
      toast.success('글이 성공적으로 생성되었습니다!');
    } catch (error) {
      toast.error('글 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast.error('요약할 내용이 없습니다.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'summarize',
          content,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '요약에 실패했습니다.');
      }

      setContent(data.result);
      onContentGenerated?.(data.result);
      toast.success('글이 요약되었습니다!');
    } catch (error) {
      toast.error('요약에 실패했습니다.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprove = async (improvementType: '문법' | '스타일' | '가독성') => {
    if (!content.trim()) {
      toast.error('개선할 내용이 없습니다.');
      return;
    }

    setIsImproving(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'improve',
          content,
          improvementType,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '글 개선에 실패했습니다.');
      }

      setContent(data.result);
      onContentGenerated?.(data.result);
      toast.success(`${improvementType}이 개선되었습니다!`);
    } catch (error) {
      toast.error('글 개선에 실패했습니다.');
      console.error(error);
    } finally {
      setIsImproving(false);
    }
  };

  const handleExtractKeywords = async () => {
    if (!content.trim()) {
      toast.error('키워드를 추출할 내용이 없습니다.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'extractKeywords',
          content,
          count: 5,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '키워드 추출에 실패했습니다.');
      }

      setKeywords(data.result);
      toast.success('키워드가 추출되었습니다!');
    } catch (error) {
      toast.error('키워드 추출에 실패했습니다.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    toast.success('내용이 클립보드에 복사되었습니다!');
  };

  const handleSaveToBulletin = () => {
    if (!content.trim()) {
      toast.error('저장할 내용이 없습니다.');
      return;
    }
    setPostTitle(topic || 'AI 생성 글');
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    if (!postTitle.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    onSaveToBulletin?.(content, postTitle);
    setShowSaveModal(false);
    setPostTitle('');
    toast.success('게시판에 저장되었습니다!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="h-6 w-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">Gemini AI 글 작성 도구</h2>
      </div>

      {/* 글 생성 섹션 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">새 글 생성</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주제
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="글의 주제를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스타일
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            >
              {styles.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              길이
            </label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            >
              {lengths.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGeneratePost}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <DocumentTextIcon className="h-5 w-5" />
          )}
          {isGenerating ? '생성 중...' : '글 생성하기'}
        </button>
      </div>

      {/* 글 편집 섹션 */}
      {content && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">글 편집</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopyContent}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                복사
              </button>
              <button
                onClick={handleSaveToBulletin}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
              >
                게시판 저장
              </button>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="여기에 내용을 입력하거나 생성된 글을 편집하세요"
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-900"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleImprove('가독성')}
              disabled={isImproving}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PencilIcon className="h-4 w-4" />
              가독성 개선
            </button>

            <button
              onClick={() => handleImprove('문법')}
              disabled={isImproving}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PencilIcon className="h-4 w-4" />
              문법 개선
            </button>

            <button
              onClick={() => handleImprove('스타일')}
              disabled={isImproving}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PencilIcon className="h-4 w-4" />
              스타일 개선
            </button>

            <button
              onClick={handleSummarize}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              요약하기
            </button>

            <button
              onClick={handleExtractKeywords}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyIcon className="h-4 w-4" />
              키워드 추출
            </button>
          </div>
        </div>
      )}

      {/* 키워드 표시 */}
      {keywords.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">추출된 키워드:</h4>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">게시판에 저장</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="글 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 