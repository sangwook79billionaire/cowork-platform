import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface NewsCollectionResult {
  total_collected: number;
  total_unique: number;
  keywords: string[];
  failed_keywords: string[];
  excel_file: string | null;
  firebase_uploaded: boolean;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: '키워드 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log(`🔍 뉴스 수집 시작: ${keywords.join(', ')}`);

                    // Python 스크립트 실행
                const pythonScript = 'scripts/news/news_collector_improved_v2.py';
    const keywordsStr = keywords.join(' ');
    
    const { stdout, stderr } = await execAsync(
      `python3 ${pythonScript} "${keywordsStr}"`,
      { timeout: 120000 } // 2분 타임아웃
    );

    if (stderr) {
      console.error('Python 스크립트 오류:', stderr);
    }

    console.log('Python 스크립트 출력:', stdout);

    // JSON 결과 추출
    const lines = stdout.split('\n');
    let jsonResult = null;
    
    for (const line of lines) {
      if (line.includes('JSON 결과:')) {
        // JSON 결과 섹션 찾기
        const jsonStartIndex = lines.indexOf(line) + 1;
        const jsonEndIndex = lines.findIndex((l, i) => i > jsonStartIndex && l.includes('='));
        
        if (jsonEndIndex > jsonStartIndex) {
          const jsonLines = lines.slice(jsonStartIndex, jsonEndIndex);
          const jsonStr = jsonLines.join('\n');
          try {
            jsonResult = JSON.parse(jsonStr);
            break;
          } catch (e) {
            console.error('JSON 파싱 오류:', e);
          }
        }
      }
    }

    if (jsonResult) {
      return NextResponse.json(jsonResult);
    }

    // JSON 파싱 실패 시 기본 결과 반환
    const result: NewsCollectionResult = {
      total_collected: 0,
      total_unique: 0,
      keywords: keywords,
      failed_keywords: [],
      excel_file: null,
      firebase_uploaded: false,
      message: '뉴스 수집이 완료되었습니다.'
    };

    // 출력에서 결과 추출
    for (const line of lines) {
      if (line.includes('총 수집:')) {
        const match = line.match(/총 수집:\s*(\d+)개/);
        if (match) result.total_collected = parseInt(match[1]);
      }
      if (line.includes('중복 제거 후:')) {
        const match = line.match(/중복 제거 후:\s*(\d+)개/);
        if (match) result.total_unique = parseInt(match[1]);
      }
      if (line.includes('Firebase 업로드: 성공')) {
        result.firebase_uploaded = true;
      }
      if (line.includes('엑셀 파일:')) {
        const match = line.match(/엑셀 파일:\s*(.+)/);
        if (match) result.excel_file = match[1].trim();
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('뉴스 수집 API 오류:', error);
    return NextResponse.json(
      { 
        error: '뉴스 수집 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 