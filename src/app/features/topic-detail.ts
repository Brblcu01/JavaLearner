import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressStore } from '../core/progress-store';
import { QuestionBank } from '../core/question-bank';
import { PoolFilter, QuizEngine } from '../core/quiz-engine';
import { PASS_MARK, topicById } from '../core/topics';
import { RichText } from '../shared/rich-text';

const DIFF = ['', 'facile', 'media', 'difficile'];

@Component({
  imports: [RouterLink, RichText],
  template: `
    @if (topic(); as t) {
      <div class="page">
        <a routerLink="/argomenti" class="back">← Argomenti</a>
        <header class="page-head">
          <p class="eyebrow">{{ t.chapter }}@if (!t.inExam829) { · solo corso Java 11, escluso dalla simulazione 1Z0-829}</p>
          <h1>{{ t.name }}</h1>
        </header>

        <dl class="figures">
          <div>
            <dt>Corrette</dt>
            <dd class="num" [class.ok]="(stat()?.accuracy ?? -1) >= pass" [class.ko]="stat()?.accuracy !== null && (stat()?.accuracy ?? 0) < pass">
              {{ stat()?.accuracy ?? '—' }}@if (stat()?.accuracy !== null) {%}
            </dd>
          </div>
          <div><dt>Viste</dt><dd class="num">{{ stat()?.seen }}<small>/{{ stat()?.total }}</small></dd></div>
          <div><dt>Errori aperti</dt><dd class="num">{{ stat()?.wrongNow }}</dd></div>
          <div><dt>Tentativi</dt><dd class="num">{{ stat()?.attempts }}</dd></div>
        </dl>

        <div class="actions">
          <button class="btn" type="button" (click)="start('all', 10)">Esercitati · 10 domande</button>
          <button class="btn ghost" type="button" [disabled]="!unseen()" (click)="start('unseen', 15)">
            Mai viste ({{ unseen() }})
          </button>
          <button class="btn ghost" type="button" [disabled]="!stat()?.wrongNow" (click)="start('wrong', 15)">
            Solo errori ({{ stat()?.wrongNow }})
          </button>
        </div>

        <div class="cols">
          @if (keyPoints().length) {
            <section aria-labelledby="kp">
              <h2 id="kp">Note per l'esame</h2>
              <p class="muted small">Dal manuale {{ t.chapter }}: le regole e le trappole che tornano nelle domande.</p>
              <dl class="notes">
                @for (k of keyPoints(); track $index) {
                  <div>
                    <dt>{{ k.title }}</dt>
                    <dd><app-rich [text]="k.body" /></dd>
                  </div>
                }
              </dl>
            </section>
          }

          <section aria-labelledby="qs">
            <h2 id="qs">Domande</h2>
            <p class="muted small">Apri una domanda per rispondere solo a quella.</p>
            <ol class="qs">
              @for (q of questions(); track q.id) {
                <li>
                  <button type="button" (click)="single(q.id)">
                    <span class="dot" [class]="status(q.id)" [attr.aria-label]="statusLabel(q.id)"></span>
                    <span class="prompt"><app-rich [text]="q.prompt" /></span>
                    <span class="diff">{{ diff[q.difficulty] }}</span>
                  </button>
                </li>
              }
            </ol>
          </section>
        </div>
      </div>
    } @else {
      <div class="page">
        <h1>Argomento non trovato</h1>
        <p><a routerLink="/argomenti">Torna agli argomenti</a></p>
      </div>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 18px; font-size: 14px; color: var(--ink-soft); text-decoration: none; }
    .back:hover { color: var(--ink); }
    .small { font-size: 13.5px; margin: 4px 0 14px; }
    .figures { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 0 20px; border-block: 1px solid var(--rule); }
    .figures > div { padding: 12px 0 12px 14px; border-left: 1px solid var(--rule); }
    .figures > div:first-child { border-left: 0; padding-left: 0; }
    dt { font-size: 12.5px; color: var(--ink-soft); }
    .figures dd { margin: 2px 0 0; font-size: 24px; font-weight: 500; letter-spacing: -0.04em; }
    .figures small { font-size: 13px; color: var(--ink-faint); }
    .ok { color: var(--pass); }
    .ko { color: var(--pen); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 36px; }
    .cols { display: grid; gap: 40px; }
    @media (min-width: 980px) { .cols { grid-template-columns: 1fr 1fr; } }

    .notes { margin: 0; display: grid; gap: 0; border-top: 1px solid var(--rule); }
    .notes > div { padding: 14px 0; border-bottom: 1px solid var(--rule); }
    .notes dt { font-weight: 600; font-size: 15px; color: var(--ink); margin-bottom: 4px; }
    .notes dd { margin: 0; color: var(--ink-soft); }

    .qs { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
    .qs li { border-bottom: 1px solid var(--rule); }
    .qs button {
      width: 100%; display: grid; grid-template-columns: 12px 1fr auto; gap: 12px; align-items: baseline;
      padding: 11px 4px; background: none; border: 0; text-align: left; cursor: pointer; font-size: 14px;
    }
    .qs button:hover { background: var(--paper-raised); }
    .prompt { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .diff { font: 400 11px var(--font-display); color: var(--ink-faint); }
    .dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid var(--rule-strong); transform: translateY(1px); }
    .dot.right { background: var(--pass); border-color: var(--pass); }
    .dot.wrong { background: var(--pen); border-color: var(--pen); }
  `,
})
export default class TopicDetail {
  readonly id = input.required<string>();
  private readonly store = inject(ProgressStore);
  private readonly bank = inject(QuestionBank);
  private readonly engine = inject(QuizEngine);
  private readonly router = inject(Router);
  protected readonly pass = PASS_MARK;
  protected readonly diff = DIFF;

  protected readonly topic = computed(() => topicById(this.id()));
  protected readonly stat = computed(() => this.store.topicStats().find((s) => s.topic.id === this.id()));
  protected readonly questions = computed(() => this.bank.byTopic().get(this.id()) ?? []);
  protected readonly keyPoints = computed(() => this.bank.keyPoints()[this.id()] ?? []);
  protected readonly unseen = computed(() => {
    const st = this.store.stats();
    return this.questions().filter((q) => !st[q.id]).length;
  });

  protected status(id: string): string {
    const s = this.store.stats()[id];
    return 'dot ' + (!s ? 'new' : s.last ? 'right' : 'wrong');
  }
  protected statusLabel(id: string): string {
    const s = this.store.stats()[id];
    return !s ? 'Mai vista' : s.last ? 'Ultima risposta corretta' : 'Ultima risposta sbagliata';
  }

  protected start(filter: PoolFilter, count: number): void {
    const t = this.topic();
    if (!t) return;
    const title = filter === 'wrong' ? `Errori · ${t.name}` : t.name;
    if (this.engine.startPractice({ topics: [t.id], count, filter, title, mode: filter === 'wrong' ? 'mistakes' : 'practice' })) {
      this.router.navigate(['/quiz']);
    }
  }

  protected single(questionId: string): void {
    if (this.engine.startQuestions([questionId], this.topic()?.name ?? 'Domanda', [this.id()])) {
      this.router.navigate(['/quiz']);
    }
  }
}
