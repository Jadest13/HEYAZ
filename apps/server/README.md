# HEYAZ Server

Hono + TypeScript 서버입니다. 요청·응답 스키마는 `packages/contracts`, 화면 코드는 `packages/app`에 있으며 서버는 화면 패키지를 가져오지 않습니다. 기존 Web/Native는 아직 로컬 저장소를 사용합니다.

## 바로 실행

Node.js 24 이상에서 저장소 루트 기준으로 실행합니다.

```sh
npm ci
npm run dev:server
```

- 서버: `http://127.0.0.1:3000`
- 프로세스 상태: `GET /health`
- DB 준비 상태: `GET /ready`
- OpenAPI 3.0 문서: `GET /openapi.json` — Postman 등의 도구로 가져올 수 있습니다.
- 개발용 Bearer 토큰: `heyaz-local-development-only-token`

기본 모드는 `127.0.0.1`에서만 동작하는 개발용 인증과 PGlite, 규칙 기반 Mock 코치입니다. 개발용 토큰은 로그인 서비스가 아니며 한 개발 계정에 연결됩니다. 데이터는 `apps/server/.data/postgres`에 저장되고 재시작 후 유지됩니다. PGlite는 한 프로세스에서 사용해야 합니다. 같은 데이터 폴더로 서버를 중복 실행하지 마세요.

설정을 바꾸려면 `apps/server/.env.example`을 같은 폴더의 `.env`로 복사해 수정합니다. 기본 설정으로 실행할 때는 복사가 필요 없습니다. 계약을 수정했다면 `dev:server`를 다시 실행하거나 별도 터미널에서 `npm run build -w @heyaz/contracts`를 실행합니다.

PowerShell 조회 예시:

```powershell
$headers = @{ Authorization = 'Bearer heyaz-local-development-only-token' }
$plan = Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/plan' -Headers $headers
$plan
```

운동 시작 예시:

```powershell
$headers['Idempotency-Key'] = [guid]::NewGuid().ToString()
$body = @{ dayId = $plan.days[0].id; planRevision = $plan.revision } | ConvertTo-Json
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/sessions' -Method Post -Headers $headers -ContentType 'application/json' -Body $body
```

이 예시는 실제 개발 DB에 활성 운동을 만듭니다. 같은 요청을 재시도할 때는 같은 키와 본문을 사용하고, 다른 작업에는 새 키를 발급합니다.

## 명령

저장소 루트에서 실행합니다.

| 명령                   | 기능                                            |
| ---------------------- | ----------------------------------------------- |
| `npm run dev:server`   | 계약 빌드 후 서버 변경 감지 실행                |
| `npm run build:server` | 계약과 서버를 JavaScript로 빌드                 |
| `npm run start:server` | 빌드한 서버 실행                                |
| `npm run test:server`  | 실제 PGlite DB를 사용하는 서버 테스트           |
| `npm run typecheck`    | Web·Native·계약·서버 및 서버 테스트의 타입 검사 |
| `npm run lint`         | 공통 ESLint 설정으로 전체 검사                  |
| `npm run format:check` | 공통 Prettier 설정으로 형식 검사                |
| `npm run db:generate`  | Drizzle 스키마 변경에 대한 마이그레이션 생성    |
| `npm run db:migrate`   | 설정한 DB에 마이그레이션 적용                   |

빌드 결과는 `apps/server/dist`와 `packages/contracts/dist`입니다. 실행에는 서버 폴더의 `drizzle` 마이그레이션과 계약 패키지도 필요합니다. 단독 배포 디렉터리를 만든다면 이 파일들과 workspace 의존성을 함께 포함해야 합니다.

## PostgreSQL과 인증 연결

일반 PostgreSQL을 사용하려면 `.env`에서 `DATABASE_DRIVER=postgres`와 `DATABASE_URL`을 설정하고 먼저 `npm run db:migrate`를 실행합니다. 개발용 PostgreSQL을 직접 실행할 경우 다음 Compose 파일을 사용할 수 있습니다.

```sh
docker compose -f apps/server/compose.yaml up -d
npm run db:migrate
```

Compose의 접속 정보는 로컬 개발용이며 `.env.example`의 PostgreSQL 예시와 같습니다. 이 환경에서는 Docker/PostgreSQL 서버가 설치되어 있지 않아 Compose 실행은 검증하지 않았습니다. 마이그레이션과 쿼리는 PGlite PostgreSQL 엔진으로 검증했습니다.

