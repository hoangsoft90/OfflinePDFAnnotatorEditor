/**
 * A saved signature asset (sensitive — kept in the dedicated signatures/
 * directory, separate from the general thumbnail policy, per ADR-006).
 */
export interface Signature {
  id: string;
  /** Relative path inside the signatures dir, e.g. 'sig-abc.png' */
  imagePath: string;
  /** Absolute file URI of the PNG */
  uri: string;
  createdAt: string; // ISO 8601
}
