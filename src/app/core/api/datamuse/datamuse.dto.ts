/** Raw item from `GET https://api.datamuse.com/words`. Never leaves the API layer. */
export interface DatamuseWordDto {
  readonly word: string;
  readonly score?: number;
  readonly tags?: readonly string[];
}
