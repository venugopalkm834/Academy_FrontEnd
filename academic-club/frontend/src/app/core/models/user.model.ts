export type Role = 'ADMIN' | 'PARTNER' | 'MEMBER';
export interface SessionUser { id: string; role: Role; email: string; firstName: string; status: string; emailVerified: boolean }
