import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Synonym } from '../../../../shared/models/synonym';
import { UI_TEXT } from '../../../../shared/ui-text';
import type { SynonymsState } from '../../text-analyzer.models';

@Component({
  selector: 'app-synonym-panel',
  templateUrl: './synonym-panel.html',
  styleUrl: './synonym-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SynonymPanel {
  readonly state = input.required<SynonymsState>();
  readonly pick = output<Synonym>();
  readonly retry = output<void>();

  protected readonly text = UI_TEXT.synonyms;
  /** Placeholder chip widths (px) shown while loading, so the layout does not jump. */
  protected readonly skeletonWidths = [72, 96, 64, 88, 80];

  protected readonly isLoading = computed(() => this.state().status === 'loading');

  /** One status line per state, announced politely by screen readers. */
  protected readonly statusMessage = computed(() => {
    const state = this.state();
    switch (state.status) {
      case 'idle':
        return this.text.idle;
      case 'loading':
        return this.text.loading(state.target.text);
      case 'error':
        return state.error.message;
      case 'success':
        return state.synonyms.length > 0
          ? this.text.found(state.synonyms.length, state.target.text)
          : this.text.empty(state.target.text);
    }
  });

  protected readonly synonyms = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.synonyms : [];
  });

  protected readonly replaceLabel = computed(() => {
    const state = this.state();
    return state.status === 'success' ? this.text.replaceWith(state.target.text) : '';
  });
}
