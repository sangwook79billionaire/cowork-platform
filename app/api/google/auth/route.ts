import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google OAuth2 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'login') {
      // Google OAuth 인증 URL 생성
      const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/tasks.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      return NextResponse.json({ authUrl });
    }

    if (action === 'callback') {
      const code = searchParams.get('code');
      
      if (!code) {
        return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
      }

      try {
        // 액세스 토큰 교환
        const { tokens } = await oauth2Client.getToken(code);
        
        // 사용자 정보 가져오기
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        return NextResponse.json({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          email: userInfo.data.email,
          name: userInfo.data.name,
          picture: userInfo.data.picture
        });
      } catch (error) {
        console.error('Token exchange error:', error);
        return NextResponse.json({ error: '토큰 교환에 실패했습니다.' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: '잘못된 액션입니다.' }, { status: 400 });

  } catch (error) {
    console.error('Google Auth error:', error);
    return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 500 });
  }
} 