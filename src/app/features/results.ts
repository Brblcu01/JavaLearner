import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Question } from '../core/models';
import { ProgressStore } from '../core/progress-store';
import { QuestionBank, isCorrect } from '../core/question-bank';
import { QuizEngine } from '../core/quiz-engine';
import { PASS_MARK, topicById } from '../core/topics';
import { CodeBlock } from '../shared/code-block';
import { RichText } from '../shared/rich-text';

const LETTERS = 'ABCDEF';
type Filter = 'wrong' | 'all' | 'marked';

interface Row {
  n: number;
  q: Question;
  answer: number[];
  right: boolean;
  marked: boolean;
}

@Component({
  imports: [RouterLink, DatePipe, CodeBlock, RichText],
  template: `
    @if (session(); as s) {
      <div class="page">
        <a routerLink="/storico" class="back">← Storico</a>
        <header class="hero">
          <div>
            <p class="eyebrow">{{ s.title }} · {{ s.finishedAt | date: 'd MMMM yyyy, HH:mm' }}</p>
            <p class="score num" [class.ok]="passed()" [class.ko]="!passed()">{{ s.score }}<span>%</span></p>
            <p class="verdict">
              @if (s.mode === 'exam') {
                <b>{{ passed() ? 'Superato.' : 'Non superato.' }}</b>
              }
              {{ rightCount() }} giuste su {{ rows().length }} · soglia {{ pass }}% · {{ duration() }}
            </p>
          </div>
          <div class="scale" aria-hidden="true">
            <span class="fill" [class.ok]="passed()" [style.width.%]="s.score"></span>
            <i [style.left.%]="pass"><em>{{ pass }}</em></i>
          </div>
        </header>

        <section class="block" aria-labelledby="by-topic">
          <h2 id="by-topic">Per argomento</h2>
          <table>
            <thead>
              <tr><th scope="col">Argomento</th><th scope="col" class="r">Giuste</th><th scope="col" class="bar-col"><span class="sr">Percentuale</span></th></tr>
            </thead>
            <tbody>
              @for (t of byTopic(); track t.id) {
                <tr>
                  <th scope="row"><a [routerLink]="['/argomenti', t.id]">{{ t.name }}</a></th>
                  <td class="r num">{{ t.right }}/{{ t.total }}</td>
                  <td class="bar-col">
                    <span class="meter"><span [class.ok]="t.pct >= pass" [style.width.%]="t.pct || 1"></span><i [style.left.%]="pass"></i></span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section class="block" aria-labelledby="review">
          <div class="review-head">
            <h2 id="review">Rivedi le risposte</h2>
            <div class="seg" role="tablist">
              <button role="tab" type="button" [attr.aria-selected]="filter() === 'wrong'" [class.on]="filter() === 'wrong'" (click)="filter.set('wrong')">
                Sbagliate <span class="num">{{ rows().length - rightCount() }}</span>
              </button>
              @if (markedCount()) {
                <button role="tab" type="button" [attr.aria-selected]="filter() === 'marked'" [class.on]="filter() === 'marked'" (click)="filter.set('marked')">
                  Segnate <span class="num">{{ markedCount() }}</span>
                </button>
              }
              <button role="tab" type="button" [attr.aria-selected]="filter() === 'all'" [class.on]="filter() === 'all'" (click)="filter.set('all')">
                Tutte <span class="num">{{ rows().length }}</span>
              </button>
            </div>
          </div>

          @if (!visible().length) {
            <p class="muted">Nessuna domanda in questo elenco.</p>
          }
          <ol class="review">
            @for (r of visible(); track r.q.id) {
              <li>
                <details [open]="!r.right && visible().length <= 12">
                  <summary>
                    <span class="mark" [class.ok]="r.right" [attr.aria-label]="r.right ? 'Giusta' : 'Sbagliata'">{{ r.right ? '✓' : '✗' }}</span>
                    <span class="num n">{{ r.n }}</span>
                    <span class="p"><app-rich [text]="r.q.prompt" /></span>
                    <span class="t">{{ topicShort(r.q.topic) }}</span>
                  </summary>
                  <div class="detail">
                    @if (r.q.code) { <app-code [source]="r.q.code" /> }
                    <ul class="opts">
                      @for (o of r.q.options; track $index; let i = $index) {
                        <li [class.right]="r.q.correct.includes(i)" [class.wrong]="r.answer.includes(i) && !r.q.correct.includes(i)">
                          <span class="letter">{{ letters[i] }}</span>
                          <span><app-rich [text]="o" /></span>
                          <span class="tag">
                            @if (r.q.correct.includes(i) && r.answer.includes(i)) { tua · corretta }
                            @else if (r.q.correct.includes(i)) { corretta }
                            @else if (r.answer.includes(i)) { tua }
                          </span>
                        </li>
                      }
                    </ul>
                    @if (!r.answer.length) { <p class="muted">Nessuna risposta data.</p> }
                    <p class="why"><app-rich [text]="r.q.explanation" /></p>
                    <p class="src">Manuale: {{ r.q.source }}</p>
                  </div>
                </details>
              </li>
            }
          </ol>
        </section>

        <div class="next">
          @if (rows().length - rightCount()) {
            <button class="btn" type="button" (click)="retryWrong()">Ripeti le {{ rows().length - rightCount() }} sbagliate</button>
          }
          <a class="btn ghost" routerLink="/">Torna alla panoramica</a>
        </div>
      </div>
    } @else {
      <div class="page">
        <h1>Sessione non trovata</h1>
        <p><a routerLink="/storico">Vai allo storico</a></p>
      </div>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 18px; font-size: 14px; color: var(--ink-soft); text-decoration: none; }
    .hero { display: grid; gap: 18px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
    .score { font-size: clamp(64px, 12vw, 104px); font-weight: 500; letter-spacing: -0.06em; line-height: 1; margin: 8px 0 6px; font-stretch: 75%; }
    .score span { font-size: 0.4em; letter-spacing: 0; margin-left: 4px; }
    .ok { color: var(--pass); }
    .ko { color: var(--pen); }
    .verdict { color: var(--ink-soft); }
    .verdict b { color: var(--ink); }
    .scale { position: relative; height: 10px; background: var(--paper-sunk); border-radius: 5px; max-width: 560px; margin-top: 14px; }
    .scale .fill { display: block; height: 100%; border-radius: 5px; background: var(--pen); animation: fill .7s cubic-bezier(.2,.8,.2,1) both; transform-origin: left; }
    .scale .fill.ok { background: var(--pass); }
    .scale i { position: absolute; top: -6px; bottom: -6px; width: 2px; background: var(--ink); }
    .scale em { position: absolute; top: -18px; left: -8px; font: 600 10.5px var(--font-display); font-style: normal; }
    @keyframes fill { from { transform: scaleX(0); } }

    .block { margin-top: 36px; }
    h2 { margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
    th, td { padding: 9px 0; border-bottom: 1px solid var(--rule); text-align: left; font-weight: 400; }
    thead th { font: 500 11px var(--font-display); text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); }
    tbody th a { text-decoration: none; }
    tbody th a:hover { text-decoration: underline; }
    .r { text-align: right; padding-right: 16px; white-space: nowrap; }
    .bar-col { width: 40%; }
    .meter { position: relative; display: block; height: 6px; background: var(--paper-sunk); border-radius: 3px; }
    .meter span { display: block; height: 100%; border-radius: 3px; background: var(--pen); }
    .meter span.ok { background: var(--pass); }
    .meter i { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--ink); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

    .review-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
    .review-head h2 { margin: 0; }
    .seg { display: inline-flex; border: 1px solid var(--rule-strong); border-radius: 6px; overflow: hidden; }
    .seg button { padding: 8px 12px; border: 0; border-left: 1px solid var(--rule-strong); background: var(--paper-raised); cursor: pointer; font-size: 13.5px; }
    .seg button:first-child { border-left: 0; }
    .seg button.on { background: var(--ink); color: var(--paper); }
    .seg .num { font-size: 11px; margin-left: 4px; opacity: .8; }

    .review { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
    .review > li { border-bottom: 1px solid var(--rule); }
    summary {
      display: grid; grid-template-columns: 20px 26px 1fr; gap: 10px; align-items: baseline;
      padding: 12px 4px; cursor: pointer; list-style: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary:hover { background: var(--paper-raised); }
    .mark { font-weight: 700; color: var(--pen); }
    .mark.ok { color: var(--pass); }
    .n { font-size: 12px; color: var(--ink-faint); }
    .p { font-size: 14.5px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .t { display: none; font: 400 11px var(--font-display); color: var(--ink-faint); }
    @media (min-width: 720px) { summary { grid-template-columns: 20px 26px 1fr auto; } .t { display: inline; } }
    details[open] .p { -webkit-line-clamp: unset; font-weight: 600; }
    .detail { padding: 4px 4px 20px 60px; display: grid; gap: 12px; }
    @media (max-width: 600px) { .detail { padding-left: 4px; } }
    .opts { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .opts li { display: grid; grid-template-columns: 24px 1fr auto; gap: 10px; padding: 7px 10px; border-radius: 5px; font-size: 14.5px; }
    .opts li.right { background: var(--pass-tint); }
    .opts li.wrong { background: var(--pen-tint); }
    .opts li.wrong span:nth-child(2) { text-decoration: line-through; text-decoration-color: var(--pen); }
    .letter { font: 500 12px var(--font-display); color: var(--ink-soft); }
    .tag { font: 500 10px var(--font-display); text-transform: uppercase; letter-spacing: .05em; color: var(--ink-soft); white-space: nowrap; }
    .why { color: var(--ink); }
    .src { font: 400 11.5px var(--font-display); color: var(--ink-faint); }

    .next { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; }
  `,
})
export default class Results {
  readonly id = input.required<string>();
  private readonly store = inject(ProgressStore);
  private readonly bank = inject(QuestionBank);
  private readonly engine = inject(QuizEngine);
  private readonly router = inject(Router);
  protected readonly pass = PASS_MARK;
  protected readonly letters = LETTERS;
  protected readonly filter = signal<Filter>('wrong');

