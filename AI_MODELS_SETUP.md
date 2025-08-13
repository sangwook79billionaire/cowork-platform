# 🤖 AI 모델 설정 가이드

이 프로젝트는 다양한 AI 모델을 지원하여 숏폼 스크립트를 생성할 수 있습니다.

## **🔑 지원하는 AI 모델**

### **1. Google Gemini AI**
- **모델**: `gemini-pro`
- **장점**: 무료 할당량, 한국어 지원 우수, 빠른 응답
- **사용법**: 기본값으로 설정됨

### **2. OpenAI GPT**
- **모델**: `gpt-4`, `gpt-3.5-turbo`
- **장점**: 높은 품질, 안정적인 성능, 다양한 용도
- **사용법**: 유료 API (사용량 기반 과금)

### **3. Anthropic Claude**
- **모델**: `claude-3`, `claude-2`
- **장점**: 창의적이고 안전한 콘텐츠 생성
- **사용법**: 유료 API (사용량 기반 과금)

## **⚙️ 환경변수 설정**

### **필수 설정**

`.env.local` 파일에 다음 환경변수를 추가하세요:

```bash
# Google Gemini AI (기본값)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI GPT (선택사항)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Claude (선택사항)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### **API 키 발급 방법**

#### **Google Gemini AI**
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 생성된 API 키 복사

#### **OpenAI GPT**
1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. OpenAI 계정으로 로그인
3. "Create new secret key" 클릭
4. 생성된 API 키 복사

#### **Anthropic Claude**
1. [Anthropic Console](https://console.anthropic.com/) 접속
2. Anthropic 계정으로 로그인
3. "Create Key" 클릭
4. 생성된 API 키 복사

## **🚀 사용 방법**

### **1. 기본 사용 (Gemini AI)**
```typescript
// 환경변수만 설정하면 자동으로 Gemini AI 사용
const response = await fetch('/api/news/generate-shorts-script', {
  method: 'POST',
  body: JSON.stringify({
    section: 'sisa',
    limit: 5
  })
});
```

### **2. 특정 AI 모델 선택**
```typescript
// OpenAI GPT-4 사용
const response = await fetch('/api/news/generate-shorts-script', {
  method: 'POST',
  body: JSON.stringify({
    section: 'sisa',
    limit: 5,
    aiProvider: 'openai',
    aiModel: 'gpt-4'
  })
});
```

### **3. Claude 3 사용**
```typescript
// Anthropic Claude 3 사용
const response = await fetch('/api/news/generate-shorts-script', {
  method: 'POST',
  body: JSON.stringify({
    section: 'sisa',
    limit: 5,
    aiProvider: 'anthropic',
    aiModel: 'claude-3'
  })
});
```

## **💰 비용 비교**

### **Google Gemini AI**
- **무료 할당량**: 월 15회 요청
- **유료**: $0.0005 / 1K 문자 (입력)
- **장점**: 가장 저렴하고 무료 할당량 제공

### **OpenAI GPT**
- **GPT-3.5 Turbo**: $0.0015 / 1K 토큰 (입력), $0.002 / 1K 토큰 (출력)
- **GPT-4**: $0.03 / 1K 토큰 (입력), $0.06 / 1K 토큰 (출력)
- **장점**: 높은 품질과 안정성

### **Anthropic Claude**
- **Claude 3 Sonnet**: $0.003 / 1K 토큰 (입력), $0.015 / 1K 토큰 (출력)
- **Claude 3 Haiku**: $0.00025 / 1K 토큰 (입력), $0.00125 / 1K 토큰 (출력)
- **장점**: 창의적이고 안전한 콘텐츠

## **🔧 고급 설정**

### **모델별 파라미터 조정**
```typescript
// 온도, 최대 토큰 수 등 조정
const response = await fetch('/api/news/generate-shorts-script', {
  method: 'POST',
  body: JSON.stringify({
    section: 'sisa',
    limit: 5,
    aiProvider: 'openai',
    aiModel: 'gpt-4',
    temperature: 0.8,        // 창의성 조정 (0.0 ~ 1.0)
    maxTokens: 2000          // 최대 토큰 수
  })
});
```

### **여러 모델 동시 사용**
```typescript
// 여러 모델로 같은 콘텐츠 생성하여 비교
const models = ['gemini-pro', 'gpt-4', 'claude-3'];
const results = await Promise.all(
  models.map(model => 
    fetch('/api/news/generate-shorts-script', {
      method: 'POST',
      body: JSON.stringify({
        section: 'sisa',
        limit: 1,
        aiModel: model
      })
    })
  )
);
```

## **⚠️ 주의사항**

### **API 키 보안**
- `.env.local` 파일을 `.gitignore`에 추가
- API 키를 코드에 직접 하드코딩하지 마세요
- 프로덕션 환경에서는 환경변수로 관리

### **사용량 제한**
- 각 AI 제공자의 API 사용량 제한 확인
- 무료 할당량 초과 시 유료 과금 발생 가능
- 대량 생성 시 비용 예상 필요

### **모델별 특성**
- **Gemini**: 한국어 처리 우수, 빠른 응답
- **GPT-4**: 높은 품질, 창의적 콘텐츠
- **Claude**: 안전하고 신뢰할 수 있는 콘텐츠

## **📊 성능 비교**

| 모델 | 속도 | 품질 | 한국어 | 비용 | 안정성 |
|------|------|------|--------|------|--------|
| Gemini Pro | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| GPT-4 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| GPT-3.5 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Claude 3 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## **🔄 모델 전환 시나리오**

### **개발/테스트 단계**
- **추천**: Google Gemini AI
- **이유**: 무료 할당량, 빠른 응답, 비용 없음

### **프로덕션 환경**
- **추천**: OpenAI GPT-4 또는 Claude 3
- **이유**: 높은 품질, 안정성, 기업용 지원

### **비용 최적화**
- **추천**: Gemini Pro + GPT-3.5 Turbo 조합
- **이유**: Gemini로 기본 생성, GPT로 품질 향상

## **📞 지원 및 문의**

AI 모델 설정에 문제가 있거나 추가 기능이 필요하시면:

1. **GitHub Issues**: 프로젝트 저장소에 이슈 등록
2. **문서 확인**: 이 가이드와 프로젝트 README 참조
3. **커뮤니티**: 개발자 커뮤니티에서 도움 요청

---

**💡 팁**: 처음에는 Gemini AI로 시작하여 무료로 테스트해보고, 필요에 따라 다른 모델을 추가하는 것을 권장합니다! 