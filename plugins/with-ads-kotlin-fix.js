/**
 * Config plugin: force `com.google.android.gms:play-services-ads` to a
 * version compiled with Kotlin metadata compatible with RN 0.86 (Kotlin 2.1).
 *
 * react-native-google-mobile-ads v16.x requests play-services-ads 25.x,
 * which Google compiles with Kotlin 2.3 metadata — RN 0.86 / Expo SDK 57
 * compile with Kotlin 2.1.20, causing:
 *   "Module was compiled with an incompatible version of Kotlin.
 *    The binary version of its metadata is 2.3.0, expected version is 2.1.0."
 *
 * play-services-ads 24.2.0 is the last version compiled with Kotlin 2.1
 * metadata and is API-compatible with the wrapper's usage. This plugin
 * injects a `resolutionStrategy { force ... }` block into
 * `android/app/build.gradle` so the downgraded version survives prebuild.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const FORCE_ADS_VERSION = '24.2.0';

module.exports = function withAdsKotlinFix(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('play-services-ads:' + FORCE_ADS_VERSION)) {
      // Already applied.
      return config;
    }
    const injection = [
      '',
      '// [with-ads-kotlin-fix] Force play-services-ads to a Kotlin 2.1-compatible version.',
      'configurations.all {',
      '  resolutionStrategy {',
      "    force 'com.google.android.gms:play-services-ads:" + FORCE_ADS_VERSION + "'",
      '  }',
      '}',
      '',
    ].join('\n');
    config.modResults.contents = contents.replace(
      /^dependencies \{/m,
      injection + 'dependencies {'
    );
    return config;
  });
};
