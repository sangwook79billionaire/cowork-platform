export interface ScheduledTask {
  id: string;
  title: string;
  description?: string;
  topic: string;
  style: string;
  length: string;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm 형식
    daysOfWeek?: number[]; // 0-6 (일요일-토요일)
    dayOfMonth?: number; // 1-31
  };
  targetBulletinId?: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  content: string;
  postId?: string;
  executedAt: Date;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface ScheduleSettings {
  timezone: string;
  autoSaveToBulletin: boolean;
  defaultBulletinId?: string;
  notificationEnabled: boolean;
} 