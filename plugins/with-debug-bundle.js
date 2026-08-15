/**
 * Config plugin: embed the JS bundle into DEBUG builds.
 *
 * By default the RN gradle plugin treats the `debug` variant as debuggable
 * and SKIPS bundling — the debug APK contains no `index.android.bundle` and
 * relies on the Metro dev server at runtime. Installed standalone (no Metro),
 * the app hangs on the splash screen forever.
 *
 * Setting `debuggableVariants = []` in the `react {}` block makes gradle
 * bundle JS for debug variants too, so `assets/index.android.bundle` is
 * embedded in the debug APK. At runtime RN 0.7x+ bridgeless
 * (`ReactHostImpl.jsBundleLoader`) checks whether Metro is running:
 *   - Metro running  -> load JS from the dev server (normal `expo run:android`)
 *   - Metro NOT running -> fall back to `reactHostDelegate.jsBundleLoader`
 *     (the embedded asset loader for `index.android.bundle`)
 * So a debug APK built with this plugin runs standalone on a device with NO
 * dev server, while `__DEV__` stays true (test ads, dev logs, readable
 * stack traces) and it is auto-signed with the generated debug keystore
 * (no release keystore needed).
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withDebugBundle(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('debuggableVariants = []')) {
      // Already applied.
      return config;
    }

    const next = contents.replace(
      /react \{\n(\s*)entryFile = file\(/,
      'react {\n$1debuggableVariants = []\n$1entryFile = file('
    );

    if (next === contents) {
      throw new Error(
        '[with-debug-bundle] could not locate the react block in android/app/build.gradle'
      );
    }

    config.modResults.contents = next;
    return config;
  });
};
