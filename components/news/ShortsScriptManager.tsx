'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Plus, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  Tag,
  Users,
  Target,
  FileText,
  Calendar,
  Filter,
  Search
} from 'lucide-react';

interface ShortsScript {
  id: string;
  originalArticleId: string;
  title: string;
  originalTitle: string;
  script: string;
  summary: string;
  keywords: string[];
  duration: number;
  section: string;
  sectionName: string;
  createdAt: string;
  status: 'draft' | 'completed' | 'archived';
  tags: string[];
  targetAudience: string;
  callToAction: string;
}

interface ScriptGenerationRequest {
  section?: string;
  date?: string;
  limit?: number;
  forceRegenerate?: boolean;
}

const ShortsScriptManager: React.FC = () => {
  const [scripts, setScripts] = useState<ShortsScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ShortsScript | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 생성 모달 상태
  const [generateForm, setGenerateForm] = useState<ScriptGenerationRequest>({
    section: 'all',
    date: new Date().toISOString().split('T')[0],
    limit: 10,
    forceRegenerate: false
  });

  // 스크립트 목록 조회
  const fetchScripts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterSection !== 'all') params.append('section', filterSection);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      params.append('limit', '100');

      const response = await fetch(`/api/news/generate-shorts-script?${params}`);
      if (response.ok) {
        const data = await response.json();
        setScripts(data.scripts || []);
      }
    } catch (error) {
      console.error('스크립트 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 스크립트 생성
  const generateScripts = async () => {
    try {
      setGenerating(true);
      
      const requestBody = { ...generateForm };
      if (requestBody.section === 'all') {
        delete requestBody.section;
      }

      const response = await fetch('/api/news/generate-shorts-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n생성된 스크립트: ${data.generatedScripts}개`);
        setShowGenerateModal(false);
        fetchScripts(); // 목록 새로고침
      } else {
        const errorData = await response.json();
        alert(`❌ 스크립트 생성 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('스크립트 생성 실패:', error);
      alert('스크립트 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 스크립트 상태 변경
  const updateScriptStatus = async (scriptId: string, newStatus: string) => {
    try {
      // TODO: 상태 업데이트 API 구현
      alert('상태 업데이트 기능은 준비 중입니다.');
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
    }
  };

  // 스크립트 삭제
  const deleteScript = async (scriptId: string) => {
    if (!confirm('이 스크립트를 삭제하시겠습니까?')) return;
    
    try {
      // TODO: 삭제 API 구현
      alert('삭제 기능은 준비 중입니다.');
    } catch (error) {
      console.error('스크립트 삭제 실패:', error);
    }
  };

  // 필터링된 스크립트
  const filteredScripts = scripts.filter(script => {
    const matchesSection = filterSection === 'all' || script.section === filterSection;
    const matchesStatus = filterStatus === 'all' || script.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.originalTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSection && matchesStatus && matchesSearch;
  });

  useEffect(() => {
    fetchScripts();
  }, [filterSection, filterStatus]);

  // 섹션별 색상
  const getSectionColor = (section: string) => {
    const colors: { [key: string]: string } = {
      'sisa': 'bg-blue-100 text-blue-800',
      'spo': 'bg-green-100 text-green-800',
      'ent': 'bg-purple-100 text-purple-800',
      'pol': 'bg-red-100 text-red-800',
      'eco': 'bg-yellow-100 text-yellow-800',
      'soc': 'bg-orange-100 text-orange-800',
      'int': 'bg-indigo-100 text-indigo-800',
      'its': 'bg-teal-100 text-teal-800'
    };
    return colors[section] || 'bg-gray-100 text-gray-800';
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Play className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">숏폼 스크립트 관리</h2>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>스크립트 생성</span>
        </button>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 섹션</option>
            <option value="sisa">시사</option>
            <option value="spo">스포츠</option>
            <option value="ent">연예</option>
            <option value="pol">정치</option>
            <option value="eco">경제</option>
            <option value="soc">사회</option>
            <option value="int">세계</option>
            <option value="its">과학</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 상태</option>
            <option value="draft">초안</option>
            <option value="completed">완성</option>
            <option value="archived">보관</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="제목, 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 스크립트 목록 */}
      <div className="space-y-4">
        {filteredScripts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {scripts.length === 0 ? '생성된 스크립트가 없습니다.' : '검색 결과가 없습니다.'}
          </div>
        ) : (
          filteredScripts.map((script) => (
            <div key={script.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-800">{script.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSectionColor(script.section)}`}>
                      {script.sectionName}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(script.status)}`}>
                      {script.status === 'draft' ? '초안' : script.status === 'completed' ? '완성' : '보관'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{script.summary}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{script.duration}초</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{script.targetAudience}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(script.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {script.keywords.map((keyword, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedScript(script);
                      setShowScriptModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="스크립트 보기"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateScriptStatus(script.id, 'completed')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="완성으로 변경"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteScript(script.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 스크립트 생성 모달 */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4">숏폼 스크립트 생성</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  섹션 선택
                </label>
                <select
                  value={generateForm.section}
                  onChange={(e) => setGenerateForm({...generateForm, section: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 섹션</option>
                  <option value="sisa">시사</option>
                  <option value="spo">스포츠</option>
                  <option value="ent">연예</option>
                  <option value="pol">정치</option>
                  <option value="eco">경제</option>
                  <option value="soc">사회</option>
                  <option value="int">세계</option>
                  <option value="its">과학</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  value={generateForm.date}
                  onChange={(e) => setGenerateForm({...generateForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생성할 기사 수
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={generateForm.limit}
                  onChange={(e) => setGenerateForm({...generateForm, limit: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="forceRegenerate"
                  checked={generateForm.forceRegenerate}
                  onChange={(e) => setGenerateForm({...generateForm, forceRegenerate: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <label htmlFor="forceRegenerate" className="text-sm font-medium text-gray-700">
                  기존 스크립트 재생성
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={generateScripts}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                    생성 중...
                  </>
                ) : (
                  '스크립트 생성'
                )}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스크립트 상세 보기 모달 */}
      {showScriptModal && selectedScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">스크립트 상세 보기</h3>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">원본 기사 제목</h4>
                <p className="text-gray-900">{selectedScript.originalTitle}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">숏폼 제목</h4>
                <p className="text-gray-900">{selectedScript.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">스크립트 내용</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-gray-900 font-sans">{selectedScript.script}</pre>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">요약</h4>
                  <p className="text-gray-900">{selectedScript.summary}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">지속 시간</h4>
                  <p className="text-gray-900">{selectedScript.duration}초</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">타겟 시청자</h4>
                  <p className="text-gray-900">{selectedScript.targetAudience}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">행동 유도</h4>
                  <p className="text-gray-900">{selectedScript.callToAction}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">키워드</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedScript.keywords.map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">태그</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedScript.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortsScriptManager; 