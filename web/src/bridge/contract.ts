import { z } from 'zod';

/**
 * 네이티브 셸 ↔ 원격 웹(WebView) 메시지 계약.
 * Capacitor 브리지를 대체하는 자체 계약(웹측 SSOT). 네이티브(Swift/Kotlin)는 이 문서를 손 미러링한다.
 * - 모든 메시지에 v(버전) + type
 * - 요청/응답 쌍만 requestId
 * - 수신부에서 Zod 로 런타임 검증
 */
export const BRIDGE_VERSION = 1 as const;

export type Platform = 'ios' | 'android' | 'web';

const v = z.literal(BRIDGE_VERSION);

const sharedItemSchema = z.object({
  text: z.string(),
  groups: z.array(z.string()).optional(),
  memo: z.string().optional(),
  newGroupName: z.string().optional(),
  newGroupColorIndex: z.number().optional(),
  savedAt: z.number().optional(),
});

const coordsSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
});

// ===================== Native → Web =====================

/** 셸이 읽은 pending 공유(Share Extension/ShareActivity 저장분)를 웹에 전달. */
export const ShareReceivedSchema = z.object({
  v,
  type: z.literal('SHARE_RECEIVED'),
  payload: z.object({ items: z.array(sharedItemSchema) }),
});

/** REQUEST_LOCATION 응답: 셸이 네이티브 권한으로 받은 좌표(또는 상태). */
export const LocationResultSchema = z.object({
  v,
  type: z.literal('LOCATION_RESULT'),
  requestId: z.string(),
  payload: z.discriminatedUnion('status', [
    z.object({ status: z.literal('granted'), coords: coordsSchema }),
    z.object({ status: z.literal('denied') }),
    z.object({ status: z.literal('unavailable') }),
  ]),
});

/** Android 시스템 뒤로 가기 → 웹이 라우팅 back 을 결정. */
export const BackPressedSchema = z.object({
  v,
  type: z.literal('BACK_PRESSED'),
  payload: z.object({}).strict(),
});

/** 앱이 백그라운드에서 복귀. */
export const AppResumedSchema = z.object({
  v,
  type: z.literal('APP_RESUMED'),
  payload: z.object({}).strict(),
});

export const NativeToWebSchema = z.discriminatedUnion('type', [
  ShareReceivedSchema,
  LocationResultSchema,
  BackPressedSchema,
  AppResumedSchema,
]);

// ===================== Web → Native =====================

/** 웹 로드 완료 + 브리지 준비됨. 셸이 pending 공유를 밀어줄 신호. */
export const WebReadySchema = z.object({
  v,
  type: z.literal('WEB_READY'),
  payload: z.object({}).strict(),
});

/** 현재 위치 요청(요청/응답: LOCATION_RESULT). */
export const RequestLocationSchema = z.object({
  v,
  type: z.literal('REQUEST_LOCATION'),
  requestId: z.string(),
  payload: z.object({}).strict(),
});

/** 외부 URL 열기. 셸이 http/https 검증 후 시스템 브라우저로 연다. */
export const OpenExternalUrlSchema = z.object({
  v,
  type: z.literal('OPEN_EXTERNAL_URL'),
  payload: z.object({ url: z.string().url() }),
});

/** 웹 라우팅의 뒤로가기 가능 여부 → 셸(Android back)이 사용. */
export const NavStateSchema = z.object({
  v,
  type: z.literal('NAV_STATE'),
  payload: z.object({ canGoBack: z.boolean() }),
});

export const WebToNativeSchema = z.discriminatedUnion('type', [
  WebReadySchema,
  RequestLocationSchema,
  OpenExternalUrlSchema,
  NavStateSchema,
]);

// ===================== 타입 & 빌더 =====================

export type SharedItem = z.infer<typeof sharedItemSchema>;
export type Coords = z.infer<typeof coordsSchema>;
export type NativeToWebMessage = z.infer<typeof NativeToWebSchema>;
export type WebToNativeMessage = z.infer<typeof WebToNativeSchema>;

export function newRequestId(): string {
  return crypto.randomUUID();
}

export const webReady = (): WebToNativeMessage => ({
  v: BRIDGE_VERSION,
  type: 'WEB_READY',
  payload: {},
});

export const requestLocation = (requestId: string): WebToNativeMessage => ({
  v: BRIDGE_VERSION,
  type: 'REQUEST_LOCATION',
  requestId,
  payload: {},
});

export const openExternalUrl = (url: string): WebToNativeMessage => ({
  v: BRIDGE_VERSION,
  type: 'OPEN_EXTERNAL_URL',
  payload: { url },
});

export const navState = (canGoBack: boolean): WebToNativeMessage => ({
  v: BRIDGE_VERSION,
  type: 'NAV_STATE',
  payload: { canGoBack },
});
