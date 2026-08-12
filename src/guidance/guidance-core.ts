/**
 * Guidance state machine — platform-agnostic core (in-app-guidance change,
 * logic + tracking specs). Persistence is injected via a `GuidanceStorage`
 * adapter so native (file) and web (localStorage) share one implementation.
 */
import type {
  FeatureGuidanceState,
  GuidanceMark,
  GuidanceMetrics,
  GuidanceStateFile,
  GuidanceStorage,
} from './types';
import type { GuidanceFeatureId } from './registry';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Dismissed spotlights are re-offered after this cooldown. */
export const DISMISS_COOLDOWN_MS = 7 * DAY_MS;
/** Badges auto-hide after this many uses… */
export const BADGE_USAGE_LIMIT = 2;
/** …or this long since the badge appeared. */
export const BADGE_MAX_AGE_MS = 14 * DAY_MS;
/** Session budget: at most this many spotlights per app launch. */
export const SESSION_SPOTLIGHT_LIMIT = 1;
/** Session budget: at most this many tooltips per app launch. */
export const SESSION_TOOLTIP_LIMIT = 2;

const EMPTY_FEATURE = (): FeatureGuidanceState => ({
  status: 'unseen',
  shownCount: 0,
  dismissedCount: 0,
  completedCount: 0,
  usageCount: 0,
  helperOpenedCount: 0,
  helperActionCount: 0,
});

export class GuidanceCore {
  private state: GuidanceStateFile = { version: 1, features: {} };
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly session = { id: Date.now(), spotlights: 0, tooltips: 0 };
  private readonly listeners = new Set<() => void>();

  constructor(private readonly storage: GuidanceStorage) {}

  /** Loads persisted state once; safe to call many times. */
  ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (!this.loadPromise) {
      this.loadPromise = this.storage
        .load()
        .then((saved) => {
          if (saved?.version === 1 && saved.features) this.state = saved;
        })
        .catch(() => {
          // fresh start — defaults are fine
        })
        .finally(() => {
          this.loaded = true;
        });
    }
    return this.loadPromise;
  }

  private getFeature(id: GuidanceFeatureId): FeatureGuidanceState {
    return (this.state.features[id] ??= EMPTY_FEATURE());
  }

  /** Current raw state of a feature. */
  get(id: GuidanceFeatureId): Readonly<FeatureGuidanceState> {
    return this.getFeature(id);
  }

  // ---- show decisions (logic spec) ----

  /** Spotlight shows on first use of a core feature (unseen → shown). */
  shouldShowSpotlight(id: GuidanceFeatureId): boolean {
    if (this.session.spotlights >= SESSION_SPOTLIGHT_LIMIT) return false;
    const st = this.getFeature(id);
    if (st.status === 'completed') return false;
    if (st.status === 'dismissed') {
      // Re-offer after cooldown, only while the feature is still unfamiliar.
      if (st.usageCount >= BADGE_USAGE_LIMIT) return false;
      return st.dismissedAt == null || Date.now() - st.dismissedAt >= DISMISS_COOLDOWN_MS;
    }
    return true; // unseen, or 'shown' (in-progress flow may resume)
  }

  /** Tooltip is a first-tap trigger: hidden until marked shown, one-shot. */
  shouldShowTooltip(id: GuidanceFeatureId): boolean {
    if (this.session.tooltips >= SESSION_TOOLTIP_LIMIT) return false;
    return this.getFeature(id).status === 'shown';
  }

  /** Badge marks a feature as new while it is unfamiliar. */
  shouldShowBadge(id: GuidanceFeatureId): boolean {
    const st = this.getFeature(id);
    if (st.status === 'completed' || st.usageCount >= BADGE_USAGE_LIMIT) return false;
    if (st.status === 'shown') return false; // guidance already active
    if (st.status === 'dismissed') {
      return st.dismissedAt != null && Date.now() - st.dismissedAt < BADGE_MAX_AGE_MS;
    }
    return true; // unseen
  }

  // ---- transitions ----

  /**
   * Records a transition/event and persists. `kind` is required for 'shown'
   * so the session budget can be charged correctly.
   */
  mark(id: GuidanceFeatureId, event: GuidanceMark, kind: 'spotlight' | 'tooltip' = 'spotlight'): void {
    const st = this.getFeature(id);
    const now = Date.now();
    switch (event) {
      case 'shown':
        st.shownCount += 1;
        st.shownAt = now;
        st.status = 'shown';
        if (kind === 'spotlight') this.session.spotlights += 1;
        else this.session.tooltips += 1;
        break;
      case 'dismissed':
        st.dismissedCount += 1;
        st.dismissedAt = now;
        st.status = 'dismissed';
        break;
      case 'completed':
        st.completedCount += 1;
        st.completedAt = now;
        st.status = 'completed';
        break;
      case 'used':
        st.usageCount += 1;
        if (st.usageCount >= BADGE_USAGE_LIMIT) {
          // Two uses prove knowledge: stop all guidance for this feature.
          st.completedAt = st.completedAt ?? now;
          st.status = 'completed';
        }
        break;
      case 'helper_opened':
        st.helperOpenedCount += 1;
        break;
      case 'helper_action':
        st.helperActionCount += 1;
        break;
    }
    this.notify();
    this.persist();
  }

  markShown(id: GuidanceFeatureId, kind: 'spotlight' | 'tooltip'): void {
    this.mark(id, 'shown', kind);
  }

  markDismissed(id: GuidanceFeatureId): void {
    this.mark(id, 'dismissed');
  }

  markCompleted(id: GuidanceFeatureId): void {
    this.mark(id, 'completed');
  }

  markUsed(id: GuidanceFeatureId): void {
    this.mark(id, 'used');
  }

  markHelperOpened(id: GuidanceFeatureId): void {
    this.mark(id, 'helper_opened');
  }

  markHelperAction(id: GuidanceFeatureId): void {
    this.mark(id, 'helper_action');
  }

  // ---- tracking (tracking spec) ----

  getMetrics(): GuidanceMetrics[] {
    return Object.entries(this.state.features).map(([feature, st]) => ({
      feature,
      shown: st.shownCount,
      skipped: st.dismissedCount,
      completed: st.completedCount,
      used: st.usageCount,
      helperOpened: st.helperOpenedCount,
      helperAction: st.helperActionCount,
      completionRate: st.shownCount > 0 ? st.completedCount / st.shownCount : 0,
      skipRate: st.shownCount > 0 ? st.dismissedCount / st.shownCount : 0,
      lastShownAt: st.shownAt,
      lastCompletedAt: st.completedAt,
    }));
  }

  // ---- reactivity ----

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** Serialized writes so concurrent marks never interleave (atomic.ts). */
  private persist(): void {
    const snapshot = this.state;
    this.saveQueue = this.saveQueue
      .then(() => this.storage.save(snapshot))
      .catch(() => {
        // Persistence is best-effort; guidance must never crash the app.
      });
  }
}
