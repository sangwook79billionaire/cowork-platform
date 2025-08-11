import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
let app: any;
let db: Firestore | null = null;

try {
  if (getApps().length === 0) {
    // 서비스 계정 키 파일 사용
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(process.cwd(), 'firebase', 'serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      
      console.log('Firebase Admin SDK 초기화 완료');
    } else {
      console.error('서비스 계정 키 파일을 찾을 수 없습니다:', serviceAccountPath);
    }
  } else {
    app = getApps()[0];
  }
  
  if (app) {
  db = getFirestore(app);
  }
} catch (error) {
  console.error('Firebase Admin SDK 초기화 오류:', error);
}

export { db }; 