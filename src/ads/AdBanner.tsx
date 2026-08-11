/**
 * Adaptive banner ad (native). Renders an anchored adaptive banner sized to
 * the screen width. Failures hide the banner silently — ads never break UI.
 * On web `AdBanner.web.tsx` renders nothing (AdMob is not supported on web).
 */
import { useMemo } from 'react';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { adUnitId, isPersonalizedAllowed } from '@/ads/ads-config';

interface Props {
  /** Placement key — future ad-placements reporting / frequency capping */
  placement?: 'home' | 'viewer';
}

export function AdBanner({ placement }: Props) {
  const unitId = useMemo(() => adUnitId('banner'), []);
  void placement;

  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: !isPersonalizedAllowed() }}
      onAdFailedToLoad={(error) => {
        console.warn('Banner ad failed to load', error.message);
      }}
    />
  );
}
