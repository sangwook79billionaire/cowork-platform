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
    const accessToken = searchParams.get('accessToken');
    const email = searchParams.get('email');

    if (!accessToken) {
      return NextResponse.json({ error: '액세스 토큰이 필요합니다.' }, { status: 400 });
    }

    // 액세스 토큰 설정
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    // 작업 목록 가져오기
    const taskListsResponse = await tasks.tasklists.list({
      maxResults: 100
    });

    const allTasks: any[] = [];

    // 각 작업 목록에서 작업들 가져오기
    for (const taskList of taskListsResponse.data.items || []) {
      const tasksResponse = await tasks.tasks.list({
        tasklist: taskList.id!,
        showCompleted: false,
        maxResults: 100
      });

      const taskItems = tasksResponse.data.items?.map((task: any) => ({
        id: task.id,
        title: task.title || '제목 없음',
        notes: task.notes || '',
        completed: task.completed || false,
        due: task.due,
        listId: taskList.id,
        listTitle: taskList.title,
        position: task.position,
        status: task.status,
        parent: task.parent
      })) || [];

      allTasks.push(...taskItems);
    }

    return NextResponse.json({
      tasks: allTasks,
      totalTasks: allTasks.length,
      email
    });

  } catch (error) {
    console.error('Google Tasks API error:', error);
    return NextResponse.json({ error: '할 일 데이터를 가져오는데 실패했습니다.' }, { status: 500 });
  }
} 