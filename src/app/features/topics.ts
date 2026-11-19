import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressStore } from '../core/progress-store';
import { AREAS, PASS_MARK } from '../core/topics';

@Component({
  imports: [RouterLink],
  template: `
    <div class="page">
      <header class="page-head">
        <p class="eyebrow">{{ totalQuestions() }} domande · {{ groups().length }} aree</p>
        <h1>Argomenti</h1>
        <p class="muted">Ordinati come nel corso. La tacca nera su ogni barra è la soglia del {{ pass }}%.</p>
      </header>

      @for (g of groups(); track g.id) {
        <section class="area" [attr.aria-labelledby]="'area-' + g.id">
          <h2 [id]="'area-' + g.id" class="eyebrow">{{ g.name }}</h2>
          <ul>
            @for (s of g.stats; track s.topic.id) {
              <li>
                <a [routerLink]="['/argomenti', s.topic.id]">
                  <span class="title">
                    <b>{{ s.topic.name }}</b>
                    <span class="chapter">{{ s.topic.chapter }}@if (!s.topic.inExam829) { · non nel 1Z0-829}</span>
                  </span>
                  <span class="meter" aria-hidden="true">
                    @if (s.accuracy !== null) {
                      <span [class.ok]="s.accuracy >= pass" [style.width.%]="s.accuracy"></span>
                    }
                    <i [style.left.%]="pass"></i>
                  </span>
                  <span class="nums">
                    <span class="num pct" [class.ok]="(s.accuracy ?? -1) >= pass" [class.ko]="s.accuracy !== null && s.accuracy < pass">
                      {{ s.accuracy === null ? '—' : s.accuracy + '%' }}
                    </span>
                    <span class="num seen">{{ s.seen }}/{{ s.total }}</span>
                  </span>
                </a>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    .area { margin-top: 28px; }
    .area h2 { margin-bottom: 8px; }
    ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
    li { border-bottom: 1px solid var(--rule); }
    a {
      display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'title nums' 'meter meter';
      gap: 8px 16px; align-items: center; padding: 14px 4px; text-decoration: none;
    }
    a:hover { background: var(--paper-raised); }
    a:hover b { text-decoration: underline; }
    .title { grid-area: title; display: grid; gap: 1px; }
    b { font-weight: 600; }
    .chapter { font: 400 11px var(--font-display); color: var(--ink-faint); letter-spacing: .02em; }
    .meter { grid-area: meter; position: relative; height: 6px; background: var(--paper-sunk); border-radius: 3px; }
    .meter span { display: block; height: 100%; border-radius: 3px; background: var(--pen); }
    .meter span.ok { background: var(--pass); }
    .meter i { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--ink); }
    .nums { grid-area: nums; display: flex; gap: 14px; align-items: baseline; }
    .pct { font-size: 15px; font-weight: 500; min-width: 4ch; text-align: right; }
    .seen { font-size: 12px; color: var(--ink-faint); min-width: 5ch; text-align: right; }
    .ok { color: var(--pass); }
    .ko { color: var(--pen); }
    @media (min-width: 720px) {
      a { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto; grid-template-areas: 'title meter nums'; padding: 12px 8px; }
    }
  `,
})
export default class Topics {
  private readonly store = inject(ProgressStore);
  protected readonly pass = PASS_MARK;
  protected readonly groups = computed(() => {
    const stats = this.store.topicStats().filter((s) => s.total > 0);
    return AREAS.map((a) => ({ ...a, stats: stats.filter((s) => s.topic.area === a.id) })).filter(
      (g) => g.stats.length,
    );
  });
  protected readonly totalQuestions = computed(() => this.store.overall().total);
}
