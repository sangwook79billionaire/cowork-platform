import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AIModelSelector, AIProvider, AIModel } from '@/lib/ai-providers';

// Firebase Admin 초기화
if (!getApps().length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    initializeApp({
      credential: cert(serviceAccount as any)
    });
    console.log('✅ Firebase Admin 초기화 성공');
  } catch (error) {
    console.error('❌ Firebase Admin 초기화 실패:', error);
  }
}

const db = getFirestore();

interface ShortsScript {
  id: string;
  originalArticleId: string;
  title: string;
  originalTitle: string;
  script: string;
  summary: string;
  keywords: string[];
  duration: number; // 초 단위
  section: string;
  sectionName: string;
  createdAt: string;
  status: 'draft' | 'completed' | 'archived';
  tags: string[];
  targetAudience: string;
  callToAction: string;
  aiProvider?: string;
  aiModel?: string;
}

interface GenerateScriptRequest {
  section?: string;
  date?: string;
  limit?: number;
  forceRegenerate?: boolean;
  aiProvider?: AIProvider;
  aiModel?: AIModel;
}

interface GenerateScriptResponse {
  success: boolean;
  message: string;
  generatedScripts: number;
  totalArticles: number;
  scripts: ShortsScript[];
  aiProvider: string;
  aiModel: string;
}

