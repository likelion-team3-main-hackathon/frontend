# Tri Lion Health Frontend

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
