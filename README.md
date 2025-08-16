# 윤수&상욱 공동작업장

협업을 위한 플랫폼입니다.

## 🚀 빠른 시작

### 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수들을 설정하세요:

```bash
# OpenAI API Key (필수)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Firebase 설정
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# Google API
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLOUD_PROJECT=your_google_cloud_project
```

**⚠️ 중요**: `.env.local` 파일은 절대 깃허브에 커밋하지 마세요! API 키가 노출될 수 있습니다.

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🔑 OpenAI API 설정

### API 키 발급
1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. API Keys 섹션에서 새 API 키 생성
3. 생성된 키를 `.env.local`의 `OPENAI_API_KEY`에 설정

### 사용 가능한 기능
- **AI 콘텐츠 생성**: 키워드 기반 블로그 글 + 숏츠 스크립트 자동 생성
- **뉴스 기반 콘텐츠**: 뉴스 검색 결과를 활용한 정확한 콘텐츠 생성
- **SEO 최적화**: 메타 제목, 설명, 키워드 자동 생성

## 📱 주요 기능

- **게시판 시스템**: 계층형 게시판 관리
- **뉴스 수집**: 자동 뉴스 크롤링 및 요약
- **AI 콘텐츠 생성**: OpenAI API를 활용한 자동 콘텐츠 작성
- **드래그 앤 드롭**: 직관적인 UI/UX
- **실시간 동기화**: Firebase 기반 실시간 데이터 업데이트

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **AI**: OpenAI GPT-4
- **Authentication**: Firebase Auth
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
cowork platform/
├── app/                    # Next.js App Router
├── components/            # React 컴포넌트
│   ├── dashboard/        # 대시보드 관련 컴포넌트
│   ├── news/            # 뉴스 및 콘텐츠 생성 컴포넌트
│   └── providers/       # Context Provider
├── lib/                  # 유틸리티 및 설정
│   ├── openai.ts        # OpenAI API 설정
│   └── firebase.ts      # Firebase 설정
├── types/                # TypeScript 타입 정의
└── scripts/              # 데이터 설정 스크립트
```

## 🔒 보안 주의사항

1. **API 키 보호**: `.env.local` 파일을 절대 깃허브에 커밋하지 마세요
2. **환경 변수**: 프로덕션 배포 시 환경 변수를 안전하게 설정하세요
3. **Firebase 규칙**: Firestore 보안 규칙을 적절히 설정하세요

## 📞 지원

문제가 있거나 기능 요청이 있으시면 이슈를 생성해 주세요.

---

**Happy Coding! 🎉** 