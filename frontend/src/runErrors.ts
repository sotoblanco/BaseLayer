export function messageForRunStatus(status: number): string | null {
  if (status === 401) return 'Please sign in to run code.';
  if (status === 413) return 'Code submission is too large.';
  if (status === 429) return 'Too many runs. Try again shortly.';
  if (status >= 400) return 'Unable to run code.';
  return null;
}
