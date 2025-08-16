'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

import { Bulletin } from '@/types/firebase';

interface BulletinEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulletin: Bulletin | null;
  onUpdate: () => void;
  parentId?: string | null; // 새 게시판 생성 시 부모 ID
  isCreate?: boolean; // 새 게시판 생성 모드인지 여부
}

const BulletinEditModal: React.FC<BulletinEditModalProps> = ({ 
  isOpen, 
  onClose, 
  bulletin, 
  onUpdate 
}) => {
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 모달이 열릴 때 게시판 이름 초기화
  useEffect(() => {
    if (isOpen && bulletin) {
      setNewName(bulletin.title);
      setError('');
    }
  }, [isOpen, bulletin]);

  // 게시판 이름 수정 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulletin) return;
    
    // 입력값 검증
    if (!newName.trim()) {
      setError('게시판 이름을 입력해주세요.');
      return;
    }
    
    if (newName.trim() === bulletin.title) {
      setError('변경된 내용이 없습니다.');
      return;
    }
    
    if (newName.trim().length > 50) {
      setError('게시판 이름은 50자 이하여야 합니다.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Firestore에서 게시판 정보 업데이트
      const bulletinRef = doc(db, 'bulletins', bulletin.id);
      await updateDoc(bulletinRef, {
        title: newName.trim(),
        updatedAt: new Date()
      });

      toast.success('게시판 이름이 성공적으로 수정되었습니다.');
      onUpdate(); // 부모 컴포넌트에 업데이트 알림
      onClose();
    } catch (error) {
      console.error('게시판 수정 오류:', error);
      setError('게시판 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
      toast.error('게시판 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 닫기
  const handleClose = () => {
    if (!isLoading) {
      setNewName('');
      setError('');
      onClose();
    }
  };

  if (!isOpen || !bulletin) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <PencilIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">게시판 수정</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 현재 게시판 정보 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">현재 게시판 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">게시판 ID:</span>
                <span className="font-mono text-gray-800">{bulletin.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">레벨:</span>
                <span className="font-medium">{bulletin.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">순서:</span>
                <span className="font-medium">{bulletin.order}</span>
              </div>
            </div>
          </div>

          {/* 게시판 이름 입력 */}
          <div>
            <label htmlFor="bulletinName" className="block text-sm font-medium text-gray-700 mb-2">
              게시판 이름
            </label>
            <input
              type="text"
              id="bulletinName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새로운 게시판 이름을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={50}
              disabled={isLoading}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {newName.length}/50자
              </span>
              {newName.trim() !== bulletin.title && (
                <span className="text-xs text-blue-600">
                  변경됨
                </span>
              )}
            </div>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !newName.trim() || newName.trim() === bulletin.title}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '수정 중...' : '수정하기'}
            </button>
          </div>
        </form>

        {/* 정보 박스 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">수정 안내</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• 게시판 이름만 수정할 수 있습니다</li>
                <li>• 레벨과 순서는 변경할 수 없습니다</li>
                <li>• 수정 후 즉시 반영됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulletinEditModal; 