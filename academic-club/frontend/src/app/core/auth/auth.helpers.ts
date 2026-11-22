import { Role } from '../models/user.model';
export const homeFor = (r: Role) => `/${r.toLowerCase()}`;
export const loginFor = (r: Role) => (r === 'MEMBER' ? '/login' : `/${r.toLowerCase()}/login`);
