const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');

// Firebase 설정 (환경변수에서 가져와야 함)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 게시판 데이터
const bulletins = [
  {
    id: 'bulletin-1',
    title: '공지사항',
    description: '중요한 공지사항을 확인하세요',
    parentId: '',
    level: 0,
    order: 1,
    isActive: true,
    userId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-2',
    title: '자유게시판',
    description: '자유롭게 의견을 나누세요',
    parentId: '',
    level: 0,
    order: 2,
    isActive: true,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-3',
    title: '질문과 답변',
    description: '궁금한 점을 물어보세요',
    parentId: '',
    level: 0,
    order: 3,
    isActive: true,
    userId: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-4',
    title: '프로젝트 공유',
    description: '프로젝트 관련 게시판',
    parentId: 'bulletin-2',
    level: 1,
    order: 1,
    isActive: true,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulletin-5',
    title: '일상 이야기',
    description: '일상적인 이야기를 나누세요',
    parentId: 'bulletin-2',
    level: 1,
    order: 2,
    isActive: true,
    userId: 'user-3',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 게시글 데이터
const posts = [
  {
    id: 'post-1',
    bulletinId: 'bulletin-1',
    title: '시스템 점검 안내',
    content: '오늘 밤 12시부터 시스템 점검이 있을 예정입니다.',
    userId: 'user-1',
    authorName: '관리자',
    isPinned: true,
    isLocked: false,
    viewCount: 150,
    likeCount: 12,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'post-2',
    bulletinId: 'bulletin-2',
    title: '새로운 프로젝트 아이디어',
    content: '다음 프로젝트로 어떤 것을 해보면 좋을까요?',
    userId: 'user-2',
    authorName: '개발자A',
    isPinned: false,
    isLocked: false,
    viewCount: 89,
    likeCount: 23,
    tags: ['아이디어', '프로젝트'],
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: 'post-3',
    bulletinId: 'bulletin-3',
    title: 'React 성능 최적화 질문',
    content: 'React 컴포넌트의 성능을 어떻게 최적화할 수 있을까요?',
    userId: 'user-3',
    authorName: '초보개발자',
    isPinned: false,
    isLocked: false,
    viewCount: 67,
    likeCount: 15,
    tags: ['React', '성능최적화'],
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
  },
  {
    id: 'post-4',
    bulletinId: 'bulletin-4',
    title: '프로젝트 진행 상황 공유',
    content: '현재 진행 중인 프로젝트의 상황을 공유합니다.',
    userId: 'user-1',
    authorName: '프로젝트매니저',
    isPinned: true,
    isLocked: false,
    viewCount: 234,
    likeCount: 45,
    tags: ['프로젝트', '진행상황'],
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 'post-5',
    bulletinId: 'bulletin-5',
    title: '오늘 점심 메뉴 추천',
    content: '오늘 점심으로 뭘 먹을까요? 추천해주세요!',
    userId: 'user-3',
    authorName: '일상인',
    isPinned: false,
    isLocked: false,
    viewCount: 45,
    likeCount: 8,
    tags: ['일상', '음식'],
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
];

async function setupBulletinData() {
  try {
    console.log('🚀 Firestore에 게시판 데이터 생성 시작...');

    // 게시판 데이터 생성
    console.log('📝 게시판 데이터 생성 중...');
    for (const bulletin of bulletins) {
      await setDoc(doc(db, 'bulletins', bulletin.id), {
        title: bulletin.title,
        description: bulletin.description,
        parentId: bulletin.parentId,
        level: bulletin.level,
        order: bulletin.order,
        isActive: bulletin.isActive,
        userId: bulletin.userId,
        createdAt: bulletin.createdAt,
        updatedAt: bulletin.updatedAt,
      });
      console.log(`✅ 게시판 생성: ${bulletin.title}`);
    }

    // 게시글 데이터 생성
    console.log('📝 게시글 데이터 생성 중...');
    for (const post of posts) {
      await setDoc(doc(db, 'bulletinPosts', post.id), {
        bulletinId: post.bulletinId,
        title: post.title,
        content: post.content,
        userId: post.userId,
        authorName: post.authorName,
        isPinned: post.isPinned,
        isLocked: post.isLocked,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        tags: post.tags || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      });
      console.log(`✅ 게시글 생성: ${post.title}`);
    }

    console.log('🎉 모든 데이터 생성 완료!');
    console.log(`📊 생성된 데이터:`);
    console.log(`   - 게시판: ${bulletins.length}개`);
    console.log(`   - 게시글: ${posts.length}개`);

  } catch (error) {
    console.error('❌ 데이터 생성 중 오류 발생:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  setupBulletinData();
}

module.exports = { setupBulletinData }; 