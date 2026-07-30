import https from "node:https";
import { URL } from "node:url";
import type { CourtSlot, DayAvailability, TimeSlot } from "./types";

const YCS_ORIGIN = "https://www.ycs.or.kr";
const COMPANY_CODE = "YCS04";
const PART_CODE = "02";
const RENT_TYPE = "1001";
const CACHE_TTL_MS = 90_000;

// YCS leaf cert chain is incomplete in Node's trust store.
const ycsAgent = new https.Agent({ rejectUnauthorized: false });

const UNAVAILABLE_USE_YN = new Set(["Y", "E", "U"]);

type YcsPlace = {
  place_cd: string;
  place_nm: string;
};

type YcsMonthTimeRow = {
  place_cd: string;
  date: string;
  start_time: string;
  end_time: string;
  use_yn: string;
};

type SessionState = {
  cookie: string;
  memNo: string;
};

type CacheEntry = {
  expiresAt: number;
  days: DayAvailability[];
};

type YcsResponse = {
  status: number;
  headers: Headers;
  setCookie: string[];
  text: string;
};

export class YcsSessionError extends Error {
  sessionExpired = true;

  constructor(message: string) {
    super(message);
    this.name = "YcsSessionError";
  }
}

let sessionState: SessionState | null = null;
let sessionLock: Promise<SessionState> | null = null;
const monthCache = new Map<string, CacheEntry>();

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function toYcsDate(year: number, month: number, day: number): string {
  return `${year}${pad2(month)}${pad2(day)}`;
}

