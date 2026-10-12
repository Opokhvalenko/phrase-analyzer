import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UI_TEXT } from './shared/ui-text';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly text = UI_TEXT;
}
