import { TestBed } from '@angular/core/testing';
import { ClipboardService, ClipboardUnavailableError } from './clipboard.service';

describe('ClipboardService', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  function mockClipboard(value: Partial<Clipboard> | undefined): void {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
  }

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('should write the text to the system clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard({ writeText });

    await TestBed.inject(ClipboardService).copy('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('should reject when the browser denies access', async () => {
    mockClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
    await expect(TestBed.inject(ClipboardService).copy('hello')).rejects.toThrow('NotAllowedError');
  });

  it('should reject with ClipboardUnavailableError when the Clipboard API is missing', async () => {
    mockClipboard(undefined);
    await expect(TestBed.inject(ClipboardService).copy('hello')).rejects.toBeInstanceOf(
      ClipboardUnavailableError,
    );
  });
});
