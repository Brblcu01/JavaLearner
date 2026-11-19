import { Injectable, computed, inject } from '@angular/core';
import { Question, QuizSession, SessionMode, TopicId } from './models';
import { ProgressStore } from './progress-store';
import { QuestionBank, isCorrect, shuffle } from './question-bank';
import { EXAM_MINUTES, EXAM_QUESTIONS, TOPICS } from './topics';

export type PoolFilter = 'all' | 'unseen' | 'wrong';

export interface PracticeOptions {
  topics: TopicId[];
  count: number;
  filter: PoolFilter;
  title?: string;
  mode?: SessionMode;
}

@Injectable({ providedIn: 'root' })
export class QuizEngine {
  private readonly bank = inject(QuestionBank);
  private readonly store = inject(ProgressStore);

  readonly session = this.store.active.asReadonly();

  readonly questions = computed<Question[]>(() => {
    const s = this.session();
    if (!s) return [];
    return s.questionIds.map((id) => this.bank.get(id)).filter((q): q is Question => !!q);
  });

  pool(topics: TopicId[], filter: PoolFilter): Question[] {
    const stats = this.store.stats();
    const set = new Set(topics);
    return this.bank.questions().filter((q) => {
      if (!set.has(q.topic)) return false;
      const s = stats[q.id];
      if (filter === 'unseen') return !s;
      if (filter === 'wrong') return !!s && !s.last;
      return true;
    });
  }

  /** Ask before throwing away a session that is still in progress. */
  private canReplace(): boolean {
    const s = this.session();
    if (!s || !Object.keys(s.answers).length) return true;
    return confirm(`Hai una sessione in corso ("${s.title}", ${s.current + 1}/${s.questionIds.length}). Abbandonarla e iniziare la nuova?`);
  }

  startPractice(opts: PracticeOptions): boolean {
    if (!this.canReplace()) return false;
    const pool = this.pool(opts.topics, opts.filter);
    if (!pool.length) return false;
    // least-practised first, then random within the same attempt count
    const stats = this.store.stats();
    const picked = shuffle(pool)
      .sort((a, b) => (stats[a.id]?.attempts ?? 0) - (stats[b.id]?.attempts ?? 0))
      .slice(0, opts.count);
    this.begin({
      mode: opts.mode ?? 'practice',
      title: opts.title ?? 'Esercitazione',
      topics: opts.topics,
      questionIds: shuffle(picked).map((q) => q.id),
    });
    return true;
  }

  /** Practice an explicit list of questions (e.g. a single question from a topic page). */
  startQuestions(ids: string[], title: string, topics: TopicId[]): boolean {
    if (!ids.length || !this.canReplace()) return false;
    this.begin({ mode: 'practice', title, topics, questionIds: ids });
    return true;
  }

  startExam(feedback = true): boolean {
    if (!this.canReplace()) return false;
    const examTopics = TOPICS.filter((t) => t.inExam829);
    const byTopic = this.bank.byTopic();
    const total = examTopics.reduce((a, t) => a + (byTopic.get(t.id)?.length ?? 0), 0);
    if (total < EXAM_QUESTIONS) return false;

    // proportional quota per topic, largest remainders fill the gap to 50
    const quotas = examTopics.map((t) => {
      const n = byTopic.get(t.id)?.length ?? 0;
      const exact = (n / total) * EXAM_QUESTIONS;
      return { id: t.id, n, q: Math.floor(exact), rem: exact - Math.floor(exact) };
    });
    let missing = EXAM_QUESTIONS - quotas.reduce((a, x) => a + x.q, 0);
    for (const x of [...quotas].sort((a, b) => b.rem - a.rem)) {
      if (missing <= 0) break;
      if (x.q < x.n) {
        x.q++;
        missing--;
      }
    }
    const ids = quotas.flatMap((x) => shuffle(byTopic.get(x.id) ?? []).slice(0, x.q).map((q) => q.id));
    const now = Date.now();
    this.begin({
      mode: 'exam',
      title: 'Simulazione 1Z0-829',
      topics: examTopics.map((t) => t.id),
      questionIds: shuffle(ids),
      deadline: now + EXAM_MINUTES * 60_000,
      feedback,
    });
    return true;
  }

  private begin(p: Pick<QuizSession, 'mode' | 'title' | 'topics' | 'questionIds' | 'deadline' | 'feedback'>) {
    this.store.active.set({
      id: crypto.randomUUID(),
      answers: {},
      checked: [],
      marked: [],
      current: 0,
      startedAt: Date.now(),
      ...p,
    });
  }

  private patch(fn: (s: QuizSession) => QuizSession): void {
    const s = this.store.active();
    if (s) this.store.active.set(fn(s));
  }

  select(q: Question, option: number): void {
    this.patch((s) => {
      if (s.checked.includes(q.id)) return s;
      const prev = s.answers[q.id] ?? [];
      let next: number[];
      if (q.correct.length === 1) next = [option];
      else next = prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option].sort();
      return { ...s, answers: { ...s.answers, [q.id]: next } };
    });
  }

  check(q: Question): void {
    const s = this.store.active();
    if (!s || s.checked.includes(q.id)) return;
    this.store.record(q.id, s.answers[q.id]);
    this.patch((x) => ({ ...x, checked: [...x.checked, q.id] }));
  }

  toggleMark(q: Question): void {
    this.patch((s) => ({
      ...s,
      marked: s.marked.includes(q.id) ? s.marked.filter((m) => m !== q.id) : [...s.marked, q.id],
    }));
  }

  go(index: number): void {
    this.patch((s) => ({ ...s, current: Math.max(0, Math.min(index, s.questionIds.length - 1)) }));
  }

  /** Close the active session and return its id (null when nothing was answered in practice). */
  finish(): string | null {
    const s = this.store.active();
    if (!s) return null;
    const now = Date.now();
    let scored: string[];
    if (s.mode === 'exam') {
      // questions already checked during the exam were recorded at that moment
      for (const id of s.questionIds) if (!s.checked.includes(id)) this.store.record(id, s.answers[id], now);
      scored = s.questionIds;
    } else {
      scored = s.questionIds.filter((id) => s.checked.includes(id));
    }
    this.store.active.set(null);
    if (!scored.length) return null;
    const right = scored.filter((id) => {
      const q = this.bank.get(id);
      return q ? isCorrect(q, s.answers[id]) : false;
    }).length;
    const done: QuizSession = {
      ...s,
      questionIds: scored,
      finishedAt: now,
      score: Math.round((right / scored.length) * 100),
    };
    this.store.saveSession(done);
    return done.id;
  }

  discard(): void {
    this.store.active.set(null);
  }
}
