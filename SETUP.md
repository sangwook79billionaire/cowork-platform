# 🚀 Cowork Platform 설정 가이드 (Firebase)

## 1. Firebase 프로젝트 설정

### 1.1 Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com)에 가입하고 새 프로젝트 생성
2. 프로젝트 이름: `cowork-platform`
3. Google Analytics 설정 (선택사항)
4. 지역 선택 (가까운 지역 선택)

### 1.2 Firebase 서비스 활성화
다음 서비스들을 활성화해야 합니다:

1. **Authentication**:
   - Sign-in method > Email/Password 활성화
   - 사용자 등록 허용 설정

2. **Firestore Database**:
   - 데이터베이스 생성
   - 보안 규칙 설정 (테스트 모드에서 시작)

3. **Storage**:
   - Storage 버킷 생성
   - 보안 규칙 설정

### 1.3 웹 앱 추가
1. 프로젝트 개요 > 웹 앱 추가
2. 앱 닉네임: `cowork-platform-web`
3. Firebase Hosting 설정 (선택사항)
4. 설정 정보 복사 (firebaseConfig 객체)

## 2. 환경 변수 설정

### 2.1 환경 변수 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2.2 Firebase 설정 정보 찾기
Firebase Console > 프로젝트 설정 > 일반 > 웹 앱에서 설정 정보 확인

## 3. Firestore 보안 규칙 설정

### 3.1 Firestore Database > Rules에서 다음 규칙 설정:

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
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || resource.data.isPublic == true);
      allow write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || request.resource.data.userId == request.auth.uid);
    }
    
    // 파일
    match /files/{fileId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || request.resource.data.userId == request.auth.uid);
    }
  }
}
```

## 4. Storage 보안 규칙 설정

### 4.1 Storage > Rules에서 다음 규칙 설정:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 사용자별 폴더 구조
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 문서별 파일
    match /documents/{documentId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 5. 로컬 개발 환경 설정

### 5.1 의존성 설치 및 실행
```bash
npm install
npm run dev
```

### 5.2 Firebase 에뮬레이터 설정 (선택사항)
로컬 개발 시 Firebase 에뮬레이터 사용:

```bash
npm install -g firebase-tools
firebase login
firebase init emulators
firebase emulators:start
```

## 6. Vercel 배포 설정

### 6.1 Vercel 프로젝트 생성
1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

### 6.2 환경 변수 설정 (Vercel)
Vercel 대시보드에서 다음 환경 변수 설정:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 6.3 GitHub Secrets 설정
GitHub 저장소 Settings > Secrets and variables > Actions에서:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 7. 실시간 기능 설정

### 7.1 Firestore 실시간 리스너
Firestore는 기본적으로 실시간 기능을 제공합니다. 클라이언트에서 실시간 리스너 설정:

```javascript
import { onSnapshot } from 'firebase/firestore'

// 실시간 문서 업데이트
const unsubscribe = onSnapshot(doc(db, 'documents', documentId), (doc) => {
  if (doc.exists()) {
    console.log('Document data:', doc.data())
  }
})
```

### 7.2 실시간 협업 기능
여러 사용자가 동시에 문서를 편집할 수 있도록 실시간 업데이트 구현:

```javascript
// 문서 변경 감지
useEffect(() => {
  if (!documentId) return

  const unsubscribe = onSnapshot(
    doc(db, 'documents', documentId),
    (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        setTitle(data.title)
        setContent(data.content)
      }
    }
  )

  return () => unsubscribe()
}, [documentId])
```

## 8. 파일 업로드 설정

### 8.1 Firebase Storage 설정
1. Firebase Console > Storage
2. 버킷 생성 (자동 생성됨)
3. 보안 규칙 설정 (위에서 제공한 규칙 사용)

### 8.2 파일 업로드 구현
```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const uploadFile = async (file, userId) => {
  const storageRef = ref(storage, `users/${userId}/${file.name}`)
  const snapshot = await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(snapshot.ref)
  return downloadURL
}
```

## 9. 성능 최적화

### 9.1 Firestore 인덱스 설정
복합 쿼리를 위한 인덱스 생성:

```javascript
// Firebase Console > Firestore Database > Indexes
// Collection: documents
// Fields: userId (Ascending), updatedAt (Descending)
```

### 9.2 캐싱 설정
Vercel에서 캐싱 헤더 설정:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

## 10. 모니터링 및 로깅

### 10.1 Firebase Analytics
- Firebase Console > Analytics
- 사용자 행동, 성능 메트릭 확인

### 10.2 Firebase Performance
- 앱 성능 모니터링
- 네트워크 요청 분석

### 10.3 Firebase Crashlytics
- 앱 크래시 보고
- 오류 추적

## 11. 보안 체크리스트

- [ ] Firebase 보안 규칙이 올바르게 설정됨
- [ ] 환경 변수가 올바르게 설정됨
- [ ] HTTPS가 강제 적용됨
- [ ] API 키가 클라이언트에 노출되지 않음
- [ ] 사용자 입력이 검증됨
- [ ] 파일 업로드 제한이 설정됨

## 12. 트러블슈팅

### 12.1 인증 오류
- Firebase 프로젝트 설정 확인
- Authentication 서비스 활성화 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 12.2 데이터베이스 연결 오류
- Firestore 보안 규칙 확인
- Firebase 프로젝트 상태 확인
- 네트워크 연결 확인

### 12.3 배포 오류
- Vercel 빌드 로그 확인
- 환경 변수 설정 확인
- GitHub Actions 워크플로우 확인

## 13. 확장 계획

### 13.1 기능 추가
- [ ] 실시간 협업 편집
- [ ] 파일 공유 및 권한 관리
- [ ] 댓글 및 피드백 시스템
- [ ] 템플릿 기능

### 13.2 성능 개선
- [ ] CDN 설정
- [ ] 데이터베이스 인덱스 최적화
- [ ] 이미지 압축 및 최적화
- [ ] 코드 스플리팅

### 13.3 보안 강화
- [ ] 2FA 인증
- [ ] API 요청 제한
- [ ] 감사 로그
- [ ] 백업 및 복구 시스템 