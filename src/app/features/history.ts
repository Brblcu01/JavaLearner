import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgressStore, dayKey } from '../core/progress-store';
import { PASS_MARK } from '../core/topics';

const MODE_LABEL = { practice: 'Esercitazione', exam: 'Simulazione', mistakes: 'Ripasso errori' } as const;
const WEEKS = 18;

@Component({
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <header class="page-head">
        <p class="eyebrow">{{ store.sessions().length }} sessioni · {{ store.overall().attempts }} risposte date</p>
        <h1>Storico</h1>
      </header>

      <section class="block" aria-labelledby="trend">
        <h2 id="trend">Simulazioni nel tempo</h2>
        @if (examPoints().length) {
          <svg class="trend" [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img"
               [attr.aria-label]="'Punteggi delle simulazioni: ' + examLabel()">
            @for (g of [0, 50, 100]; track g) {
              <line [attr.x1]="padL" [attr.x2]="W - 8" [attr.y1]="y(g)" [attr.y2]="y(g)" class="grid" />
              <text [attr.x]="padL - 8" [attr.y]="y(g) + 4" class="axis" text-anchor="end">{{ g }}</text>
            }
            <line [attr.x1]="padL" [attr.x2]="W - 8" [attr.y1]="y(pass)" [attr.y2]="y(pass)" class="pass" />
            <text [attr.x]="W - 8" [attr.y]="y(pass) - 6" class="pass-label" text-anchor="end">soglia {{ pass }}%</text>
            @if (examPoints().length > 1) {
              <polyline [attr.points]="polyline()" class="line" />
            }
            @for (p of examPoints(); track p.id) {
              <g role="link" tabindex="0" [attr.aria-label]="'Simulazione ' + p.score + '%'" (click)="open(p.id)" (keydown.enter)="open(p.id)">
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" [class.ok]="p.score >= pass" class="dot">
                  <title>{{ p.score }}% · {{ p.date | date: 'd MMM' }}</title>
                </circle>
              </g>
            }
          </svg>
        } @else {
          <p class="muted">Nessuna simulazione completata. <a routerLink="/simulazione">Falla adesso</a>: ti dà la misura più vicina all'esame vero.</p>
        }
      </section>

      <section class="block" aria-labelledby="activity">
        <h2 id="activity">Attività</h2>
        <p class="muted small">Risposte date al giorno, ultime {{ weeks }} settimane.</p>
        <div class="heat" role="img" [attr.aria-label]="'Giorni di studio nelle ultime ' + weeks + ' settimane: ' + activeDays()">
          @for (d of heat(); track d.key) {
            <span [class]="'c l' + d.level" [title]="d.label"></span>
          }
        </div>
      </section>

      <section class="block" aria-labelledby="all">
        <h2 id="all">Tutte le sessioni</h2>
        @if (store.sessions().length) {
          <table>
            <thead><tr><th scope="col">Data</th><th scope="col">Sessione</th><th scope="col" class="r">Domande</th><th scope="col" class="r">Punteggio</th></tr></thead>
            <tbody>
              @for (s of store.sessions(); track s.id) {
                <tr>
                  <td class="num d">{{ s.finishedAt | date: 'dd/MM/yy HH:mm' }}</td>
                  <td><a [routerLink]="['/risultati', s.id]">{{ s.title }}</a> <span class="muted mode">{{ modeLabel[s.mode] }}</span></td>
                  <td class="r num">{{ s.questionIds.length }}</td>
                  <td class="r num" [class.ok]="(s.score ?? 0) >= pass" [class.ko]="(s.score ?? 0) < pass">{{ s.score }}%</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="muted">Le sessioni completate compaiono qui.</p>
        }
      </section>

      <section class="block settings" aria-labelledby="settings">
        <h2 id="settings">Impostazioni e dati</h2>
        <div class="setting">
          <div><b>Tema</b><p class="muted">Segue il sistema finché non scegli.</p></div>
          <div class="seg">
            @for (t of themes; track t.id) {
              <button type="button" [class.on]="theme() === t.id" [attr.aria-pressed]="theme() === t.id" (click)="setTheme(t.id)">{{ t.label }}</button>
            }
          </div>
        </div>
        <div class="setting">
          <div><b>Backup dei progressi</b><p class="muted">I dati restano in questo browser. Esportali per spostarli su un altro dispositivo.</p></div>
          <div class="row">
            <button class="btn ghost small" type="button" (click)="exportData()">Esporta</button>
            <label class="btn ghost small">Importa<input type="file" accept="application/json" (change)="importData($event)" hidden /></label>
          </div>
        </div>
        @if (message()) { <p class="msg" role="status">{{ message() }}</p> }
        <div class="setting">
          <div><b>Azzera tutto</b><p class="muted">Cancella risposte, sessioni e statistiche. Non si può annullare.</p></div>
          <button class="btn danger small" type="button" (click)="reset()">Azzera i progressi</button>
        </div>
      </section>
    </div>
  `,
  styles: `
    .block { margin-top: 36px; }
    h2 { margin-bottom: 12px; }
    .small { font-size: 13.5px; margin: -6px 0 12px; }
    .trend { width: 100%; height: auto; max-width: 760px; display: block; overflow: visible; }
    .grid { stroke: var(--rule); }
    .axis { font: 400 10px var(--font-display); fill: var(--ink-faint); }
    .pass { stroke: var(--ink); stroke-width: 1.5; stroke-dasharray: 5 4; }
    .pass-label { font: 600 10.5px var(--font-display); fill: var(--ink); }
    .line { fill: none; stroke: var(--ink-soft); stroke-width: 1.5; }
    .dot { fill: var(--pen); stroke: var(--paper); stroke-width: 2; cursor: pointer; }
    .dot.ok { fill: var(--pass); }

    .heat { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 13px); grid-auto-columns: 13px; justify-content: start; gap: 3px; overflow-x: auto; padding-bottom: 4px; }
    .c { width: 13px; height: 13px; border-radius: 2px; background: var(--paper-sunk); border: 1px solid var(--rule); }
    .c.l1 { background: color-mix(in srgb, var(--pass) 30%, var(--paper)); border-color: transparent; }
    .c.l2 { background: color-mix(in srgb, var(--pass) 55%, var(--paper)); border-color: transparent; }
    .c.l3 { background: color-mix(in srgb, var(--pass) 80%, var(--paper)); border-color: transparent; }
    .c.l4 { background: var(--pass); border-color: transparent; }
    .c.future { visibility: hidden; }

    table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
    th, td { padding: 9px 8px 9px 0; border-bottom: 1px solid var(--rule); text-align: left; font-weight: 400; }
    thead th { font: 500 11px var(--font-display); text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); }
    .r { text-align: right; padding-right: 0; }
    .d { font-size: 12px; color: var(--ink-soft); white-space: nowrap; }
    td a { text-decoration: none; font-weight: 500; }
    td a:hover { text-decoration: underline; }
    .mode { font-size: 12.5px; margin-left: 6px; }
    @media (max-width: 600px) { .mode { display: block; margin: 0; } }
    .ok { color: var(--pass); }
    .ko { color: var(--pen); }

    .settings { scroll-margin-top: var(--safe-top); border-top: 1px solid var(--rule); padding-top: 28px; }
    .setting { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px 24px; padding: 14px 0; border-bottom: 1px solid var(--rule); }
    .setting p { font-size: 13.5px; }
    .row { display: flex; gap: 8px; }
    .seg { display: inline-flex; border: 1px solid var(--rule-strong); border-radius: 6px; overflow: hidden; }
    .seg button { padding: 8px 14px; border: 0; border-left: 1px solid var(--rule-strong); background: var(--paper-raised); cursor: pointer; font-size: 13.5px; }
    .seg button:first-child { border-left: 0; }
    .seg button.on { background: var(--ink); color: var(--paper); }
    .msg { padding: 10px 0; font-size: 14px; }
  `,
})
export default class History {
  protected readonly store = inject(ProgressStore);
  private readonly router = inject(Router);
  protected readonly pass = PASS_MARK;
  protected readonly modeLabel = MODE_LABEL;
  protected readonly weeks = WEEKS;
  protected readonly W = 720;
  protected readonly H = 220;
  protected readonly padL = 34;
  protected readonly message = signal('');

  protected readonly themes = [
    { id: 'system', label: 'Sistema' },
    { id: 'light', label: 'Chiaro' },
    { id: 'dark', label: 'Scuro' },
  ];
  protected readonly theme = signal(this.readTheme());

  protected y(v: number): number {
    return 14 + (1 - v / 100) * (this.H - 34);
  }

  protected readonly examPoints = computed(() => {
    const ex = this.store.exams();
    const n = ex.length;
    const span = this.W - 8 - this.padL - 16;
    return ex.map((e, i) => ({
      id: e.id,
      score: e.score ?? 0,
      date: e.finishedAt ?? e.startedAt,
      x: this.padL + 16 + (n === 1 ? span / 2 : (i / (n - 1)) * span),
      y: this.y(e.score ?? 0),
    }));
  });
  protected readonly polyline = computed(() => this.examPoints().map((p) => `${p.x},${p.y}`).join(' '));
  protected readonly examLabel = computed(() => this.examPoints().map((p) => p.score + '%').join(', '));

  protected readonly heat = computed(() => {
    const days = this.store.days();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    // start on the Monday WEEKS-1 weeks ago so columns are whole weeks
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
    const cells: { key: string; level: number | string; label: string }[] = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d.getTime());
      if (d > today) {
        cells.push({ key, level: ' future', label: '' });
        continue;
      }
      const n = days[key] ?? 0;
      const level = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4;
      cells.push({ key, level, label: `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}: ${n} risposte` });
    }
    return cells;
  });
  protected readonly activeDays = computed(() => Object.keys(this.store.days()).length + ' giorni attivi in totale');

  protected open(id: string): void {
    this.router.navigate(['/risultati', id]);
  }

  private readTheme(): string {
    try {
      return localStorage.getItem('jl.theme') ?? 'system';
    } catch {
      return 'system';
    }
  }

  protected setTheme(id: string): void {
    this.theme.set(id);
    try {
      if (id === 'system') localStorage.removeItem('jl.theme');
      else localStorage.setItem('jl.theme', id);
    } catch {
      /* preference lasts for this visit only */
    }
    if (id === 'system') delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = id;
  }

  protected exportData(): void {
    const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `javalearner-progressi-${dayKey(Date.now())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.message.set('Progressi esportati.');
  }

  protected async importData(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.store.importJson(await file.text());
      this.message.set('Progressi importati.');
    } catch (err) {
      this.message.set(err instanceof Error && err.message.includes('JavaLearner') ? err.message : 'File non valido: scegli un export di JavaLearner.');
    }
    (e.target as HTMLInputElement).value = '';
  }

  protected reset(): void {
    if (confirm('Cancellare tutti i progressi? Non si può annullare.')) {
      this.store.resetAll();
      this.message.set('Progressi azzerati.');
    }
  }
}
