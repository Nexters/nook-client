import { BRIDGE_VERSION } from './message';
import type { NativeToWeb } from './native-to-web';
import type { WebToNative } from './web-to-native';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseRecord(json: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(json);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function hasSupportedVersion(value: Record<string, unknown>): boolean {
  return value.v === BRIDGE_VERSION;
}

export function parseWebToNative(json: string): WebToNative | null {
  const value = parseRecord(json);
  if (!value || !hasSupportedVersion(value) || !isRecord(value.payload)) {
    return null;
  }

  switch (value.type) {
    case 'WEB_READY':
      return { v: BRIDGE_VERSION, type: value.type, payload: {} };
    case 'OPEN_EXTERNAL_URL':
      return typeof value.payload.url === 'string'
        ? { v: BRIDGE_VERSION, type: value.type, payload: { url: value.payload.url } }
        : null;
    case 'REQUEST_PUSH_PERMISSION':
      return { v: BRIDGE_VERSION, type: value.type, payload: {} };
    default:
      return null;
  }
}

export function parseNativeToWeb(json: string): NativeToWeb | null {
  const value = parseRecord(json);
  if (
    !value ||
    !hasSupportedVersion(value) ||
    value.type !== 'APP_RESUMED' ||
    !isRecord(value.payload)
  ) {
    return null;
  }
  return { v: BRIDGE_VERSION, type: value.type, payload: {} };
}
