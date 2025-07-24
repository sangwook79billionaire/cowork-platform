import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

// Google OAuth2 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url || 'http://localhost');
    const accessToken = searchParams.get('accessToken');
    const email = searchParams.get('email');

    if (!accessToken) {
      return NextResponse.json({ error: '액세스 토큰이 필요합니다.' }, { status: 400 });
    }

    // 액세스 토큰 설정
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 현재 시간 기준으로 앞으로 30일간의 이벤트 가져오기
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100
    });

    const events = response.data.items?.map((event: any) => ({
      id: event.id,
      title: event.summary || '제목 없음',
      description: event.description || '',
      startDate: event.start?.dateTime || event.start?.date,
      endDate: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime,
      location: event.location || '',
      color: event.colorId ? getColorFromId(event.colorId) : '#3B82F6',
      recurring: !!event.recurrence,
      attendees: event.attendees?.map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName,
        responseStatus: attendee.responseStatus
      })) || []
    })) || [];

    return NextResponse.json({
      events,
      totalEvents: events.length,
      email
    });

  } catch (error) {
    console.error('Google Calendar API error:', error);
    return NextResponse.json({ error: '캘린더 데이터를 가져오는데 실패했습니다.' }, { status: 500 });
  }
}

// Google Calendar 색상 ID를 hex 색상으로 변환
function getColorFromId(colorId: string): string {
  const colorMap: { [key: string]: string } = {
    '1': '#7986CB', // 라벤더
    '2': '#33B679', // 세이지
    '3': '#8F6ED5', // 포도
    '4': '#E67C73', // 플레임
    '5': '#F6C026', // 바나나
    '6': '#F49C20', // 피칸
    '7': '#E67C73', // 피치
    '8': '#A4BDFC', // 슬레이트
    '9': '#7AE7BF', // 오렌지
    '10': '#DBADFF', // 그레이프
    '11': '#FF887C', // 체리
    '12': '#51B749', // 에메랄드
    '13': '#DC2127', // 레드
    '14': '#EB773C', // 오렌지
    '15': '#FFB878', // 피치
    '16': '#51B749', // 그린
    '17': '#BDADFF', // 그레이프
    '18': '#FF887C', // 체리
    '19': '#E1E1E1', // 그레이
    '20': '#51B749', // 에메랄드
    '21': '#16A765', // 다크 그린
    '22': '#4986E7', // 다크 블루
    '23': '#FF3B30', // 다크 레드
    '24': '#FF9500'  // 다크 오렌지
  };
  
  return colorMap[colorId] || '#3B82F6';
} 