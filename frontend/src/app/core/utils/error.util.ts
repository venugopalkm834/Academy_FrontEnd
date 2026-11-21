export const errText = (e: any): string => {
  if (e?.status === 0) return 'Could not reach the server. Make sure the backend is running and try again (your session may also have expired: log in again).';
  if (e?.status === 413) return 'The file is too large.';
  const m = e?.error?.errors;
  return m ? Object.entries(m).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' · ') : e?.error?.message || 'Something went wrong. Please try again.';
};
