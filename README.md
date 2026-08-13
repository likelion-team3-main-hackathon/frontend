# Tri Lion Health Frontend

## 백엔드 API 연결 현황

현재 화면 흐름은 다음 실제 API와 연결되어 있습니다.

```text
Google 로그인
→ 사용자 상태 조회
→ 필수 약관 저장
→ 온보딩 정보 저장
→ 건강 문서 업로드
→ 건강 분석 생성 및 완료 폴링
→ 맞춤 루틴 생성 및 완료 폴링
→ 루틴 상세·오늘 루틴 조회
```

- Access Token 만료 시 HttpOnly Refresh Token 쿠키로 한 번 재발급한 뒤 요청을 재시도합니다.
- 건강 문서는 JPG, PNG, PDF 중 하나를 반드시 선택해야 분석을 진행할 수 있습니다.
- 홈의 루틴 목록·오늘 루틴·루틴 상세는 백엔드 응답을 사용합니다.
- 홈의 물·수면 컨디션 카드는 아직 UI 확인용 데이터이며 기록 API 연결 대상입니다.
- 추천 카드 목록은 현재 추천안 조회 API가 없어 UI 프리셋으로 남아 있고, 선택 결과는 실제 `POST /routines/generations` 요청값에 반영됩니다.

## 로컬 실행

백엔드 Docker 환경을 먼저 실행합니다.

```bash
cd ../tri_lion_health
docker compose up --build -d
```

프론트 환경변수를 준비하고 Vite를 실행합니다.

```bash
cd ../frontend
cp .env.example .env
```

`.env`의 `VITE_GOOGLE_CLIENT_ID`를 백엔드 `tri_lion_health/.env`의 `GOOGLE_CLIENT_ID`와 같은 Google OAuth Web Client ID로 변경합니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=실제값.apps.googleusercontent.com
```

```bash
npm ci
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

## Google Cloud 설정

사용하는 OAuth Web Client의 Authorized JavaScript origins에 다음 값을 등록해야 합니다.

```text
http://localhost:5173
```

Google 로그인 성공 시 프론트는 Google ID Token을 `POST /api/v1/auth/oauth/google`로 전달합니다. 플랫폼 Access Token은 `sessionStorage`, Refresh Token은 백엔드가 설정한 HttpOnly Cookie에 저장됩니다.

로컬 백엔드는 실제 Google 검증 모드여야 합니다.

```env
GOOGLE_FAKE_ENABLED=false
FRONTEND_ORIGIN=http://localhost:5173
```

설정을 바꾼 경우 백엔드를 재생성합니다.

```bash
cd ../tri_lion_health
docker compose up --build -d --force-recreate app
```

## 검증

```bash
npm run build
npm run lint
```
