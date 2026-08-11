/**
 * Interstitial ad manager (native).
 *
 * Shows a fullscreen interstitial at most once per cooldown window. A fresh ad
 * is loaded on demand; if loading fails or it is not yet ready, the show is
 * skipped silently. Never blocks the UI.
 */
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import { adUnitId, INTERSTITIAL_COOLDOWN_MS, INTERSTITIAL_MIN_OPEN_MS, isPersonalizedAllowed } from '@/ads/ads-config';

let lastShownAt = 0;

/**
 * Shows an interstitial if due (cooldown + minimum open duration respected).
 * Call when leaving the viewer. Returns true if an ad was shown.
 */
export async function showInterstitialIfDue(openedAtMs: number): Promise<boolean> {
  const now = Date.now();
  if (now - lastShownAt < INTERSTITIAL_COOLDOWN_MS) return false;
  if (now - openedAtMs < INTERSTITIAL_MIN_OPEN_MS) return false;

  const ad = InterstitialAd.createForAdRequest(adUnitId('interstitial'), {
    requestNonPersonalizedAdsOnly: !isPersonalizedAllowed(),
  });

  const shown = await new Promise<boolean>((resolve) => {
    // `settled` guards against a late LOADED firing after the timeout already
    // resolved — otherwise an ad could appear unprompted seconds after leaving.
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subs.forEach((sub) => sub());
      resolve(value);
    };

    const timeout = setTimeout(() => finish(false), 15_000);

    const onLoaded = () => {
      if (settled) return;
      ad.show().catch(() => finish(false));
    };
    const onFailed = () => finish(false);
    const onClosed = () => finish(true);

    const subs = [
      ad.addAdEventListener(AdEventType.LOADED, onLoaded),
      ad.addAdEventListener(AdEventType.ERROR, onFailed),
      ad.addAdEventListener(AdEventType.CLOSED, onClosed),
    ];

    ad.load();
  });

  if (shown) lastShownAt = Date.now();
  return shown;
}
