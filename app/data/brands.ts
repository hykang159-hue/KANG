export type RacketLine = {
  name: string;
  tagline: string;
  weight: string;
  headSize: string;
  feel: string;
};

export type Brand = {
  id: string;
  name: string;
  origin: string;
  summary: string;
  accent: string;
  lines: RacketLine[];
};

export const brands: Brand[] = [
  {
    id: "wilson",
    name: "Wilson",
    origin: "USA",
    summary: "투어에서 가장 많이 선택되는 클래식 퍼포먼스 라인.",
    accent: "#1a3c6e",
    lines: [
      {
        name: "Pro Staff",
        tagline: "정밀한 컨트롤과 솔리드한 타구감",
        weight: "315g",
        headSize: "97 sq.in",
        feel: "컨트롤",
      },
      {
        name: "Blade",
        tagline: "현대 투어 플레이어의 표준",
        weight: "305g",
        headSize: "98 sq.in",
        feel: "밸런스",
      },
      {
        name: "Clash",
        tagline: "유연한 프레임으로 편안한 파워",
        weight: "295g",
        headSize: "100 sq.in",
        feel: "컴포트",
      },
      {
        name: "Ultra",
        tagline: "가볍고 시원한 파워 히팅",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "파워",
      },
      {
        name: "Shift",
        tagline: "스핀과 안정성을 동시에",
        weight: "315g",
        headSize: "99 sq.in",
        feel: "스핀",
      },
    ],
  },
  {
    id: "babolat",
    name: "Babolat",
    origin: "France",
    summary: "스핀과 파워로 현대 게임을 정의한 브랜드.",
    accent: "#c8102e",
    lines: [
      {
        name: "Pure Aero",
        tagline: "공기역학 프레임의 스핀 머신",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "스핀",
      },
      {
        name: "Pure Drive",
        tagline: "가장 대중적인 올라운드 파워",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "파워",
      },
      {
        name: "Pure Strike",
        tagline: "날카로운 컨트롤과 타격감",
        weight: "305g",
        headSize: "98 sq.in",
        feel: "컨트롤",
      },
      {
        name: "Pure Aero Rafa",
        tagline: "라파의 공격적인 스핀 셋업",
        weight: "317g",
        headSize: "100 sq.in",
        feel: "스핀",
      },
    ],
  },
  {
    id: "head",
    name: "HEAD",
    origin: "Austria",
    summary: "속도·스핀·컨트롤을 세분한 투어 라인업.",
    accent: "#e87722",
    lines: [
      {
        name: "Speed",
        tagline: "빠른 스윙과 균형 잡힌 반응",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "밸런스",
      },
      {
        name: "Radical",
        tagline: "다재다능한 올코트 무기",
        weight: "315g",
        headSize: "98 sq.in",
        feel: "밸런스",
      },
      {
        name: "Extreme",
        tagline: "스핀과 파워를 극대화",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "스핀",
      },
      {
        name: "Gravity",
        tagline: "넓은 스윗스팟의 컴포트 히팅",
        weight: "305g",
        headSize: "100 sq.in",
        feel: "컴포트",
      },
      {
        name: "Prestige",
        tagline: "클래식 플레이어용 컨트롤 머신",
        weight: "320g",
        headSize: "95–98 sq.in",
        feel: "컨트롤",
      },
    ],
  },
  {
    id: "yonex",
    name: "Yonex",
    origin: "Japan",
    summary: "아이소메트릭 헤드로 안정성과 스윗스팟을 넓힌 라인.",
    accent: "#0d5c63",
    lines: [
      {
        name: "EZONE",
        tagline: "파워와 편안함의 아이소메트릭",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "파워",
      },
      {
        name: "VCORE",
        tagline: "스핀 친화적인 공격형 프레임",
        weight: "300g",
        headSize: "98–100 sq.in",
        feel: "스핀",
      },
      {
        name: "Percept",
        tagline: "정밀한 감각과 컨트롤",
        weight: "305g",
        headSize: "98 sq.in",
        feel: "컨트롤",
      },
      {
        name: "Astrel",
        tagline: "여성·주니어 친화 컴포트 파워",
        weight: "270–280g",
        headSize: "100 sq.in",
        feel: "컴포트",
      },
    ],
  },
  {
    id: "tecnifibre",
    name: "Tecnifibre",
    origin: "France",
    summary: "스트링 기술이 녹아든 감각 중심 퍼포먼스.",
    accent: "#2b2b2b",
    lines: [
      {
        name: "TFight",
        tagline: "투어 레벨의 단단한 타구감",
        weight: "305–315g",
        headSize: "98–100 sq.in",
        feel: "컨트롤",
      },
      {
        name: "TF-X1",
        tagline: "진동 흡수에 초점 둔 컴포트",
        weight: "285–300g",
        headSize: "100 sq.in",
        feel: "컴포트",
      },
      {
        name: "Tempo",
        tagline: "여성 플레이어를 위한 경량 파워",
        weight: "255–275g",
        headSize: "100–105 sq.in",
        feel: "파워",
      },
    ],
  },
  {
    id: "dunlop",
    name: "Dunlop",
    origin: "UK / Japan",
    summary: "클래식 브리티시 DNA와 현대 스핀 기술의 조합.",
    accent: "#f5c518",
    lines: [
      {
        name: "CX",
        tagline: "컨트롤과 감각을 살린 클래식",
        weight: "300–305g",
        headSize: "98 sq.in",
        feel: "컨트롤",
      },
      {
        name: "FX",
        tagline: "파워와 안정성의 올라운더",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "파워",
      },
      {
        name: "SX",
        tagline: "스핀 그루브가 돋보이는 공격형",
        weight: "300g",
        headSize: "100 sq.in",
        feel: "스핀",
      },
    ],
  },
];