운영 실행은 `NODE_ENV=production`, `DATABASE_DRIVER=postgres`, `AUTH_MODE=oidc`를 요구합니다. 개발용 인증으로 외부 인터페이스에 바인딩하거나 운영 모드로 시작하면 설정 오류를 반환합니다.

OIDC는 다음 설정으로 이미 발급된 액세스 토큰의 서명, 발급자, 대상 API, 만료를 검증합니다.

```dotenv
AUTH_MODE=oidc
OIDC_ISSUER=https://your-identity-provider.example
OIDC_AUDIENCE=heyaz-api
OIDC_JWKS_URL=https://your-identity-provider.example/.well-known/jwks.json
```

허용 알고리즘은 RS256·ES256이고 `sub`, `exp`, `iat`가 필요합니다. 로그인 화면·회원가입·소셜 OAuth 콜백·토큰 발급·로그아웃/갱신은 제공자 결정 후 연결해야 합니다. 사용자 식별자는 검증된 `iss`와 `sub`에서 파생하며 클라이언트의 사용자 ID 필드를 신뢰하지 않습니다.

실제 AI 제공자는 아직 연결하지 않았습니다. `src/services/coach.ts`의 `CoachProvider`를 교체하고 `createApp`에 전달할 수 있습니다. 응답 스키마 검증, 15초 응답 대기 제한, 성공 시 이용량 저장과 사용자 승인 절차가 준비되어 있습니다. 외부 제공자 어댑터는 실제 네트워크 취소도 구현해야 합니다. 운영 모드의 기본 `COACH_MODE`는 `disabled`입니다.

## 구현 구조와 범위

- `src/app.ts`: API 등록, 인증 연결, 공통 오류·검증·문서화
- `src/services`: 계획·프로필·운동·신체 기록·Burning Day·집계·코치 처리
- `src/db`: Drizzle 스키마, PostgreSQL/PGlite 연결, 사용자별 트랜잭션 저장소
- `src/config.ts`, `src/auth.ts`: 환경 변수 검증과 인증
- `drizzle`: 변경 이력을 보존하는 SQL 마이그레이션

DB는 계정, 도메인별 문서(`resources`), 재전송 응답, 코치 사용 원장의 4개 테이블을 사용합니다. 프로필·계획·세션 등을 각각 별도 JSONB 문서로 저장합니다. 각 사용자 행을 잠가 요청의 조회·수정·재전송 기록을 하나의 트랜잭션으로 처리합니다. 계획·세션·신체 기록·Burning Day의 버전 검사도 이 안에서 수행합니다.

현재 목록·분석은 사용자별 도메인 문서를 읽어 서버에서 집계·페이지 분할합니다. 데이터가 많아지는 단계에서는 날짜별 DB 인덱스와 SQL 집계, 개별 테이블 분리를 진행해야 합니다. 코치 응답을 기다리는 동안에도 해당 사용자 잠금을 유지하므로 같은 사용자의 다른 요청은 대기합니다. 다중 프로세스 PostgreSQL 부하 시험과 운영 백업·재전송 키 보관 기간은 후속 작업입니다.

API별 입력·오류·기존 앱과의 차이는 [API 안내](../../docs/server-api.md)를 참고하세요. 프론트엔드의 API 연결, 기존 로컬 데이터 이전, 소셜 로그인, 실제 AI·결제·Push·Health, 운영 배포는 아직 완료되지 않았습니다.

## 검증 기록

2026-09-09: 서버 테스트 31개와 기존 앱 테스트 19개, 전체 TypeScript 검사, ESLint, Prettier 검사, 서버/Web 빌드 통과. PGlite에서 마이그레이션, 계정 분리, 동시 요청의 단일 활성 세션·버전 충돌, 재전송, DB 재시작 후 저장 유지, 코치 이용량·실패 롤백·승인, 초기화 이전 요청 무효화를 검증했습니다. OIDC는 테스트용 서명 키로 서명·발급자·대상·만료를 검증했으며 실제 인증 제공자 연결 시험은 아닙니다.

빌드한 서버를 실행해 `/health`, `/ready`, `/openapi.json`의 HTTP 응답도 확인했습니다. 서버 실행용 의존성의 `npm audit --omit=dev --workspace=@heyaz/server` 결과는 알려진 취약점 0건입니다. 일반 PostgreSQL 인스턴스 연결과 운영 배포는 수행하지 않았습니다.
