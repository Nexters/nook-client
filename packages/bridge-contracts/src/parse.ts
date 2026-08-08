import { BRIDGE_VERSION, type ImagePickSource, type SocialProvider } from './message';
import type {
  ImagePickStatus,
  NativeToWeb,
  PickedImage,
  SocialCredential,
  SocialLoginStatus,
} from './native-to-web';
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

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === 'apple' || value === 'kakao';
}

function isSocialLoginStatus(value: unknown): value is SocialLoginStatus {
  return value === 'success' || value === 'cancelled' || value === 'error';
}

function isImagePickSource(value: unknown): value is ImagePickSource {
  return value === 'album' || value === 'camera';
}

function isImagePickStatus(value: unknown): value is ImagePickStatus {
  return value === 'success' || value === 'cancelled' || value === 'error';
}

function parsePickedImage(value: unknown): PickedImage | null {
  if (!isRecord(value)) return null;
  const { base64, mimeType, width, height } = value;
  return typeof base64 === 'string' &&
    base64.length > 0 &&
    typeof mimeType === 'string' &&
    mimeType.length > 0 &&
    Number.isSafeInteger(width) &&
    Number(width) > 0 &&
    Number.isSafeInteger(height) &&
    Number(height) > 0
    ? { base64, mimeType, width: Number(width), height: Number(height) }
    : null;
}

function token(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** 자격증명은 provider 마다 필드가 달라, 최소 하나라도 있어야 유효한 것으로 본다. */
function parseSocialCredential(value: unknown): SocialCredential | null {
  if (!isRecord(value)) return null;

  const credential: SocialCredential = {};
  const identityToken = token(value.identityToken);
  const authorizationCode = token(value.authorizationCode);
  const accessToken = token(value.accessToken);
  if (identityToken) credential.identityToken = identityToken;
  if (authorizationCode) credential.authorizationCode = authorizationCode;
  if (accessToken) credential.accessToken = accessToken;

  return identityToken || authorizationCode || accessToken ? credential : null;
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
    case 'SOCIAL_LOGIN': {
      const id = requestId(value.payload);
      return id && isSocialProvider(value.payload.provider)
        ? {
            v: BRIDGE_VERSION,
            type: value.type,
            payload: { requestId: id, provider: value.payload.provider },
          }
        : null;
    }
    case 'IMAGE_PICK': {
      const id = requestId(value.payload);
      return id && isImagePickSource(value.payload.source)
        ? {
            v: BRIDGE_VERSION,
            type: value.type,
            payload: { requestId: id, source: value.payload.source },
          }
        : null;
    }
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
  if (value.type === 'SOCIAL_LOGIN_RESULT') {
    const id = requestId(value.payload);
    const { provider, status } = value.payload;
    if (!id || !isSocialProvider(provider) || !isSocialLoginStatus(status)) {
      return null;
    }
    if (status !== 'success') {
      return { v: BRIDGE_VERSION, type: value.type, payload: { requestId: id, provider, status } };
    }
    const credential = parseSocialCredential(value.payload.credential);
    return credential
      ? {
          v: BRIDGE_VERSION,
          type: value.type,
          payload: { requestId: id, provider, status, credential },
        }
      : null;
  }
  if (value.type === 'IMAGE_PICK_RESULT') {
    const id = requestId(value.payload);
    const { source, status } = value.payload;
    if (!id || !isImagePickSource(source) || !isImagePickStatus(status)) {
      return null;
    }
    if (status !== 'success') {
      return { v: BRIDGE_VERSION, type: value.type, payload: { requestId: id, source, status } };
    }
    const image = parsePickedImage(value.payload.image);
    return image
      ? { v: BRIDGE_VERSION, type: value.type, payload: { requestId: id, source, status, image } }
      : null;
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
