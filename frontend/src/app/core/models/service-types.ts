import { ApiService } from '../services/api.service';

export interface ServiceType { value: string; label: string; icon: string }
// The list is managed by the admin (Admin > Institute Categories). These defaults show until the real list arrives from the server.
// The array is updated IN PLACE, so every screen that holds a reference to it sees the new list.
export const SERVICE_TYPES: ServiceType[] = [
  { value: 'SCHOOL', label: 'School', icon: '🏫' }, { value: 'COLLEGE', label: 'College', icon: '🎓' },
  { value: 'TRAINING', label: 'Training Institute', icon: '💼' }, { value: 'COACHING', label: 'Tuition & Coaching', icon: '📚' },
  { value: 'DANCE', label: 'Dance', icon: '💃' }, { value: 'YOGA', label: 'Yoga & Wellness', icon: '🧘' },
  { value: 'MUSIC', label: 'Music', icon: '🎸' }, { value: 'SPORTS', label: 'Sports & Fitness', icon: '⚽' },
  { value: 'PLACEMENTS', label: 'Placements', icon: '🧑‍💼' }, { value: 'OTHER', label: 'Other', icon: '✨' },
];
export async function loadServiceTypes(api: ApiService) {
  try { const r = await api.get('/public/service-types'); if (r?.items?.length) SERVICE_TYPES.splice(0, SERVICE_TYPES.length, ...r.items); } catch { /* keep the defaults */ }
}
export const typeInfo = (v: string): ServiceType => SERVICE_TYPES.find((t) => t.value === v) ?? { value: v, label: v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : 'Other', icon: '✨' };
