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
 * metadata and is API-compatible with the wrapper's usage.
 *
 * IMPORTANT: the force must be applied from the ROOT build.gradle via
 * `subprojects { configurations.configureEach { resolutionStrategy.force ... } }`
 * so it affects the `react-native-google-mobile-ads` subproject's own
 * dependency resolution. A `configurations.all` block inside app/build.gradle
 * only affects the app module and does NOT stop the ads module from resolving
 * play-services-ads 25.x (verified in CI — same Kotlin metadata error).
 * This plugin re-applies the rule on every `expo prebuild --clean`.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const FORCE_ADS_VERSION = '24.2.0';
const MARKER = 'with-ads-kotlin-fix';

module.exports = function withAdsKotlinFix(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      // Already applied.
      return config;
    }
    const injection = [
      '',
      '// [' + MARKER + '] Force play-services-ads to a Kotlin 2.1-compatible version.',
      'subprojects {',
      '  configurations.configureEach {',
      "    resolutionStrategy.force 'com.google.android.gms:play-services-ads:" + FORCE_ADS_VERSION + "'",
      '  }',
      '}',
      '',
    ].join('\n');
    config.modResults.contents = contents + injection;
    return config;
  });
};
