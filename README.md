# 윤수&상욱 공동작업장

협업을 위한 플랫폼입니다.

## 🚀 배포 URL

**프로덕션**: https://cowork-platform-bjvgrazw6-sangwooks-projects-e3b2e6cf.vercel.app

## 📋 환경 변수 설정

### 로컬 개발 환경

1. `env.example` 파일을 복사하여 `.env.local` 파일 생성
2. Firebase 프로젝트 설정에서 필요한 값들을 입력

```bash
cp env.example .env.local
```

### Vercel 배포 환경

Vercel 대시보드에서 다음 환경 변수들을 설정:

#### 프론트엔드 (NEXT_PUBLIC_ 접두사)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

#### 서버 사이드
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## 🛠️ 개발

```bash
npm install
npm run dev
```

## 📦 배포

### 자동 배포 (GitHub Actions)
- `main` 브랜치에 푸시하면 자동으로 Vercel에 배포됩니다.

### 수동 배포
```bash
vercel --prod --yes
```

## 🔧 주요 기능

- 구글 RSS 뉴스 수집
- Firebase 연동
- 뉴스 검색 및 표시
- 웹 인터페이스

## 📁 프로젝트 구조

```
├── app/                    # Next.js App Router
├── components/             # React 컴포넌트
├── lib/                    # 유틸리티 함수들
├── scripts/news/           # Python 뉴스 수집 스크립트
├── firebase/              # Firebase 설정
└── public/                # 정적 파일들
``` 