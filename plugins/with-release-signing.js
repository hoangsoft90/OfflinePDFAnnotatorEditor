/**
 * Config plugin: inject a release signingConfig into the generated
 * `android/app/build.gradle` so `./gradlew bundleRelease` (and
 * `assembleRelease`) sign with a real release keystore instead of the
 * default debug keystore that Expo prebuild wires up.
 *
 * The keystore lives in GitHub Secrets (never in the repo — this repo is
 * public). The CI workflow decodes `ANDROID_KEYSTORE_BASE64` to a file,
 * then exports these env vars BEFORE `expo prebuild` so the plugin can
 * read them at prebuild time:
 *
 *   ANDROID_KEYSTORE_PATH       absolute path to the .jks file
 *   ANDROID_KEYSTORE_PASSWORD   keystore password
 *   ANDROID_KEY_ALIAS           key alias
 *   ANDROID_KEY_PASSWORD        key password
 *
 * When the env vars are absent (local dev, debug-CI, `expo run`), the
 * plugin is a no-op and the generated project keeps its default debug
 * signing — so only release builds are affected.
 *
 * Fixed keystore (never rotate): keystore/release.jks (gitignored) with
 * password 83793900 / alias offlinepdf. Re-applied on every prebuild.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'with-release-signing';

function gradleStr(value) {
  // Escape single quotes for a Gradle single-quoted string literal.
  return String(value).replace(/'/g, "\\'");
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('[' + MARKER + ']')) {
      // Already applied.
      return config;
    }

    const keystorePath = process.env.ANDROID_KEYSTORE_PATH;
    const keystorePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
    const keyAlias = process.env.ANDROID_KEY_ALIAS;
    const keyPassword = process.env.ANDROID_KEY_PASSWORD;

    if (!keystorePath || !keystorePassword || !keyAlias || !keyPassword) {
      // Not a release-signing build (no secrets exported) — leave gradle untouched.
      console.log('[with-release-signing] env vars missing — keeping default debug signing');
      return config;
    }

    const signingConfigBlock = [
      '',
      '    // [' + MARKER + '] release keystore injected from CI secrets',
      '    signingConfigs {',
      '        release {',
      "            storeFile file('" + gradleStr(keystorePath) + "')",
      "            storePassword '" + gradleStr(keystorePassword) + "'",
      "            keyAlias '" + gradleStr(keyAlias) + "'",
      "            keyPassword '" + gradleStr(keyPassword) + "'",
      '        }',
      '        debug {',
    ].join('\n');

    // 1) Add the `release` signingConfig inside the existing signingConfigs block.
    const withReleaseConfig = contents.replace(
      /signingConfigs \{\n(\s+)debug \{/,
      signingConfigBlock
    );

    // 2) Point the `release` buildType at signingConfigs.release instead of the
    //    default debug config (the line right after Expo's "Caution!" comment).
    const finalContents = withReleaseConfig.replace(
      /release \{\n\s*\/\/ Caution! In production, you need to generate your own keystore file\.\n\s*\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\n(\s*)signingConfig signingConfigs\.debug/,
      'release {\n            // [' +
        MARKER +
        '] release signing injected from CI secrets\n            signingConfig signingConfigs.release'
    );

    if (finalContents === withReleaseConfig) {
      throw new Error(
        '[with-release-signing] could not locate the release buildType block in android/app/build.gradle'
      );
    }

    config.modResults.contents = finalContents;
    return config;
  });
};
