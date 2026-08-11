/**
 * UMP consent (GDPR / ATT compliance) — native.
 *
 * Google requires consent management for EEA/UK users (and iOS ATT) before
 * loading ads. `gatherConsent` requests consent info and shows the UMP form
 * only when required. The app keeps a privacy-first default: unless the user
 * explicitly consents to personalized ads, requests are marked
 * non-personalized (`requestNonPersonalizedAdsOnly`).
 */
import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

/**
 * Runs the consent flow. Resolves `true` when personalized ads are allowed,
 * `false` otherwise (non-personalized only). Never throws — failures degrade
 * to non-personalized so the app keeps working.
 */
export async function gatherAdsConsent(): Promise<boolean> {
  try {
    await AdsConsent.requestInfoUpdate();
    const consentInfo = await AdsConsent.getConsentInfo();
    if (consentInfo.status === AdsConsentStatus.REQUIRED) {
      if (consentInfo.isConsentFormAvailable) {
        const result = await AdsConsent.showForm();
        return result.status === AdsConsentStatus.OBTAINED;
      }
      return false;
    }
    return consentInfo.status === AdsConsentStatus.OBTAINED;
  } catch (e) {
    console.warn('Ads consent flow failed — using non-personalized ads', e);
    return false;
  }
}
