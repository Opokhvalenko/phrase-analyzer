import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export class ClipboardUnavailableError extends Error {
  constructor() {
    super('Clipboard API is not available');
    this.name = 'ClipboardUnavailableError';
  }
}

/** Thin wrapper over the async Clipboard API, so components can be tested with a mock. */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly document = inject(DOCUMENT);

  async copy(text: string): Promise<void> {
    const clipboard = this.document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      throw new ClipboardUnavailableError();
    }
    await clipboard.writeText(text);
  }
}
