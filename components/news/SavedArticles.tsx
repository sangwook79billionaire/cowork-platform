'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SavedArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  published_at: string;
  content: string;
  saved_at: string;
  userId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Bulletin {
  id: string;
  title: string;
  description: string;
  parentId: string;
  level: number;
  order: number;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function SavedArticles() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showShortsModal, setShowShortsModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null);
  const [shortsScript, setShortsScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [selectedBulletinId, setSelectedBulletinId] = useState<string>('');
  const [showBulletinSelector, setShowBulletinSelector] = useState(false);

  // 저장된 기사 목록 가져오기
  const fetchSavedArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/news/save');
      const result = await response.json();

      if (result.success) {
        setArticles(result.data.articles);
      } else {
        console.error('저장된 기사 목록 가져오기 실패:', result.error);
        toast.error('저장된 기사 목록을 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('저장된 기사 목록 가져오기 오류:', error);
      toast.error('저장된 기사 목록을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 게시판 목록 가져오기
  const fetchBulletins = async () => {
    try {
      const bulletinsRef = collection(db, 'bulletins');
      const q = query(bulletinsRef, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedBulletins: Bulletin[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedBulletins.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          parentId: data.parentId || '',
          level: data.level || 0,
          userId: data.userId || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isActive: data.isActive !== false,
          order: data.order || 0,
        });
      });
      
      setBulletins(fetchedBulletins);
    } catch (error) {
      console.error('게시판 데이터 가져오기 오류:', error);
      toast.error('게시판 목록을 가져오는데 실패했습니다.');
    }
  };

  // 기사 삭제
  const deleteArticle = async (articleId: string) => {
    if (!confirm('정말로 이 기사를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/news/save/${articleId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('기사가 삭제되었습니다.');
        fetchSavedArticles(); // 목록 새로고침
      } else {
        toast.error(result.error || '기사 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('기사 삭제 오류:', error);
      toast.error('기사 삭제 중 오류가 발생했습니다.');
    }
  };

  // 숏폼 스크립트 제작
  const handleCreateShortsScript = async (article: SavedArticle) => {
    setSelectedArticle(article);
    setShowShortsModal(true);
    setShortsScript('');
    setGeneratingScript(true);

    try {
      const response = await fetch('/api/gemini/create-shorts-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleTitle: article.title,
          articleContent: article.content,
          articleSource: article.source,
          publishedAt: article.published_at,
        }),
      });

      if (!response.ok) {
        throw new Error('스크립트 생성에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setShortsScript(result.script);
        toast.success('숏폼 스크립트가 생성되었습니다!');
      } else {
        toast.error(result.error || '스크립트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('숏폼 스크립트 생성 오류:', error);
      toast.error('스크립트 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingScript(false);
    }
  };

  // 숏폼 스크립트 재생성
  const handleRegenerateScript = async () => {
    if (!selectedArticle) return;
    await handleCreateShortsScript(selectedArticle);
  };

  // 숏폼 스크립트를 게시판에 저장
  const handleSaveScriptToBulletin = async () => {
    if (!selectedBulletinId || !shortsScript || !selectedArticle) {
      toast.error('게시판을 선택하고 스크립트가 생성된 후 저장해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/bulletin-posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bulletinId: selectedBulletinId,
          title: `[숏폼] ${selectedArticle.title}`,
          content: `**원본 기사:** ${selectedArticle.title}\n\n**출처:** ${selectedArticle.source}\n\n**발행일:** ${formatDate(selectedArticle.published_at)}\n\n**숏폼 스크립트:**\n\n${shortsScript}`,
          userId: 'current-user', // 실제 사용자 ID로 교체 필요
          authorName: '현재 사용자', // 실제 사용자 닉네임으로 교체 필요
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('스크립트 저장 오류:', errorText);
        toast.error('스크립트 저장에 실패했습니다.');
        return;
      }

      const result = await response.json();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('숏폼 스크립트가 게시판에 저장되었습니다!');
      setShowShortsModal(false);
      setSelectedBulletinId('');
      setShortsScript('');
      
    } catch (error) {
      console.error('스크립트 저장 오류:', error);
      toast.error('스크립트 저장 중 오류가 발생했습니다.');
    }
  };

  // 필터링된 기사 목록
  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    article.content.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 날짜 포맷팅
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '날짜 없음';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // 유효한 날짜인지 확인
      if (isNaN(dateObj.getTime())) {
        return '날짜 없음';
      }
      
      return dateObj.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error);
      return '날짜 없음';
    }
  };

  useEffect(() => {
    fetchSavedArticles();
    fetchBulletins(); // 게시판 목록 가져오기
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">저장된 뉴스 기사</h2>
        
        {/* 검색 필터 */}
        <div className="mb-4">
          <input
            type="text"
            id="saved-articles-search"
            name="searchKeyword"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="저장된 기사에서 검색..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 새로고침 버튼 */}
        <button
          onClick={fetchSavedArticles}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 기사 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            총 {filteredArticles.length}개의 저장된 기사
          </p>
          
          <div className="grid gap-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg flex-1">{article.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCreateShortsScript(article)}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      title="숏폼 스크립트 제작"
                    >
                      숏폼 제작
                    </button>
                    <button
                      onClick={() => deleteArticle(article.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 mb-3">{article.content}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>{article.source}</span>
                    <span>저장: {formatDate(article.saved_at)}</span>
                    <span>발행: {formatDate(article.published_at)}</span>
                  </div>
                  
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    원문 보기 →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchKeyword ? '검색 결과가 없습니다.' : '저장된 기사가 없습니다.'}
          </p>
        </div>
      )}

      {/* 숏폼 스크립트 모달 */}
      {showShortsModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">숏폼 스크립트 제작</h3>
              <button
                onClick={() => setShowShortsModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ✕
              </button>
            </div>

            {/* 원본 기사 정보 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">원본 기사</h4>
              <p className="text-sm text-gray-600 mb-2">
                <strong>제목:</strong> {selectedArticle.title}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>출처:</strong> {selectedArticle.source}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>발행일:</strong> {formatDate(selectedArticle.published_at)}
              </p>
              <div className="text-sm text-gray-600">
                <strong>내용:</strong>
                <p className="mt-1 text-gray-700 line-clamp-3">{selectedArticle.content}</p>
              </div>
            </div>

            {/* 스크립트 생성 영역 */}
            <div className="space-y-4">
              {generatingScript ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">AI가 숏폼 스크립트를 생성하고 있습니다...</p>
                </div>
              ) : shortsScript ? (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">생성된 스크립트</h4>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{shortsScript}</pre>
                  </div>
                  
                  {/* 게시판 선택 영역 */}
                  <div className="mt-4 space-y-4">
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2">게시판에 저장</h5>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowBulletinSelector(!showBulletinSelector)}
                          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          {selectedBulletinId ? '게시판 변경' : '게시판 선택'}
                        </button>
                        {selectedBulletinId && (
                          <span className="text-sm text-gray-600">
                            선택됨: {bulletins.find(b => b.id === selectedBulletinId)?.title || '알 수 없음'}
                          </span>
                        )}
                      </div>
                      
                      {/* 게시판 선택 드롭다운 */}
                      {showBulletinSelector && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                          <div className="space-y-1">
                            {bulletins.map((bulletin) => (
                              <button
                                key={bulletin.id}
                                onClick={() => {
                                  setSelectedBulletinId(bulletin.id);
                                  setShowBulletinSelector(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-200 transition-colors ${
                                  selectedBulletinId === bulletin.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                                }`}
                              >
                                {'　'.repeat(bulletin.level)}📁 {bulletin.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(shortsScript)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        스크립트 복사
                      </button>
                      <button
                        onClick={handleRegenerateScript}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        다시 생성
                      </button>
                      {selectedBulletinId && (
                        <button
                          onClick={handleSaveScriptToBulletin}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          게시판에 저장
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">스크립트를 생성하려면 기사를 선택해주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 