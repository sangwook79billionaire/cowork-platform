import OpenAI from "openai";

// OpenAI 클라이언트 초기화
export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

// 콘텐츠 생성 결과 타입 정의
export type ContentOutput = {
  topic: string;
  blog: {
    title: string;
    outline: string[];
    article_markdown: string;
    seo: { 
      slug: string; 
      metaTitle: string; 
      metaDescription: string; 
      keywords: string[]; 
    };
  };
  shorts: {
    hook: string;
    script_45s: string;
    filename: string;
    title: string;
    description: string;
    hashtags: string[];
  };
};

// 뉴스 기반 콘텐츠 생성 함수
export async function generateContentFromNews(
  keyword: string, 
  newsContent?: string
): Promise<ContentOutput> {
  try {
  const systemPrompt = `너는 한국어 카피라이터이자 SEO 에디터입니다. 
자연스럽고 인간적인 톤을 유지하고, 숫자는 발음하기 쉽게 표기하세요.

작성 규칙:
- 블로그: H2/H3 구조, 짧은 문단, 예시/체크리스트 포함
- 숏츠: 강한 훅 → 2가지 상식 → 실천 팁 1~2 → 마무리 CTA
- SEO: 한국어 슬러그, 메타타이틀(≤60자), 메타디스크립션(≤120자), 키워드 6~10개
- 뉴스 내용이 있으면 사실 기반으로 작성, 출처 언급`;

  const userPrompt = newsContent 
    ? `키워드: ${keyword}
뉴스 내용: ${newsContent}

위 뉴스 내용을 바탕으로 블로그 글과 숏츠 스크립트를 작성해주세요.`
    : `키워드: ${keyword}

목적: 블로그 글(마크다운) + 유튜브 숏츠(약 45~55초)
- 블로그: H2/H3 구조, 짧은 문단, 예시/체크리스트 포함
- 숏츠: 강한 훅 → 2가지 상식 → 실천 팁 1~2 → 마무리 CTA("건강플러스 노트로 건강 지키세요")
- SEO: 한국어 슬러그, 메타타이틀(≤60자), 메타디스크립션(≤120자), 키워드 6~10개`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // gpt-4o-mini 모델로 변경
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4000
  });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI API 응답이 비어있습니다.");
    }

    try {
      return JSON.parse(content) as ContentOutput;
    } catch (error) {
      console.error("JSON 파싱 오류:", error);
      throw new Error("OpenAI API 응답을 파싱할 수 없습니다.");
    }
  } catch (error: any) {
    console.error("OpenAI API 오류:", error);
    
    // 할당량 초과 오류 처리
    if (error.status === 429 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI API 할당량이 초과되었습니다. 계정 상태를 확인해주세요.");
    }
    
    // 기타 API 오류
    if (error.status) {
      throw new Error(`OpenAI API 오류 (${error.status}): ${error.message || '알 수 없는 오류'}`);
    }
    
    throw new Error(`콘텐츠 생성 중 오류가 발생했습니다: ${error.message}`);
  }
}

// 배치 처리를 위한 간단한 콘텐츠 생성 함수
export async function generateSimpleContent(keyword: string): Promise<ContentOutput> {
  return generateContentFromNews(keyword);
}
