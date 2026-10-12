import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TextAnalyzerPage } from './features/text-analyzer/text-analyzer.page';
import { UI_TEXT } from './shared/ui-text';

@Component({
  selector: 'app-root',
  imports: [TextAnalyzerPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly text = UI_TEXT;
}
