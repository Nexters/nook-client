#!/usr/bin/env node
// 관리자용. App Store Connect API 키(EXPO_ASC_*)로 기기 등록, 팀원 개발 인증서 발급, 개발 프로파일 재생성을 한다.
// Individual 계정이라 포털·Xcode 자동 서명을 팀원이 못 쓰므로 API 로 대신 만들어 파일로 건넨다.
//
//   ios-signing device <이름> <UDID>          기기 등록 후 프로파일 재생성
//   ios-signing cert <CSR 파일> [<이름>]       팀원 CSR 로 DEVELOPMENT 인증서 발급 후 프로파일 재생성
//   ios-signing profiles                      개발 프로파일 2개 재생성 (모든 개발 인증서 + 모든 기기 포함)
//
// 결과물은 build/ios-signing/ 에 떨어진다. .cer 와 .mobileprovision 은 비밀이 아니다 (개인키는 CSR 만든 맥에 있다).
import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { ios } = JSON.parse(readFileSync(join(mobileRoot, 'native-public-config.json'), 'utf8'));
const outDir = join(mobileRoot, 'build', 'ios-signing');
const API = 'https://api.appstoreconnect.apple.com/v1';

function jwt() {
  const keyPath = process.env.EXPO_ASC_API_KEY_PATH;
  const kid = process.env.EXPO_ASC_KEY_ID;
  const iss = process.env.EXPO_ASC_ISSUER_ID;
  if (!keyPath || !kid || !iss) {
    throw new Error(
      'EXPO_ASC_API_KEY_PATH / EXPO_ASC_KEY_ID / EXPO_ASC_ISSUER_ID 가 필요하다 (02 문서 준비 절)',
    );
  }
  const b64 = (s) => Buffer.from(s).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' }))}.${b64(
    JSON.stringify({ iss, iat: now, exp: now + 1190, aud: 'appstoreconnect-v1' }),
  )}`;
  const sign = createSign('SHA256');
  sign.update(unsigned);
  sign.end();
  const sig = sign.sign({ key: readFileSync(keyPath, 'utf8'), dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${sig.toString('base64url')}`;
}

const token = jwt();

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) {
    const detail =
      json.errors?.map((e) => `${e.title}: ${e.detail}`).join('\n') ?? JSON.stringify(json);
    throw new Error(`${method} ${path} → ${res.status}\n${detail}`);
  }
  return json;
}

async function listAll(path) {
  const sep = path.includes('?') ? '&' : '?';
  return (await api('GET', `${path}${sep}limit=200`)).data;
}

async function registerDevice(name, udid) {
  if (!name || !udid) throw new Error('사용법: device <이름> <UDID>');
  const { data } = await api('POST', '/devices', {
    data: { type: 'devices', attributes: { name, platform: 'IOS', udid } },
  });
  console.log(`기기 등록: ${data.attributes.name} (${data.id})`);
}

async function issueCertificate(csrPath, name) {
  if (!csrPath) throw new Error('사용법: cert <CSR 파일> [<이름>]');
  const csrContent = readFileSync(csrPath, 'utf8');
  const { data } = await api('POST', '/certificates', {
    data: { type: 'certificates', attributes: { certificateType: 'DEVELOPMENT', csrContent } },
  });
  const file = join(outDir, `${name ?? data.id}.cer`);
  writeFileSync(file, Buffer.from(data.attributes.certificateContent, 'base64'));
  console.log(
    `인증서 발급: ${data.attributes.displayName} (${data.id}, ${data.attributes.expirationDate.slice(0, 10)} 만료)`,
  );
  console.log(`  → ${file}`);
}

async function regenerateProfiles() {
  const certs = (await listAll('/certificates?filter[certificateType]=DEVELOPMENT')).map(
    (c) => c.id,
  );
  const devices = (await listAll('/devices?filter[platform]=IOS&filter[status]=ENABLED')).map(
    (d) => d.id,
  );
  const bundleIds = await listAll('/bundleIds?filter[platform]=IOS');
  const existing = await listAll('/profiles?filter[profileType]=IOS_APP_DEVELOPMENT');
  if (certs.length === 0)
    throw new Error('DEVELOPMENT 인증서가 하나도 없다. cert 명령으로 먼저 발급한다');

  for (const [identifier, name] of Object.entries(ios.devProfiles)) {
    const bundleId = bundleIds.find((b) => b.attributes.identifier === identifier);
    if (!bundleId) throw new Error(`Apple 에 등록된 번들 ID 가 없다: ${identifier}`);
    for (const old of existing.filter((p) => p.attributes.name === name)) {
      await api('DELETE', `/profiles/${old.id}`);
    }
    const { data } = await api('POST', '/profiles', {
      data: {
        type: 'profiles',
        attributes: { name, profileType: 'IOS_APP_DEVELOPMENT' },
        relationships: {
          bundleId: { data: { type: 'bundleIds', id: bundleId.id } },
          certificates: { data: certs.map((id) => ({ type: 'certificates', id })) },
          devices: { data: devices.map((id) => ({ type: 'devices', id })) },
        },
      },
    });
    const file = join(outDir, `${name}.mobileprovision`);
    writeFileSync(file, Buffer.from(data.attributes.profileContent, 'base64'));
    console.log(
      `프로파일 생성: ${name} — 인증서 ${certs.length}개, 기기 ${devices.length}대, ${data.attributes.expirationDate.slice(0, 10)} 만료`,
    );
    console.log(`  → ${file}`);
  }
}

const [command, ...args] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
try {
  switch (command) {
    case 'device':
      await registerDevice(args[0], args[1]);
      await regenerateProfiles();
      break;
    case 'cert':
      await issueCertificate(args[0], args[1]);
      await regenerateProfiles();
      break;
    case 'profiles':
      await regenerateProfiles();
      break;
    default:
      console.error(
        '사용법: ios-signing <device <이름> <UDID> | cert <CSR 파일> [<이름>] | profiles>',
      );
      process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
