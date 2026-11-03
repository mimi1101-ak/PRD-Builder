// 화면 미리보기: PRD 를 바탕으로 AI 가 쓴 "실제로 눌러 볼 수 있는 작은 웹앱" 한 장.
// AI 는 lib/preview-kit 의 디자인 키트 부품(클래스)과 실행 도우미(App)만 써서 HTML·스크립트를 쓰고,
// 서버가 키트 CSS·글꼴·도우미를 붙여 문서 한 장으로 만든다(lib/preview-doc.ts). 화면에서는 격리된 iframe 안에서 돌린다.
// 화면·서버가 함께 쓰므로 서버 전용 의존성은 넣지 않는다.

// 디자인 키트 5종: 정제된 쪽 paper·soft·console, 과감한 쪽 poster·night
export const PREVIEW_KITS = ["paper", "soft", "console", "poster", "night"] as const;
export type PreviewKit = (typeof PREVIEW_KITS)[number];
export const PREVIEW_KIT_LABELS: Record<PreviewKit, string> = {
  paper: "잡지형",
  soft: "앱형",
  console: "업무형",
  poster: "포스터형",
  night: "어두운 고급형",
};
export const PREVIEW_KIT_DESCRIPTIONS: Record<PreviewKit, string> = {
  paper: "크림색 종이, 큰 굵은 제목, 잉크 선",
  soft: "흰 둥근 면, 큰 숫자, 아래 탭",
  console: "왼쪽 메뉴, 촘촘한 표, 얇은 테두리",
  poster: "굵은 테두리, 큰 색면, 스티커",
  night: "검은 바탕, 가는 선, 얇고 큰 제목",
};
// 키트별 제목 글꼴 (모두 고딕 계열, 구글 폰트). 디자인을 바꿔 볼 때 화면에서도 쓴다
export const PREVIEW_KIT_FONTS: Record<PreviewKit, string> = {
  paper: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@600;700;800;900&display=swap",
  soft: "https://fonts.googleapis.com/css2?family=Jua&display=swap",
  console: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap",
  poster: "https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap",
  night: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap",
};

// 강조색 (단색만, lib/preview-kit/kits.css)
export const PREVIEW_ACCENTS = ["ink", "blue", "green", "teal", "orange", "red", "pink", "brown", "yellow"] as const;
export type PreviewAccent = (typeof PREVIEW_ACCENTS)[number];

// 반드시 있어야 하는 화면 네 개 (AI 가 2개까지 더 만들 수 있다)
export const PREVIEW_SCREENS = ["home", "pricing", "feature", "result"] as const;
export type PreviewScreen = (typeof PREVIEW_SCREENS)[number];
export const PREVIEW_SCREEN_LABELS: Record<PreviewScreen, string> = {
  home: "홈",
  pricing: "요금",
  feature: "기능",
  result: "결과",
};

// 만드는 중 진행 표시: 응답에서 각 화면과 스크립트가 처음 나오는 순간
export const PREVIEW_STAGES = [...PREVIEW_SCREENS, "script"] as const;
export type PreviewStage = (typeof PREVIEW_STAGES)[number];
export const PREVIEW_STAGE_LABELS: Record<PreviewStage, string> = {
  ...PREVIEW_SCREEN_LABELS,
  script: "버튼·입력 동작",
};

// DB previews.content 형식
// - redesignUsed: 다른 디자인으로 다시 만들기(무료, 한 번)를 썼는지
// - redesignStartedAt: 다시 만드는 중 표시(중복 방지 잠금). 끝나거나 실패하면 지운다
export type PreviewContent = {
  version: 2;
  kit: PreviewKit;
  accent: PreviewAccent;
  html: string;
  redesignUsed?: boolean;
  redesignStartedAt?: string | null;
};

// 다른 디자인으로 다시 만들기: 미리보기 하나에 한 번(개발자 계정은 제한 없음). 잠금은 5분이 지나면 풀린 것으로 본다
export const REDESIGN_LOCK_MS = 5 * 60 * 1000;
export function redesignBusy(content: Pick<PreviewContent, "redesignStartedAt">, now = Date.now()) {
  const started = content.redesignStartedAt ? Date.parse(content.redesignStartedAt) : NaN;
  return Number.isFinite(started) && now - started < REDESIGN_LOCK_MS;
}

// 브라우저로 보내는 상태: 키트를 붙여 조립한 문서 한 장
export type PreviewStatus = "generating" | "ready" | "failed";
export type PreviewState = {
  status: PreviewStatus;
  doc: string | null;
  kit: PreviewKit | null;
  redesignUsed: boolean;
  updatedAt: string;
};

// 격리된 프레임과 바깥 화면이 주고받는 메시지 (lib/preview-kit/runtime.js 와 같은 이름)
export const PREVIEW_MESSAGE_FROM_APP = "dotprd-preview";
export const PREVIEW_MESSAGE_FROM_HOST = "dotprd-host";

// 내려받는 HTML 파일 이름과, AI 코딩 도구에 붙여 넣을 한 줄
export const PREVIEW_FILE_PATH = "docs/preview.html";
export const PREVIEW_REFERENCE_PROMPT = `화면 디자인은 ${PREVIEW_FILE_PATH} 를 참고해. 색, 글꼴, 배치, 버튼 모양을 이 파일과 비슷하게 맞추고, 들어 있는 글과 데이터는 가짜이니 그대로 쓰지 마.`;
