/**
 * useGuidance — React hook over the guidance singleton (in-app-guidance
 * change). Re-renders when the feature's guidance state changes.
 */
import { useCallback, useEffect, useReducer } from 'react';

import { guidance } from './guidance-store';
import type { GuidanceFeatureId } from './registry';

export function useGuidance(featureId: GuidanceFeatureId) {
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    void guidance.ensureLoaded();
    return guidance.subscribe(force);
  }, []);

  // Memoized over the stable singleton so consumers can put these in effect
  // deps without churn (e.g. the tooltip auto-dismiss timer).
  const markShown = useCallback(
    (kind: 'spotlight' | 'tooltip') => guidance.markShown(featureId, kind),
    [featureId]
  );
  const markDismissed = useCallback(() => guidance.markDismissed(featureId), [featureId]);
  const markCompleted = useCallback(() => guidance.markCompleted(featureId), [featureId]);
  const markUsed = useCallback(() => guidance.markUsed(featureId), [featureId]);
  const markHelperOpened = useCallback(() => guidance.markHelperOpened(featureId), [featureId]);
  const markHelperAction = useCallback(() => guidance.markHelperAction(featureId), [featureId]);

  const state = guidance.get(featureId);
  return {
    state,
    showSpotlight: guidance.shouldShowSpotlight(featureId),
    showTooltip: guidance.shouldShowTooltip(featureId),
    showBadge: guidance.shouldShowBadge(featureId),
    markShown,
    markDismissed,
    markCompleted,
    markUsed,
    markHelperOpened,
    markHelperAction,
  };
}

/** Non-reactive imperative access for event handlers outside components. */
export { guidance };
