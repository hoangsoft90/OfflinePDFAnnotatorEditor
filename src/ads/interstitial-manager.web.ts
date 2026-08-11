/**
 * Interstitial ad manager — web no-op. AdMob is not supported on web.
 */
export async function showInterstitialIfDue(_openedAtMs: number): Promise<boolean> {
  return false;
}
