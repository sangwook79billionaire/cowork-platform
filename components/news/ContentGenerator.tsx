'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ContentOutput } from '@/lib/openai';

interface ContentGeneratorProps {
  keyword?: string;
  newsContent?: string;
}

export function ContentGenerator({ keyword: initialKeyword, newsContent: initialNewsContent }: ContentGeneratorProps) {
  const [keyword, setKeyword] = useState(initialKeyword || '');
  const [newsContent, setNewsContent] = useState(initialNewsContent || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentOutput | null>(null);

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      toast.error('키워드를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          newsContent: newsContent.trim() || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '콘텐츠 생성에 실패했습니다.');
      }

      setGeneratedContent(result.data);
      toast.success('콘텐츠가 성공적으로 생성되었습니다!');
      
    } catch (error) {
      console.error('콘텐츠 생성 오류:', error);
      toast.error(error instanceof Error ? error.message : '콘텐츠 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (type: 'blog' | 'shorts') => {
    if (!generatedContent) return;

    let content = '';
    let filename = '';

    if (type === 'blog') {
      content = generatedContent.blog.article_markdown;
      filename = `${generatedContent.blog.seo.slug}.md`;
    } else {
      content = [
        'HOOK:', generatedContent.shorts.hook,
        '\n\nSCRIPT:', generatedContent.shorts.script_45s,
        '\n\nTITLE:', generatedContent.shorts.title,
        '\n\nDESC:', generatedContent.shorts.description,
        '\n\nTAGS:', generatedContent.shorts.hashtags.join(' '),
      ].join('\n');
      filename = `${generatedContent.blog.seo.slug}-shorts.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`${type === 'blog' ? '블로그' : '숏츠'} 파일이 다운로드되었습니다.`);
  };

  return (
    <div className="space-y-6">
      {/* 입력 폼 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AI 콘텐츠 생성기
        </h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
              키워드 *
            </label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 무릎 통증, 계단 내려갈 때"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="newsContent" className="block text-sm font-medium text-gray-700 mb-2">
              뉴스 내용 (선택사항)
            </label>
            <textarea
              id="newsContent"
              value={newsContent}
              onChange={(e) => setNewsContent(e.target.value)}
              placeholder="뉴스 기사 내용을 붙여넣으면 더 정확한 콘텐츠를 생성할 수 있습니다."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !keyword.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? '생성 중...' : '콘텐츠 생성하기'}
          </button>
        </div>
      </div>

      {/* 생성된 콘텐츠 표시 */}
      {generatedContent && (
        <div className="space-y-6">
          {/* 블로그 콘텐츠 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📝 블로그 콘텐츠
              </h3>
              <button
                onClick={() => handleDownload('blog')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                다운로드
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">제목</h4>
                <p className="text-gray-700">{generatedContent.blog.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">개요</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {generatedContent.blog.outline.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">SEO 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">슬러그:</span> {generatedContent.blog.seo.slug}
                  </div>
                  <div>
                    <span className="font-medium">메타 제목:</span> {generatedContent.blog.seo.metaTitle}
                  </div>
                  <div>
                    <span className="font-medium">메타 설명:</span> {generatedContent.blog.seo.metaDescription}
                  </div>
                  <div>
                    <span className="font-medium">키워드:</span> {generatedContent.blog.seo.keywords.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 숏츠 콘텐츠 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                🎬 숏츠 스크립트
              </h3>
              <button
                onClick={() => handleDownload('shorts')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                다운로드
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">훅</h4>
                <p className="text-gray-700 bg-yellow-50 p-3 rounded-md">
                  {generatedContent.shorts.hook}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">스크립트 (45초)</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md whitespace-pre-line">
                  {generatedContent.shorts.script_45s}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">메타데이터</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">제목:</span> {generatedContent.shorts.title}
                  </div>
                  <div>
                    <span className="font-medium">설명:</span> {generatedContent.shorts.description}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">해시태그:</span> {generatedContent.shorts.hashtags.join(' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
