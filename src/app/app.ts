import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { QuestionBank } from './core/question-bank';
import { QuizEngine } from './core/quiz-engine';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip" href="#main">Vai al contenuto</a>
    <div class="shell" [class.focus-mode]="inQuiz()">
      <nav class="rail" aria-label="Navigazione principale">
        <a routerLink="/" class="brand">
          <img src="icon.webp" alt="" width="28" height="28" />
          <span>java<b>learner</b></span>
        </a>
        <p class="exam-code">OCP · 1Z0-829</p>
        <ul>
          @for (item of nav; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="on"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                ariaCurrentWhenActive="page"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
                <span>{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
        @if (engine.session(); as s) {
          <a class="resume" routerLink="/quiz">
            <span class="eyebrow">In corso</span>
            <span>{{ s.title }}</span>
            <span class="num">{{ s.current + 1 }} / {{ s.questionIds.length }}</span>
          </a>
        }
      </nav>

      <main id="main">
        @if (bank.loaded()) {
          <router-outlet />
        } @else {
          <p class="loading eyebrow">Carico le domande…</p>
        }
      </main>
    </div>
  `,
  styles: `
    .skip {
      position: absolute; left: -999px; top: 8px; z-index: 50;
      background: var(--ink); color: var(--paper); padding: 8px 12px; border-radius: 6px;
    }
    .skip:focus { left: 8px; }

    .shell { min-height: calc(100dvh - var(--safe-top)); }

    .rail {
      position: fixed; inset: auto 0 0 0; z-index: 20;
      background: var(--paper-raised);
      border-top: 1px solid var(--rule);
      padding-bottom: var(--safe-bottom);
    }
    .brand, .exam-code, .resume { display: none; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); }
    li a {
      display: grid; justify-items: center; gap: 3px;
      padding: 9px 2px 8px;
      font-size: 11.5px; font-weight: 500; text-decoration: none;
      color: var(--ink-soft);
    }
    li a.on { color: var(--ink); }
    li a.on svg { stroke: var(--ink); stroke-width: 2; }
    svg { width: 22px; height: 22px; fill: none; stroke: var(--ink-faint); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }

    .focus-mode .rail { display: none; }

    @media (min-width: 900px) {
      .shell { display: grid; grid-template-columns: 228px 1fr; }
      .focus-mode { grid-template-columns: 1fr; }
      .rail {
        position: sticky; top: 0; inset: auto; height: 100dvh;
        border-top: 0; border-right: 1px solid var(--rule);
        padding: 22px 14px; display: flex; flex-direction: column; gap: 4px;
      }
      .brand {
        display: flex; align-items: center; gap: 10px;
        text-decoration: none; padding: 0 8px;
        font: 400 15px var(--font-display); letter-spacing: -0.03em;
      }
      .brand img { border-radius: 7px; }
      .brand b { font-weight: 700; }
      .exam-code { display: block; padding: 2px 8px 18px 46px; font: 500 10.5px var(--font-display); letter-spacing: .06em; color: var(--ink-faint); }
      ul { grid-template-columns: 1fr; gap: 2px; }
      li a {
        display: flex; align-items: center; gap: 12px; justify-items: start;
        padding: 9px 10px; border-radius: 6px; font-size: 14.5px;
      }
      li a:hover { background: var(--paper-sunk); color: var(--ink); }
      li a.on { background: var(--paper-sunk); }
      svg { width: 19px; height: 19px; }
      .resume {
        display: grid; gap: 2px; margin-top: auto;
        padding: 12px; border: 1px solid var(--rule-strong); border-left: 4px solid var(--marker);
        border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;
      }
      .resume .num { font-size: 12px; color: var(--ink-soft); font-weight: 400; }
    }

    .loading { padding: 48px 24px; }
  `,
})
export class App {
  protected readonly bank = inject(QuestionBank);
  protected readonly engine = inject(QuizEngine);
  private readonly router = inject(Router);
  protected readonly inQuiz = signal(false);

  protected readonly nav: NavItem[] = [
    { path: '/', label: 'Panoramica', exact: true, icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { path: '/argomenti', label: 'Argomenti', icon: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h11' },
    { path: '/esercitati', label: 'Esercitati', icon: 'M9 6l-6 6 6 6M15 6l6 6-6 6' },
    { path: '/simulazione', label: 'Esame', icon: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
    { path: '/storico', label: 'Storico', icon: 'M4 6h16M4 12h16M4 18h10' },
  ];

  constructor() {
    this.bank.load();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.inQuiz.set(e.urlAfterRedirects.startsWith('/quiz')));
  }
}
