import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { QuestionStat, QuizSession, TopicStat } from './models';
import { QuestionBank, isCorrect } from './question-bank';
import { TOPICS, topicById } from './topics';

const KEY_STATS = 'jl.stats.v1';
const KEY_SESSIONS = 'jl.sessions.v1';
const KEY_DAYS = 'jl.days.v1';
const KEY_ACTIVE = 'jl.active.v1';
const MAX_SESSIONS = 200;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress stays in memory for this visit */
  }
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

@Injectable({ providedIn: 'root' })
export class ProgressStore {
  private readonly bank = inject(QuestionBank);

  readonly stats = signal<Record<string, QuestionStat>>(read(KEY_STATS, {}));
  readonly sessions = signal<QuizSession[]>(read(KEY_SESSIONS, []));
  readonly days = signal<Record<string, number>>(read(KEY_DAYS, {}));
  readonly active = signal<QuizSession | null>(read(KEY_ACTIVE, null));

  constructor() {
    effect(() => write(KEY_STATS, this.stats()));
    effect(() => write(KEY_SESSIONS, this.sessions()));
    effect(() => write(KEY_DAYS, this.days()));
    effect(() => write(KEY_ACTIVE, this.active()));
  }

  /** Record one answered question (practice: on check; exam: on finish). */
  record(questionId: string, answer: number[] | undefined, at = Date.now()): void {
    const q = this.bank.get(questionId);
    if (!q) return;
    const ok = isCorrect(q, answer);
    this.stats.update((s) => {
      const prev = s[questionId] ?? { attempts: 0, correct: 0, last: false, lastAt: 0 };
      return {
        ...s,
        [questionId]: {
          attempts: prev.attempts + 1,
          correct: prev.correct + (ok ? 1 : 0),
          last: ok,
          lastAt: at,
        },
      };
    });
    const k = dayKey(at);
    this.days.update((d) => ({ ...d, [k]: (d[k] ?? 0) + 1 }));
  }

  saveSession(s: QuizSession): void {
    this.sessions.update((list) => [s, ...list.filter((x) => x.id !== s.id)].slice(0, MAX_SESSIONS));
  }

  resetAll(): void {
    this.stats.set({});
    this.sessions.set([]);
    this.days.set({});
    this.active.set(null);
  }

  exportJson(): string {
    return JSON.stringify(
      { app: 'javalearner', version: 1, stats: this.stats(), sessions: this.sessions(), days: this.days() },
      null,
      2,
    );
  }

  importJson(text: string): void {
    const data = JSON.parse(text);
    if (data?.app !== 'javalearner' || typeof data.stats !== 'object') {
      throw new Error('Il file non è un export di JavaLearner.');
    }
    this.stats.set(data.stats ?? {});
    this.sessions.set(Array.isArray(data.sessions) ? data.sessions : []);
    this.days.set(data.days ?? {});
  }

  // ---------- derived ----------

  readonly topicStats = computed<TopicStat[]>(() => {
    const stats = this.stats();
    const byTopic = this.bank.byTopic();
    return TOPICS.map((topic) => {
      const qs = byTopic.get(topic.id) ?? [];
      let seen = 0;
      let lastOk = 0;
      let attempts = 0;
      let correctAttempts = 0;
      for (const q of qs) {
        const s = stats[q.id];
        if (!s) continue;
        seen++;
        if (s.last) lastOk++;
        attempts += s.attempts;
        correctAttempts += s.correct;
      }
      return {
        topic,
        total: qs.length,
        seen,
        accuracy: seen ? Math.round((lastOk / seen) * 100) : null,
        attempts,
        correctAttempts,
        wrongNow: seen - lastOk,
      };
    });
  });

  readonly overall = computed(() => {
    const ts = this.topicStats();
    const total = ts.reduce((a, t) => a + t.total, 0);
    const seen = ts.reduce((a, t) => a + t.seen, 0);
    const wrong = ts.reduce((a, t) => a + t.wrongNow, 0);
    const attempts = ts.reduce((a, t) => a + t.attempts, 0);
    return {
      total,
      seen,
      wrong,
      attempts,
      accuracy: seen ? Math.round(((seen - wrong) / seen) * 100) : null,
    };
  });

  readonly exams = computed(() =>
    this.sessions()
      .filter((s) => s.mode === 'exam' && s.finishedAt)
      .sort((a, b) => a.startedAt - b.startedAt),
  );

  readonly streak = computed(() => {
    const days = this.days();
    let n = 0;
    const d = new Date();
    if (!days[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
    while (days[dayKey(d.getTime())]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  });

  topicName(id: string): string {
    return topicById(id)?.name ?? id;
  }
}
