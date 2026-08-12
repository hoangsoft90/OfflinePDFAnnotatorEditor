/**
 * In-app guidance — shared types (in-app-guidance change).
 */

/** Per-feature lifecycle status. */
export type GuidanceStatus = 'unseen' | 'shown' | 'dismissed' | 'completed';

/** Transition / event recorded on a feature. */
export type GuidanceMark =
  | 'shown'
  | 'dismissed'
  | 'completed'
  | 'used'
  | 'helper_opened'
  | 'helper_action';

/** Persisted per-feature state (counters + timestamps, privacy-first ADR-006). */
export interface FeatureGuidanceState {
  status: GuidanceStatus;
  shownCount: number;
  dismissedCount: number;
  completedCount: number;
  /** Times the user actually used the guided feature. */
  usageCount: number;
  helperOpenedCount: number;
  helperActionCount: number;
  shownAt?: number;
  dismissedAt?: number;
  completedAt?: number;
}

export interface GuidanceStateFile {
  version: 1;
  features: Record<string, FeatureGuidanceState>;
}

/** Locally computed effectiveness metrics (tracking spec). */
export interface GuidanceMetrics {
  feature: string;
  shown: number;
  skipped: number;
  completed: number;
  used: number;
  helperOpened: number;
  helperAction: number;
  completionRate: number;
  skipRate: number;
  lastShownAt?: number;
  lastCompletedAt?: number;
}

/** Storage backend abstraction (native file vs web localStorage). */
export interface GuidanceStorage {
  load(): Promise<GuidanceStateFile | null>;
  save(state: GuidanceStateFile): Promise<void>;
}
