/**
 * Adaptive banner — web no-op. AdMob is not supported on web, so the banner
 * renders nothing there (resolved by Metro via the `.web` extension).
 */
export function AdBanner(_props: { placement?: 'home' | 'viewer' }): null {
  return null;
}
