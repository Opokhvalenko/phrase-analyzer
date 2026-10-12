import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TextAnalyzerPage } from './features/text-analyzer/text-analyzer.page';
import { UI_TEXT } from './shared/ui-text';

export const DATAMUSE_HOME_URL = 'https://www.datamuse.com/api/';
export const SOURCE_CODE_URL = 'https://github.com/Opokhvalenko/phrase-analyzer';

@Component({
  selector: 'app-root',
  imports: [TextAnalyzerPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly text = UI_TEXT;
  protected readonly datamuseUrl = DATAMUSE_HOME_URL;
  protected readonly sourceCodeUrl = SOURCE_CODE_URL;
}
