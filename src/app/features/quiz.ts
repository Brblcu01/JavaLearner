import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Question } from '../core/models';
import { isCorrect } from '../core/question-bank';
import { QuizEngine } from '../core/quiz-engine';
import { topicById } from '../core/topics';
import { CodeBlock } from '../shared/code-block';
import { RichText } from '../shared/rich-text';

const LETTERS = 'ABCDEF';
const DIFF = ['', 'facile', 'media', 'difficile'];
const COUNT_WORD = ['', 'una', 'due', 'tre', 'quattro'];

@Component({
  imports: [RouterLink, CodeBlock, RichText],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    @if (session(); as s) {
      @if (q(); as q) {
        <div class="quiz" [class.exam]="isExam()">
          <header class="bar">
            <button type="button" class="icon-btn" (click)="leave()" aria-label="Esci dalla sessione">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <div class="title">
              <span class="eyebrow">{{ isExam() ? 'Simulazione' : s.mode === 'mistakes' ? 'Ripasso errori' : 'Esercitazione' }}</span>
              <b>{{ s.title }}</b>
            </div>
            @if (isExam()) {
              <span class="timer num" [class.low]="remaining() < 300" role="timer" [attr.aria-label]="'Tempo rimasto ' + clock()">
                {{ clock() }}
              </span>
            }
            <button type="button" class="btn small" [class.ghost]="!allDone()" (click)="askFinish()">
              {{ isExam() ? 'Consegna' : 'Termina' }}
            </button>
          </header>

          <div class="body">
            <nav class="sheet" aria-label="Foglio risposte">
              <p class="eyebrow sheet-head">
                <span>Foglio risposte</span>
                <span class="num">{{ answeredCount() }}/{{ total() }}</span>
              </p>
              <ol>
                @for (id of s.questionIds; track id; let i = $index) {
                  <li>
                    <button
                      type="button"
                      [class]="cellClass(id, i)"
                      (click)="engine.go(i)"
                      [attr.aria-current]="i === s.current ? 'step' : null"
                      [attr.aria-label]="cellLabel(id, i)"
                    >
                      {{ i + 1 }}
                    </button>
                  </li>
                }
              </ol>
            </nav>

            <article class="question" aria-live="polite" #top>
              <p class="meta">
                <span class="num">Domanda {{ s.current + 1 }} di {{ total() }}</span>
                <span>{{ topicName(q.topic) }}</span>
                <span>{{ diff[q.difficulty] }}</span>
              </p>

              <h1 class="prompt"><app-rich [text]="q.prompt" /></h1>
              @if (q.code) {
                <app-code [source]="q.code" />
              }

              <p class="choose" [class.multi]="q.correct.length > 1">
                @if (q.correct.length > 1) {
                  Scegli <b>{{ countWord[q.correct.length] }}</b> risposte · {{ selection().length }}/{{ q.correct.length }}
                } @else {
                  Scegli una risposta
                }
              </p>

              <ul class="options" [attr.role]="q.correct.length > 1 ? 'group' : 'radiogroup'">
                @for (opt of q.options; track $index; let i = $index) {
                  <li>
                    <button
                      type="button"
                      [class]="optionClass(q, i)"
                      [disabled]="checked()"
                      (click)="engine.select(q, i)"
                      [attr.role]="q.correct.length > 1 ? 'checkbox' : 'radio'"
                      [attr.aria-checked]="selection().includes(i)"
                    >
                      <span class="bubble" aria-hidden="true">{{ letters[i] }}</span>
                      <span class="text"><app-rich [text]="opt" /></span>
                      @if (checked() && q.correct.includes(i)) {
                        <span class="verdict ok">corretta</span>
                      } @else if (checked() && selection().includes(i)) {
                        <span class="verdict ko">tua scelta</span>
                      }
                    </button>
                  </li>
                }
              </ul>

              @if (checked()) {
                <section #explain class="explain" [class.right]="wasRight()" aria-label="Spiegazione">
                  <p class="verdict-line">{{ wasRight() ? 'Giusto.' : 'Sbagliato.' }}
                    @if (!wasRight()) { La risposta corretta è {{ correctLetters(q) }}. }
                  </p>
                  <p><app-rich [text]="q.explanation" /></p>
                  <p class="source">Manuale: {{ q.source }}</p>
                </section>
              }
            </article>
          </div>

          <footer class="actions">
            <button type="button" class="btn ghost" [disabled]="s.current === 0" (click)="engine.go(s.current - 1)">
              <span>←<span class="hide-sm"> Precedente</span></span>
            </button>
            <button type="button" class="btn ghost mark" [class.on]="isMarked()" (click)="engine.toggleMark(q)" [attr.aria-pressed]="isMarked()">
              <span>{{ isMarked() ? 'Segnata' : 'Segna' }}<span class="hide-sm"> per revisione</span></span>
            </button>
            @if (instant() && !checked()) {
              <button type="button" class="btn primary" [disabled]="!complete()" (click)="check(q)">Verifica</button>
            } @else if (s.current < total() - 1) {
              <button type="button" class="btn primary" (click)="engine.go(s.current + 1)">Avanti →</button>
            } @else {
              <button type="button" class="btn primary" (click)="askFinish()">{{ isExam() ? 'Consegna' : 'Vedi risultati' }}</button>
            }
          </footer>
        </div>

        <dialog #finishDialog class="panel" (close)="onDialogClose()">
          <form method="dialog">
            <h2>{{ isExam() ? 'Consegnare la simulazione?' : 'Terminare la sessione?' }}</h2>
            @if (isExam()) {
              <p>
                Hai risposto a <b class="num">{{ answeredCount() }}</b> domande su {{ total() }}.
                @if (total() - answeredCount()) { Le {{ total() - answeredCount() }} senza risposta contano come sbagliate. }
                @if (s.marked.length) { Ne hai {{ s.marked.length }} segnate per revisione. }
              </p>
            } @else {
              <p>
                Hai verificato {{ s.checked.length }} domande su {{ total() }}.
                @if (total() - s.checked.length) { Quelle non verificate non vengono salvate. }
              </p>
            }
            <div class="dialog-actions">
              <button class="btn ghost" value="cancel">Continua</button>
              <button class="btn" value="confirm">{{ isExam() ? 'Consegna' : 'Termina' }}</button>
            </div>
          </form>
        </dialog>
      }
    } @else if (!leaving()) {
      <div class="page empty">
        <h1>Nessuna sessione in corso</h1>
        <p class="muted">Avvia un'esercitazione o una simulazione d'esame.</p>
        <div class="row">
          <a class="btn" routerLink="/esercitati">Esercitati</a>
          <a class="btn ghost" routerLink="/simulazione">Simulazione</a>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .quiz { min-height: calc(100dvh - var(--safe-top)); display: grid; grid-template-rows: auto 1fr auto; grid-template-columns: minmax(0, 1fr); }

    .bar {
      position: sticky; top: var(--safe-top); z-index: 10;
      display: flex; align-items: center; gap: 12px;
      padding: 10px var(--gutter); background: var(--paper); border-bottom: 1px solid var(--rule);
    }
    .icon-btn { width: 40px; height: 40px; display: grid; place-items: center; background: none; border: 1px solid var(--rule); border-radius: 6px; cursor: pointer; }
    .icon-btn svg { width: 18px; height: 18px; stroke: var(--ink); stroke-width: 1.8; fill: none; stroke-linecap: round; }
    .title { flex: 1; min-width: 0; display: grid; }
    .title > * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .title b { font-size: 14.5px; }
    @media (max-width: 380px) { .exam .title .eyebrow { display: none; } .bar { gap: 8px; } }
    .timer { font-size: 17px; font-weight: 500; padding: 6px 10px; border: 1px solid var(--rule-strong); border-radius: 6px; letter-spacing: -0.02em; }
    .timer.low { color: var(--pen); border-color: var(--pen); }

    .body { display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; }
    .question > * { min-width: 0; }
    .sheet { padding: 12px var(--gutter) 0; }
    .sheet-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .sheet ol { list-style: none; margin: 0; padding: 0 0 4px; display: flex; gap: 5px; overflow-x: auto; scrollbar-width: thin; }
    .cell {
      position: relative; width: 32px; height: 32px; flex: none;
      font: 500 11px var(--font-display); color: var(--ink-soft);
      background: var(--paper-raised); border: 1px solid var(--rule-strong); border-radius: 4px; cursor: pointer;
    }
    .cell:hover { border-color: var(--ink); }
    .cell.answered { background: var(--ink-soft); color: var(--paper); border-color: var(--ink-soft); }
    .cell.right { background: var(--pass); border-color: var(--pass); color: var(--paper); }
    .cell.wrong { background: var(--pen); border-color: var(--pen); color: var(--paper); }
    .cell.current { outline: 2px solid var(--ink); outline-offset: 1px; }
    .cell.marked::after {
      content: ''; position: absolute; top: -1px; right: -1px; width: 0; height: 0;
      border-top: 10px solid var(--marker); border-left: 10px solid transparent; border-top-right-radius: 4px;
    }

    .question { padding: 22px var(--gutter) 28px; max-width: 780px; width: 100%; display: grid; gap: 18px; align-content: start; }
    .meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font: 400 11.5px var(--font-display); color: var(--ink-soft); letter-spacing: 0.01em; }
    .meta span + span::before { content: '·'; margin-right: 14px; color: var(--ink-faint); }
    .prompt { font-family: var(--font-body); font-stretch: 100%; font-size: clamp(18px, 2.4vw, 21px); font-weight: 600; letter-spacing: -0.01em; line-height: 1.4; }
    .choose { font-size: 13.5px; color: var(--ink-soft); }
    .choose.multi { color: var(--ink); }
    .choose b { font-weight: 700; }

    .options { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .opt {
      width: 100%; display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 14px;
      min-height: 52px; padding: 10px 14px; text-align: left; cursor: pointer;
      background: var(--paper-raised); border: 1px solid var(--rule); border-radius: 6px;
      font-size: 15.5px; line-height: 1.45;
      transition: border-color .12s ease, background .12s ease;
    }
    .opt:hover:not(:disabled) { border-color: var(--ink-soft); }
    .opt:disabled { cursor: default; color: var(--ink); }
    .bubble {
      width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
      border: 1.5px solid var(--rule-strong); font: 500 12px var(--font-display); color: var(--ink-soft);
      transition: background .12s ease;
    }
    .opt.selected { border-color: var(--ink); }
    .opt.selected .bubble { background: var(--ink); border-color: var(--ink); color: var(--paper); }
    .opt.right { border-color: var(--pass); background: var(--pass-tint); }
    .opt.right .bubble { background: var(--pass); border-color: var(--pass); color: var(--paper); }
    .opt.wrong { border-color: var(--pen); background: var(--pen-tint); }
    .opt.wrong .bubble { background: var(--pen); border-color: var(--pen); color: var(--paper); }
    .opt.wrong .text { text-decoration: line-through; text-decoration-color: var(--pen); text-decoration-thickness: 2px; }
    .opt.dim { opacity: .55; }
    .verdict { font: 500 10.5px var(--font-display); text-transform: uppercase; letter-spacing: .06em; }
    .verdict.ok { color: var(--pass); }
    .verdict.ko { color: var(--pen); }

    .explain {
      scroll-margin-bottom: 90px;
      border-left: 3px solid var(--pen); padding: 4px 0 4px 16px; display: grid; gap: 10px;
      animation: rise .25s ease both;
    }
    .explain.right { border-left-color: var(--pass); }
    .verdict-line { font-weight: 700; }
    .source { font: 400 11.5px var(--font-display); color: var(--ink-faint); }
    @keyframes rise { from { opacity: 0; transform: translateY(4px); } }

    .actions {
      position: sticky; bottom: 0; z-index: 10;
      display: flex; gap: 8px; justify-content: space-between;
      padding: 10px var(--gutter) calc(10px + var(--safe-bottom));
      background: var(--paper); border-top: 1px solid var(--rule);
    }
    .actions .primary { margin-left: auto; min-width: 120px; }
    .mark.on { background: var(--marker-tint); border-color: var(--marker); }
    .hide-sm { display: none; }

    @media (min-width: 900px) {
      .hide-sm { display: inline; }
      .body { grid-template-columns: minmax(0, 1fr) 260px; }
      .sheet { order: 2; padding: 26px 24px; border-left: 1px solid var(--rule); position: sticky; top: calc(61px + var(--safe-top)); align-self: start; max-height: calc(100dvh - 130px); overflow-y: auto; }
      .sheet ol { flex-wrap: wrap; overflow: visible; }
      .question { padding: 36px 48px 48px; justify-self: center; }
      .actions { padding-inline: 48px; }
    }

    dialog { max-width: min(440px, calc(100vw - 32px)); padding: 24px; color: var(--ink); }
    dialog::backdrop { background: color-mix(in srgb, var(--ink) 40%, transparent); }
    dialog form { display: grid; gap: 14px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }

    .empty { display: grid; gap: 12px; }
    .row { display: flex; gap: 10px; }
  `,
})
export default class Quiz {
  protected readonly engine = inject(QuizEngine);
  private readonly router = inject(Router);
  protected readonly letters = LETTERS;
  protected readonly diff = DIFF;
  protected readonly countWord = COUNT_WORD;

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('finishDialog');
  private readonly top = viewChild<ElementRef<HTMLElement>>('top');
  private readonly explain = viewChild<ElementRef<HTMLElement>>('explain');

  protected readonly session = this.engine.session;
  protected readonly isExam = computed(() => this.session()?.mode === 'exam');
  protected readonly total = computed(() => this.session()?.questionIds.length ?? 0);
  protected readonly q = computed<Question | undefined>(() => {
    const s = this.session();
    return s ? this.engine.questions().find((x) => x.id === s.questionIds[s.current]) : undefined;
  });
  protected readonly selection = computed(() => {
    const s = this.session();
    const q = this.q();
    return (s && q && s.answers[q.id]) || [];
  });
  /** feedback after each answer: always in practice, optional in the exam */
  protected readonly instant = computed(() => {
    const s = this.session();
    return !!s && (s.mode !== 'exam' || !!s.feedback);
  });
  protected readonly checked = computed(() => {
    const s = this.session();
    const q = this.q();
    return !!s && !!q && this.instant() && s.checked.includes(q.id);
  });
  protected readonly complete = computed(() => {
    const q = this.q();
    return !!q && this.selection().length === q.correct.length;
  });
  protected readonly wasRight = computed(() => {
    const q = this.q();
    return !!q && isCorrect(q, this.selection());
  });
  protected readonly isMarked = computed(() => {
    const s = this.session();
    const q = this.q();
    return !!s && !!q && s.marked.includes(q.id);
  });
  protected readonly answeredCount = computed(() => {
    const s = this.session();
    if (!s) return 0;
    return s.mode === 'exam' ? s.questionIds.filter((id) => s.answers[id]?.length).length : s.checked.length;
  });
  protected readonly allDone = computed(() => this.answeredCount() === this.total());

  // ---- exam clock ----
  private readonly now = signal(Date.now());
  protected readonly remaining = computed(() => {
    const d = this.session()?.deadline;
    return d ? Math.max(0, Math.round((d - this.now()) / 1000)) : 0;
  });
  protected readonly clock = computed(() => {
    const r = this.remaining();
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    effect(() => {
      if (this.isExam() && this.remaining() === 0) this.finish();
    });

    // bring the new question into view when moving through the sheet
    effect(() => {
      this.session()?.current;
      queueMicrotask(() => {
        const el = this.top()?.nativeElement;
        if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: 0 });
      });
    });
  }

  protected check(q: Question): void {
    this.engine.check(q);
    // let the explanation render, then bring it into view above the sticky footer
    setTimeout(() => this.explain()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  protected topicName(id: string): string {
    return topicById(id)?.name ?? id;
  }

  protected correctLetters(q: Question): string {
    return q.correct.map((i) => LETTERS[i]).join(', ');
  }

  protected optionClass(q: Question, i: number): string {
    const sel = this.selection().includes(i);
    if (!this.checked()) return sel ? 'opt selected' : 'opt';
    if (q.correct.includes(i)) return 'opt right';
    if (sel) return 'opt wrong';
    return 'opt dim';
  }

  protected cellClass(id: string, i: number): string {
    const s = this.session()!;
    const c = ['cell'];
    if (i === s.current) c.push('current');
    if (s.marked.includes(id)) c.push('marked');
    if (this.instant() && s.checked.includes(id)) {
      const q = this.engine.questions().find((x) => x.id === id);
      c.push(q && isCorrect(q, s.answers[id]) ? 'right' : 'wrong');
    } else if (s.answers[id]?.length) c.push('answered');
    return c.join(' ');
  }

  protected cellLabel(id: string, i: number): string {
    const s = this.session()!;
    const parts = [`Domanda ${i + 1}`];
    if (s.answers[id]?.length) parts.push('risposta data');
    else parts.push('senza risposta');
    if (s.marked.includes(id)) parts.push('segnata per revisione');
    return parts.join(', ');
  }

  protected askFinish(): void {
    const s = this.session();
    if (!s) return;
    if (!this.isExam() && s.checked.length === s.questionIds.length) {
      this.finish();
      return;
    }
    this.dialog()?.nativeElement.showModal();
  }

  protected onDialogClose(): void {
    if (this.dialog()?.nativeElement.returnValue === 'confirm') this.finish();
  }

  protected readonly leaving = signal(false);

  private finish(): void {
    this.leaving.set(true);
    const id = this.engine.finish();
    this.router.navigate(id ? ['/risultati', id] : ['/']);
  }

  protected leave(): void {
    // the session stays saved: it can be resumed from the side rail
    this.router.navigate(['/']);
  }

  protected onKey(e: KeyboardEvent): void {
    const q = this.q();
    const s = this.session();
    if (!q || !s || e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.dialog()?.nativeElement.open) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;

    const key = e.key.toUpperCase();
    const idx = LETTERS.indexOf(key) >= 0 ? LETTERS.indexOf(key) : /^[1-6]$/.test(key) ? Number(key) - 1 : -1;
    if (idx >= 0 && idx < q.options.length && key.length === 1) {
      this.engine.select(q, idx);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      this.engine.go(s.current + 1);
    } else if (e.key === 'ArrowLeft') {
      this.engine.go(s.current - 1);
    } else if (e.key === 'Enter' && target.tagName !== 'BUTTON') {
      if (this.instant() && !this.checked()) {
        if (this.complete()) this.check(q);
      } else if (s.current < this.total() - 1) this.engine.go(s.current + 1);
      e.preventDefault();
    }
  }
}
