import type { PushPermissionStatus, PushToken } from '@nook/bridge-contracts';
import { getApps } from '@react-native-firebase/app';
import { getMessaging, getToken, onTokenRefresh } from '@react-native-firebase/messaging';
import { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface PushPermissionOutcome {
  status: PushPermissionStatus;
  /** status 가 granted 이고 토큰 발급도 성공했을 때만 존재한다. */
  token?: PushToken;
}

export interface PushNotificationOpened {
  data: Record<string, string>;
  title?: string;
  body?: string;
}

// 앱이 포그라운드에 떠 있어도 배너를 그대로 띄운다 — 웹이 화면을 갱신할 시간을 번다.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function toPermissionStatus(status: PermissionStatus): PushPermissionStatus {
  switch (status) {
    case PermissionStatus.GRANTED:
      return 'granted';
    case PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

function toStringRecord(data: Record<string, unknown> | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function toOpened({ notification }: Notifications.NotificationResponse): PushNotificationOpened {
  const { data, title, body } = notification.request.content;
  return {
    data: toStringRecord(data),
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
  };
}

// 권한 요청은 expo-notifications 로 한다 — react-native-firebase 도 requestPermission 을
// 제공하지만 자체 문서가 expo-notifications 를 쓰라고 안내하며 deprecated 로 표시해 뒀다.
// 토큰은 react-native-firebase 로 받는다: iOS 는 이게 APNs 원시 토큰이 아니라 서버가 실제로
// 쓸 수 있는 FCM 등록 토큰이라, expo-notifications 의 getDevicePushTokenAsync 로는 안 된다
// (Android 는 두 방식이 사실상 같은 값을 준다).
const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;

/**
 * Firebase 네이티브 설정(GoogleService-Info.plist / google-services.json)이 빌드에 들어가
 * default app 이 초기화됐는지. 설정이 빠진 빌드(현재 Android)에서 getMessaging() 을 부르면
 * "No Firebase App '[DEFAULT]'" 로 터지므로, 모든 Firebase 접근은 이 확인 뒤에 한다.
 */
function isFirebaseConfigured(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

async function withTokenIfGranted(status: PushPermissionStatus): Promise<PushPermissionOutcome> {
  if (status !== 'granted' || !platform || !isFirebaseConfigured()) {
    return { status };
  }

  try {
    const value = await getToken(getMessaging());
    return { status, token: { platform, value } };
  } catch {
    return { status };
  }
}

/**
 * 권한을 요청하고, 허용된 경우 FCM 등록 토큰을 함께 돌려준다. 서버 등록은 웹이 이어서 한다.
 * 어떤 실패에도 reject 하지 않는다 — 웹이 requestId 로 응답을 기다리고 있어, 응답이 빠지면
 * Promise 가 영원히 pending 으로 남는다.
 */
export async function requestPushPermissionAndToken(): Promise<PushPermissionOutcome> {
  try {
    const permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return await withTokenIfGranted(toPermissionStatus(permission.status));
  } catch {
    return { status: 'undetermined' };
  }
}

/** 다이얼로그 없이 현재 권한 상태만 조회한다. 이미 허용된 사용자의 토큰 재등록용. */
export async function getPushStatusAndToken(): Promise<PushPermissionOutcome> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    return await withTokenIfGranted(toPermissionStatus(permission.status));
  } catch {
    return { status: 'undetermined' };
  }
}

/** 콜드 스타트로 알림을 탭해 앱이 열린 경우를 확인한다. */
export async function getInitialNotificationOpened(): Promise<PushNotificationOpened | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;

  // "이번 실행을 일으킨 탭"이 아니라 "가장 최근 탭"을 돌려주는 API 라, 소비하지 않으면
  // 다음에 아이콘으로 정상 실행해도 지난 알림의 화면으로 또 이동한다.
  await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  return toOpened(response);
}

/** 앱이 떠 있는 동안 알림을 탭한 경우를 구독한다. */
export function addNotificationOpenedListener(
  callback: (opened: PushNotificationOpened) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) =>
    callback(toOpened(response)),
  );
}

/** FCM 토큰이 재발급된 경우(재설치·복원 등)를 구독한다. Firebase 미설정 빌드에서는 no-op. */
export function addPushTokenRefreshListener(callback: (token: PushToken) => void): () => void {
  if (!platform || !isFirebaseConfigured()) return () => undefined;

  return onTokenRefresh(getMessaging(), (value) => {
    callback({ platform, value });
  });
}
