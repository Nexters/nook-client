# Local HTTPS certificates

```bash
mkcert -install
cd apps/web/certs
mkcert <YOUR_LOCAL_IP> localhost 127.0.0.1
```

생성된 키와 인증서 경로를 `apps/web/.env.local`에 입력한다.

iPhone에서 인증서를 신뢰하려면 다음 순서로 진행한다.

1. 터미널에서 `open "$(mkcert -CAROOT)"` 실행
2. `rootCA.pem`을 AirDrop으로 iPhone에 전송
3. iPhone에서 프로파일 설치
4. 설정 → 일반 → 정보 → 인증서 신뢰 설정
5. mkcert Root CA 전체 신뢰 활성화
