/** 셸이 주입한 앱 정보의 최소 형태. nativeBridge 인스턴스가 그대로 만족한다. */
export interface AppInfoSource {
  isNative: boolean;
  platform: string;
  appVersion: string | null;
  appBuildNumber: string | null;
}

/**
 * 서버의 최소 지원 버전 정책용 식별 헤더. 브라우저 접속은 정책 대상이 아니라 null 을
 * 반환하고, 구버전 셸이 주입하지 않는 값(빌드 번호 등)은 해당 헤더만 뺀다 —
 * 서버는 "빌드 번호 없는 네이티브 요청"을 구버전 바이너리로 판단할 수 있다.
 */
export function buildAppHeaders(source: AppInfoSource): Record<string, string> | null {
  if (!source.isNative) return null;

  const headers: Record<string, string> = {
    // 서버 파싱 스펙이 대문자(IOS/ANDROID)다.
    'X-App-Platform': source.platform.toUpperCase(),
  };
  if (source.appVersion) headers['X-App-Version'] = source.appVersion;
  if (source.appBuildNumber) headers['X-App-Build-Number'] = source.appBuildNumber;
  return headers;
}
