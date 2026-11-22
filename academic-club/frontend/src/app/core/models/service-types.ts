export const SERVICE_TYPES = [
  { value: 'SCHOOL', label: 'School', icon: '🏫' }, { value: 'COLLEGE', label: 'College', icon: '🎓' },
  { value: 'TRAINING', label: 'Training Institute', icon: '💼' }, { value: 'COACHING', label: 'Tuition & Coaching', icon: '📚' },
  { value: 'DANCE', label: 'Dance', icon: '💃' }, { value: 'YOGA', label: 'Yoga & Wellness', icon: '🧘' },
  { value: 'MUSIC', label: 'Music', icon: '🎸' }, { value: 'SPORTS', label: 'Sports & Fitness', icon: '⚽' },
  { value: 'OTHER', label: 'Other', icon: '✨' },
];
export const typeInfo = (v: string) => SERVICE_TYPES.find((t) => t.value === v) ?? SERVICE_TYPES[SERVICE_TYPES.length - 1];
