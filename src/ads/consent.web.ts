/**
 * UMP consent — web no-op. AdMob is not supported on web, so the web build
 * never needs a consent flow. Resolves non-personalized (ads disabled).
 */
export async function gatherAdsConsent(): Promise<boolean> {
  return false;
}
