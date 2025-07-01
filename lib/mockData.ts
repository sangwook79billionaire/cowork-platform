import { Document, UserProfile } from '@/types/firebase'

// 모의 사용자 데이터
export const mockUserProfile: UserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: '테스트 사용자',
  avatarUrl: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// 모의 문서 데이터
export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: '첫 번째 문서',
    content: '이것은 첫 번째 문서의 내용입니다.',
    userId: 'test-user-id',
    isPublic: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'doc-2',
    title: '프로젝트 계획',
    content: '프로젝트 계획서입니다.\n\n1. 기획 단계\n2. 개발 단계\n3. 테스트 단계\n4. 배포 단계',
    userId: 'test-user-id',
    isPublic: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'doc-3',
    title: '회의록',
    content: '2024년 1월 20일 회의록\n\n참석자: 팀원 A, 팀원 B, 팀원 C\n\n주요 논의 사항:\n- 프로젝트 일정 조정\n- 기술 스택 결정\n- 다음 회의 일정',
    userId: 'test-user-id',
    isPublic: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
]

// 모의 사용자 객체
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: '테스트 사용자',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-20T00:00:00.000Z',
  },
  providerData: [],
  refreshToken: 'test-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'test-id-token',
  getIdTokenResult: async () => ({
    authTime: '2024-01-20T00:00:00.000Z',
    issuedAtTime: '2024-01-20T00:00:00.000Z',
    signInProvider: 'password',
    token: 'test-id-token',
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
} 