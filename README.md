# 윤수&상욱 공동작업장

Notion을 벤치마킹한 소규모 웹 기반 협업 툴입니다.

## 🚀 기술 스택

### Frontend
- **Next.js 14** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 모던한 UI 스타일링
- **React Hot Toast** - 사용자 알림

### Backend & Database
- **Firebase** - Google의 BaaS 플랫폼
  - **Firebase Auth** - 사용자 인증
  - **Firestore** - NoSQL 실시간 데이터베이스
  - **Firebase Storage** - 파일 스토리지
  - **Firebase Security Rules** - 보안 규칙

### Deployment
- **Vercel** - 프론트엔드 및 서버리스 함수 호스팅
- **GitHub Actions** - CI/CD 파이프라인

## 🏗️ 프로젝트 구조

```
cowork-platform/
├── app/                    # Next.js App Router
│   ├── globals.css        # 전역 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   ├── auth/             # 인증 관련 컴포넌트
│   ├── dashboard/        # 대시보드 컴포넌트
│   └── providers/        # Context Providers
├── hooks/                # Custom React Hooks
├── lib/                  # 유틸리티 및 설정
├── types/                # TypeScript 타입 정의
└── firebase/             # Firebase 설정 및 규칙
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com)에서 새 프로젝트 생성
2. 프로젝트 이름: `cowork-platform`
3. 다음 서비스 활성화:
   - Authentication (이메일/비밀번호)
   - Firestore Database
   - Storage

### 3. 환경 변수 설정

1. `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

2. Firebase 프로젝트 설정에서 웹 앱 추가 후 설정 정보 복사

### 4. Firestore 보안 규칙 설정

Firebase Console > Firestore Database > Rules에서 다음 규칙 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 프로필
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 문서
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || resource.data.isPublic == true);
    }
    
    // 파일
    match /files/{fileId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5. Storage 보안 규칙 설정

Firebase Console > Storage > Rules에서 다음 규칙 설정:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.metadata.userId;
    }
  }
}
```

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📊 데이터 구조

### Users 컬렉션
```javascript
{
  id: "user_uid",
  email: "user@example.com",
  name: "사용자 이름",
  avatarUrl: "https://...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Documents 컬렉션
```javascript
{
  id: "document_id",
  title: "문서 제목",
  content: "문서 내용",
  userId: "user_uid",
  isPublic: false,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Files 컬렉션
```javascript
{
  id: "file_id",
  name: "파일명.jpg",
  url: "https://...",
  size: 1024,
  type: "image/jpeg",
  userId: "user_uid",
  documentId: "document_id",
  createdAt: Timestamp
}
```

## 🔧 배포

### Vercel 배포

1. GitHub 저장소를 Vercel에 연결
2. 환경 변수 설정:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. 자동 배포 설정 (main 브랜치 푸시 시)

### CI/CD 파이프라인

GitHub Actions를 통한 자동 배포:
- main 브랜치 푸시 시 Vercel에 자동 배포
- 코드 품질 검사 (ESLint, TypeScript)
- 테스트 실행

## 💰 비용 최적화

### 무료 티어 활용

1. **Vercel**: 개인 프로젝트 무료
   - 월 100GB 대역폭
   - 서버리스 함수 포함

2. **Firebase**: 무료 티어 (Spark 플랜)
   - Firestore: 1GB 저장소, 50,000 읽기/일, 20,000 쓰기/일
   - Storage: 5GB 저장소, 1GB 다운로드/일
   - Authentication: 무제한 사용자
   - Hosting: 10GB 저장소, 360MB/일

### 확장성

사용자 증가 시:
- Firebase Blaze 플랜으로 업그레이드 (종량제)
- Vercel Pro 플랜 고려
- CDN 및 캐싱 최적화

## 🔒 보안

- Firebase Security Rules를 통한 데이터 보안
- Firebase Auth를 통한 안전한 인증
- 환경 변수를 통한 민감 정보 관리
- HTTPS 강제 적용

## 📱 반응형 디자인

- Tailwind CSS를 활용한 모바일 퍼스트 디자인
- 모든 디바이스에서 최적화된 UI/UX
- 터치 친화적 인터페이스

## 🚀 실시간 협업 기능

- Firestore 실시간 리스너를 활용한 실시간 업데이트
- 문서 동시 편집 기능
- 실시간 알림 시스템

## 📝 라이선스

MIT License 