function normalizeYcsDate(raw: string): string {
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

function courtNameFromPlace(place: YcsPlace): string {
  const numeric = Number(place.place_cd);
  if (Number.isFinite(numeric)) {
    return `${numeric}코트`;
  }
  return place.place_nm;
}

function isSlotAvailable(useYn: string): boolean {
  return !UNAVAILABLE_USE_YN.has(useYn);
}

function mergeSetCookie(
  existing: string,
  setCookieHeaders: string[],
): string {
  const jar = new Map<string, string>();
  for (const part of existing.split(";").map((item) => item.trim())) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    jar.set(part.slice(0, eq), part.slice(eq + 1));
  }

  for (const header of setCookieHeaders) {
    const first = header.split(";")[0]?.trim();
    if (!first) continue;
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    jar.set(first.slice(0, eq), first.slice(eq + 1));
  }

  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function headersFromNode(
  nodeHeaders: NodeJS.Dict<string | string[]>,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

async function ycsRequest(
  path: string,
  init: {
    method?: string;
    cookie?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<YcsResponse> {
  const url = new URL(path, YCS_ORIGIN);
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/html;q=0.9,*/*;q=0.8",
    ...init.headers,
  };
  if (init.cookie) {
    headers.Cookie = init.cookie;
  }

  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers,
        agent: ycsAgent,
      },
      (response) => {
        const chunks: Buffer[] = [];
        const rawSetCookie = response.headers["set-cookie"];
        const setCookie = Array.isArray(rawSetCookie)
          ? rawSetCookie
          : rawSetCookie
            ? [rawSetCookie]
            : [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: headersFromNode(response.headers),
            setCookie,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.on("error", reject);
    if (init.body) {
      request.write(init.body);
    }
    request.end();
  });
}

function readSecurityToken(html: string): string {
  const match = html.match(/name="SecurityToken"\s+value="([^"]+)"/);
  if (!match?.[1]) {
    throw new YcsSessionError("YCS 로그인 토큰을 찾지 못했습니다.");
  }
  return match[1];
}

async function loginWithCredentials(): Promise<SessionState> {
  const user = process.env.YCS_USER?.trim();
  const password = process.env.YCS_PASSWORD?.trim();
  const staticCookie = process.env.YCS_COOKIE?.trim();

  if (staticCookie && (!user || !password)) {
    return { cookie: staticCookie, memNo: "" };
  }

  if (!user || !password) {
    throw new YcsSessionError(
      "YCS_USER / YCS_PASSWORD 또는 YCS_COOKIE를 .env.local에 설정하세요.",
    );
  }

  const loginPath = "/fmcs/133?referer=%2Ffmcs%2F4";
  const loginPage = await ycsRequest(loginPath, {
    method: "GET",
    cookie: staticCookie,
  });
  let cookie = mergeSetCookie(staticCookie ?? "", loginPage.setCookie);
  const token = readSecurityToken(loginPage.text);
  const body = new URLSearchParams({
    SecurityToken: token,
    user_id: user,
    user_password: password,
  }).toString();

  const loginResponse = await ycsRequest(loginPath, {
    method: "POST",
    cookie,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${YCS_ORIGIN}${loginPath}`,
      Origin: YCS_ORIGIN,
      "Content-Length": String(Buffer.byteLength(body)),
    },
    body,
  });
  cookie = mergeSetCookie(cookie, loginResponse.setCookie);

  const location = loginResponse.headers.get("location");
  if (location) {
    const redirectPath = location.startsWith("http")
      ? new URL(location).pathname + new URL(location).search
      : location;
    const redirected = await ycsRequest(redirectPath, {
      method: "GET",
      cookie,
    });
    cookie = mergeSetCookie(cookie, redirected.setCookie);
  }

  const memNo = await fetchMemNo(cookie);
  if (!memNo) {
    throw new YcsSessionError(
      "YCS 로그인에 실패했습니다. 아이디/비밀번호를 확인하거나 세션을 갱신하세요.",
    );
  }

  return { cookie, memNo };
}

async function fetchMemNo(cookie: string): Promise<string> {
  const response = await ycsRequest("/fmcs/4", {
    method: "GET",
    cookie,
    headers: {
      Accept: "text/html",
      Referer: `${YCS_ORIGIN}/fmcs/133`,
    },
  });
  if (
    response.text.includes("회원 로그인") &&
    response.text.includes('id="memberLoginForm"')
  ) {
    return "";
  }
  const match = response.text.match(/MEM_NO\s*=\s*'([^']*)'/);
  return match?.[1] ?? "";
}

async function ensureSession(forceRefresh = false): Promise<SessionState> {
  if (!forceRefresh && sessionState?.cookie && sessionState.memNo) {
    return sessionState;
  }

  if (sessionLock) {
    const locked = await sessionLock;
    if (!forceRefresh && locked.cookie && locked.memNo) {
      return locked;
    }
  }

  sessionLock = (async () => {
    if (!forceRefresh && sessionState?.cookie && sessionState.memNo) {
      return sessionState;
    }

    sessionState = await loginWithCredentials();
    if (!sessionState.memNo && sessionState.cookie) {
      sessionState.memNo = await fetchMemNo(sessionState.cookie);
    }
    if (!sessionState.memNo) {
      sessionState = null;
      throw new YcsSessionError(
        "YCS 세션이 만료되었거나 로그인이 필요합니다. .env.local 값을 갱신하세요.",
      );
    }
    return sessionState;
  })();

  try {
    return await sessionLock;
  } finally {
    sessionLock = null;
  }
}

async function postJson<T>(
  path: string,
  data: Record<string, string>,
  session: SessionState,
): Promise<T> {
  const body = new URLSearchParams(data).toString();
  const response = await ycsRequest(path, {
    method: "POST",
    cookie: session.cookie,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${YCS_ORIGIN}/fmcs/4`,
      Origin: YCS_ORIGIN,
      "Content-Length": String(Buffer.byteLength(body)),
    },
    body,
  });

  if (
    response.status === 401 ||
    response.status === 302 ||
    response.text.includes("회원 로그인") ||
    response.text.includes("로그인을 하셔야만")
  ) {
    throw new YcsSessionError("YCS 세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  try {
    return JSON.parse(response.text) as T;
  } catch {
    throw new Error(`YCS 응답 파싱 실패: ${path}`);
  }
}

async function fetchPlaces(session: SessionState): Promise<YcsPlace[]> {
  const places = await postJson<YcsPlace[]>(
    "/rest/common/place",
    {
      company_code: COMPANY_CODE,
      group_cd: "",
      part_code: PART_CODE,
    },
    session,
  );

  if (!Array.isArray(places) || places.length === 0) {
    throw new Error("목동테니스장 코트 목록을 가져오지 못했습니다.");
  }
  return places;
}

async function fetchPlaceMonthTimes(
  session: SessionState,
  placeCode: string,
  baseDate: string,
): Promise<YcsMonthTimeRow[]> {
  const rows = await postJson<YcsMonthTimeRow[]>(
    "/rest/facilities/place_month_time_state_list",
    {
      company_code: COMPANY_CODE,
      part_code: PART_CODE,
      place_code: placeCode,
      base_date: baseDate,
      rent_type: RENT_TYPE,
      mem_no: session.memNo,
    },
    session,
  );
  return Array.isArray(rows) ? rows : [];
}

function buildDaysFromRows(
  year: number,
  month: number,
  places: YcsPlace[],
  rows: YcsMonthTimeRow[],
): DayAvailability[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthPrefix = `${year}${pad2(month)}`;

  type SlotAcc = Map<string, { available: boolean; placeCd: string }>;
  const byDate = new Map<string, Map<string, SlotAcc>>();

  for (const row of rows) {
    const compactDate = row.date.replace(/-/g, "");
    if (!compactDate.startsWith(monthPrefix)) {
      continue;
    }
    const isoDate = normalizeYcsDate(row.date);
    const slotKey = `${row.start_time}|${row.end_time}`;
    let dayMap = byDate.get(isoDate);
    if (!dayMap) {
      dayMap = new Map();
      byDate.set(isoDate, dayMap);
    }
    let slotMap = dayMap.get(slotKey);
    if (!slotMap) {
      slotMap = new Map();
      dayMap.set(slotKey, slotMap);
    }
    const previous = slotMap.get(row.place_cd);
    const available = isSlotAvailable(row.use_yn);
    if (!previous || available) {
      slotMap.set(row.place_cd, { available, placeCd: row.place_cd });
    }
  }

  const days: DayAvailability[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = formatIsoDate(year, month, day);
    const dayMap = byDate.get(isoDate);
    if (!dayMap || dayMap.size === 0) {
      days.push({ date: isoDate, slots: [] });
      continue;
    }

    const slotKeys = [...dayMap.keys()].sort((left, right) => {
      const [leftStart] = left.split("|");
      const [rightStart] = right.split("|");
      return leftStart.localeCompare(rightStart);
    });

    const slots: TimeSlot[] = slotKeys.map((slotKey) => {
      const [start, end] = slotKey.split("|");
      const courtStates = dayMap.get(slotKey) ?? new Map();
      const courts: CourtSlot[] = places.map((place) => {
        const state = courtStates.get(place.place_cd);
        return {
          courtId: place.place_cd,
          courtName: courtNameFromPlace(place),
          available: state?.available ?? false,
        };
      });
      return { start, end, courts };
    });

    days.push({ date: isoDate, slots });
  }

  return days;
}

async function fetchMonthAvailabilityUncached(
  year: number,
  month: number,
): Promise<DayAvailability[]> {
  let session = await ensureSession(false);
  const baseDate = toYcsDate(year, month, 1);

  const loadAll = async (activeSession: SessionState) => {
    const places = await fetchPlaces(activeSession);
    const rowGroups = await Promise.all(
      places.map((place) =>
        fetchPlaceMonthTimes(activeSession, place.place_cd, baseDate),
      ),
    );
    return buildDaysFromRows(year, month, places, rowGroups.flat());
  };

  try {
    return await loadAll(session);
  } catch (error) {
    if (!(error instanceof YcsSessionError)) {
      throw error;
    }
    session = await ensureSession(true);
    return await loadAll(session);
  }
}

export async function fetchMonthAvailability(
  year: number,
  month: number,
  options: { bypassCache?: boolean } = {},
): Promise<DayAvailability[]> {
  const cacheKey = `${year}-${pad2(month)}`;
  const cached = monthCache.get(cacheKey);
  if (!options.bypassCache && cached && cached.expiresAt > Date.now()) {
    return cached.days;
  }

  const days = await fetchMonthAvailabilityUncached(year, month);
  monthCache.set(cacheKey, {
    days,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return days;
}
