import { Component, computed, input } from '@angular/core';

interface Segment {
  code: boolean;
  text: string;
}

/** Renders plain text where `backticks` become inline code. No HTML is interpreted. */
@Component({
  selector: 'app-rich',
  template: `@for (s of segments(); track $index) {@if (s.code) {<code class="inline-code">{{ s.text }}</code>} @else {{{ s.text }}}}`,
  styles: `
    :host { white-space: pre-line; overflow-wrap: anywhere; }
  `,
})
export class RichText {
  readonly text = input.required<string>();
  protected readonly segments = computed<Segment[]>(() =>
    this.text()
      .split('`')
      .map((text, i) => ({ code: i % 2 === 1, text }))
      .filter((s) => s.text.length > 0),
  );
}
