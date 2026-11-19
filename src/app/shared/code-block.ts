import { Component, computed, input } from '@angular/core';

type Kind = 'kw' | 'str' | 'com' | 'lit' | 'ann' | 'type' | 'txt';
interface Token {
  k: Kind;
  t: string;
}

const KEYWORDS = new Set(
  (
    'abstract assert boolean break byte case catch char class const continue default do double else enum ' +
    'exports extends final finally float for goto if implements import instanceof int interface long module ' +
    'native new non-sealed open opens package permits private protected provides public record requires return ' +
    'sealed short static strictfp super switch synchronized this throw throws to transient transitive try uses ' +
    'var void volatile while with yield true false null'
  ).split(' '),
);

const TOKEN_RE =
  /("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(@[A-Za-z_]\w*)|(\b\d[\d_]*(?:\.\d+)?[lLfFdD]?\b|\b0[xX][\da-fA-F_]+\b)|(\bnon-sealed\b|\b[A-Za-z_$][\w$]*\b)/g;

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ k: 'txt', t: src.slice(last, i) });
    const [whole, str, com, ann, num, word] = m;
    let k: Kind = 'txt';
    if (str) k = 'str';
    else if (com) k = 'com';
    else if (ann) k = 'ann';
    else if (num) k = 'lit';
    else if (word) k = KEYWORDS.has(word) ? 'kw' : /^[A-Z]/.test(word) ? 'type' : 'txt';
    out.push({ k, t: whole });
    last = i + whole.length;
  }
  if (last < src.length) out.push({ k: 'txt', t: src.slice(last) });
  return out;
}

/** Split tokens into lines so line numbers can be rendered like the exam's code exhibits. */
function toLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const tok of tokens) {
    const parts = tok.t.split('\n');
    parts.forEach((p, i) => {
      if (i > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ k: tok.k, t: p });
    });
  }
  return lines;
}

@Component({
  selector: 'app-code',
  template: `
    <pre class="code" [attr.aria-label]="'Codice Java, ' + lines().length + ' righe'"><code>@for (line of lines(); track $index) {<span class="ln" aria-hidden="true">{{ $index + 1 }}</span><span class="line">@for (tok of line; track $index) {<span [class]="tok.k">{{ tok.t }}</span>}</span>
}</code></pre>
  `,
  styles: `
    .code {
      margin: 0;
      padding: 14px 0;
      background: var(--code-bg);
      border: 1px solid var(--rule);
      border-radius: 6px;
      overflow-x: auto;
      font: 400 13.5px/1.6 var(--font-code);
      color: var(--code-ink);
      tab-size: 4;
      font-variant-ligatures: none;
    }
    code { display: grid; grid-template-columns: auto 1fr; }
    .ln {
      padding: 0 12px 0 14px;
      text-align: right;
      color: var(--ink-faint);
      user-select: none;
      border-right: 1px solid var(--rule);
      margin-right: 14px;
    }
    .line { white-space: pre; padding-right: 16px; }
    @media (max-width: 600px) { .code { font-size: 12.5px; } .ln { padding: 0 8px 0 10px; margin-right: 10px; } }
    .kw { color: var(--code-kw); font-weight: 500; }
    .str { color: var(--code-str); }
    .com { color: var(--ink-faint); font-style: italic; }
    .lit { color: var(--code-num); }
    .ann { color: var(--code-ann); }
    .type { color: var(--code-type); }
  `,
})
export class CodeBlock {
  readonly source = input.required<string>();
  protected readonly lines = computed(() => toLines(tokenize(this.source().replace(/\s+$/, ''))));
}
