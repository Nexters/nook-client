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

function requestId(payload: Record<string, unknown>): string | null {
  return typeof payload.requestId === 'string' && payload.requestId.length > 0
    ? payload.requestId
    : null;
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
    case 'SESSION_GET':
    case 'SESSION_CLEAR': {
      const id = requestId(value.payload);
      return id ? { v: BRIDGE_VERSION, type: value.type, payload: { requestId: id } } : null;
    }
    case 'SESSION_REFRESH': {
      const id = requestId(value.payload);
      return id &&
        Number.isSafeInteger(value.payload.revision) &&
        Number(value.payload.revision) >= 0
        ? {
            v: BRIDGE_VERSION,
            type: value.type,
            payload: { requestId: id, revision: Number(value.payload.revision) },
          }
        : null;
    }
    case 'SESSION_ESTABLISH': {
      const id = requestId(value.payload);
      const refreshToken = value.payload.refreshToken;
      return id &&
        typeof value.payload.accessToken === 'string' &&
        value.payload.accessToken.length > 0 &&
        (typeof refreshToken === 'string' || refreshToken === null)
        ? {
            v: BRIDGE_VERSION,
            type: value.type,
            payload: {
              requestId: id,
              accessToken: value.payload.accessToken,
              refreshToken,
            },
          }
        : null;
    }
    default:
      return null;
  }
}

export function parseNativeToWeb(json: string): NativeToWeb | null {
  const value = parseRecord(json);
  if (!value || !hasSupportedVersion(value) || !isRecord(value.payload)) {
    return null;
  }
  if (value.type === 'APP_RESUMED') {
    return { v: BRIDGE_VERSION, type: value.type, payload: {} };
  }
  if (value.type === 'SESSION_CLEARED') {
    return typeof value.payload.reason === 'string'
      ? { v: BRIDGE_VERSION, type: value.type, payload: { reason: value.payload.reason } }
      : null;
  }
  if (value.type === 'SESSION_RESULT') {
    const id = requestId(value.payload);
    const rawStatus = value.payload.status;
    if (!id || !['bootstrapping', 'authenticated', 'anonymous'].includes(String(rawStatus))) {
      return null;
    }
    const status = rawStatus as 'bootstrapping' | 'authenticated' | 'anonymous';
    if (status === 'authenticated') {
      return typeof value.payload.accessToken === 'string' &&
        Number.isSafeInteger(value.payload.revision)
        ? {
            v: BRIDGE_VERSION,
            type: value.type,
            payload: {
              requestId: id,
              status,
              accessToken: value.payload.accessToken,
              revision: Number(value.payload.revision),
            },
          }
        : null;
    }
    return { v: BRIDGE_VERSION, type: value.type, payload: { requestId: id, status } };
  }
  return null;
}
