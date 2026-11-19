import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopicStat } from '../core/models';
import { PASS_MARK } from '../core/topics';

/**
 * One column per topic, the exam pass mark drawn across all of them.
 * The question it answers: "which topics are still below the line?"
 */
@Component({
  selector: 'app-pass-line-chart',
  imports: [RouterLink],
  template: `
    <div class="chart" role="list" aria-label="Precisione per argomento rispetto alla soglia del 68%">
      <div class="plot">
        <span class="grid" [style.bottom]="at(100)"><i>100</i></span>
        <span class="grid" [style.bottom]="at(50)"><i>50</i></span>
        <span class="grid" [style.bottom]="at(0)"></span>
        <span class="pass" [style.bottom]="at(pass)"><i>{{ pass }}% soglia</i></span>
        @for (s of stats(); track s.topic.id) {
          <a
            class="col"
            role="listitem"
            [routerLink]="['/argomenti', s.topic.id]"
            [attr.aria-label]="label(s)"
            [title]="label(s)"
          >
            <span class="track">
              @if (s.accuracy !== null) {
                <span
                  class="bar"
                  [class.ok]="s.accuracy >= pass"
                  [class.thin]="s.seen < s.total / 2"
                  [style.height.%]="s.accuracy || 2"
                ></span>
              } @else {
                <span class="bar none"></span>
              }
            </span>
            <span class="name">{{ s.topic.short }}</span>
          </a>
        }
      </div>
    </div>
    <!-- narrow screens: same chart turned on its side, one row per topic -->
    <ul class="rows" aria-label="Precisione per argomento rispetto alla soglia del 68%">
      <li class="vpass" aria-hidden="true" [style.left]="'calc(var(--label) + (100% - var(--label)) * ' + pass / 100 + ')'"><i>{{ pass }}%</i></li>
      @for (s of stats(); track s.topic.id) {
        <li>
          <a [routerLink]="['/argomenti', s.topic.id]" [attr.aria-label]="label(s)">
            <span class="rname">{{ s.topic.short }}</span>
            <span class="rtrack">
              @if (s.accuracy !== null) {
                <span class="rbar" [class.ok]="s.accuracy >= pass" [class.thin]="s.seen < s.total / 2" [style.width.%]="s.accuracy || 2"></span>
              } @else {
                <span class="rbar none"></span>
              }
            </span>
          </a>
        </li>
      }
    </ul>
    <p class="legend">
      <span><b class="sw ok"></b>sopra soglia</span>
      <span><b class="sw ko"></b>sotto soglia</span>
      <span><b class="sw thin"></b>meno di metà domande viste</span>
      <span><b class="sw none"></b>mai provato</span>
    </p>
  `,
  styles: `
    .chart { overflow-x: auto; padding-top: 18px; }
    .plot {
      position: relative;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(18px, 1fr);
      gap: 6px;
      min-width: 440px;
      height: 260px;
      padding-left: 30px;
    }
    .grid, .pass {
      position: absolute; left: 30px; right: 0; height: 0;
      border-top: 1px solid var(--rule);
      pointer-events: none;
    }
    .grid i, .pass i {
      position: absolute; right: 100%; top: -7px; padding-right: 6px;
      font: 400 10px var(--font-display); font-style: normal; color: var(--ink-faint);
    }
    .pass { border-top: 1.5px dashed var(--ink); z-index: 2; }
    .pass i {
      left: 0; right: auto; top: -18px; padding: 0 4px;
      color: var(--ink); background: var(--paper-raised); font-weight: 600; white-space: nowrap;
    }
    .col {
      display: grid; grid-template-rows: 1fr 82px;
      text-decoration: none; min-width: 0;
      border-radius: 4px;
    }
    .track { position: relative; display: flex; align-items: flex-end; }
    .bar {
      width: 100%;
      background: var(--pen);
      border-radius: 3px 3px 0 0;
      transform-origin: bottom;
      animation: grow 0.6s cubic-bezier(.2,.8,.2,1) both;
    }
    .bar.ok { background: var(--pass); }
    .bar.thin { background-image: repeating-linear-gradient(135deg, transparent 0 3px, var(--paper-raised) 3px 5px); }
    .bar.none { height: 6px; background: none; border: 1px dashed var(--rule-strong); border-bottom: 0; animation: none; }
    .col:hover .bar { filter: brightness(1.1); }
    .col:hover .name { color: var(--ink); }
    .name {
      writing-mode: vertical-rl; transform: rotate(180deg);
      justify-self: center; padding-bottom: 6px;
      font: 400 10.5px var(--font-display); letter-spacing: -0.01em;
      color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      border-left: 1px solid var(--rule); width: 100%; text-align: right;
      display: flex; align-items: center; padding-top: 8px;
    }
    @keyframes grow { from { transform: scaleY(0); } }

    .rows { display: none; position: relative; list-style: none; margin: 18px 0 0; padding: 0; --label: 92px; }
    .rows a { display: grid; grid-template-columns: var(--label) 1fr; align-items: center; height: 24px; text-decoration: none; }
    .rname { font: 400 11px var(--font-display); color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
    .rtrack { height: 12px; border-left: 1px solid var(--rule-strong); display: flex; }
    .rbar { height: 100%; background: var(--pen); border-radius: 0 3px 3px 0; transform-origin: left; animation: grow-x .6s cubic-bezier(.2,.8,.2,1) both; }
    .rbar.ok { background: var(--pass); }
    .rbar.thin { background-image: repeating-linear-gradient(135deg, transparent 0 3px, var(--paper-raised) 3px 5px); }
    .rbar.none { width: 6px; border: 1px dashed var(--rule-strong); border-left: 0; background: none; animation: none; }
    .vpass {
      position: absolute; top: -16px; bottom: 0; width: 0; z-index: 1; pointer-events: none;
      border-left: 1.5px dashed var(--ink);
    }
    .vpass i { position: absolute; top: 0; left: 4px; font: 600 10px var(--font-display); font-style: normal; color: var(--ink); }
    @keyframes grow-x { from { transform: scaleX(0); } }
    @media (max-width: 640px) {
      .chart { display: none; }
      .rows { display: block; }
    }

    .legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 14px; font-size: 12.5px; color: var(--ink-soft); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .sw { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
    .sw.ok { background: var(--pass); }
    .sw.ko { background: var(--pen); }
    .sw.thin { background: repeating-linear-gradient(135deg, var(--ink-soft) 0 2px, transparent 2px 4px); }
    .sw.none { border: 1px dashed var(--rule-strong); }
  `,
})
export class PassLineChart {
  readonly stats = input.required<TopicStat[]>();
  protected readonly pass = PASS_MARK;

  /** vertical position inside the bar area (the bottom 82px hold the labels) */
  protected at(pct: number): string {
    return `calc(82px + (100% - 82px) * ${pct / 100})`;
  }

  protected label(s: TopicStat): string {
    if (s.accuracy === null) return `${s.topic.name}: mai provato, ${s.total} domande`;
    return `${s.topic.name}: ${s.accuracy}% corrette, ${s.seen} di ${s.total} domande viste`;
  }
}
