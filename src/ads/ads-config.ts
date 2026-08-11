/**
 * AdMob ad unit configuration (shared, no native imports).
 *
 * REAL_ADS are the real AdMob ad unit IDs (filled 2026-08-11 for Android).
 * The matching app ID lives in `app.json` under the
 * `react-native-google-mobile-ads` plugin (`androidAppId` / `iosAppId`).
 * ⚠️ iOS cần app + ad unit riêng trên AdMob console trước khi build iOS.
 * In development (`__DEV__`) the official Google test ad units are always
 * used, so you can develop without a live app.
 */
import { Platform } from 'react-native';

/** Google's official test ad unit IDs — safe to use during development. */
const TEST_IDS = {
  banner: { android: 'ca-app-pub-3940256099942544/6300978111', ios: 'ca-app-pub-3940256099942544/2934735716' },
  interstitial: { android: 'ca-app-pub-3940256099942544/1033173712', ios: 'ca-app-pub-3940256099942544/4411468910' },
  rewarded: { android: 'ca-app-pub-3940256099942544/5224354917', ios: 'ca-app-pub-3940256099942544/1712485313' },
};

/** Real ad unit IDs (AdMob dashboard, filled 2026-08-11). ⚠ iOS cần app + ad unit riêng trên AdMob console. */
const REAL_ADS = {
  banner: { android: 'ca-app-pub-6917313063209470/1017535323', ios: 'ca-app-pub-6917313063209470/1017535323' },
  interstitial: { android: 'ca-app-pub-6917313063209470/7750464636', ios: 'ca-app-pub-6917313063209470/7750464636' },
  rewarded: { android: 'ca-app-pub-6917313063209470/1061199133', ios: 'ca-app-pub-6917313063209470/1061199133' },
};

export type AdKind = 'banner' | 'interstitial' | 'rewarded';

function pick(ids: { android: string; ios: string }): string {
  return Platform.OS === 'ios' ? ids.ios : ids.android;
}

/** Returns the ad unit ID for the current platform + environment. */
export function adUnitId(kind: AdKind): string {
  return __DEV__ ? pick(TEST_IDS[kind]) : pick(REAL_ADS[kind]);
}

// Hard guard: never silently ship a release build with placeholder ad IDs.
if (!__DEV__ && REAL_ADS.banner.android.includes('XXXX')) {
  console.error(
    '[AdMob] REAL_ADS in src/ads/ads-config.ts still contains placeholder IDs — ' +
      'release builds would request invalid ad units. Replace them before shipping.'
  );
}

/** Interstitial cooldown between shows (ms). */
export const INTERSTITIAL_COOLDOWN_MS = 90_000;
/** Minimum time a document must be open before showing an interstitial on leave. */
export const INTERSTITIAL_MIN_OPEN_MS = 10_000;

// Privacy-first default: non-personalized unless the user consents (UMP).
let personalizedAllowed = false;

/** Record whether the UMP consent flow allowed personalized ads. */
export function setPersonalizedAdsAllowed(allowed: boolean): void {
  personalizedAllowed = allowed;
}

/** True when the current user consented to personalized ads. */
export function isPersonalizedAllowed(): boolean {
  return personalizedAllowed;
}