  protected readonly session = computed(() => this.store.sessions().find((s) => s.id === this.id()));
  protected readonly passed = computed(() => (this.session()?.score ?? 0) >= PASS_MARK);

  protected readonly rows = computed<Row[]>(() => {
    const s = this.session();
    if (!s) return [];
    return s.questionIds
      .map((id, i) => {
        const q = this.bank.get(id);
        if (!q) return null;
        const answer = s.answers[id] ?? [];
        return { n: i + 1, q, answer, right: isCorrect(q, answer), marked: s.marked.includes(id) };
      })
      .filter((r): r is Row => !!r);
  });
  protected readonly rightCount = computed(() => this.rows().filter((r) => r.right).length);
  protected readonly markedCount = computed(() => this.rows().filter((r) => r.marked).length);
  protected readonly visible = computed(() => {
    const f = this.filter();
    return this.rows().filter((r) => (f === 'all' ? true : f === 'wrong' ? !r.right : r.marked));
  });

  protected readonly byTopic = computed(() => {
    const map = new Map<string, { id: string; name: string; right: number; total: number; pct: number }>();
    for (const r of this.rows()) {
      const t = map.get(r.q.topic) ?? { id: r.q.topic, name: topicById(r.q.topic)?.name ?? r.q.topic, right: 0, total: 0, pct: 0 };
      t.total++;
      if (r.right) t.right++;
      map.set(r.q.topic, t);
    }
    return [...map.values()]
      .map((t) => ({ ...t, pct: Math.round((t.right / t.total) * 100) }))
      .sort((a, b) => a.pct - b.pct || b.total - a.total);
  });

  protected readonly duration = computed(() => {
    const s = this.session();
    if (!s?.finishedAt) return '';
    const min = Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000));
    return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
  });

  protected topicShort(id: string): string {
    return topicById(id)?.short ?? id;
  }

  protected retryWrong(): void {
    const ids = this.rows().filter((r) => !r.right).map((r) => r.q.id);
    const topics = [...new Set(this.rows().filter((r) => !r.right).map((r) => r.q.topic))];
    if (this.engine.startQuestions(ids, 'Ripeti sbagliate', topics)) this.router.navigate(['/quiz']);
  }
}
