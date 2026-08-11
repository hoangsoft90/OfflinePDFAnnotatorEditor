import * as Crypto from 'expo-crypto';

/** RFC4122 v4 UUID (Hermes-safe, backed by expo-crypto). */
export function uuid(): string {
  return Crypto.randomUUID();
}
