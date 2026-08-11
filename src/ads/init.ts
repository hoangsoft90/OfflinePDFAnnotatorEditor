/**
 * AdMob bootstrap (native).
 *
 * Order matters for consent compliance: gather UMP consent first, apply the
 * request configuration (non-personalized unless consented), then initialize.
 * Callers invoke this fire-and-forget — it never blocks app startup.
 */
import mobileAds from 'react-native-google-mobile-ads';

import { gatherAdsConsent } from '@/ads/consent';
import { setPersonalizedAdsAllowed } from '@/ads/ads-config';

let initStarted = false;

export async function initAds(): Promise<void> {
  if (initStarted) return;
  initStarted = true;
  try {
    const personalized = await gatherAdsConsent();
    setPersonalizedAdsAllowed(personalized);
    await mobileAds().initialize();
  } catch (e) {
    console.warn('AdMob initialization failed', e);
  }
}
