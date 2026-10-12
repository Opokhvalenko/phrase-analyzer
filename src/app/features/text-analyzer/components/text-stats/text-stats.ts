import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  countCharacters,
  countCharactersWithoutSpaces,
  countWords,
} from '../../../../shared/text/text-stats';
import { UI_TEXT } from '../../../../shared/ui-text';

@Component({
  selector: 'app-text-stats',
  templateUrl: './text-stats.html',
  styleUrl: './text-stats.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextStats {
  readonly text = input.required<string>();

  protected readonly labels = UI_TEXT.stats;
  protected readonly characters = computed(() => countCharacters(this.text()));
  protected readonly charactersWithoutSpaces = computed(() =>
    countCharactersWithoutSpaces(this.text()),
  );
  protected readonly words = computed(() => countWords(this.text()));
}
