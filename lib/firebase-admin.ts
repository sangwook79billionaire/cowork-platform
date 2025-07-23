import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
let app: any;
let db: Firestore | null = null;

try {
  if (getApps().length === 0) {
    // 서비스 계정 키가 있는 경우 사용
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      });
    } else {
      // 환경 변수로 초기화
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      });
    }
  } else {
    app = getApps()[0];
  }
  
  db = getFirestore(app);
  console.log('Firebase Admin SDK 초기화 완료');
} catch (error) {
  console.error('Firebase Admin SDK 초기화 오류:', error);
}

export { db }; 