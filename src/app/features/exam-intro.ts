import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressStore } from '../core/progress-store';
import { QuestionBank } from '../core/question-bank';
import { QuizEngine } from '../core/quiz-engine';
import { EXAM_MINUTES, EXAM_QUESTIONS, PASS_MARK, TOPICS } from '../core/topics';

@Component({
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="page-head">
        <p class="eyebrow">@if (feedback()) {Formato d'esame, con correzione} @else {Condizioni dell'esame reale}</p>
        <h1>Simulazione 1Z0-829</h1>
      </header>

      <div class="layout">
        <section class="sheet panel" aria-label="Regole">
          <dl class="rules">
            <div><dt class="num">{{ questions }}</dt><dd>domande, estratte da tutti gli argomenti in proporzione</dd></div>
            <div><dt class="num">{{ minutes }}′</dt><dd>di tempo; allo scadere l'esame si chiude da solo</dd></div>
            <div><dt class="num">{{ pass }}%</dt><dd>per superarlo, cioè almeno {{ needed }} risposte giuste</dd></div>
          </dl>
          <ul class="notes">
            <li>Ogni domanda dice quante risposte scegliere. Vale solo se le azzecchi tutte.</li>
            @if (feedback()) {
              <li>Dopo ogni risposta premi <b>Verifica</b>: vedi subito se è giusta e perché. La risposta poi resta bloccata.</li>
            } @else {
              <li>Nessuna correzione durante la prova: risultati e spiegazioni alla fine, come all'esame vero.</li>
            }
            <li>Puoi <mark>segnare</mark> una domanda per rivederla e saltare avanti e indietro.</li>
            <li>Sicurezza (corso Java 11) è esclusa: non è negli obiettivi del 1Z0-829.</li>
          </ul>
          <label class="toggle">
            <input type="checkbox" [checked]="feedback()" (change)="setFeedback($any($event.target).checked)" />
            <span class="track" aria-hidden="true"></span>
            <span>
              <b>Correzione dopo ogni risposta</b>
              <small>Disattivala per provare le condizioni reali dell'esame.</small>
            </span>
          </label>
          <button class="btn" type="button" [disabled]="!enough()" (click)="start()">Inizia la simulazione</button>
          @if (!enough()) {
            <p class="muted">Servono almeno {{ questions }} domande nella banca, ora ce ne sono {{ available() }}.</p>
          }
        </section>

        <section aria-labelledby="past">
          <h2 id="past">Simulazioni precedenti</h2>
          @if (exams().length) {
            <ul class="past">
              @for (e of exams(); track e.id) {
                <li>
                  <a [routerLink]="['/risultati', e.id]">
                    <span class="num score" [class.ok]="(e.score ?? 0) >= pass" [class.ko]="(e.score ?? 0) < pass">{{ e.score }}%</span>
                    <span>{{ (e.score ?? 0) >= pass ? 'Superato' : 'Non superato' }}</span>
                    <span class="muted">{{ e.finishedAt | date: 'd MMM yyyy' }}</span>
                  </a>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">Ancora nessuna. La prima ti dice da dove partire.</p>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .layout { display: grid; gap: 36px; }
    @media (min-width: 900px) { .layout { grid-template-columns: 3fr 2fr; align-items: start; } }
    .sheet { padding: 24px; display: grid; gap: 22px; justify-items: start; }
    .rules { margin: 0; display: grid; gap: 0; width: 100%; border-top: 1px solid var(--rule); }
    .rules > div { display: grid; grid-template-columns: 96px 1fr; align-items: baseline; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
    .rules dt { font-size: 28px; font-weight: 500; letter-spacing: -0.04em; }
    .rules dd { margin: 0; color: var(--ink-soft); }
    .notes { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
    .toggle { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; cursor: pointer; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 6px; width: 100%; }
    .toggle input { position: absolute; opacity: 0; pointer-events: none; }
    .toggle .track { position: relative; width: 38px; height: 22px; border-radius: 11px; background: var(--rule-strong); transition: background .15s ease; }
    .toggle .track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--paper-raised); transition: transform .15s ease; }
    .toggle input:checked + .track { background: var(--pass); }
    .toggle input:checked + .track::after { transform: translateX(16px); }
    .toggle input:focus-visible + .track { outline: 2px solid var(--focus); outline-offset: 2px; }
    .toggle small { display: block; font-size: 13px; color: var(--ink-soft); }
    mark { background: var(--marker-tint); color: inherit; padding: 0 3px; border-bottom: 2px solid var(--marker); }
    h2 { margin-bottom: 12px; }
    .past { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
    .past li { border-bottom: 1px solid var(--rule); }
    .past a { display: grid; grid-template-columns: 60px 1fr auto; gap: 12px; padding: 11px 0; text-decoration: none; align-items: baseline; }
    .past a:hover span:nth-child(2) { text-decoration: underline; }
    .score { font-size: 17px; font-weight: 500; }
    .ok { color: var(--pass); }
    .ko { color: var(--pen); }
  `,
})
export default class ExamIntro {
  private readonly engine = inject(QuizEngine);
  private readonly store = inject(ProgressStore);
  private readonly bank = inject(QuestionBank);
  private readonly router = inject(Router);
  protected readonly questions = EXAM_QUESTIONS;
  protected readonly minutes = EXAM_MINUTES;
  protected readonly pass = PASS_MARK;
  protected readonly needed = Math.ceil((EXAM_QUESTIONS * PASS_MARK) / 100);
  protected readonly exams = computed(() => [...this.store.exams()].reverse());
  protected readonly available = computed(() => {
    const ids = new Set(TOPICS.filter((t) => t.inExam829).map((t) => t.id));
    return this.bank.questions().filter((q) => ids.has(q.topic)).length;
  });
  protected readonly enough = computed(() => this.available() >= EXAM_QUESTIONS);

  protected readonly feedback = signal(this.readFeedback());

  private readFeedback(): boolean {
    try {
      return localStorage.getItem('jl.examFeedback') !== 'off';
    } catch {
      return true;
    }
  }

  protected setFeedback(on: boolean): void {
    this.feedback.set(on);
    try {
      localStorage.setItem('jl.examFeedback', on ? 'on' : 'off');
    } catch {
      /* preference lasts for this visit only */
    }
  }

  protected start(): void {
    if (this.engine.startExam(this.feedback())) this.router.navigate(['/quiz']);
  }
}
