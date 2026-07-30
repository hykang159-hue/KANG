# 포켓몬 상세 페이지 — 데이터 모델 설계 (검토용)

개별 포켓몬 페이지(`/poke/[id]`)에서 사용할 도메인 타입과, 각 필드를 채우기 위한 PokéAPI 엔드포인트 매핑입니다.

Base URL: `https://pokeapi.co/api/v2`

---

## 제안 타입

```ts
type PokemonStat = {
  name: string; // 예: "hp", "attack"
  baseStat: number;
};

type PokemonDetail = {
  id: number;
  name: {
    ko: string;
    en: string;
  };
  image: {
    front: string | null;
    back: string | null;
  };
  types: string[]; // 영어 slug 기준 (예: "electric"). 한국어 필요 시 아래 참고
  height: number; // m (API 원본은 0.1m 단위 → ÷10)
  weight: number; // kg (API 원본은 0.1kg 단위 → ÷10)
  cry: string | null; // 오디오 URL (.ogg)
  stats: PokemonStat[];
};
```

---

## 필드 ↔ 엔드포인트 매핑

| # | 필드 | 엔드포인트 | 응답 경로 | 비고 |
|---|------|------------|-----------|------|
| 1 | `id` | `GET /pokemon/{id}` | `id` | species에도 동일 id 존재 |
| 2.1 | `name.ko` | `GET /pokemon-species/{id}` | `names[]` where `language.name === "ko"` → `name` | 한국어 이름은 species에만 있음 |
| 2.2 | `name.en` | `GET /pokemon/{id}` | `name` | 또는 species `names[]` where `language.name === "en"` |
| 3.1 | `image.front` | `GET /pokemon/{id}` | `sprites.front_default` | 공식 아트는 `sprites.other["official-artwork"].front_default` |
| 3.2 | `image.back` | `GET /pokemon/{id}` | `sprites.back_default` | 없을 수 있음 → `null` |
| 4 | `types` | `GET /pokemon/{id}` | `types[].type.name` | `slot` 기준 정렬 권장. 값은 영어 slug |
| 5 | `height` | `GET /pokemon/{id}` | `height` | 원본 ÷ 10 → m |
| 6 | `weight` | `GET /pokemon/{id}` | `weight` | 원본 ÷ 10 → kg |
| 7 | `cry` | `GET /pokemon/{id}` | `cries.latest` | 대안: `cries.legacy` (구세대 울음소리) |
| 8 | `stats` | `GET /pokemon/{id}` | `stats[].stat.name`, `stats[].base_stat` | HP / 공격 / 방어 / 특공 / 특방 / 스피드 |

---

## 호출 전략 (권장)

필요한 엔드포인트는 **2개**면 충분합니다.

```
GET /pokemon/{id}           → id, 영어 이름, 이미지, 타입, 키, 몸무게, 울음소리, 종족값
GET /pokemon-species/{id}   → 한국어 이름
```

```ts
const [pokemon, species] = await Promise.all([
  fetch(`${baseUrl}/pokemon/${id}`).then((r) => r.json()),
  fetch(`${baseUrl}/pokemon-species/${id}`).then((r) => r.json()),
]);
```

이후 위 두 응답을 `PokemonDetail`로 매핑하면 됩니다.

---

## 타입(types) 한국어 표기 — 선택 사항

`/pokemon`의 `types[].type.name`은 `"electric"` 같은 **영어 slug**입니다.

한국어 타입명이 필요하면 타입마다 추가 호출이 필요합니다.

```
GET /type/{name}  →  names[] where language.name === "ko"
```

예: `electric` → `전기`

| 옵션 | 설명 |
|------|------|
| A. 영어 slug 유지 | 추가 호출 없음. UI에서 매핑 테이블로 한국어 표시 가능 |
| B. `/type/{name}` N회 호출 | 정확하지만 요청 수 증가 (보통 1~2개) |
| C. 앱 내 고정 맵 | `electric → 전기` 등 18타입 상수 맵 |

**권장:** 우선 A 또는 C. 페이지 설계 1차에서는 `types: string[]`(영어 slug)로 두고, 표시용 한국어는 상수 맵으로 처리.

---

## 종족값(stat) 이름

API `stat.name` 예시와 일반적 한국어 대응:

| API (`stat.name`) | 한국어 (표시용) |
|-------------------|-----------------|
| `hp` | HP |
| `attack` | 공격 |
| `defense` | 방어 |
| `special-attack` | 특수공격 |
| `special-defense` | 특수방어 |
| `speed` | 스피드 |

표시용 한국어는 API에 없으므로, UI/매핑 레이어에서 변환하는 편이 단순합니다.
(원하면 `GET /stat/{name}`의 `names[]`에서 `ko`를 가져올 수도 있음 — 타입과 동일한 선택지)

---

## 단위 변환

| 필드 | API 단위 | 앱 표시 단위 | 변환 |
|------|----------|--------------|------|
| `height` | 데시미터 (0.1m) | m | `height / 10` |
| `weight` | 헥토그램 (0.1kg) | kg | `weight / 10` |

---

## 정리

| 구분 | 내용 |
|------|------|
| 필수 호출 | `/pokemon/{id}` + `/pokemon-species/{id}` (병렬) |
| species가 필요한 이유 | 한국어 이름 (`names`) |
| 그 외 전부 | `/pokemon/{id}` 한 번에 확보 |
| 추가 호출 후보 | 타입/스탯 한국어 공식명 (`/type`, `/stat`) — 1차에서는 생략 권장 |

---

## 검토 포인트

1. `types` / `stats` 이름을 **영어 slug 유지**할지, **한국어까지 모델에 넣을지**
2. 이미지는 `front_default` / `back_default`로 할지, 공식 아트(`official-artwork`)를 쓸지
3. 울음소리는 `cries.latest`만 쓸지, `legacy` 선택 UI를 둘지
4. `height` / `weight`를 모델에 **변환된 값(m, kg)** 으로 둘지, **원본 그대로** 두고 UI에서 변환할지

확인되면 이 구조대로 `PokemonDetail` 타입과 페이지 매핑을 구현하겠습니다.
