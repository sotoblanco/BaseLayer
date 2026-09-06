export type ExerciseType = 'code' | 'spreadsheet' | 'drawing';

export interface FileLesson {
  slug: string;
  title: string;
  description: string;
  initial_code: string;
  test_code: string;
  solution_code?: string;
  has_solution?: boolean;
  order: number;
  language: string;
  chapter?: string;
  exercise_type?: ExerciseType;
  google_sheet_id?: string;
  copy_on_open?: boolean;
  image_url?: string;
  stroke_color?: string;
  stroke_width?: number;
  skills?: string[];
}

export interface FileCourse {
  slug: string;
  title: string;
  description: string;
  lessons: FileLesson[];
  skills?: string[];
}

export interface FileCourseSummary {
  slug: string;
  title: string;
  description: string;
  lesson_count: number;
  skills?: string[];
}

export interface UXLightChapter {
  id: string;
  slug: string;
  title: string;
  chapterNumber: number;
  lessons: FileLesson[];
}

export type ConsoleTab = 'shell' | 'plots' | 'feedback';
export type MobileTab = 'instructions' | 'workspace' | 'console';
export type EditorTab = 'script' | 'tests' | 'solution';

export interface OutputMessage {
  id: string;
  type: 'stdout' | 'stderr' | 'prompt' | 'info' | 'error' | 'success';
  text: string;
  timestamp: number;
}

export interface GradingResult {
  passed: boolean;
  xpEarned: number;
  message: string;
  errorDetail?: string;
}

export interface PlotFigure {
  id: string;
  title: string;
  caption?: string;
  svg?: string;
  pngUrl?: string;
}
