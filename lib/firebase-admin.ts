import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
let app: any;
let db: Firestore | null = null;

try {
  if (getApps().length === 0) {
    // 환경 변수에서 Firebase 설정 가져오기
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // 환경 변수로 초기화 (Vercel 배포 환경용)
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        }),
        projectId
      });
      
      console.log('✅ Firebase Admin SDK 초기화 완료 (환경 변수)');
    } else {
      // 로컬 개발 환경용 서비스 계정 키 파일 사용
      try {
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.join(process.cwd(), 'firebase', 'serviceAccountKey.json');
        
        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          
          app = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id
          });
          
          console.log('✅ Firebase Admin SDK 초기화 완료 (로컬 파일)');
        } else {
          console.error('❌ 서비스 계정 키 파일을 찾을 수 없습니다:', serviceAccountPath);
        }
      } catch (fileError) {
        console.error('❌ 로컬 파일 로드 실패:', fileError);
      }
    }
  } else {
    app = getApps()[0];
    console.log('✅ 기존 Firebase Admin SDK 앱 사용');
  }
  
  if (app) {
    db = getFirestore(app);
    console.log('✅ Firestore 데이터베이스 연결 완료');
  } else {
    console.error('❌ Firebase Admin SDK 앱이 초기화되지 않았습니다');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK 초기화 오류:', error);
}

export { db }; 