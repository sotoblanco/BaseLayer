import type { FileLesson, UXLightChapter } from './types';

export function formatChapterTitle(slug: string): string {
  const cleaned = slug.replace(/[-_]/g, ' ').trim();
  const match = cleaned.match(/^chapter\s*(\d+)$/i);
  if (match) return `Chapter ${Number(match[1])}`;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupLessonsIntoChapters(lessons: FileLesson[]): UXLightChapter[] {
  if (lessons.length === 0) return [];

  const hasChapters = lessons.some((l) => l.chapter);
  if (!hasChapters) {
    return [{
      id: 'lessons',
      slug: 'lessons',
      title: 'Lessons',
      chapterNumber: 1,
      lessons,
    }];
  }

  const chapterMap = new Map<string, FileLesson[]>();
  lessons.forEach((lesson) => {
    const key = lesson.chapter || 'default';
    if (!chapterMap.has(key)) chapterMap.set(key, []);
    chapterMap.get(key)!.push(lesson);
  });

  return Array.from(chapterMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, chapterLessons], i) => ({
      id: slug,
      slug,
      title: formatChapterTitle(slug),
      chapterNumber: i + 1,
      lessons: chapterLessons,
    }));
}

export function flattenLessons(chapters: UXLightChapter[]) {
  return chapters.flatMap((ch, chapterIndex) =>
    ch.lessons.map((lesson, lessonIndex) => ({ chapterIndex, lessonIndex, lesson }))
  );
}
