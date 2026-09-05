import { API_BASE_URL } from './config';

export async function fetchSolutionCode(
  courseSlug: string,
  lessonSlug: string,
  token: string
): Promise<string> {
  const res = await fetch(
    `${API_BASE_URL}/file-courses/${courseSlug}/${lessonSlug}/solution-code`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error('Unable to load solution');
  }
  const data = await res.json();
  return data.solution_code || '';
}
