export const ROLES = ['ADMIN', 'PARTNER', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];
export const INST_TYPES = ['SCHOOL', 'COLLEGE', 'TRAINING', 'COACHING', 'DANCE', 'YOGA', 'MUSIC', 'SPORTS', 'OTHER'];
