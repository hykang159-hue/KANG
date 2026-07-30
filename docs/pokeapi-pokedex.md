# PokéAPI — 도감 조회용 API 가이드

출처: [PokéAPI Docs v2 — Pokémon](https://pokeapi.co/docs/v2#pokemon)

Base URL: `https://pokeapi.co/api/v2`

- 소비 전용 API (HTTP **GET**만 가능)
- 인증 불필요
- Fair Use: 요청 결과는 **로컬 캐시** 권장

---

## 도감에서 실제로 쓸 API

| 목적 | 엔드포인트 | 예시 |
|------|------------|------|
| 목록 (페이지) | `GET /pokemon?limit=&offset=` | `/pokemon?limit=20&offset=0` |
| 상세 조회 (이름/번호) | `GET /pokemon/{id or name}` | `/pokemon/25`, `/pokemon/pikachu` |
| 도감 설명·분류·진화 | `GET /pokemon-species/{id or name}` | `/pokemon-species/25` |

---

## 1. 목록 — 도감 리스트

```http
GET https://pokeapi.co/api/v2/pokemon?limit=20&offset=0
```

| 쿼리 | 설명 |
|------|------|
| `limit` | 한 번에 가져올 개수 (기본 20) |
| `offset` | 건너뛸 개수 (페이지네이션) |

예시:
- 1세대만: `?limit=151&offset=0`
- 전체: `?limit=1025&offset=0`

### 응답 예시

```json
{
  "count": 1302,
  "next": "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
  "previous": null,
  "results": [
    {
      "name": "bulbasaur",
      "url": "https://pokeapi.co/api/v2/pokemon/1/"
    }
  ]
}
```

### 주요 필드

| 필드 | 설명 |
|------|------|
| `count` | 전체 리소스 개수 |
| `next` | 다음 페이지 URL |
| `previous` | 이전 페이지 URL |
| `results[].name` | 포켓몬 이름 |
| `results[].url` | 상세 API URL |

---

## 2. 상세 조회 — 검색 / 카드 클릭

```http
GET https://pokeapi.co/api/v2/pokemon/{id or name}/
```

예:
- `https://pokeapi.co/api/v2/pokemon/1/`
- `https://pokeapi.co/api/v2/pokemon/bulbasaur/`
- `https://pokeapi.co/api/v2/pokemon/pikachu/`

### 도감 UI에서 바로 쓸 필드

| 필드 | 설명 |
|------|------|
| `id` | 도감 번호 |
| `name` | 이름 |
| `height` | 키 (단위: 0.1m) |
| `weight` | 몸무게 (단위: 0.1kg) |
| `types` | 타입 목록 |
| `stats` | HP, 공격 등 능력치 |
| `abilities` | 특성 |
| `sprites` | 이미지 URL |
| `species.url` | Species API로 이어지는 URL |
| `moves` | 기술 목록 |

### 이미지 경로 예시

- 기본: `sprites.front_default`
- 공식 아트: `sprites.other["official-artwork"].front_default`

---

## 3. 종(Species) — 도감 설명문

```http
GET https://pokeapi.co/api/v2/pokemon-species/{id or name}/
```

예: `https://pokeapi.co/api/v2/pokemon-species/25/`

### 주요 필드

| 필드 | 설명 |
|------|------|
| `flavor_text_entries` | 도감 설명문 (언어별) |
| `genera` | 분류 (예: 쥐포켓몬) |
| `names` | 다국어 이름 |
| `evolution_chain.url` | 진화 체인 URL |
| `color` | 색상 |
| `habitat` | 서식지 |
| `is_legendary` | 전설 여부 |
| `is_mythical` | 환상 여부 |

한국어 설명 예시:

```ts
const koreanFlavor = species.flavor_text_entries.find(
  (entry) => entry.language.name === "ko"
);
```

---

## 추천 호출 흐름

```
목록 화면
  └─ GET /pokemon?limit=20&offset=0

검색 / 상세
  ├─ GET /pokemon/{id or name}          ← 스탯, 타입, 이미지
  └─ GET /pokemon-species/{id or name}  ← 도감 설명, 분류

진화 (선택)
  └─ species.evolution_chain → GET /evolution-chain/{id}
```

---

## 부가 API (필요할 때)

| 기능 | 엔드포인트 |
|------|------------|
| 타입별 필터 | `GET /type/{name}` |
| 게임별 도감 | `GET /pokedex/{id or name}` (예: `national`) |
| 진화 트리 | `GET /evolution-chain/{id}` |
| 출현 장소 | `GET /pokemon/{id or name}/encounters` |

---

## 최소 구현 예시

```ts
const baseUrl = "https://pokeapi.co/api/v2";

// 목록
const list = await fetch(`${baseUrl}/pokemon?limit=20&offset=0`).then(
  (response) => response.json()
);

// 상세 (이름 또는 번호)
const pokemon = await fetch(`${baseUrl}/pokemon/pikachu`).then((response) =>
  response.json()
);

// 도감 설명
const species = await fetch(pokemon.species.url).then((response) =>
  response.json()
);

const koreanFlavor = species.flavor_text_entries.find(
  (entry: { language: { name: string } }) => entry.language.name === "ko"
);
```

---

## 한 줄 요약

목록은 `/pokemon`, 조회는 `/pokemon/{이름|번호}`, 도감 설명은 `/pokemon-species/{이름|번호}`를 함께 사용하면 된다.
