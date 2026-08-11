/**
 * Rewarded ad manager — web no-op. AdMob is not supported on web.
 */
export async function showRewardedAd(): Promise<boolean> {
  return false;
}
