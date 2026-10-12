import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { UI_TEXT } from '../../shared/ui-text';

export type AppErrorKind = 'network' | 'timeout' | 'server' | 'unknown';

/** An error that is safe to show to the user: a known kind and a human message. */
export interface AppError {
  readonly kind: AppErrorKind;
  readonly message: string;
}

const SERVER_ERROR_MIN_STATUS = 500;

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    'message' in error &&
    typeof error.kind === 'string' &&
    error.kind in UI_TEXT.errors &&
    typeof error.message === 'string'
  );
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  return createAppError(getErrorKind(error));
}

function getErrorKind(error: unknown): AppErrorKind {
  if (error instanceof TimeoutError) {
    return 'timeout';
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'network';
    }
    if (error.status >= SERVER_ERROR_MIN_STATUS) {
      return 'server';
    }
  }
  return 'unknown';
}

function createAppError(kind: AppErrorKind): AppError {
  return { kind, message: UI_TEXT.errors[kind] };
}
