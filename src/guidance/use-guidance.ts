/**
 * useGuidance — React hook over the guidance singleton (in-app-guidance
 * change). Re-renders when the feature's guidance state changes.
 */
import { useEffect, useReducer } from 'react';

import { guidance } from './guidance-store';
import type { GuidanceFeatureId } from './registry';

export function useGuidance(featureId: GuidanceFeatureId) {
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    void guidance.ensureLoaded();
    return guidance.subscribe(force);
  }, []);

  const state = guidance.get(featureId);
  return {
    state,
    showSpotlight: guidance.shouldShowSpotlight(featureId),
    showTooltip: guidance.shouldShowTooltip(featureId),
    showBadge: guidance.shouldShowBadge(featureId),
    markShown: (kind: 'spotlight' | 'tooltip') => guidance.markShown(featureId, kind),
    markDismissed: () => guidance.markDismissed(featureId),
    markCompleted: () => guidance.markCompleted(featureId),
    markUsed: () => guidance.markUsed(featureId),
    markHelperOpened: () => guidance.markHelperOpened(featureId),
    markHelperAction: () => guidance.markHelperAction(featureId),
  };
}

/** Non-reactive imperative access for event handlers outside components. */
export { guidance };
