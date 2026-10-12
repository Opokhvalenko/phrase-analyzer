import { TestBed } from '@angular/core/testing';
import { App, DATAMUSE_HOME_URL, SOURCE_CODE_URL } from './app';
import { UI_TEXT } from './shared/ui-text';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the app title as the only h1', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const headings = compiled.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toContain(UI_TEXT.appTitle);
  });

  it('should render the analyzer page inside main', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main app-text-analyzer-page')).not.toBeNull();
  });

  it('should credit Datamuse and link to the source code in the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('footer a'));
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      [UI_TEXT.footer.datamuse, DATAMUSE_HOME_URL],
      [UI_TEXT.footer.sourceCode, SOURCE_CODE_URL],
    ]);
  });
});
