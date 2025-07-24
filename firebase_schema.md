# Firebase Firestore 데이터베이스 스키마

## 📊 **컬렉션 구조**

### 1. **news** 컬렉션 (뉴스 기사)
```json
{
  "id": "google-abc12345",
  "title": "뉴스 제목",
  "description": "뉴스 설명",
  "content": "뉴스 내용",
  "url": "https://news.google.com/...",
  "publishedAt": "2025-01-24T01:40:34.000Z",
  "source": {
    "name": "Google News",
    "id": "google-news"
  },
  "keywords": "AI",
  "collectedAt": "2025-01-24T01:40:34.000Z",
  "category": "technology",
  "language": "ko",
  "isSaved": false,
  "savedBy": [],
  "viewCount": 0
}
```

### 2. **users** 컬렉션 (사용자)
```json
{
  "uid": "user123",
  "email": "user@example.com",
  "displayName": "사용자명",
  "createdAt": "2025-01-24T01:40:34.000Z",
  "lastLoginAt": "2025-01-24T01:40:34.000Z",
  "preferences": {
    "keywords": ["AI", "기술", "경제"],
    "language": "ko",
    "notifications": true
  }
}
```

### 3. **saved_articles** 컬렉션 (저장된 기사)
```json
{
  "id": "saved-abc12345",
  "userId": "user123",
  "articleId": "google-abc12345",
  "savedAt": "2025-01-24T01:40:34.000Z",
  "notes": "사용자 메모",
  "tags": ["중요", "읽어야함"]
}
```

### 4. **search_history** 컬렉션 (검색 기록)
```json
{
  "id": "search-abc12345",
  "userId": "user123",
  "keywords": "AI",
  "language": "ko",
  "searchedAt": "2025-01-24T01:40:34.000Z",
  "resultCount": 25
}
```

### 5. **news_collection_logs** 컬렉션 (수집 로그)
```json
{
  "id": "log-abc12345",
  "collectionDate": "2025-01-24T01:40:34.000Z",
  "keywords": ["AI", "인공지능", "기술"],
  "totalCollected": 150,
  "totalUnique": 120,
  "excelFile": "news_data_20250124_014034.xlsx",
  "firebaseUploaded": true,
  "status": "completed"
}
```

## 🔍 **인덱스 설정**

### **news** 컬렉션 인덱스
- `keywords` (Ascending)
- `publishedAt` (Descending)
- `category` (Ascending)
- `language` (Ascending)

### **saved_articles** 컬렉션 인덱스
- `userId` (Ascending)
- `savedAt` (Descending)

### **search_history** 컬렉션 인덱스
- `userId` (Ascending)
- `searchedAt` (Descending)

## 🛡️ **보안 규칙**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 뉴스 기사는 모든 사용자가 읽기 가능
    match /news/{document} {
      allow read: if true;
      allow write: if false; // 관리자만 쓰기 가능
    }
    
    // 사용자 데이터는 본인만 접근 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 저장된 기사는 본인만 접근 가능
    match /saved_articles/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 검색 기록은 본인만 접근 가능
    match /search_history/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 수집 로그는 관리자만 접근 가능
    match /news_collection_logs/{document} {
      allow read, write: if false; // 관리자만 접근
    }
  }
}
```

## 📈 **데이터 통계**

### **예상 데이터 크기**
- 뉴스 기사: 하루 500-1000개
- 사용자: 100-1000명
- 저장된 기사: 사용자당 10-50개
- 검색 기록: 사용자당 하루 5-20회

### **성능 최적화**
- 페이지네이션: 20개씩 로드
- 캐싱: Redis 또는 메모리 캐시
- 압축: gzip 압축 사용 