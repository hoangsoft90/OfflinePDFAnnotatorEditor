/**
 * Safe navigation helpers — guarantee no dead ends across the app.
 */
import { router } from 'expo-router';

/**
 * Back navigation that can never strand the user:
 * - If there is history, pop it (native stack / browser history on web).
 * - Otherwise (cold-start deep link, web direct URL entry, refresh) fall back
 *   to the Home tab instead of doing nothing or leaving the app.
 */
export function safeBack(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}
