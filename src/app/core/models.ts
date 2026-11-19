export type TopicId = string;

export interface KeyPoint {
  title: string;
  body: string;
}

export interface Question {
  id: string;
  topic: TopicId;
  difficulty: 1 | 2 | 3;
  prompt: string;
  code: string | null;
  options: string[];
  correct: number[];
  explanation: string;
  source: string;
}

export interface TopicFile {
  topic: TopicId;
  keyPoints: KeyPoint[];
  questions: Omit<Question, 'topic'>[];
}

export type AreaId = 'fondamenti' | 'oop' | 'api' | 'funzionale' | 'piattaforma';

export interface Topic {
  id: TopicId;
  name: string;
  short: string;
  area: AreaId;
  chapter: string;
  /** false = topic only in the Java 11 course (1Z0-819), excluded from the 1Z0-829 simulation */
  inExam829: boolean;
}

export type SessionMode = 'practice' | 'exam' | 'mistakes';

export interface QuizSession {
  id: string;
  mode: SessionMode;
  title: string;
  topics: TopicId[];
  questionIds: string[];
  answers: Record<string, number[]>;
  /** questions already checked (feedback shown): practice, or exam with instant feedback */
  checked: string[];
  marked: string[];
  current: number;
  startedAt: number;
  finishedAt?: number;
  /** exam mode: show right/wrong and the explanation after each answer */
  feedback?: boolean;
  /** exam mode: deadline as epoch ms */
  deadline?: number;
  score?: number;
}

export interface QuestionStat {
  attempts: number;
  correct: number;
  last: boolean;
  lastAt: number;
}

export interface TopicStat {
  topic: Topic;
  total: number;
  seen: number;
  /** % of seen questions whose last answer was right; null when nothing seen */
  accuracy: number | null;
  attempts: number;
  correctAttempts: number;
  wrongNow: number;
}
