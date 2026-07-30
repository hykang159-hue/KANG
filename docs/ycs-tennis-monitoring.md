# YCS 목동테니스장 모니터링 연동 가이드

예약 **조회(모니터링)만** 대상으로 합니다. 예약·결제 POST는 호출하지 마세요.

관련 UI: `/tennis`  
관련 API: `GET /api/tennis/availability?year=YYYY&month=M`  
구현: [`app/tennis/ycs-client.ts`](../app/tennis/ycs-client.ts)

## 환경변수

| 키 | 설명 |
|----|------|
| `TENNIS_DATA_SOURCE` | `mock` \| `ycs` (기본 `mock`) |
| `YCS_USER` | YCS 로그인 아이디 |
| `YCS_PASSWORD` | YCS 로그인 비밀번호 |
| `YCS_COOKIE` | (선택) 브라우저에서 복사한 세션 쿠키. 로그인 실패 시 폴백 |

값은 `.env.local`에만 두고 커밋하지 마세요.

```bash
TENNIS_DATA_SOURCE=ycs
YCS_USER=
YCS_PASSWORD=
# YCS_COOKIE=FMCSSESSIONID=...
```

## 캡처된 엔드포인트

기준 시설:

| 항목 | 값 |
|------|-----|
| 센터 `company_code` | `YCS04` (목동테니스장) |
| 시설 `part_code` | `02` |
| 신청목적 `rent_type` | `1001` (체육경기) |
| 장소 `place_code` | `1`…`18` (코트) |

### 로그인

1. `GET /fmcs/133?referer=%2Ffmcs%2F4` → `SecurityToken` 추출  
2. `POST` 동일 URL  
   - body: `SecurityToken`, `user_id`, `user_password`  
   - cookie: `FMCSSESSIONID` 유지  
3. `GET /fmcs/4` → `MEM_NO` 추출 (로그인 성공 확인)

브라우저의 NetFunnel(`nfStart`)은 서버사이드 로그인에서 생략해도 조회 API는 동작했습니다.

### 코트 목록

`POST /rest/common/place`

```
company_code=YCS04
group_cd=
part_code=02
```

응답 예: `{ place_cd, place_nm }` → `코트-01` …

### 월별 시간대 현황 (모니터링 핵심)

`POST /rest/facilities/place_month_time_state_list`

```
company_code=YCS04
part_code=02
place_code={코트코드}
base_date=YYYYMMDD   # 해당 월 아무 날짜 (보통 1일)
rent_type=1001
mem_no={MEM_NO}
```

응답 필드 매핑:

| YCS 필드 | 앱 필드 | 비고 |
|----------|---------|------|
| `date` (`YYYYMMDD`) | `DayAvailability.date` | `YYYY-MM-DD`로 정규화 |
| `start_time` / `end_time` | `TimeSlot.start` / `end` | 그대로 `HH:mm` |
| `place_cd` / `place_nm` | `CourtSlot.courtId` / `courtName` | UI는 `N코트` |
| `use_yn` | `CourtSlot.available` | 아래 표 |

`use_yn` 의미 (원 사이트 JS 기준):

| 값 | 의미 | available |
|----|------|-----------|
| `N` | 예약가능 | `true` |
| `D` | 추첨접수 등 선택 가능 | `true` |
| `Y` | 예약완료 | `false` |
| `E` | 마감 | `false` |
| `U` | 예약불가 | `false` |

참고 엔드포인트 (일별 상세 UI용, 현재 월 집계에는 미사용):

- `POST /rest/facilities/place_month_state_list` — 일자별 마감/가능
- `POST /rest/facilities/place_time_state_list` — 특정일 시간대

## 앱 동작

1. 코트 18면에 대해 `place_month_time_state_list`를 병렬 조회  
2. 날짜·시간대별로 코트 가능 여부를 합쳐 `DayAvailability[]` 생성  
3. 표시 슬롯은 **YCS 실제 시간대** 기준  
   - 평일: 대개 `09:00`부터 1시간  
   - 주말: 대개 2시간 블록 + `21:00~22:00`  
4. 동일 `year/month`는 **90초** in-memory 캐시  
5. 세션 만료 시 `401` + `sessionExpired: true` → UI에 갱신 안내  
6. YCS HTTPS 인증서 체인이 Node 기본 CA로 검증되지 않아, `ycs-client`는 **해당 호스트 요청에만** `rejectUnauthorized: false` 에이전트를 사용합니다.

## 쿠키 갱신

1. 브라우저에서 YCS 재로그인  
2. DevTools → 요청 Cookie 또는 Application → Cookies에서 `FMCSSESSIONID` 복사  
3. `.env.local`의 `YCS_COOKIE` 갱신 후 `npm run dev` 재시작  

비밀번호를 채팅/문서에 넣지 마세요. 유출이 의심되면 YCS에서 비밀번호를 변경하세요.

## 체크리스트

- [x] 로그인 form / `SecurityToken` 확인
- [x] `YCS04` / `part 02` / 코트 1–18 확인
- [x] `place_month_time_state_list` 매핑
- [x] `TENNIS_DATA_SOURCE=ycs` 라우트 연결
- [x] 세션 만료 UI 메시지
- [x] 예약 POST 미호출

## 텔레그램 빈자리 알림

평일 `18:00~22:00`, 주말 `17:00~22:00`에 겹치는 슬롯에서 **새로 생긴** 가능 코트만 알림합니다.
오늘부터 7일 앞까지 조회합니다.

| 환경변수 | 설명 |
|----------|------|
| `TELEGRAM_BOT_TOKEN` | BotFather 토큰 |
| `TELEGRAM_CHAT_ID` | 수신 chat id |
| `TENNIS_ALERT_SECRET` | tick API Bearer 시크릿 |
| `CRON_SECRET` | Vercel Cron용 (보통 `TENNIS_ALERT_SECRET`과 동일) |

엔드포인트: `POST|GET /api/tennis/alerts/tick`  
헤더: `Authorization: Bearer <TENNIS_ALERT_SECRET>`

스케줄:
- Vercel Hobby는 Cron이 **하루 1회**만 가능 → [`vercel.json`](../vercel.json)은 `0 9 * * *` (UTC 09:00 = 한국 18:00) 백업용
- **5분 주기**는 GitHub Actions [`.github/workflows/tennis-alert.yml`](../.github/workflows/tennis-alert.yml)
  - Repo Settings → Secrets에 추가:
    - `TENNIS_ALERT_URL` = `https://kang-nu.vercel.app/api/tennis/alerts/tick`
    - `TENNIS_ALERT_SECRET` = Vercel과 동일한 시크릿
- 로컬 상시 실행: `npm run tennis:alerts`
