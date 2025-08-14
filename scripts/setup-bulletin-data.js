const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase 설정 (환경 변수에서 가져오기)
const firebaseConfig = {
  apiKey: process.env.GOOGLE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 테스트용 게시판 데이터
const testBulletins = [
  {
    title: '공지사항',
    description: '중요한 공지사항을 확인하세요',
    level: 0,
    order: 1,
    isActive: true,
    userId: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    title: '자유게시판',
    description: '자유롭게 의견을 나누는 공간입니다',
    level: 0,
    order: 2,
    isActive: true,
    userId: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    title: '질문과 답변',
    description: '궁금한 점을 물어보고 답변을 받는 공간입니다',
    level: 0,
    order: 3,
    isActive: true,
    userId: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    title: '프로젝트 공유',
    description: '프로젝트를 공유하고 피드백을 받는 공간입니다',
    parentId: '자유게시판', // 부모 게시판 ID
    level: 1,
    order: 1,
    isActive: true,
    userId: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    title: '코드 리뷰',
    description: '코드를 공유하고 리뷰를 받는 공간입니다',
    parentId: '자유게시판', // 부모 게시판 ID
    level: 1,
    order: 2,
    isActive: true,
    userId: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
];

// 게시판 데이터 생성 함수
async function createTestBulletins() {
  try {
    console.log('🔍 테스트 게시판 데이터 생성 시작...');
    
    for (const bulletin of testBulletins) {
      const docRef = await addDoc(collection(db, 'bulletins'), bulletin);
      console.log(`✅ 게시판 생성 완료: ${bulletin.title} (ID: ${docRef.id})`);
    }
    
    console.log('🎉 모든 테스트 게시판 데이터 생성 완료!');
  } catch (error) {
    console.error('❌ 게시판 데이터 생성 오류:', error);
  }
}

// 스크립트 실행
createTestBulletins(); 