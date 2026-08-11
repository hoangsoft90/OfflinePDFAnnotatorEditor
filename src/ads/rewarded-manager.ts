/**
 * Rewarded ad manager (native).
 *
 * Loads and shows a rewarded ad; resolves `true` when the user earned the
 * reward (watched to completion), `false` otherwise. Safe to call from UI
 * actions (e.g. a Settings "watch an ad to support" row).
 */
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

import { adUnitId, isPersonalizedAllowed } from '@/ads/ads-config';

/** Loads + shows a rewarded ad. Resolves true when the reward is earned. */
export async function showRewardedAd(): Promise<boolean> {
  const ad = RewardedAd.createForAdRequest(adUnitId('rewarded'), {
    requestNonPersonalizedAdsOnly: !isPersonalizedAllowed(),
  });

  return new Promise<boolean>((resolve) => {
    // `settled` guards against a late LOADED firing after the timeout already
    // resolved — the ad must never show without a user-triggered request.
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subs.forEach((sub) => sub());
      resolve(value);
    };

    const timeout = setTimeout(() => finish(false), 20_000);

    const onLoaded = () => {
      if (settled) return;
      ad.show().catch(() => finish(false));
    };
    const onFailed = () => finish(false);
    const onEarned = () => finish(true);
    const onClosed = () => finish(false);

    const subs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, onLoaded),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onEarned),
      ad.addAdEventListener(AdEventType.ERROR, onFailed),
      ad.addAdEventListener(AdEventType.CLOSED, onClosed),
    ];

    ad.load();
  });
}
