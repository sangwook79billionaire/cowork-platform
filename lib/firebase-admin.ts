import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
let app: any;
let db: Firestore | null = null;

// Private Key 정규화 함수 - 더 강력한 처리
function normalizePrivateKey(privateKey: string): string {
  console.log('🔍 Private Key 정규화 시작');
  console.log('  - 원본 길이:', privateKey.length);
  console.log('  - 원본 시작:', privateKey.substring(0, 50));
  console.log('  - 원본 끝:', privateKey.substring(privateKey.length - 50));

  let normalizedKey = privateKey;

  // 1. \n 문자를 실제 줄바꿈으로 변환
  if (normalizedKey.includes('\\n')) {
    normalizedKey = normalizedKey.replace(/\\n/g, '\n');
    console.log('  - \\n을 줄바꿈으로 변환 완료');
  }

  // 2. 이미 올바른 형식인 경우
  if (normalizedKey.includes('\n')) {
    console.log('  - 이미 줄바꿈 포함됨');
  }

  // 3. BEGIN과 END 마커가 있는지 확인
  if (normalizedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log('  - BEGIN/END 마커 확인됨');
  } else {
    console.log('  - BEGIN/END 마커 없음 - 추가 필요');
    
    // 4. Private Key 형식이 올바르지 않은 경우 수정
    if (!normalizedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      normalizedKey = '-----BEGIN PRIVATE KEY-----\n' + normalizedKey;
    }
    if (!normalizedKey.endsWith('-----END PRIVATE KEY-----')) {
      normalizedKey = normalizedKey + '\n-----END PRIVATE KEY-----';
    }
  }

  // 5. 줄바꿈이 부족한 경우 추가 (64자마다)
  if (!normalizedKey.includes('\n') && normalizedKey.length > 64) {
    console.log('  - 64자마다 줄바꿈 추가');
    const keyContent = normalizedKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const formattedKey = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;
    normalizedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  }

  console.log('  - 정규화 후 길이:', normalizedKey.length);
  console.log('  - 줄바꿈 포함:', normalizedKey.includes('\n') ? '✅' : '❌');
  console.log('  - BEGIN 마커:', normalizedKey.includes('-----BEGIN PRIVATE KEY-----') ? '✅' : '❌');
  console.log('  - END 마커:', normalizedKey.includes('-----END PRIVATE KEY-----') ? '✅' : '❌');

  return normalizedKey;
}

try {
  if (getApps().length === 0) {
    // 환경 변수에서 Firebase 설정 가져오기
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('🔍 Firebase 환경 변수 확인:');
    console.log('  - PROJECT_ID:', projectId ? '✅ 설정됨' : '❌ 미설정');
    console.log('  - CLIENT_EMAIL:', clientEmail ? '✅ 설정됨' : '❌ 미설정');
    console.log('  - PRIVATE_KEY:', privateKey ? '✅ 설정됨' : '❌ 미설정');

    if (projectId && clientEmail && privateKey) {
      try {
        // Private Key 정규화
        const normalizedPrivateKey = normalizePrivateKey(privateKey);
        
        console.log('🔍 Private Key 정규화 완료');
        console.log('  - 원본 길이:', privateKey.length);
        console.log('  - 정규화 후 길이:', normalizedPrivateKey.length);
        console.log('  - 줄바꿈 포함:', normalizedPrivateKey.includes('\n') ? '✅' : '❌');

        // 환경 변수로 초기화 (Vercel 배포 환경용)
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: normalizedPrivateKey
          }),
          projectId
        });
        
        console.log('✅ Firebase Admin SDK 초기화 완료 (환경 변수)');
      } catch (envError) {
        console.error('❌ 환경 변수로 초기화 실패:', envError);
        console.error('❌ 오류 상세:', envError instanceof Error ? envError.message : 'Unknown error');
        throw envError;
      }
    } else {
      console.log('⚠️ 환경 변수가 부족하여 로컬 파일 사용 시도');
      
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
  console.error('❌ 오류 상세:', error instanceof Error ? error.message : 'Unknown error');
  console.error('❌ 오류 스택:', error instanceof Error ? error.stack : 'No stack trace');
}

export { db }; 