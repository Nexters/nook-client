import type { PushPermissionStatus, PushToken } from '@nook/bridge-contracts';
import { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';

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

/**
 * 권한을 요청하고, 허용된 경우 FCM(Android)·APNs(iOS) 원시 디바이스 토큰을 함께 돌려준다.
 * 서버에 등록하는 API 는 아직 없어(백엔드 작업 진행 중) 토큰을 웹으로 넘기는 데까지만 한다.
 */
export async function requestPushPermissionAndToken(): Promise<PushPermissionOutcome> {
  const permission = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  const status = toPermissionStatus(permission.status);
  if (status !== 'granted') {
    return { status };
  }

  try {
    const { type, data } = await Notifications.getDevicePushTokenAsync();
    // ios·android 외 플랫폼(web) 토큰은 이 앱에서 나올 일이 없다 — 방어적으로만 걸러낸다.
    return type === 'ios' || type === 'android'
      ? { status, token: { platform: type, value: String(data) } }
      : { status };
  } catch {
    return { status };
  }
}

/** 콜드 스타트로 알림을 탭해 앱이 열린 경우를 확인한다. */
export async function getInitialNotificationOpened(): Promise<PushNotificationOpened | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response ? toOpened(response) : null;
}

/** 앱이 떠 있는 동안 알림을 탭한 경우를 구독한다. */
export function addNotificationOpenedListener(
  callback: (opened: PushNotificationOpened) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) =>
    callback(toOpened(response)),
  );
}