// 숏폼 스크립트 생성 프롬프트
const generateShortsPrompt = (article: any) => `
다음 뉴스 기사를 30초~60초 숏폼 동영상용 스크립트로 변환해주세요.

**원본 기사:**
제목: ${article.title}
내용: ${article.summary || article.title}

**요구사항:**
1. 핵심 내용을 간결하게 요약
2. 시청자의 관심을 끌 수 있는 도입부
3. 명확하고 이해하기 쉬운 설명
4. 강력한 마무리와 행동 유도
5. 30-60초 분량 (약 100-200자)

**출력 형식:**
{
  "title": "숏폼 제목 (15자 이내)",
  "script": "전체 스크립트 내용",
  "summary": "핵심 요약 (50자 이내)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "duration": 45,
  "targetAudience": "타겟 시청자",
  "callToAction": "행동 유도 문구",
  "tags": ["태그1", "태그2"]
}

한국어로 작성해주세요.
`;

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 숏폼 스크립트 생성 시작');
    
    const body: GenerateScriptRequest = await request.json();
    const { section, date, limit = 10, forceRegenerate = false } = body;
    
    // 오늘 날짜 (기본값)
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`🔍 대상: ${section || '전체'} 섹션, 날짜: ${targetDate}`);
    
    // 뉴스 기사 조회
    let query = db.collection('nateNews')
      .where('publishedAt', '==', targetDate)
      .orderBy('rank', 'asc');
    
    if (section) {
      query = query.where('section', '==', section);
    }
    
    const articlesSnapshot = await query.limit(limit).get();
    
    if (articlesSnapshot.empty) {
      return NextResponse.json({
        success: false,
        message: '해당 날짜에 크롤링된 기사가 없습니다.',
        generatedScripts: 0,
        totalArticles: 0,
        scripts: []
      });
    }
    
    const articles = articlesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any));
    
    console.log(`📰 ${articles.length}개 기사 발견`);
    
    const generatedScripts: ShortsScript[] = [];
    let successCount = 0;
    
    // 각 기사별로 스크립트 생성
    for (const article of articles) {
      try {
        // 이미 스크립트가 있는지 확인
        if (!forceRegenerate) {
          const existingScriptQuery = db.collection('shortsScripts')
            .where('originalArticleId', '==', article.id)
            .limit(1);
          
          const existingScripts = await existingScriptQuery.get();
          if (!existingScripts.empty) {
            console.log(`⚠️ 이미 스크립트 존재: ${article.title}`);
            continue;
          }
        }
        
        console.log(`🎬 스크립트 생성 중: ${article.title}`);
        
        // AI 모델로 스크립트 생성
        const prompt = generateShortsPrompt(article);
        
        const aiResponse = await AIModelSelector.generateContent(
          prompt,
          body.aiProvider,
          { model: body.aiModel }
        );
        
        const text = aiResponse.content;
        
        // JSON 파싱 시도
        let scriptData;
        try {
          // JSON 부분만 추출
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            scriptData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('JSON 형식이 아닙니다');
          }
        } catch (parseError) {
          console.warn(`⚠️ JSON 파싱 실패, 기본 형식으로 생성: ${article.title}`);
          // 기본 형식으로 스크립트 생성
          scriptData = {
            title: article.title.substring(0, 15),
            script: `안녕하세요! 오늘의 주요 뉴스를 전해드립니다.\n\n${article.title}\n\n이 뉴스에 대해 자세히 알아보시겠어요?`,
            summary: article.title.substring(0, 50),
            keywords: ['뉴스', '주요', '정보'],
            duration: 45,
            targetAudience: '일반 시청자',
            callToAction: '더 자세한 내용은 링크를 확인해보세요!',
            tags: ['뉴스', '정보']
          };
        }
        
        // 섹션 이름 매핑
        const sectionNames: { [key: string]: string } = {
          'sisa': '시사',
          'spo': '스포츠',
          'ent': '연예',
          'pol': '정치',
          'eco': '경제',
          'soc': '사회',
          'int': '세계',
          'its': '과학'
        };
        
        // 스크립트 데이터 생성
        const script: ShortsScript = {
          id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalArticleId: article.id,
          title: scriptData.title || article.title.substring(0, 15),
          originalTitle: article.title,
          script: scriptData.script || '스크립트 생성 실패',
          summary: scriptData.summary || article.title.substring(0, 50),
          keywords: scriptData.keywords || ['뉴스'],
          duration: scriptData.duration || 45,
          section: article.section,
          sectionName: sectionNames[article.section] || article.section,
          createdAt: new Date().toISOString(),
          status: 'draft',
          tags: scriptData.tags || ['뉴스'],
          targetAudience: scriptData.targetAudience || '일반 시청자',
          callToAction: scriptData.callToAction || '더 자세한 내용을 확인해보세요!',
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model
        };
        
        // Firebase에 저장
        await db.collection('shortsScripts').doc(script.id).set(script);
        
        generatedScripts.push(script);
        successCount++;
        
        console.log(`✅ 스크립트 생성 완료: ${script.title}`);
        
        // API 호출 간격 조절
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ 스크립트 생성 실패: ${article.title}`, error);
        
        // 오류 발생 시에도 기본 스크립트 저장
        try {
          const fallbackScript: ShortsScript = {
            id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            originalArticleId: article.id,
            title: article.title.substring(0, 15),
            originalTitle: article.title,
            script: `오늘의 뉴스: ${article.title}\n\n이 뉴스에 대해 더 자세히 알아보세요.`,
            summary: article.title.substring(0, 50),
            keywords: ['뉴스', '정보'],
            duration: 30,
            section: article.section,
            sectionName: article.section,
            createdAt: new Date().toISOString(),
            status: 'draft',
            tags: ['뉴스'],
            targetAudience: '일반 시청자',
            callToAction: '더 자세한 내용을 확인해보세요!'
          };
          
          await db.collection('shortsScripts').doc(fallbackScript.id).set(fallbackScript);
          generatedScripts.push(fallbackScript);
          successCount++;
          
        } catch (fallbackError) {
          console.error(`❌ 기본 스크립트 저장도 실패: ${article.title}`, fallbackError);
        }
      }
    }
    
    // 사용된 AI 모델 정보 가져오기
    const aiInfo = AIModelSelector.getProviderInfo();
    const usedProvider = body.aiProvider || aiInfo.default || 'google';
    const usedModel = body.aiModel || 'gemini-pro';
    
    const response: GenerateScriptResponse = {
      success: true,
      message: `${successCount}개의 숏폼 스크립트가 성공적으로 생성되었습니다.`,
      generatedScripts: successCount,
      totalArticles: articles.length,
      scripts: generatedScripts,
      aiProvider: usedProvider,
      aiModel: usedModel
    };
    
    console.log(`🎉 숏폼 스크립트 생성 완료: ${successCount}/${articles.length}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 숏폼 스크립트 생성 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '숏폼 스크립트 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        generatedScripts: 0,
        totalArticles: 0,
        scripts: []
      },
      { status: 500 }
    );
  }
}

// GET: 생성된 스크립트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = db.collection('shortsScripts').orderBy('createdAt', 'desc');
    
    if (section) {
      query = query.where('section', '==', section);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(limit);
    
    const snapshot = await query.get();
    
    const scripts: ShortsScript[] = [];
    snapshot.forEach(doc => {
      scripts.push({
        id: doc.id,
        ...doc.data()
      } as ShortsScript);
    });
    
    return NextResponse.json({
      success: true,
      scripts,
      total: scripts.length
    });
    
  } catch (error) {
    console.error('❌ 스크립트 목록 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '스크립트 목록 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 