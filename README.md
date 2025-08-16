# 윤수&상욱 공동작업장

협업을 위한 플랫폼입니다.

## 🚀 Quick Start

1. **저장소 클론**
```bash
git clone https://github.com/sangwook79billionaire/cowork-platform.git
cd cowork-platform
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
```bash
# .env.local 파일 생성
cp env.example .env.local

# 필요한 환경 변수 설정
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
```

4. **개발 서버 실행**
```bash
npm run dev
```

## 🔑 OpenAI API 설정

1. [OpenAI Platform](https://platform.openai.com/)에서 API 키 발급
2. `.env.local`에 `OPENAI_API_KEY` 설정
3. API 할당량 및 결제 상태 확인

## 🔥 Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. 웹 앱 추가 및 설정 값 복사
3. `.env.local`에 Firebase 환경 변수 설정

## 🎨 주요 기능

- **게시판 관리**: 계층적 게시판 시스템 (부모-자식-손자)
- **뉴스 크롤링**: 네이트 뉴스 자동 수집 및 랭킹
- **AI 콘텐츠 생성**: OpenAI를 활용한 블로그 포스트 및 숏폼 스크립트 생성
- **드래그 앤 드롭**: 게시판 위치 자유롭게 변경
- **실시간 동기화**: Firebase Firestore를 통한 실시간 데이터 동기화

## 📁 프로젝트 구조

```
cowork-platform/
├── app/                    # Next.js App Router
│   ├── api/               # API 엔드포인트
│   │   ├── ai/            # AI 관련 API
│   │   ├── news/          # 뉴스 관련 API
│   │   └── bulletin-posts/ # 게시판 포스트 API
├── components/             # React 컴포넌트
│   ├── dashboard/         # 대시보드 컴포넌트
│   ├── news/              # 뉴스 관련 컴포넌트
│   └── providers/         # Context Provider
├── lib/                    # 유틸리티 라이브러리
│   ├── openai.ts          # OpenAI API 클라이언트
│   ├── firebase.ts        # Firebase 설정
│   └── firebaseNewsService.ts # Firebase 뉴스 서비스
└── types/                  # TypeScript 타입 정의
```

## 🔒 보안 주의사항

- **API 키**: `.env.local` 파일을 Git에 커밋하지 마세요
- **환경 변수**: Vercel 프로덕션 환경에 환경 변수 설정 필요
- **Firebase 규칙**: Firestore 보안 규칙 설정 필수

## 🚀 배포

Vercel을 통한 자동 배포:

1. GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포 활성화

## 📝 최근 업데이트

- **2025-08-17**: NateNews 버튼 UI 대폭 개선
  - 더 직관적이고 명확한 액션 버튼
  - 기능별 색상 구분 (파란색/초록색/보라색)
  - 호버 효과 및 애니메이션 추가
  - 저장 상태 표시 개선
- **2025-08-17**: Firebase 환경 변수 설정 완료
- **2025-08-17**: OpenAI API 연동 및 AI 콘텐츠 생성 기능
