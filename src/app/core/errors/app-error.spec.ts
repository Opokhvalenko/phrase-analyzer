import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { UI_TEXT } from '../../shared/ui-text';
import { isAppError, toAppError } from './app-error';

describe('toAppError', () => {
  it('should map status 0 (no network, CORS, DNS) to "network"', () => {
    expect(toAppError(new HttpErrorResponse({ status: 0 }))).toEqual({
      kind: 'network',
      message: UI_TEXT.errors.network,
    });
  });

  it('should map a timeout to "timeout"', () => {
    expect(toAppError(new TimeoutError()).kind).toBe('timeout');
  });

  it.each([500, 502, 503])('should map status %i to "server"', (status) => {
    expect(toAppError(new HttpErrorResponse({ status })).kind).toBe('server');
  });

  it.each([400, 404, 429])('should map status %i to "unknown"', (status) => {
    expect(toAppError(new HttpErrorResponse({ status })).kind).toBe('unknown');
  });

  it.each([
    new Error('boom'),
    'oops',
    null,
    undefined,
    42,
  ])('should map an unexpected value (%j) to "unknown"', (value) => {
    expect(toAppError(value)).toEqual({ kind: 'unknown', message: UI_TEXT.errors.unknown });
  });

  it('should return an AppError unchanged', () => {
    const error = { kind: 'timeout', message: UI_TEXT.errors.timeout } as const;
    expect(toAppError(error)).toBe(error);
  });
});

describe('isAppError', () => {
  it('should reject objects with an unknown kind', () => {
    expect(isAppError({ kind: 'teapot', message: 'x' })).toBe(false);
  });

  it.each([
    'toString',
    'constructor',
    'hasOwnProperty',
    '__proto__',
  ])('should reject a kind inherited from Object.prototype (%s)', (kind) => {
    expect(isAppError({ kind, message: 'x' })).toBe(false);
  });
});
