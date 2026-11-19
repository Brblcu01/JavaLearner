import { Injectable, computed, signal } from '@angular/core';
import { KeyPoint, Question, TopicFile } from './models';
import { TOPICS } from './topics';

@Injectable({ providedIn: 'root' })
export class QuestionBank {
  private readonly _questions = signal<Question[]>([]);
  private readonly _keyPoints = signal<Record<string, KeyPoint[]>>({});
  readonly loaded = signal(false);
  readonly failed = signal<string[]>([]);

  readonly questions = this._questions.asReadonly();
  readonly keyPoints = this._keyPoints.asReadonly();

  readonly byId = computed(() => new Map(this._questions().map((q) => [q.id, q])));
  readonly byTopic = computed(() => {
    const map = new Map<string, Question[]>();
    for (const t of TOPICS) map.set(t.id, []);
    for (const q of this._questions()) map.get(q.topic)?.push(q);
    return map;
  });

  async load(): Promise<void> {
    const results = await Promise.all(
      TOPICS.map(async (t) => {
        try {
          const res = await fetch(`questions/${t.id}.json`);
          if (!res.ok) throw new Error(String(res.status));
          return { id: t.id, file: (await res.json()) as TopicFile };
        } catch {
          return { id: t.id, file: null };
        }
      }),
    );
    const questions: Question[] = [];
    const keyPoints: Record<string, KeyPoint[]> = {};
    const failed: string[] = [];
    for (const { id, file } of results) {
      if (!file) {
        failed.push(id);
        continue;
      }
      keyPoints[id] = file.keyPoints ?? [];
      for (const q of file.questions) questions.push({ ...q, topic: id });
    }
    this._questions.set(questions);
    this._keyPoints.set(keyPoints);
    this.failed.set(failed);
    this.loaded.set(true);
  }

  get(id: string): Question | undefined {
    return this.byId().get(id);
  }
}

export function isCorrect(q: Question, answer: number[] | undefined): boolean {
  if (!answer || answer.length !== q.correct.length) return false;
  const s = new Set(answer);
  return q.correct.every((c) => s.has(c));
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
