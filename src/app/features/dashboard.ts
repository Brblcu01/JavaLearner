import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressStore } from '../core/progress-store';
import { QuizEngine } from '../core/quiz-engine';
import { PASS_MARK } from '../core/topics';
import { PassLineChart } from '../shared/pass-line-chart';

const MODE_LABEL = { practice: 'Esercitazione', exam: 'Simulazione', mistakes: 'Ripasso errori' } as const;

@Component({
  imports: [PassLineChart, RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="page-head">
        <p class="eyebrow">OCP Java SE 17 Developer · 1Z0-829</p>
        @if (overall().seen === 0) {
          <h1>Nessuna risposta ancora.</h1>
          <p class="muted lead">
            Il grafico qui sotto si riempie mentre rispondi. Una simulazione completa ti dà subito la mappa di
            tutti gli argomenti; in alternativa parti dalle basi.
          </p>
          <div class="actions">
            <a class="btn" routerLink="/simulazione">Fai una simulazione</a>
            <a class="btn ghost" [routerLink]="['/argomenti', 'basics']">Parti dalle basi</a>
          </div>
        } @else {
          <h1>
            Sopra la soglia in <span class="hl">{{ above() }}</span> argomenti su {{ topicCount() }}
          </h1>
          <p class="muted lead">
            All'esame serve il {{ pass }}%.
            @if (below().length) { {{ below().length }} sotto la soglia }
            @if (below().length && untouched()) { · }
            @if (untouched()) { {{ untouched() }} mai provati }
            @if (!below().length && !untouched()) { Nessun argomento sotto la soglia: verifica con una simulazione. }
          </p>
        }
      </header>

      <section class="panel chart-panel" aria-labelledby="chart-title">
        <div class="panel-head">
          <h2 id="chart-title">Risposte corrette per argomento</h2>
          <p class="muted small">Ultima risposta data a ogni domanda. Tocca una colonna per aprire l'argomento.</p>
        </div>
        <app-pass-line-chart [stats]="stats()" />
      </section>

      <dl class="figures">
        <div>
          <dt>Domande viste</dt>
          <dd><span class="num big">{{ overall().seen }}</span><span class="num of">/ {{ overall().total }}</span></dd>
        </div>
        <div>
          <dt>Precisione</dt>
          <dd>
            <span class="num big" [class.ok]="(overall().accuracy ?? 0) >= pass">{{ overall().accuracy ?? '—' }}</span>
            @if (overall().accuracy !== null) {<span class="num of">%</span>}
          </dd>
        </div>
        <div>
          <dt>Simulazioni</dt>
          <dd>
            <span class="num big">{{ store.exams().length }}</span>
            @if (bestExam() !== null) {<span class="of">miglior {{ bestExam() }}%</span>}
          </dd>
        </div>
        <div>
          <dt>Giorni di fila</dt>
          <dd><span class="num big">{{ store.streak() }}</span></dd>
        </div>
      </dl>

      <div class="cols">
        <section class="panel block" aria-labelledby="weak-title">
          <h2 id="weak-title">Da ripassare</h2>
          @if (weakest().length) {
            <ul class="weak">
              @for (s of weakest(); track s.topic.id) {
                <li>
                  <a [routerLink]="['/argomenti', s.topic.id]">
                    <span>{{ s.topic.name }}</span>
                    <span class="num pct ko">{{ s.accuracy }}%</span>
                  </a>
                  <span class="meter"><span [style.width.%]="s.accuracy"></span><i [style.left.%]="pass"></i></span>
                </li>
              }
            </ul>
            <button class="btn" type="button" (click)="practiceWeak()">
              Esercitati su {{ weakest().length === 1 ? 'questo' : 'questi ' + weakest().length }}
            </button>
          } @else if (overall().seen) {
            <p class="muted">Tutti gli argomenti provati sono sopra il {{ pass }}%. Prova quelli mai visti o una simulazione.</p>
          } @else {
            <p class="muted">Qui compariranno gli argomenti sotto la soglia.</p>
          }
        </section>

        <section class="panel block" aria-labelledby="err-title">
          <h2 id="err-title">Errori aperti</h2>
          <p><span class="num big ko">{{ overall().wrong }}</span></p>
          <p class="muted">Domande la cui ultima risposta era sbagliata. Spariscono da qui quando le azzecchi.</p>
          <button class="btn ghost" type="button" [disabled]="!overall().wrong" (click)="practiceMistakes()">
            Ripassa gli errori
          </button>
        </section>
      </div>

      <section class="panel block" aria-labelledby="recent-title">
        <div class="row-head">
          <h2 id="recent-title">Ultime sessioni</h2>
          @if (store.sessions().length) {<a routerLink="/storico" class="link">Tutto lo storico</a>}
        </div>
        @if (recent().length) {
          <ul class="recent">
            @for (s of recent(); track s.id) {
              <li>
                <a [routerLink]="['/risultati', s.id]">
                  <span class="num score" [class.ok]="(s.score ?? 0) >= pass" [class.ko]="(s.score ?? 0) < pass">{{ s.score }}%</span>
                  <span class="what">
                    <b>{{ s.title }}</b>
                    <span class="muted">{{ modeLabel[s.mode] }} · {{ s.questionIds.length }} domande</span>
                  </span>
                  <span class="muted when">{{ s.finishedAt | date: 'd MMM, HH:mm' }}</span>
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">Nessuna sessione completata.</p>
        }
      </section>
    </div>
  `,
  styles: `
    .lead { font-size: 16.5px; max-width: 60ch; }
    .hl { box-shadow: inset 0 -0.38em 0 var(--marker-tint); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .small { font-size: 13px; }
    .chart-panel { padding: 20px 20px 16px; }
    .panel-head { display: grid; gap: 4px; }

    .figures {
      display: grid; grid-template-columns: repeat(2, 1fr);
      margin: 20px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
    }
    .figures > div { padding: 14px 0; }
    .figures > div:nth-child(odd) { padding-right: 12px; }
    .figures > div:nth-child(n+3) { border-top: 1px solid var(--rule); }
    @media (min-width: 720px) {
      .figures { grid-template-columns: repeat(4, 1fr); }
      .figures > div { padding: 16px 20px; border-left: 1px solid var(--rule); border-top: 0 !important; }
      .figures > div:first-child { border-left: 0; padding-left: 0; }
    }
    dt { font-size: 13px; color: var(--ink-soft); }
    dd { margin: 4px 0 0; display: flex; align-items: baseline; gap: 6px; }
    .big { font-size: 30px; font-weight: 500; letter-spacing: -0.04em; line-height: 1; }
    .of { font-size: 13px; color: var(--ink-soft); }
    .ok { color: var(--pass); }
    .ko { color: var(--pen); }

    .cols { display: grid; gap: 20px; margin-bottom: 20px; }
    @media (min-width: 820px) { .cols { grid-template-columns: 3fr 2fr; } }
    .block { padding: 20px; display: grid; gap: 14px; align-content: start; }
    .block .btn { justify-self: start; }

    .weak { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .weak a { display: flex; justify-content: space-between; gap: 12px; text-decoration: none; font-weight: 500; }
    .weak a:hover span:first-child { text-decoration: underline; }
    .pct { font-size: 13px; }
    .meter { position: relative; display: block; height: 6px; margin-top: 6px; background: var(--paper-sunk); border-radius: 3px; }
    .meter span { display: block; height: 100%; background: var(--pen); border-radius: 3px; }
    .meter i { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--ink); }

    .row-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .link { font-size: 14px; color: var(--ink-soft); }
    .recent { list-style: none; margin: 0; padding: 0; }
    .recent li + li { border-top: 1px solid var(--rule); }
    .recent a { display: grid; grid-template-columns: 56px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; text-decoration: none; }
    .recent a:hover b { text-decoration: underline; }
    .score { font-size: 17px; font-weight: 500; }
    .what { display: grid; font-size: 14px; }
    .what .muted { font-size: 13px; }
    .when { font-size: 13px; text-align: right; }
  `,
})
export default class Dashboard {
  protected readonly store = inject(ProgressStore);
  private readonly engine = inject(QuizEngine);
  private readonly router = inject(Router);
  protected readonly pass = PASS_MARK;
  protected readonly modeLabel = MODE_LABEL;

  protected readonly stats = computed(() => this.store.topicStats().filter((s) => s.total > 0));
  protected readonly overall = this.store.overall;
  protected readonly topicCount = computed(() => this.stats().length);
  protected readonly above = computed(() => this.stats().filter((s) => (s.accuracy ?? -1) >= PASS_MARK).length);
  protected readonly below = computed(() =>
    this.stats().filter((s) => s.accuracy !== null && s.accuracy < PASS_MARK),
  );
  protected readonly untouched = computed(() => this.stats().filter((s) => s.accuracy === null).length);
  protected readonly weakest = computed(() =>
    [...this.below()].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 3),
  );
  protected readonly bestExam = computed(() => {
    const e = this.store.exams();
    return e.length ? Math.max(...e.map((x) => x.score ?? 0)) : null;
  });
  protected readonly recent = computed(() => this.store.sessions().slice(0, 5));

  protected practiceWeak(): void {
    const ids = this.weakest().map((s) => s.topic.id);
    if (this.engine.startPractice({ topics: ids, count: 15, filter: 'all', title: 'Argomenti deboli' })) {
      this.router.navigate(['/quiz']);
    }
  }

  protected practiceMistakes(): void {
    const all = this.stats().map((s) => s.topic.id);
    if (
      this.engine.startPractice({ topics: all, count: 20, filter: 'wrong', title: 'Ripasso errori', mode: 'mistakes' })
    ) {
      this.router.navigate(['/quiz']);
    }
  }
}
