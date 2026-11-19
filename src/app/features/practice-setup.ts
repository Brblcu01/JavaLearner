import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressStore } from '../core/progress-store';
import { PoolFilter, QuizEngine } from '../core/quiz-engine';
import { AREAS, PASS_MARK } from '../core/topics';

@Component({
  template: `
    <div class="page">
      <header class="page-head">
        <p class="eyebrow">Correzione dopo ogni risposta</p>
        <h1>Esercitati</h1>
        <p class="muted">Scegli argomenti e quantità. Vedi subito se hai risposto bene e perché.</p>
      </header>

      <form (submit)="$event.preventDefault(); start()">
        <fieldset>
          <legend><h2>Argomenti</h2></legend>
          <div class="quick">
            <button type="button" class="btn ghost small" (click)="selectAll()">Tutti</button>
            <button type="button" class="btn ghost small" (click)="selectBelow()">Sotto il {{ pass }}%</button>
            <button type="button" class="btn ghost small" (click)="selected.set([])">Nessuno</button>
          </div>
          @for (g of groups(); track g.id) {
            <p class="eyebrow area">{{ g.name }}</p>
            <div class="chips">
              @for (s of g.stats; track s.topic.id) {
                <label class="chip" [class.on]="selected().includes(s.topic.id)">
                  <input type="checkbox" [checked]="selected().includes(s.topic.id)" (change)="toggle(s.topic.id)" />
                  <span>{{ s.topic.name }}</span>
                  @if (s.accuracy !== null) {
                    <span class="num pct" [class.ko]="s.accuracy < pass">{{ s.accuracy }}%</span>
                  }
                </label>
              }
            </div>
          }
        </fieldset>

        <fieldset>
          <legend><h2>Quali domande</h2></legend>
          <div class="seg" role="radiogroup">
            @for (f of filters; track f.id) {
              <label [class.on]="filter() === f.id">
                <input type="radio" name="filter" [checked]="filter() === f.id" (change)="filter.set(f.id)" />
                {{ f.label }}
              </label>
            }
          </div>
        </fieldset>

        <fieldset>
          <legend><h2>Quante</h2></legend>
          <div class="seg" role="radiogroup">
            @for (n of counts; track n) {
              <label [class.on]="count() === n">
                <input type="radio" name="count" [checked]="count() === n" (change)="count.set(n)" />
                <span class="num">{{ n }}</span>
              </label>
            }
          </div>
        </fieldset>

        <div class="go">
          <p class="muted" aria-live="polite">
            @if (!selected().length) {
              Seleziona almeno un argomento.
            } @else if (!poolSize()) {
              Nessuna domanda con questo filtro negli argomenti scelti.
            } @else {
              <span class="num">{{ actual() }}</span> domande da {{ poolSize() }} disponibili.
            }
          </p>
          <button class="btn" type="submit" [disabled]="!poolSize()">Inizia</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    fieldset { border: 0; padding: 0; margin: 0 0 30px; min-width: 0; }
    legend { padding: 0; margin-bottom: 12px; }
    .quick { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .area { margin: 16px 0 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 12px; border: 1px solid var(--rule-strong); border-radius: 999px;
      font-size: 14px; cursor: pointer; user-select: none; background: var(--paper-raised);
    }
    .chip:hover { border-color: var(--ink-soft); }
    .chip.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .chip:has(input:focus-visible), .seg label:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
    input { position: absolute; opacity: 0; pointer-events: none; }
    .pct { font-size: 11px; opacity: .75; }
    .pct.ko { color: var(--pen); opacity: 1; }
    .chip.on .pct.ko { color: color-mix(in srgb, var(--pen) 60%, var(--paper)); }
    .seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--rule-strong); border-radius: 6px; overflow: hidden; }
    .seg label { padding: 10px 16px; cursor: pointer; font-size: 14.5px; border-left: 1px solid var(--rule-strong); background: var(--paper-raised); }
    .seg label:first-child { border-left: 0; }
    .seg label.on { background: var(--ink); color: var(--paper); }
    .go {
      position: sticky; bottom: calc(72px + var(--safe-bottom)); display: flex; justify-content: space-between; align-items: center; gap: 16px;
      padding: 14px 16px; background: var(--paper-raised); border: 1px solid var(--rule); border-radius: var(--radius);
    }
    @media (min-width: 900px) { .go { bottom: 16px; } }
  `,
})
export default class PracticeSetup {
  private readonly store = inject(ProgressStore);
  private readonly engine = inject(QuizEngine);
  private readonly router = inject(Router);
  protected readonly pass = PASS_MARK;
  protected readonly counts = [10, 20, 30, 50];
  protected readonly filters: { id: PoolFilter; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'unseen', label: 'Mai viste' },
    { id: 'wrong', label: 'Sbagliate' },
  ];

  protected readonly stats = computed(() => this.store.topicStats().filter((s) => s.total > 0));
  protected readonly groups = computed(() =>
    AREAS.map((a) => ({ ...a, stats: this.stats().filter((s) => s.topic.area === a.id) })).filter((g) => g.stats.length),
  );
  protected readonly selected = signal<string[]>([]);
  protected readonly filter = signal<PoolFilter>('all');
  protected readonly count = signal(20);
  protected readonly poolSize = computed(() =>
    this.selected().length ? this.engine.pool(this.selected(), this.filter()).length : 0,
  );
  protected readonly actual = computed(() => Math.min(this.count(), this.poolSize()));

  protected toggle(id: string): void {
    this.selected.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  protected selectAll(): void {
    this.selected.set(this.stats().map((s) => s.topic.id));
  }
  protected selectBelow(): void {
    this.selected.set(this.stats().filter((s) => s.accuracy !== null && s.accuracy < PASS_MARK).map((s) => s.topic.id));
  }

  protected start(): void {
    const n = this.selected().length;
    const title = n === 1 ? (this.stats().find((s) => s.topic.id === this.selected()[0])?.topic.name ?? '') : `${n} argomenti`;
    const ok = this.engine.startPractice({
      topics: this.selected(),
      count: this.count(),
      filter: this.filter(),
      title,
      mode: this.filter() === 'wrong' ? 'mistakes' : 'practice',
    });
    if (ok) this.router.navigate(['/quiz']);
  }
}
