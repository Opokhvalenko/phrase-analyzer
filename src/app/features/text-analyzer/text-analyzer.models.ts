import type { AppError } from '../../core/errors/app-error';
import type { Synonym } from '../../shared/models/synonym';
import type { TextSelection } from '../../shared/text/selection';

/**
 * `target` is the selection captured when the lookup started.
 * A synonym always replaces this target, even if the user selects something else afterwards.
 */
export type SynonymsState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly target: TextSelection }
  | {
      readonly status: 'success';
      readonly target: TextSelection;
      readonly synonyms: readonly Synonym[];
    }
  | { readonly status: 'error'; readonly target: TextSelection; readonly error: AppError };

export interface UndoSnapshot {
  readonly text: string;
  readonly selection: TextSelection;
}
